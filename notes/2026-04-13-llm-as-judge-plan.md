# LLM-as-Judge Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the brittle deterministic field-matching scorer with a semantic LLM-as-judge evaluation that accurately measures extraction quality across naming variations.

**Architecture:** Add a new `EvaluationKind` implementation that uses an LLM (Opus) to semantically match extracted fields against ground truth. The existing deterministic scorer is kept as a fast baseline. The `EvaluationKind.score()` interface becomes async to support LLM calls. A `FieldJudge` interface abstracts the LLM dependency for testability. The CLI gains a `--scorer` flag to select between `deterministic` and `llm-judge`.

**Tech Stack:** Vercel AI SDK (`ai` + `@ai-sdk/amazon-bedrock`), Zod for response validation, Bun test runner.

---

## Context

The current deterministic scorer uses exact `fieldName` match + exact normalized `label` match. Analysis shows this dramatically undercounts model performance: Haiku's actual recall is ~80% but reports as 61% because 33 of 38 "extra" fields are semantic matches to "missed" ground truth fields (e.g., `prosecutionCourt` ↔ `courtOfProsecution`, `communityActivityContactName` ↔ `communityActivityContactNames`).

The LLM judge sends both field sets to Opus and asks it to determine semantic equivalence. This produces accurate match lists that feed into the same metrics pipeline (recall, precision, type accuracy, group accuracy, sensitivity accuracy).

## File Structure

```
src/services/evaluation/
  types.ts                                # Modified: make score() async
  harness.ts                              # Modified: await score()
  kinds/
    shared.ts                             # New: FlatField, flattenFields, calculateMetrics
    pdf-field-extraction.ts               # Modified: use shared utilities
    pdf-field-extraction-judge.ts         # New: LLM judge evaluation kind
  judge.ts                                # New: FieldJudge interface + Bedrock impl
  judge-prompt.ts                         # New: prompt construction
  judge-schemas.ts                        # New: Zod schemas for judge response

src/entrypoints/cli/commands/
  evaluate.ts                             # Modified: add --scorer flag

test/
  evaluation-judge-schemas.test.ts        # New: response parsing tests
  evaluation-judge-scoring.test.ts        # New: judge scoring integration tests
  pdf-field-extraction-eval.test.ts       # Modified: adapt for async score()
  evaluation-harness.test.ts              # Modified: adapt for async score()
```

---

### Task 1: Make EvaluationKind.score() async

The LLM judge needs an async `score()`. This change touches the interface, the harness, and both existing scorer and tests.

**Files:**
- Modify: `src/services/evaluation/types.ts`
- Modify: `src/services/evaluation/harness.ts`
- Modify: `src/services/evaluation/kinds/pdf-field-extraction.ts`
- Modify: `test/evaluation-harness.test.ts`
- Modify: `test/pdf-field-extraction-eval.test.ts`

- [ ] **Step 1: Update the EvaluationKind interface**

In `src/services/evaluation/types.ts`, change `score` to return a Promise:

```typescript
export interface EvaluationKind<TOutput, TGroundTruth> {
  id: string
  description: string
  score(output: TOutput, groundTruth: TGroundTruth): Promise<CaseMetrics>
  summarize(cases: CaseMetrics[]): SummaryMetrics
}
```

- [ ] **Step 2: Update the harness to await score()**

In `src/services/evaluation/harness.ts`, add `await` at the `kind.score()` call site:

```typescript
    const caseMetrics = await kind.score(output, fixture.groundTruth)
```

- [ ] **Step 3: Make the deterministic scorer async**

In `src/services/evaluation/kinds/pdf-field-extraction.ts`, change the `score` method signature:

```typescript
  async score(
    output: ExtractionOutput,
    groundTruth: DataCollectionSpec,
  ): Promise<CaseMetrics> {
```

The body stays the same — it just returns a resolved promise implicitly.

- [ ] **Step 4: Run tests**

Run: `bun test test/evaluation-harness.test.ts test/pdf-field-extraction-eval.test.ts`

Both test files already use `async` test functions and the harness is already async, so no test changes should be needed. Verify all pass.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/evaluation/types.ts src/services/evaluation/harness.ts src/services/evaluation/kinds/pdf-field-extraction.ts
git commit -m "refactor(evaluation): make EvaluationKind.score() async

Prepares the evaluation interface for LLM-as-judge scoring, which
requires async LLM calls during field matching. The deterministic
scorer is unchanged in behavior — just marked async."
```

---

### Task 2: Extract shared utilities from the deterministic scorer

Move `FlatField`, `flattenFields()`, `ExtractionOutput`, and metrics calculation into a shared module so both scorers can use them.

**Files:**
- Create: `src/services/evaluation/kinds/shared.ts`
- Modify: `src/services/evaluation/kinds/pdf-field-extraction.ts`
- Test: `test/pdf-field-extraction-eval.test.ts` (existing tests verify no regressions)

- [ ] **Step 1: Write a test that imports from the new shared module**

Create a minimal test at the top of `test/pdf-field-extraction-eval.test.ts` that verifies the shared utilities are importable. Or simply: after extracting, run the existing tests and verify they still pass. Since the extraction is a refactor, the existing 295-line test file is the regression suite.

- [ ] **Step 2: Create `src/services/evaluation/kinds/shared.ts`**

```typescript
import type {
  DataCollectionSpec,
  DataRequirement,
} from '../../data-collection/types'
import type { FieldConfidence } from '../../ingestion/types'

export interface ExtractionOutput {
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}

export interface FlatField {
  requirement: DataRequirement
  groupId: string
}

export function flattenFields(spec: DataCollectionSpec): FlatField[] {
  const fields: FlatField[] = []
  for (const group of spec.groups) {
    for (const req of group.requirements) {
      fields.push({ requirement: req, groupId: group.id })
    }
  }
  return fields
}

export interface MatchResult {
  matches: Map<number, number>
  missed: string[]
  extra: string[]
  totalGroundTruth: number
  totalExtracted: number
  totalMatched: number
}

export function calculateMetrics(
  groundTruthFields: FlatField[],
  extractedFields: FlatField[],
  matches: Map<number, number>,
): {
  metrics: Record<string, number>
  details: Record<string, unknown>
} {
  const fieldRecall =
    groundTruthFields.length > 0
      ? matches.size / groundTruthFields.length
      : 1.0

  const fieldPrecision =
    extractedFields.length > 0 ? matches.size / extractedFields.length : 1.0

  const missed: string[] = []
  for (let gtIdx = 0; gtIdx < groundTruthFields.length; gtIdx++) {
    if (!matches.has(gtIdx)) {
      missed.push(groundTruthFields[gtIdx].requirement.fieldName)
    }
  }

  const extra: string[] = []
  const matchedExtractedIndices = new Set(matches.values())
  for (let exIdx = 0; exIdx < extractedFields.length; exIdx++) {
    if (!matchedExtractedIndices.has(exIdx)) {
      extra.push(extractedFields[exIdx].requirement.fieldName)
    }
  }

  let typeCorrect = 0
  let groupCorrect = 0
  let sensitivityCorrect = 0
  for (const [gtIdx, exIdx] of matches) {
    const gtField = groundTruthFields[gtIdx]
    const exField = extractedFields[exIdx]
    if (gtField.requirement.fieldType === exField.requirement.fieldType)
      typeCorrect++
    if (gtField.groupId === exField.groupId) groupCorrect++
    if (gtField.requirement.sensitivity === exField.requirement.sensitivity)
      sensitivityCorrect++
  }

  const typeAccuracy = matches.size > 0 ? typeCorrect / matches.size : 1.0
  const groupAccuracy = matches.size > 0 ? groupCorrect / matches.size : 1.0
  const sensitivityAccuracy =
    matches.size > 0 ? sensitivityCorrect / matches.size : 1.0

  return {
    metrics: {
      fieldRecall,
      fieldPrecision,
      typeAccuracy,
      groupAccuracy,
      sensitivityAccuracy,
    },
    details: {
      missed,
      extra,
      totalGroundTruth: groundTruthFields.length,
      totalExtracted: extractedFields.length,
      totalMatched: matches.size,
    },
  }
}
```

- [ ] **Step 3: Refactor pdf-field-extraction.ts to use shared utilities**

Replace the local `ExtractionOutput`, `FlatField`, `flattenFields`, and metrics calculation with imports from `shared.ts`. The file should shrink to just the `normalizeLabel()`, `matchFields()` functions and the `pdfFieldExtractionKind` object that wires them together:

```typescript
import type { DataCollectionSpec } from '../../data-collection/types'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'
import {
  type ExtractionOutput,
  type FlatField,
  calculateMetrics,
  flattenFields,
} from './shared'

export type { ExtractionOutput }

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchFields(
  extracted: FlatField[],
  groundTruth: FlatField[],
): Map<number, number> {
  const matches = new Map<number, number>()
  const usedExtracted = new Set<number>()

  for (let gtIdx = 0; gtIdx < groundTruth.length; gtIdx++) {
    const gtField = groundTruth[gtIdx]
    for (let exIdx = 0; exIdx < extracted.length; exIdx++) {
      if (usedExtracted.has(exIdx)) continue
      if (gtField.requirement.fieldName === extracted[exIdx].requirement.fieldName) {
        matches.set(gtIdx, exIdx)
        usedExtracted.add(exIdx)
        break
      }
    }
  }

  for (let gtIdx = 0; gtIdx < groundTruth.length; gtIdx++) {
    if (matches.has(gtIdx)) continue
    const gtNormLabel = normalizeLabel(groundTruth[gtIdx].requirement.label)
    for (let exIdx = 0; exIdx < extracted.length; exIdx++) {
      if (usedExtracted.has(exIdx)) continue
      if (gtNormLabel === normalizeLabel(extracted[exIdx].requirement.label)) {
        matches.set(gtIdx, exIdx)
        usedExtracted.add(exIdx)
        break
      }
    }
  }

  return matches
}

export const pdfFieldExtractionKind: EvaluationKind<
  ExtractionOutput,
  DataCollectionSpec
> = {
  id: 'pdf-field-extraction',
  description:
    'Evaluates PDF field extraction accuracy using deterministic field matching',

  async score(
    output: ExtractionOutput,
    groundTruth: DataCollectionSpec,
  ): Promise<CaseMetrics> {
    const extractedFields = flattenFields(output.spec)
    const groundTruthFields = flattenFields(groundTruth)
    const matches = matchFields(extractedFields, groundTruthFields)
    const { metrics, details } = calculateMetrics(
      groundTruthFields,
      extractedFields,
      matches,
    )
    return { fixture: '', metrics, details }
  },

  summarize(cases: CaseMetrics[]): SummaryMetrics {
    if (cases.length === 0) return { metrics: {} }
    const metricKeys = new Set<string>()
    for (const c of cases) {
      for (const key of Object.keys(c.metrics)) metricKeys.add(key)
    }
    const metrics: Record<string, number> = {}
    for (const key of metricKeys) {
      let sum = 0
      let count = 0
      for (const c of cases) {
        if (key in c.metrics) { sum += c.metrics[key]; count++ }
      }
      metrics[key] = count > 0 ? sum / count : 0
    }
    return { metrics }
  },
}
```

- [ ] **Step 4: Run tests to verify refactor is clean**

Run: `bun test test/pdf-field-extraction-eval.test.ts test/evaluation-harness.test.ts`
Expected: all pass, no behavior change.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/evaluation/kinds/shared.ts src/services/evaluation/kinds/pdf-field-extraction.ts
git commit -m "refactor(evaluation): extract shared utilities from deterministic scorer

Move FlatField, flattenFields, ExtractionOutput, and calculateMetrics
into shared.ts so both deterministic and LLM judge scorers can use them."
```

---

### Task 3: Define judge response schema and parsing

Define the Zod schema for the structured JSON the LLM judge returns, and the `FieldJudge` interface.

**Files:**
- Create: `src/services/evaluation/judge-schemas.ts`
- Create: `src/services/evaluation/judge.ts`
- Create: `test/evaluation-judge-schemas.test.ts`

- [ ] **Step 1: Write failing tests for judge response parsing**

Create `test/evaluation-judge-schemas.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { judgeResponseSchema } from '../src/services/evaluation/judge-schemas'

describe('judgeResponseSchema', () => {
  it('parses a valid judge response', () => {
    const response = {
      matches: [
        {
          groundTruthFieldName: 'oathDay',
          extractedFieldName: 'certificationOathDay',
          confidence: 0.95,
          reasoning: 'Same field — extracted version has a section prefix',
        },
      ],
      unmatchedGroundTruth: ['firstName', 'lastName'],
      unmatchedExtracted: ['fullName'],
    }
    const result = judgeResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matches).toHaveLength(1)
      expect(result.data.matches[0].confidence).toBe(0.95)
      expect(result.data.unmatchedGroundTruth).toEqual([
        'firstName',
        'lastName',
      ])
      expect(result.data.unmatchedExtracted).toEqual(['fullName'])
    }
  })

  it('rejects response missing required fields', () => {
    const response = { matches: [] }
    const result = judgeResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it('rejects match with confidence out of range', () => {
    const response = {
      matches: [
        {
          groundTruthFieldName: 'a',
          extractedFieldName: 'b',
          confidence: 1.5,
          reasoning: 'test',
        },
      ],
      unmatchedGroundTruth: [],
      unmatchedExtracted: [],
    }
    const result = judgeResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/evaluation-judge-schemas.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/services/evaluation/judge-schemas.ts`**

```typescript
import { z } from 'zod'

export const judgeMatchSchema = z.object({
  groundTruthFieldName: z.string(),
  extractedFieldName: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export const judgeResponseSchema = z.object({
  matches: z.array(judgeMatchSchema),
  unmatchedGroundTruth: z.array(z.string()),
  unmatchedExtracted: z.array(z.string()),
})

export type JudgeMatch = z.infer<typeof judgeMatchSchema>
export type JudgeResponse = z.infer<typeof judgeResponseSchema>
```

- [ ] **Step 4: Create `src/services/evaluation/judge.ts`**

Define the FieldJudge interface. The Bedrock implementation will be added in a later task.

```typescript
import type { FlatField } from './kinds/shared'
import type { JudgeResponse } from './judge-schemas'

export interface FieldJudge {
  judge(
    extracted: FlatField[],
    groundTruth: FlatField[],
  ): Promise<JudgeResponse>
}
```

- [ ] **Step 5: Run tests**

Run: `bun test test/evaluation-judge-schemas.test.ts`
Expected: all 3 pass.

- [ ] **Step 6: Run full check**

Run: `bun run check`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/evaluation/judge-schemas.ts src/services/evaluation/judge.ts test/evaluation-judge-schemas.test.ts
git commit -m "feat(evaluation): add judge response schema and FieldJudge interface

Zod schema validates the structured JSON returned by the LLM judge.
FieldJudge interface abstracts the LLM dependency for testability."
```

---

### Task 4: Implement judge prompt construction

Build the prompt that formats extracted and ground truth fields for the LLM judge.

**Files:**
- Create: `src/services/evaluation/judge-prompt.ts`
- Create: `test/evaluation-judge-prompt.test.ts`

- [ ] **Step 1: Write failing test for prompt construction**

Create `test/evaluation-judge-prompt.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { buildJudgePrompt } from '../src/services/evaluation/judge-prompt'
import type { FlatField } from '../src/services/evaluation/kinds/shared'

const gtFields: FlatField[] = [
  {
    requirement: {
      id: 'f1',
      fieldName: 'courtOfProsecution',
      label: 'Court where you were prosecuted',
      fieldType: 'text',
      required: true,
    },
    groupId: 'case-background',
  },
  {
    requirement: {
      id: 'f2',
      fieldName: 'oathDay',
      label: 'Day (of submission)',
      fieldType: 'text',
      required: true,
    },
    groupId: 'certification',
  },
]

const exFields: FlatField[] = [
  {
    requirement: {
      id: 'e1',
      fieldName: 'prosecutionCourt',
      label: 'Prosecution Court',
      fieldType: 'text',
      required: true,
    },
    groupId: 'case-info',
  },
  {
    requirement: {
      id: 'e2',
      fieldName: 'certificationOathDay',
      label: 'Certification Oath Day',
      fieldType: 'text',
      required: true,
    },
    groupId: 'certification-oath',
  },
]

describe('buildJudgePrompt', () => {
  it('includes all ground truth and extracted field names', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('courtOfProsecution')
    expect(prompt).toContain('oathDay')
    expect(prompt).toContain('prosecutionCourt')
    expect(prompt).toContain('certificationOathDay')
  })

  it('includes field labels', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('Court where you were prosecuted')
    expect(prompt).toContain('Prosecution Court')
  })

  it('includes group context', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('case-background')
    expect(prompt).toContain('case-info')
  })

  it('requests JSON output', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('"matches"')
    expect(prompt).toContain('"unmatchedGroundTruth"')
    expect(prompt).toContain('"unmatchedExtracted"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/evaluation-judge-prompt.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/services/evaluation/judge-prompt.ts`**

```typescript
import type { FlatField } from './kinds/shared'

function formatField(field: FlatField): string {
  return JSON.stringify({
    fieldName: field.requirement.fieldName,
    label: field.requirement.label,
    fieldType: field.requirement.fieldType,
    group: field.groupId,
  })
}

export function buildJudgePrompt(
  extracted: FlatField[],
  groundTruth: FlatField[],
): string {
  const gtList = groundTruth.map(formatField).join(',\n  ')
  const exList = extracted.map(formatField).join(',\n  ')

  return `You are evaluating the output of a PDF form field extraction system. Compare the extracted fields against the ground truth fields and determine which extracted fields match which ground truth fields.

Two fields "match" if they represent the SAME piece of information the form collects, even when they use different names. Examples of matches:
- "prosecutionCourt" ↔ "courtOfProsecution" (same concept, word order differs)
- "certificationOathDay" ↔ "oathDay" (one has a section prefix)
- "communityActivityContactName" ↔ "communityActivityContactNames" (singular vs plural)
- "priorApplicationDate" ↔ "previousApplicationDate" (synonym: prior/previous)
- "sobrietyDuration" ↔ "sobrietyLength" (synonym: duration/length)

Examples of NON-matches:
- "fullName" vs "firstName"/"lastName" (different granularity — one combined, others individual)
- "attorneyPhone" vs "attorneyContact" (phone is a subset of contact info)

Rules:
- Each ground truth field matches at most one extracted field, and vice versa
- Only match fields that represent the SAME piece of information
- Fields at different granularity levels should NOT be matched
- Set confidence: 1.0 = obvious match, 0.7 = likely match, 0.5 = uncertain

Return ONLY valid JSON (no markdown fences, no explanation outside the JSON) with this structure:
{
  "matches": [
    {
      "groundTruthFieldName": "string",
      "extractedFieldName": "string",
      "confidence": 0.0-1.0,
      "reasoning": "brief explanation"
    }
  ],
  "unmatchedGroundTruth": ["fieldName1", "fieldName2"],
  "unmatchedExtracted": ["fieldName1", "fieldName2"]
}

Ground truth fields (${groundTruth.length} total):
[
  ${gtList}
]

Extracted fields (${extracted.length} total):
[
  ${exList}
]`
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/evaluation-judge-prompt.test.ts`
Expected: all 4 pass.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/evaluation/judge-prompt.ts test/evaluation-judge-prompt.test.ts
git commit -m "feat(evaluation): add judge prompt construction

Formats ground truth and extracted fields into a structured prompt
that asks the LLM to produce semantic field matches with confidence
scores and reasoning."
```

---

### Task 5: Implement Bedrock field judge

Create the real LLM implementation of the `FieldJudge` interface.

**Files:**
- Modify: `src/services/evaluation/judge.ts`

- [ ] **Step 1: Implement `createBedrockFieldJudge`**

Update `src/services/evaluation/judge.ts`:

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { FlatField } from './kinds/shared'
import { buildJudgePrompt } from './judge-prompt'
import { type JudgeResponse, judgeResponseSchema } from './judge-schemas'

export interface FieldJudge {
  judge(
    extracted: FlatField[],
    groundTruth: FlatField[],
  ): Promise<JudgeResponse>
}

export function createBedrockFieldJudge(model: string): FieldJudge {
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async judge(
      extracted: FlatField[],
      groundTruth: FlatField[],
    ): Promise<JudgeResponse> {
      const prompt = buildJudgePrompt(extracted, groundTruth)

      const result = await generateText({
        model: bedrock(model),
        maxOutputTokens: 16384,
        messages: [{ role: 'user', content: prompt }],
      })

      const trimmed = result.text.trim()
      const jsonStr = trimmed.startsWith('```')
        ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
        : trimmed
      const parsed = JSON.parse(jsonStr)
      return judgeResponseSchema.parse(parsed)
    },
  }
}
```

- [ ] **Step 2: Run full check**

Run: `bun run check`
Expected: all pass (no tests call the real Bedrock endpoint).

- [ ] **Step 3: Commit**

```bash
git add src/services/evaluation/judge.ts
git commit -m "feat(evaluation): add Bedrock field judge implementation

Uses Opus via the AI SDK to semantically match extracted fields
against ground truth. Validates the structured response with Zod."
```

---

### Task 6: Implement the LLM judge evaluation kind

Wire the judge into an `EvaluationKind` that uses semantic matching instead of deterministic matching.

**Files:**
- Create: `src/services/evaluation/kinds/pdf-field-extraction-judge.ts`
- Create: `test/evaluation-judge-scoring.test.ts`

- [ ] **Step 1: Write failing test for judge scoring**

Create `test/evaluation-judge-scoring.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../src/services/data-collection/types'
import type { FieldJudge } from '../src/services/evaluation/judge'
import type { JudgeResponse } from '../src/services/evaluation/judge-schemas'
import { createLlmJudgeKind } from '../src/services/evaluation/kinds/pdf-field-extraction-judge'
import type { FlatField } from '../src/services/evaluation/kinds/shared'

function makeSpec(
  fields: Array<{ fieldName: string; label: string; groupId: string }>,
): DataCollectionSpec {
  const groups = new Map<string, typeof fields>()
  for (const f of fields) {
    const existing = groups.get(f.groupId) ?? []
    existing.push(f)
    groups.set(f.groupId, existing)
  }
  return {
    id: 'test',
    title: 'Test',
    description: '',
    groups: Array.from(groups.entries()).map(([id, reqs]) => ({
      id,
      title: id,
      requirements: reqs.map((r) => ({
        id: r.fieldName,
        fieldName: r.fieldName,
        label: r.label,
        fieldType: 'text' as const,
        required: true,
      })),
    })),
  }
}

function createStubJudge(response: JudgeResponse): FieldJudge {
  return {
    async judge(): Promise<JudgeResponse> {
      return response
    },
  }
}

describe('LLM judge evaluation kind', () => {
  it('computes metrics from judge matches', async () => {
    const groundTruth = makeSpec([
      { fieldName: 'courtOfProsecution', label: 'Court', groupId: 'case' },
      { fieldName: 'oathDay', label: 'Day', groupId: 'cert' },
      { fieldName: 'firstName', label: 'First', groupId: 'info' },
    ])

    const extracted = makeSpec([
      { fieldName: 'prosecutionCourt', label: 'Court', groupId: 'case' },
      { fieldName: 'certOathDay', label: 'Day', groupId: 'cert' },
      { fieldName: 'extraField', label: 'Extra', groupId: 'other' },
    ])

    const judge = createStubJudge({
      matches: [
        {
          groundTruthFieldName: 'courtOfProsecution',
          extractedFieldName: 'prosecutionCourt',
          confidence: 0.95,
          reasoning: 'word order',
        },
        {
          groundTruthFieldName: 'oathDay',
          extractedFieldName: 'certOathDay',
          confidence: 0.9,
          reasoning: 'prefix',
        },
      ],
      unmatchedGroundTruth: ['firstName'],
      unmatchedExtracted: ['extraField'],
    })

    const kind = createLlmJudgeKind(judge)
    const result = await kind.score(
      { spec: extracted, confidence: [] },
      groundTruth,
    )

    expect(result.metrics.fieldRecall).toBeCloseTo(2 / 3, 2)
    expect(result.metrics.fieldPrecision).toBeCloseTo(2 / 3, 2)
    expect(result.details.totalMatched).toBe(2)
    expect(result.details.totalGroundTruth).toBe(3)
    expect(result.details.totalExtracted).toBe(3)
    expect((result.details.missed as string[])).toContain('firstName')
    expect((result.details.extra as string[])).toContain('extraField')
  })

  it('returns perfect scores for identical specs', async () => {
    const spec = makeSpec([
      { fieldName: 'name', label: 'Name', groupId: 'info' },
    ])

    const judge = createStubJudge({
      matches: [
        {
          groundTruthFieldName: 'name',
          extractedFieldName: 'name',
          confidence: 1.0,
          reasoning: 'exact match',
        },
      ],
      unmatchedGroundTruth: [],
      unmatchedExtracted: [],
    })

    const kind = createLlmJudgeKind(judge)
    const result = await kind.score({ spec, confidence: [] }, spec)

    expect(result.metrics.fieldRecall).toBe(1.0)
    expect(result.metrics.fieldPrecision).toBe(1.0)
  })

  it('stores judge matches in details', async () => {
    const gt = makeSpec([
      { fieldName: 'a', label: 'A', groupId: 'g' },
    ])
    const ex = makeSpec([
      { fieldName: 'b', label: 'B', groupId: 'g' },
    ])

    const judge = createStubJudge({
      matches: [
        {
          groundTruthFieldName: 'a',
          extractedFieldName: 'b',
          confidence: 0.8,
          reasoning: 'semantic match',
        },
      ],
      unmatchedGroundTruth: [],
      unmatchedExtracted: [],
    })

    const kind = createLlmJudgeKind(judge)
    const result = await kind.score({ spec: ex, confidence: [] }, gt)

    const judgeMatches = result.details.judgeMatches as Array<{
      groundTruthFieldName: string
      extractedFieldName: string
      confidence: number
    }>
    expect(judgeMatches).toHaveLength(1)
    expect(judgeMatches[0].confidence).toBe(0.8)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/evaluation-judge-scoring.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/services/evaluation/kinds/pdf-field-extraction-judge.ts`**

```typescript
import type { DataCollectionSpec } from '../../data-collection/types'
import type { FieldJudge } from '../judge'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'
import { type ExtractionOutput, calculateMetrics, flattenFields } from './shared'

export function createLlmJudgeKind(
  judge: FieldJudge,
): EvaluationKind<ExtractionOutput, DataCollectionSpec> {
  return {
    id: 'pdf-field-extraction-llm-judge',
    description:
      'Evaluates PDF field extraction accuracy using LLM semantic matching',

    async score(
      output: ExtractionOutput,
      groundTruth: DataCollectionSpec,
    ): Promise<CaseMetrics> {
      const extractedFields = flattenFields(output.spec)
      const groundTruthFields = flattenFields(groundTruth)

      const judgeResult = await judge.judge(extractedFields, groundTruthFields)

      // Build index maps for field lookup
      const gtIndex = new Map<string, number>()
      for (let i = 0; i < groundTruthFields.length; i++) {
        gtIndex.set(groundTruthFields[i].requirement.fieldName, i)
      }
      const exIndex = new Map<string, number>()
      for (let i = 0; i < extractedFields.length; i++) {
        exIndex.set(extractedFields[i].requirement.fieldName, i)
      }

      // Convert judge matches to index-based matches
      const matches = new Map<number, number>()
      const validJudgeMatches = []
      for (const m of judgeResult.matches) {
        const gtIdx = gtIndex.get(m.groundTruthFieldName)
        const exIdx = exIndex.get(m.extractedFieldName)
        if (gtIdx !== undefined && exIdx !== undefined) {
          matches.set(gtIdx, exIdx)
          validJudgeMatches.push(m)
        }
      }

      const { metrics, details } = calculateMetrics(
        groundTruthFields,
        extractedFields,
        matches,
      )

      return {
        fixture: '',
        metrics,
        details: {
          ...details,
          judgeMatches: validJudgeMatches,
          scorer: 'llm-judge',
        },
      }
    },

    summarize(cases: CaseMetrics[]): SummaryMetrics {
      if (cases.length === 0) return { metrics: {} }
      const metricKeys = new Set<string>()
      for (const c of cases) {
        for (const key of Object.keys(c.metrics)) metricKeys.add(key)
      }
      const metrics: Record<string, number> = {}
      for (const key of metricKeys) {
        let sum = 0
        let count = 0
        for (const c of cases) {
          if (key in c.metrics) { sum += c.metrics[key]; count++ }
        }
        metrics[key] = count > 0 ? sum / count : 0
      }
      return { metrics }
    },
  }
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/evaluation-judge-scoring.test.ts`
Expected: all 3 pass.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/evaluation/kinds/pdf-field-extraction-judge.ts test/evaluation-judge-scoring.test.ts
git commit -m "feat(evaluation): add LLM judge evaluation kind

Implements EvaluationKind using semantic field matching via a FieldJudge.
Converts judge matches to index-based format for shared metrics calculation.
Stores judge match details (confidence, reasoning) in results."
```

---

### Task 7: Wire LLM judge into CLI evaluate command

Add `--scorer` flag to `evaluate run` and `evaluate compare` so users can choose between deterministic and LLM judge scoring.

**Files:**
- Modify: `src/entrypoints/cli/commands/evaluate.ts`
- Modify: `src/services/evaluation/index.ts`

- [ ] **Step 1: Export the new kinds from the evaluation index**

Update `src/services/evaluation/index.ts` to add:

```typescript
export { createLlmJudgeKind } from './kinds/pdf-field-extraction-judge'
export { createBedrockFieldJudge, type FieldJudge } from './judge'
```

- [ ] **Step 2: Add --scorer flag to the CLI**

In `src/entrypoints/cli/commands/evaluate.ts`, modify the `run` case to accept `--scorer`:

After the existing `strategyId` parsing (around line 100), add:

```typescript
      const scorerIdx = args.indexOf('--scorer')
      const scorerType =
        scorerIdx !== -1 && args[scorerIdx + 1]
          ? args[scorerIdx + 1]
          : 'deterministic'

      if (scorerType !== 'deterministic' && scorerType !== 'llm-judge') {
        console.error(
          'Invalid scorer. Use: --scorer deterministic (default) or --scorer llm-judge',
        )
        return 1
      }
```

Then, before the `runEvaluation` call, select the appropriate kind:

```typescript
      let kind = pdfFieldExtractionKind
      if (scorerType === 'llm-judge') {
        const { createBedrockFieldJudge } = await import(
          '../../../services/evaluation/judge'
        )
        const { createLlmJudgeKind } = await import(
          '../../../services/evaluation/kinds/pdf-field-extraction-judge'
        )
        const { OPUS_MODEL_ID } = await import(
          '../../../services/extraction/models'
        )
        const judge = createBedrockFieldJudge(OPUS_MODEL_ID)
        kind = createLlmJudgeKind(judge)
        console.log('Using LLM judge (Opus) for semantic field matching')
      }
```

Pass `kind` to `runEvaluation` instead of the hardcoded `pdfFieldExtractionKind`.

Also update the `printUsage()` function to document the new flag:

```typescript
  console.log(
    '  run <strategy-id>      Run a strategy against the test suite',
  )
  console.log(
    '    --scorer <type>      Scoring method: deterministic (default) or llm-judge',
  )
```

Apply the same `--scorer` flag parsing to the `compare` case, passing it through to the recursive `evaluate(['run', s.id, ...scorerArgs])` call.

- [ ] **Step 3: Run full check**

Run: `bun run check`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/cli/commands/evaluate.ts src/services/evaluation/index.ts
git commit -m "feat(evaluation): add --scorer flag for LLM judge in CLI

evaluate run <strategy> --scorer llm-judge uses Opus to semantically
match fields. Defaults to deterministic for backwards compatibility."
```

---

### Task 8: Run evaluations and update results

Generate new LLM-judged evaluation results for all strategies and archive old deterministic results. This task requires active Bedrock credentials.

**Files:**
- Modify: `catalog/experiments/pdf-field-extraction/_suite.md`
- Modified by CLI: `catalog/experiments/pdf-field-extraction/*.json` and `*.md`

- [ ] **Step 1: Verify credentials**

Run: `bun run cli bedrock-credentials status`
Expected: credentials valid.

- [ ] **Step 2: Run LLM-judged evaluations**

```bash
bun run cli evaluate run opus-baseline --scorer llm-judge
bun run cli evaluate run sonnet --scorer llm-judge
bun run cli evaluate run haiku --scorer llm-judge
```

Review the output metrics. Expected: Haiku recall should be ~80% (vs 61% with deterministic), precision ~97% (vs 75%).

- [ ] **Step 3: Update the suite description**

In `catalog/experiments/pdf-field-extraction/_suite.md`, add a section describing the evaluation methodology:

```markdown
## Scoring Methods

### LLM Judge (primary)
Uses Claude Opus 4.6 to semantically match extracted fields against ground truth. Handles naming variations (synonyms, prefixes, word order) that deterministic matching misses.

### Deterministic (baseline)
Exact fieldName match + normalized label match. Fast and reproducible but systematically undercounts performance when models use different naming conventions than ground truth.
```

- [ ] **Step 4: Commit**

```bash
git add catalog/experiments/pdf-field-extraction/
git commit -m "feat(evaluation): run LLM-judged evaluations for all strategies

Opus judge produces accurate semantic matches. Results:
- Haiku: ~80% recall (was 61% with deterministic matching)
- Sonnet: ~30% recall (genuinely coarser extraction)
- Opus: 100% (baseline)

The delta between deterministic and LLM-judge scores demonstrates
the importance of evaluation methodology — a key course topic."
```

Note: actual numbers in the commit message should reflect the real output.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: all pass.

- [ ] **Step 6: Final commit if any cleanup needed**

---

## Verification

After all tasks are complete:

1. `bun run check` passes (lint + typecheck + all tests)
2. `bun run cli evaluate strategies` lists 3 strategies
3. `bun run cli evaluate run haiku` runs deterministic scoring (default)
4. `bun run cli evaluate run haiku --scorer llm-judge` runs LLM judge
5. Results in `catalog/experiments/pdf-field-extraction/haiku.json` show judge matches with confidence scores and reasoning
6. Deterministic scorer still works identically (no regression)
