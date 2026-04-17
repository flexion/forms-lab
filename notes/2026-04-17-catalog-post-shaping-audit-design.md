# Catalog Post-Shaping Audit & Update — Design

**Date:** 2026-04-17
**Scope:** Reflect story-4 (form shaping) work in the catalog, and take an evaluator-driven pass at gaps that will cost rubric points.

## Context

PR #42 (`story-4/form-shaping`) merged to main on 2026-04-15. The branch shipped a command-based form-shaping system that replaced the initial full-spec-rewrite approach. The catalog does not yet reflect:

- That shaping shipped (still listed under "Planned Capabilities")
- The command-based architecture
- The LLM tool-use integration technique
- The custom-element coordinator pattern
- The first-round → second-round pivot (which is rubric-rewarded as systematic engineering)
- Two small threats surfaced in code review

A secondary driver: the final presentation is ~April 20. Model & Inference is 40/100 rubric points. The walkthrough currently pitches one LLM integration point (extraction). Shaping is a second, technically distinct integration point (tool-use / constrained generation / schema as validation boundary) and is currently invisible to an evaluator.

Canonical sources for this work:
- `notes/2026-04-15-command-based-shaping-design.md` (command-based shaping design)
- `notes/2026-04-16-layout-overhaul-design.md` (three-panel editor)
- `notes/story-4-form-shaping/review.md` (code review, AC coverage, deferred items)

## Decisions

- **Medium scope.** Reflect what shipped + take an evaluator-driven gap pass. Do not touch stories 5–9 or refactor catalog structure.
- **Three small ADRs, not one combined ADR.** Existing ADRs in `catalog/decisions/architecture/` are single-concern; match precedent.
- **Add a new walkthrough page for shaping** rather than expanding an existing page. Shaping as a peer to extraction frames the project correctly for the evaluator.
- **Promote the pivot to an experiment record.** The systematic-engineering framing is worth the ~30 minutes.

## Changes

### 1. Catalog truthfulness

**1.1** `catalog/stories/4-maya-shapes-the-form-experience.md`
- Mark ACs per the status table in `notes/story-4-form-shaping/review.md` (met / partial / deferred).
- Add `## Implementation Notes` under `## Notes`: what shipped (command-based architecture, AI SDK tool-use, typed coordinator, git-backed shaping log), what's deferred (group-move UI, dedicated suggest-modes button, optimistic concurrency, Playwright tests for custom elements).
- Add links to the three new ADRs and the shaping-architecture experiment.

**1.2** `catalog/walkthrough/08-whats-next.md`
- Remove "Form shaping" bullet from Planned Capabilities.

**1.3** `catalog/architecture/data-model.md`
- Fix stale `src/types/models.ts` reference (line 51). Replace with pointers to `src/services/data-collection/types.ts` and `src/services/forms/types.ts`.
- Add short section **Shaping Commands** as a peer concept. Commands span DataCollectionSpec (field-level) and FormSpec (structural). Reference the command vocabulary in `src/services/forms/shaping/commands.ts`.

**1.4** `notes/flight-board.md`
- Move #4 row to a new "Landed" section; PR #42 merged 2026-04-15.

**1.5** `catalog/personas/maya.md`
- No change. Re-read confirms persona text is already consistent with what shipped.

### 2. New ADRs

Location: `catalog/decisions/architecture/`. All `status: stable`, `decided: 2026-04-15`.

**2.1 `command-based-shaping.md`**
- Decision: canonical representation of a FormSpec/DataCollectionSpec edit is a sequence of domain commands, not a revised spec.
- Context: first-round full-rewrite drifted (LLM shuffled page IDs, produced noisy diffs), lost intent (differ had to infer semantics from structural diffs), didn't scale toward WYSIWYG.
- Consequences: command vocabulary spans both domain layers (deliberate broadening of Maya's edit scope from Story 3). Batch-atomic execution with rollback. Shaping log is separate from git commit because some intents produce multi-command batches.
- Sources: design doc, `services/forms/shaping/commands.ts`, `services/forms/shaping/executor.ts`.

**2.2 `llm-tool-use-as-validation-boundary.md`**
- Decision: Claude emits commands via AI SDK tool-use mode. Each command kind is a Zod-backed tool. Server re-validates with the same Zod schemas before the executor runs.
- Context: free-form JSON LLM output requires fragile parsing and leaves ambiguity about whether malformed output is an attack or a generation failure. Tool-use makes well-formedness a modeling constraint and lets the schema be the single source of truth for "what the LLM is allowed to say."
- Consequences: three layers of defense — tool-use grammar, Zod schema, executor semantic validation. Adding a new command kind is a single-file change (tool definition + executor case). Threat model entry for shaping cites schema validation as the primary integrity boundary.
- Sources: `services/forms/shaping/tools.ts`, `services/forms/shaping/bedrock-shaper.ts`.

**2.3 `coordinator-custom-elements.md`**
- Decision: interactive editor UI is composed of custom elements. One root `flex-form-editor` coordinator owns ephemeral state and mediates between children via typed `CustomEvent`s. No React/Vue/etc.
- Context: the editor is the project's most interactive surface. A full client framework would conflict with P2 (design-system depends only on `shared/`), P4 (presentation is stateless — but editor state is real), and the project's Hono-JSX / server-rendered posture. Custom elements are a natural fit because the server still renders initial HTML; elements attach behavior.
- Consequences: each child element (`flex-form-structure`, `flex-assistant`, etc.) is independently testable. The event protocol is the contract. Pattern generalizes to any future editor-style UI without reaching for a framework. Trade-off: client logic is spread across files; no component-tree time-travel debugging.
- Sources: `src/design-system/components/flex-form-editor/`, `notes/2026-04-16-layout-overhaul-design.md`.

### 3. Architecture docs

**3.1** `catalog/architecture/software-architecture.md`
- Add `forms/shaping/` bullet under `src/services/` listing: `commands.ts`, `executor.ts`, `humanize.ts`, `projector.ts`, `tools.ts`, `bedrock-shaper.ts`, and `shaping log`.
- Extend "Current state → Isolated" to include `AI SDK tool-use` (contained to `services/forms/shaping/`).
- Link the three new ADRs from `## Sources`.

**3.2** `catalog/architecture/threat-model.md`
- Under the existing "Hono application to LLM (form shaping)" section, add two threats from the review:
  - **LLM cost abuse via refinement loop.** An attacker who is already an authenticated project owner can type refinement feedback repeatedly. Low severity; cost controls tracked as a follow-up.
  - **Prompt injection via refinement feedback (`previousAttempt.feedback`).** Low severity given attacker must be project owner; worth documenting the surface.
- Add a changelog entry dated 2026-04-17: "Added refinement-loop abuse and refinement-feedback prompt-injection threats surfaced in story-4 code review."

**3.3** `catalog/architecture/system-overview.md`
- Data Flow step 2 currently says "Maya shapes FormSpec … via authoring UI." Expand: "via LLM-assisted command-based editor; commands execute atomically and are logged."
- No structural changes.

### 4. Walkthrough

**4.1** New page: `catalog/walkthrough/03b-llm-assisted-form-shaping.md`
- Frontmatter: `order: 3.5`, `rubric: [model-functionality, innovation]`, `timing: "3 min"`, `audience: [evaluator, general]`.
- **Risk:** confirm `walkthrough.tsx` sorts on numeric `order` (fractional support) before committing to `3.5`. Fallback: renumber existing pages (04→05, 05→06, …) to insert at `04`. Renumbering touches every walkthrough file; preferred only if fractional order is unsupported.
- Sections:
  - **What It Does** — intent in natural language → LLM proposes a batch of domain commands → Maya accepts/rejects/refines. Git commit per accepted batch.
  - **The LLM Technique** — constrained generation via AI SDK tool-use. Each command kind is a tool. The LLM cannot emit ill-formed commands; the schema is the grammar.
  - **Why It's Interesting** — commands *are* the diff. Executor is deterministic. Atomic batch semantics. Manual UI operations (future drag-drop) would emit the same commands — one foundation for LLM-driven and direct-manipulation editing.
  - **The Pivot** — one short paragraph. First approach had the LLM rewrite the full FormSpec; drift and lost intent made it unsalvageable. Commands solved both.
  - Links: story #4, new ADRs, `services/forms/shaping/`, `catalog/experiments/shaping-architecture/`.

**4.2** `catalog/walkthrough/02-our-approach.md`
- In "What Makes This Different", add one line: the project has **two** distinct LLM integration points — structured extraction (PDF → spec) and constrained command generation (intent → edit batch).

**4.3** `catalog/walkthrough/06-inference-pipeline.md`
- Add a second pipeline box after the extraction one:
  ```
  Intent → AI SDK tool-use (Claude/Bedrock) → Command batch → Zod validation → Executor → Git commit
  ```
- Add short subsection noting: different sampling profile (tool-use mode, higher structure constraint), same Bedrock client, different validation strategy (schema-as-grammar vs. JSON parse-and-validate).

**4.4** `catalog/walkthrough/07-live-demo.md`
- New "Shape a Form" section after "Upload and Extract": open a project → click Edit → type an intent ("combine pages 2 and 3") → see proposed commands → accept → preview updates.

### 5. Experiments

**5.1** New directory: `catalog/experiments/shaping-architecture/`
- Before writing, read `catalog/experiments/pdf-field-extraction/_suite.md` and one variant file to confirm the frontmatter shape (fields like `variants`, metric columns, etc.). The shaping experiment is qualitative, so some metric-oriented fields will be intentionally empty or omitted; match the schema where it applies.
- `_suite.md` — framing: qualitative comparison of two architectures for LLM-assisted form editing, driven by the same set of user intents.
- `full-rewrite.md` — first-round approach. What it did (LLM returned revised FormSpec; server diffed). Observed failure modes (LLM drift, intent loss, noisy diffs). Why the approach hit a ceiling.
- `command-based.md` — second-round approach. What it does (LLM emits commands via tool-use). Why it fixes the failure modes. Trade-offs (deferred per-command acceptance, batch atomicity, broadening of domain).
- Clearly labeled: **qualitative architectural evaluation, no automated metrics** — findings derived from driving both implementations against the same intents during story-4 work.

## Out of Scope

- Editing stories 5–9 (describe future work, still accurate).
- Refactoring catalog structure or routes.
- Promoting design-notes-under-`notes/` to catalog (session artifacts belong where they are).
- A dedicated design-system page for `flex-form-editor` (registry auto-surfaces components; the *pattern* belongs in an ADR).
- Per-command-acceptance UI, group-move UI, dedicated suggest-modes UI (tracked as story-4 follow-ups in the review doc).

## Implementation Order

Linear — later changes link to earlier artifacts:

1. Three ADRs (2.1–2.3).
2. Story 4 update (1.1).
3. Architecture docs (3.1–3.3).
4. Walkthrough (4.1–4.4).
5. Experiments (5.1).
6. Housekeeping (1.2–1.4).
7. Verify: `bun run check`, visually confirm the new walkthrough page renders in dev.

## Testing / Verification

- `bun run check` — lint, type check, tests. No code changes expected, but markdown links and frontmatter could break some catalog renderers; the existing tests cover walkthrough/catalog parsing.
- Manual: `bun run dev`, visit `/catalog/walkthrough/03b-llm-assisted-form-shaping`, `/catalog/stories/4-…`, `/catalog/experiments/shaping-architecture/…`, `/catalog/decisions/architecture/command-based-shaping` (and the other two ADRs). Confirm sidebar placement and cross-links render.

## Effort Estimate

3–5 hours. ADRs ~45 min total; new walkthrough page ~30 min; experiment writeup ~30 min; edits to existing files ~90 min; verification ~30 min.
