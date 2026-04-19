---
status: working
story: 73
---

# Story #73: Prompt Optimization — Implementation Plan

## Goal

Register two new extraction variants that apply Assignment 10 prompt-engineering findings to the Sonnet extraction pipeline:

- `extraction/sonnet-temperature-zero` — baseline prompt + `temperature: 0`.
- `extraction/sonnet-hybrid-v1` — concise instructions + 1 exemplar (nested-groups) + `temperature: 0`.

Both are measured against baseline Sonnet with the LLM-judge scorer, same as #63 and #66.

## Architecture

The extractor factory `createBedrockPdfExtractor` in `src/services/form-documents/extraction.ts` already threads `exemplars` and `maxOutputTokens` into `generateText`. We extend it with an optional `temperature` field and a new `promptVariant` lever so the hybrid variant can swap the prompt text rather than the prompt-appendix. The registry wires the two new variants with appropriate factory options.

Key design decisions:

- **Temperature is a first-class option, not a constant.** Threading it through `BedrockExtractorOptions` keeps the surface small and lets any variant opt into deterministic output.
- **The hybrid prompt lives in a sibling module**, not inline in `extraction.ts`. Inline string templating is already at the limit of readable in the baseline; adding a second 2000-char prompt next to it would create a maintenance hazard. Putting `buildHybridPrompt()` in `src/services/form-documents/hybrid-extraction-prompt.ts` keeps `extraction.ts` orchestration-only.
- **The hybrid variant reuses the nested-groups exemplar** from `src/services/extraction/exemplars`. No new exemplar content — we're testing prompt shape, not content novelty.
- **No new eval kind.** `pdf-field-extraction` handles this.

## Tasks

### 1. Thread `temperature` through the extractor (TDD)

File: `src/services/form-documents/extraction.ts`

- Add `temperature?: number` to `BedrockExtractorOptions`.
- In `createBedrockPdfExtractor`, pass `temperature: options?.temperature` into the `generateText` call (Step 1 only — Step 2 (formSpec) and Step 3 (AcroForm mapping) keep defaults so we're measuring the extraction prompt specifically).

Test: `test/extraction-temperature.test.ts`
- Assert `BedrockExtractorOptions` accepts `temperature`.
- Mock `generateText` and assert the `temperature` argument propagates on Step 1.
- Assert omitting `temperature` leaves it unset (no regression on existing variants).

### 2. Register `extraction/sonnet-temperature-zero`

File: `src/services/extraction/registry.ts`

Add after the `haiku` registration:

```ts
registry.register({
  id: 'sonnet-temperature-zero',
  metadata: {
    name: 'Claude Sonnet 4 (temperature=0)',
    description:
      'Baseline Sonnet prompt with temperature=0. Ablates the "free optimization" lever from Assignment 10: deterministic output at zero marginal cost.',
    status: 'experimental',
    courseTopics: ['evaluation', 'prompt-optimization', 'determinism'],
    catalogPath:
      '/catalog/experiments/pdf-field-extraction/sonnet-temperature-zero',
    modelId: SONNET_MODEL_ID,
    pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
  },
  create: () =>
    createBedrockPdfExtractor({ model: SONNET_MODEL_ID, temperature: 0 }),
})
```

Test: `test/extraction-registry.test.ts`
- Add: registers `sonnet-temperature-zero`, status=experimental, courseTopics contains `prompt-optimization`.
- Bump the `>= 6` strategy count to `>= 7`.

### 3. Build the hybrid prompt module (TDD)

New file: `src/services/form-documents/hybrid-extraction-prompt.ts`

Exports `buildHybridExtractionPrompt(exemplar: ExtractionExemplar): string`. The prompt is shorter than the baseline and front-loads the single exemplar:

```
Extract the structure of this government PDF form as JSON matching the schema below. Follow the example extraction before producing your own.

## Example

Input form description:
{exemplar.input}

Output JSON:
{exemplar.output formatted}

## Schema

{same JSON schema block as baseline}

## Your extraction

Return ONLY the JSON. Use kebab-case ids, camelCase fieldNames. Flag fields you're less than 80% confident on. Be thorough.
```

Rationale follows A10's hybrid-v2 shape: one concrete example + concise rules, no verbose guidelines list.

Test: `test/extraction-hybrid-prompt.test.ts`
- Empty case: accepts a single exemplar (no undefined/empty handling — callers are trusted).
- Structure: prompt contains `## Example`, `## Schema`, `## Your extraction`.
- Exemplar content appears in output (input text and a key field from the JSON).
- Shorter than baseline: the hybrid prompt must be measurably shorter than baseline + 3-exemplar few-shot (sanity check on the "concise" claim).

### 4. Wire hybrid variant into extractor

File: `src/services/form-documents/extraction.ts`

Add `promptVariant?: 'default' | 'hybrid'` + `hybridExemplar?: ExtractionExemplar` to `BedrockExtractorOptions`. In `createBedrockPdfExtractor`, when `promptVariant === 'hybrid'`, use `buildHybridExtractionPrompt(hybridExemplar)` as the Step 1 text instead of the inline template.

Keep the default path untouched so existing variants are unaffected.

Test: `test/extraction-hybrid-prompt.test.ts` (extend)
- With `promptVariant: 'hybrid'`, the Step 1 call uses the hybrid prompt (mock `generateText`, assert the `text` field contains `## Example` and not `## Examples` (plural) to confirm it's the new shape, not the 3-shot appendix).
- Without `promptVariant`, the Step 1 call uses the baseline prompt (regression guard).

### 5. Register `extraction/sonnet-hybrid-v1`

File: `src/services/extraction/registry.ts`

```ts
import { exemplars } from './exemplars'
// ...
const [nestedGroupsExemplar] = exemplars
// ...
registry.register({
  id: 'sonnet-hybrid-v1',
  metadata: {
    name: 'Claude Sonnet 4 (hybrid prompt)',
    description:
      'Concise instructions + 1 exemplar + temperature=0. Ports the Assignment 10 hybrid-v2 strategy to extraction: less is more, even for frontier models.',
    status: 'experimental',
    courseTopics: ['evaluation', 'prompt-optimization', 'few-shot'],
    catalogPath:
      '/catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1',
    modelId: SONNET_MODEL_ID,
    pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
  },
  create: () =>
    createBedrockPdfExtractor({
      model: SONNET_MODEL_ID,
      temperature: 0,
      promptVariant: 'hybrid',
      hybridExemplar: nestedGroupsExemplar,
    }),
})
```

Test: `test/extraction-registry.test.ts`
- Registers `sonnet-hybrid-v1`, status=experimental, courseTopics contains `prompt-optimization` and `few-shot`.
- Bump count to `>= 8`.

### 6. Stub catalog pages (pre-eval)

Create both pages with approach + metrics placeholder, so the PR is mergeable before eval spend:

- `catalog/experiments/pdf-field-extraction/sonnet-temperature-zero.md`
- `catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1.md`

Follow the few-shot-sonnet.md template. Metrics sections show `_Pending evaluation run._`. Findings sections are empty until eval results land.

### 7. Update roadmap + orchestration

- `catalog/experiments/_roadmap.md` — mark #73 row (or add if missing) with `pr-open` after PR is opened.
- `notes/experiment-orchestration.md` — flip #73 row to `in-progress` now, `pr-open` after PR opened. The user merges.

### 8. Verify + open PR

- `bun run check` must be green.
- Open a draft PR to `main`. Body links back to #73 and notes the pending eval checkpoint.
- **Do NOT run `bun run cli evaluate`** — that's the Tier-2 Bedrock spend checkpoint. Coordinator session reports to the user and waits for go-ahead.

### 9. After user approval: run evals + fill in findings

Two runs:

```bash
AWS_PROFILE=llm-class bun run cli evaluate run sonnet-temperature-zero --scorer llm-judge
AWS_PROFILE=llm-class bun run cli evaluate run sonnet-hybrid-v1 --scorer llm-judge
```

Each writes `catalog/experiments/pdf-field-extraction/<id>.{json,md}`. Then:

- Update each catalog page with the Metrics table, Findings, Course Connection, and Cost sections.
- Update the `_roadmap.md` #73 row with a one-line finding.
- Update `notes/experiment-orchestration.md` row to `shipped` (after merge, actually — coordinator marks `pr-open` until user merges).
- Commit the catalog updates onto the same branch.

## Non-goals

- Do not touch shaping, filling, or field-mapping variants.
- Do not add a second hybrid exemplar. If the first variant underperforms, that's a finding, not a bug.
- Do not modify the default Sonnet variant.
- Do not run evals without user approval.
