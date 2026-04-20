# RAG-Powered Form Authoring Pipeline — Design Spec

**Date:** 2026-04-19
**Status:** Draft

## Overview

An agent-guided pipeline that transforms a policy corpus (and optionally a source PDF) into a first-class web form. The agent reads reference documentation such as regulatory text, proposes evaluation criteria the form should satisfy, generates form structure and fields grounded in policy, and auto-evaluates its output before presenting to the human for review.

The pipeline produces the same artifacts as manual form authoring — DataCollectionSpec, FormSpec, shaping log — committed to git with full provenance. The result doubles as a reusable test fixture.

## Users

- **Primary demo user (C):** Civic tech practitioner with no domain expertise. Relies on the agent to surface what matters from the policy corpus. Needs explanatory context with each proposal.
- **Production user (B):** Program administrator who understands the program at a high level but not specific CFR citations. Uses the pipeline to bridge the gap between program knowledge and form structure.
- **Expert user (A):** Policy expert who knows the regulations. May skip early pipeline stages or override criteria. The pipeline accelerates, not replaces, their expertise.

The pipeline must be explanatory enough for C, not patronizing for A. Structured commands with regulatory citations serve both: C reads the explanation, A reads the citation and validates directly.

## Pipeline Stages

### Stage 0: PDF Extraction (optional)

When a source PDF is provided, the existing extraction pipeline (`createProject` + `fireAndForgetExtraction`) runs first. Produces a draft DataCollectionSpec + FormSpec on the `import` branch. The authoring pipeline starts from this draft rather than empty state.

No changes to the extraction pipeline. The authoring pipeline treats the extraction output as initial state.

### Stage 1: Corpus Analysis -> Evaluation Criteria

**Input:** Policy corpus (project-scoped `references/*.md`)

**Model:** Sonnet, temperature 0

**Process:**
1. Agent reads full corpus from project's `references/` directory
2. Single LLM call: "Given this policy corpus, what criteria should a compliant form satisfy?"
3. Returns criteria as English sentences with regulatory citations

**Output:** `criteria.json` committed to git:
```json
{
  "criteria": [
    {
      "id": "exp-screening",
      "text": "Must screen for expedited processing per 7 CFR 273.2(i)",
      "source": "7 CFR 273.2(i)",
      "status": "pending"
    }
  ],
  "approvedAt": null,
  "approvedBy": null
}
```

**Human review:** Criteria presented as an editable list. Each row has text, citation badge, and accept/reject controls. Human can add criteria. "Approve criteria" freezes the set and advances to Stage 2.

Status transitions: `pending` (agent-proposed) -> `approved` / `rejected` / `added` (human-modified).

### Stage 2: Structure Planning -> Page/Group Skeleton

**Input:** Approved criteria + corpus + current state (empty or extraction draft)

**Model:** Sonnet, temperature 0

**Process:**
1. Agent retrieves broad policy chunks using criteria text as retrieval queries
2. Single LLM call: proposes `addPage` / `addGroup` shaping commands (~15-20 commands)
3. Commands appear in staged-changes UI

**Output:** Staged shaping commands with explanatory text citing policy.

**Human review:** Commands visible in existing staged-changes panel. Human accepts, rejects individual commands, or types chat redirect. On redirect, agent revises using the existing `previousAttempt` pattern. On accept, commands committed via `executeCommands`.

### Stage 3: Section Generation -> Fields per Group (per section)

**Input:** Committed skeleton + criteria + scoped corpus retrieval

**Model:** Sonnet, temperature 0 (Opus available as alternative for complex sections)

**Process (per group or cluster of related groups):**
1. Agent picks next uncovered group — a group is "uncovered" if it has no fields in the DataCollectionSpec yet (empty `requirements` array)
2. Retrieves topic-scoped policy (query = group title + related criteria text)
3. Single LLM call: proposes `addField` / `setFieldSensitivity` / `setFieldCondition` / `relabelField` commands (~5-15 per section)
4. Auto-eval inner loop (Stage 4) runs before presenting to human

**Output:** Staged commands with eval scorecard.

**Human review:** Commands + scorecard in staged-changes UI. Human accepts or redirects.

### Stage 4: Auto-Evaluation -> Criteria Check (per section)

**Input:** Generated form state + approved criteria + corpus

**Model:** Haiku, temperature 0

**Process:**
1. LLM-as-judge scores each relevant criterion as pass / fail / partial with explanation
2. Failed criteria become feedback for retry
3. Max 2 retries per section

**Inner loop:**
```
Generate section -> Evaluate against criteria -> Pass? -> Present to human
                                              -> Fail? -> Retry with specific feedback (max 2)
```

If still failing after retries, present to human with the failing scorecard and let them decide.

**Output:** `eval-results.json` updated per section:
```json
{
  "sections": {
    "income-group": {
      "results": [
        { "criterionId": "exp-screening", "pass": true, "explanation": "..." },
        { "criterionId": "income-types", "pass": false, "explanation": "Missing unearned income distinction", "retry": 1 }
      ],
      "generatedAt": "2026-04-19T..."
    }
  }
}
```

## Service Architecture

New service at `src/services/form-authoring/`:

### Modules

**`pipeline.ts`** — Orchestrator exposing per-stage methods:
- `analyzeCriteria(corpus: PolicyChunk[]): Promise<Criterion[]>`
- `planStructure(criteria: Criterion[], state: ProjectState, corpus: PolicyChunk[]): Promise<ShapingResult>`
- `generateSection(groupId: string, criteria: Criterion[], state: ProjectState, corpus: PolicyChunk[]): Promise<ShapingResult>`
- `evaluateSection(groupId: string, state: ProjectState, criteria: Criterion[], corpus: PolicyChunk[]): Promise<SectionEvalResult>`

Each method is a single LLM call with a focused prompt. The route handler drives the stage machine, calling one method per user interaction.

**`criteria.ts`** — Types and helpers for criteria (parse, serialize, merge human edits).

**`evaluator.ts`** — Judge implementation. Takes form state + approved criteria + corpus, scores each criterion pass/fail/partial with explanation. Returns structured feedback for retry.

**`prompts.ts`** — Prompt builders per stage. Separated from pipeline logic for independent testing and tuning.

**`types.ts`** — `Criterion`, `EvalResult`, `SectionEvalResult`, `AuthoringStageConfig`.

### Dependencies (all existing)

- `src/services/rag/` — retrieval and corpus loading
- `src/services/forms/shaping/commands.ts` — command types and tools
- `src/services/forms/shaping/executor.ts` — command validation
- Bedrock via AI SDK (same pattern as `bedrock-shaper.ts`)

### What it does NOT own

Route handling, UI components, project persistence. Those stay in `src/entrypoints/app/` and `src/services/projects/`.

## Per-Stage Model Configuration

```ts
interface AuthoringStageConfig {
  criteria: { modelId: string }    // Stage 1
  structure: { modelId: string }   // Stage 2
  generation: { modelId: string }  // Stage 3
  evaluation: { modelId: string }  // Stage 4
}
```

**Defaults:**
- Criteria: Sonnet
- Structure: Sonnet
- Generation: Sonnet (Opus registered as alternative)
- Evaluation: Haiku

All stages use temperature 0 for determinism and consistency. Per-stage model overrides via the existing variant preference system.

## Persistence

All artifacts stored in the project's git repo under `forms/default/`:

| Artifact | File | Stage |
|---|---|---|
| Criteria | `criteria.json` | 1 |
| Eval results | `eval-results.json` | 4 |
| DataCollectionSpec | `spec.json` | 0, 2, 3 |
| FormSpec | `form.json` | 0, 2, 3 |
| Shaping log | `shaping-log.json` | 2, 3 |
| Provenance | `provenance.json` | 0 |

**Project-scoped corpus:** `references/*.md` in the project git repo. Same frontmatter format as `catalog/references/`. The corpus loader (`src/services/rag/corpus.ts`) gains a `projectDir` option to read from project paths in addition to the global catalog.

## SNAP Fixture

**Corpus:** `catalog/references/snap-wisconsin.md` — ~10-15 chunks from 7 CFR 273 covering:
- Eligibility categories (273.1-273.4)
- Expedited processing (273.2(i))
- Income: earned vs unearned (273.9(b))
- Resources and BBCE exclusions (273.8)
- Household composition (273.1(b))
- Citizenship/immigration (273.4)
- Work requirements with WI ABAWD waiver (273.7)
- Rights and responsibilities
- Certification/signature

**Fixture:** `fixtures/snap-wisconsin/` following existing pattern:
- `manifest.json` — metadata
- `ground-truth.json` — labeled field extraction
- Source PDF: USDA FNS-7 model application or Wisconsin DHS form

The ground truth serves extraction eval (existing harness) and provides a benchmark for authoring output quality.

## UI Integration

No new pages. Pipeline surfaces within the existing project view.

**Stage indicator:** Progress bar at top of project page showing current stage (Criteria / Structure / Sections / Complete). Derived from artifact presence in git — no stored state.

**Stage 1 (Criteria review):** Editable list of text rows. Each row: text input, citation badge, accept/reject control. "Add criterion" button. "Approve criteria" button commits and advances.

**Stages 2-3:** Existing shaping UI. Staged commands in staged-changes panel, chat input for redirects. Pipeline auto-populates the next generation step.

**Stage 4 (Eval scorecard):** Criteria checklist alongside staged commands. Green check / red x per criterion with expandable explanation. Shows retry count if retries occurred.

**Escape hatch:** Reactive shaping chat works at any point. Expert users can skip stages or shape manually. The pipeline is a guided overlay, not a locked workflow.

## Cost and Latency

Per section: 1 generation call + 1 eval call, plus up to 2 retry pairs. For a 6-page / 10-group SNAP form:

- Worst case: 1 (criteria) + 1 (structure) + 10 (generation) + 10 (eval) + 20 (retries) = 42 calls
- Realistic: ~25 calls with 1-2 retries on a couple sections
- Wall clock: 3-5 minutes total
- Cost: a few dollars at Sonnet/Haiku pricing

## Known Limitations

- **No repeating groups:** SNAP needs household member repetition. Modeled as static "Household Member 1/2/3" groups. Noted limitation, not a blocker.
- **Corpus upload deferred:** Policy documents are pre-loaded as fixtures. File upload UI is future work.
- **No state persistence beyond git:** Pipeline stage is inferred from artifacts. If the user abandons mid-pipeline, they can resume by checking what artifacts exist.

## Scope Target

Full loop (target): Corpus analysis -> criteria review -> structure planning -> per-section generation with auto-eval -> complete form.

Fallback (if time constrained): Cut auto-eval inner loop. Criteria still generated and reviewed, but evaluation becomes a separate offline step rather than an inline retry loop. Pipeline still produces quality output; the agent just doesn't self-correct before presenting.
