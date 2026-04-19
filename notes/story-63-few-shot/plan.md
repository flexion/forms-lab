---
status: working
story: 63
---

# Story #63: Few-Shot Extraction Variant — Implementation Plan

## Goal

Add an extraction variant `few-shot-sonnet` that prepends 2-3 curated exemplar pairs (PDF description -> spec) to the extraction prompt, demonstrating few-shot prompt conditioning.

## Architecture

The extraction pipeline lives at `src/services/form-documents/extraction.ts`. The function `createBedrockPdfExtractor(options)` builds a prompt inline (lines 111-151) and calls Bedrock via `generateText`. The extraction registry at `src/services/extraction/registry.ts` maps variant IDs to factory functions.

The key insight: we need a new extractor factory that wraps the same Bedrock pipeline but injects exemplars into the prompt. We do NOT duplicate the entire extraction function — instead, we extend `BedrockExtractorOptions` with an optional `exemplars` field and modify the prompt builder to prepend them.

## Tasks

### 1. Create exemplar data (src/services/extraction/exemplars/)

Create `src/services/extraction/exemplars/index.ts` exporting an array of 2-3 exemplar objects:

```typescript
export interface ExtractionExemplar {
  id: string
  description: string
  rationale: string
  input: string    // compact description of a form
  output: string   // compact JSON spec snippet
}
```

Each exemplar should demonstrate an edge case:
1. **Nested groups** — a form section with sub-groups (e.g., "Employment History" with "Current" and "Previous" sub-groups)
2. **Sensitivity labels** — a form with PII fields (SSN, DOB) requiring correct sensitivity classification
3. **Conditional fields** — a form where some fields only appear based on answers to other fields

Keep exemplars compact (under 500 tokens each) to avoid blowing the token budget. The output should be a small, representative DataCollectionSpec snippet (2-3 groups, 4-6 fields each) — NOT a full extraction. Include the rationale for each exemplar as a code comment.

### 2. Extend extraction.ts to accept exemplars

In `src/services/form-documents/extraction.ts`:

- Add `exemplars?: ExtractionExemplar[]` to `BedrockExtractorOptions` (line 65-67)
- In the prompt text (lines 111-151), if `exemplars` is provided, prepend a "## Examples" section before the "Guidelines" section showing each exemplar as input/output pairs
- Format: `### Example N: {description}\n\nInput form description:\n{input}\n\nExpected output:\n{output}\n\n`

### 3. Register the few-shot-sonnet variant

In `src/services/extraction/registry.ts`, add a new registration after the haiku entry (after line 47):

```typescript
import { exemplars } from './exemplars'

registry.register({
  id: 'few-shot-sonnet',
  metadata: {
    name: 'Claude Sonnet 4 (few-shot)',
    description: 'Sonnet with curated extraction examples prepended to the prompt.',
    status: 'experimental',
    courseTopics: ['evaluation', 'few-shot', 'prompt-conditioning'],
    catalogPath: '/catalog/experiments/pdf-field-extraction/few-shot-sonnet',
    modelId: SONNET_MODEL_ID,
  },
  create: () => createBedrockPdfExtractor({ model: SONNET_MODEL_ID, exemplars }),
})
```

### 4. Update tests

In `test/extraction-registry.test.ts`:

- Update the "strategies registered" assertion: the count should now be >= 4 (was >= 2)
- Add a test: `it('registers few-shot-sonnet as experimental')`
- Add a test: `it('few-shot-sonnet has few-shot in courseTopics')`

### 5. Create catalog page

Create `catalog/experiments/pdf-field-extraction/few-shot-sonnet.md`:

```markdown
---
kind: pdf-field-extraction
implementation: few-shot-sonnet
status: working
course-topics: [evaluation, few-shot, prompt-conditioning]
---

# PDF Field Extraction: Claude Sonnet 4 (Few-Shot)

> Selectable in **Settings → Variants → Extraction**.

**Status:** experimental

## Approach

Prepends 2-3 curated exemplar (input description → output spec) pairs to the standard extraction prompt. Exemplars are chosen to demonstrate edge cases: nested groups, sensitivity labels, and conditional fields.

## Exemplars

1. **Nested groups** — {describe}
2. **Sensitivity labels** — {describe}
3. **Conditional fields** — {describe}

## Course Topics

- Few-shot prompt conditioning (Ch 8)
- Evaluation and model selection

## Metrics

_Pending evaluation run._

## Findings

_To be filled after evaluation._
```

### 6. Update roadmap

In `catalog/experiments/_roadmap.md`, update the #63 row status from `planned` to `pr-open`.

### 7. Update orchestration doc

In `notes/experiment-orchestration.md`, update the #63 row status from `planned` to `pr-open`.

## Verification

Run `bun run check` — must be green. Do NOT run `bun run cli evaluate` (requires user approval for Bedrock spend).

## Non-goals

- Do not run evaluation (gated by user approval)
- Do not modify other variants
- Do not touch shaping, filling, or field-mapping code
