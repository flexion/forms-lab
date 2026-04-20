# RAG-Powered Form Authoring Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an agent-guided pipeline that reads a policy corpus, proposes evaluation criteria, generates form structure and fields with regulatory citations, and auto-evaluates output before human review.

**Architecture:** New service at `src/services/form-authoring/` with four pipeline stages (criteria analysis, structure planning, section generation, auto-evaluation). Each stage is a single LLM call via Bedrock. The service produces shaping commands that integrate with the existing staged-changes UI. Corpus loading extends the existing RAG service with project-scoped `references/` support.

**Tech Stack:** Bun, Hono JSX, AI SDK (`generateText`/`generateObject`), AWS Bedrock (Sonnet for stages 1-3, Haiku for eval), Zod schemas, existing shaping command infrastructure.

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/services/form-authoring/types.ts` | `Criterion`, `CriteriaSet`, `SectionEvalResult`, `EvalResults`, `AuthoringStageConfig` types |
| `src/services/form-authoring/criteria.ts` | Criteria parsing, serialization, merge of human edits |
| `src/services/form-authoring/prompts.ts` | Prompt builders for each pipeline stage |
| `src/services/form-authoring/pipeline.ts` | Orchestrator: `analyzeCriteria`, `planStructure`, `generateSection`, `evaluateSection` |
| `src/services/form-authoring/evaluator.ts` | LLM-as-judge: scores criteria pass/fail/partial |
| `src/services/form-authoring/index.ts` | Public API exports |
| `src/entrypoints/app/routes/owner/edit/authoring.tsx` | Route handlers for pipeline endpoints (criteria CRUD, stage advancement, eval results) |
| `src/entrypoints/app/routes/owner/edit/authoring-components.tsx` | Server-rendered JSX: criteria editor, eval scorecard, stage indicator |
| `src/design-system/components/flex-criteria-editor/client.ts` | Client-side criteria list: add/edit/remove/approve interactions |
| `src/design-system/components/flex-criteria-editor/styles.css` | Criteria editor styling with design tokens |
| `src/design-system/components/flex-eval-scorecard/client.ts` | Client-side eval scorecard: expandable pass/fail criteria |
| `src/design-system/components/flex-eval-scorecard/styles.css` | Eval scorecard styling |
| `catalog/references/snap-wisconsin.md` | SNAP Wisconsin policy corpus (~10-15 chunks from 7 CFR 273) |
| `fixtures/snap-wisconsin/manifest.json` | SNAP fixture metadata |
| `fixtures/snap-wisconsin/ground-truth.json` | SNAP ground truth DataCollectionSpec |
| `test/form-authoring/types.test.ts` | Type and schema validation tests |
| `test/form-authoring/criteria.test.ts` | Criteria merge/serialize tests |
| `test/form-authoring/prompts.test.ts` | Prompt builder output tests |
| `test/form-authoring/pipeline.test.ts` | Pipeline orchestration tests (mocked LLM) |
| `test/form-authoring/evaluator.test.ts` | Evaluator scoring tests (mocked LLM) |
| `test/form-authoring/authoring-routes.test.ts` | Route handler tests |

### Modified files

| File | Change |
|------|--------|
| `src/services/rag/corpus.ts` | Add `projectDir` option to `loadPolicyCorpus` for project-scoped references |
| `src/services/rag/index.ts` | Re-export any new options |
| `src/entrypoints/app/routes/owner/edit/index.tsx` | Mount authoring sub-routes |
| `src/entrypoints/app/routes/owner/edit/components.tsx` | Add pipeline stage indicator to EditorPage |
| `src/design-system/register.ts` | Register new interactive components |
| `fixtures/index.ts` | Add SNAP fixture loader |

---

## Task 1: Types and Schemas

**Files:**
- Create: `src/services/form-authoring/types.ts`
- Test: `test/form-authoring/types.test.ts`

- [ ] **Step 1: Write the failing test for Criterion schema**

```typescript
// test/form-authoring/types.test.ts
import { describe, expect, test } from 'bun:test'
import { criterionSchema, criteriaSetSchema } from '../../src/services/form-authoring/types'

describe('Criterion schema', () => {
  test('accepts a valid criterion', () => {
    const result = criterionSchema.safeParse({
      id: 'exp-screening',
      text: 'Must screen for expedited processing per 7 CFR 273.2(i)',
      source: '7 CFR 273.2(i)',
      status: 'pending',
    })
    expect(result.success).toBe(true)
  })

  test('rejects missing text', () => {
    const result = criterionSchema.safeParse({
      id: 'exp-screening',
      source: '7 CFR 273.2(i)',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  test('rejects invalid status', () => {
    const result = criterionSchema.safeParse({
      id: 'exp-screening',
      text: 'Must screen',
      source: '7 CFR 273.2(i)',
      status: 'unknown',
    })
    expect(result.success).toBe(false)
  })
})

describe('CriteriaSet schema', () => {
  test('accepts a complete criteria set', () => {
    const result = criteriaSetSchema.safeParse({
      criteria: [
        {
          id: 'exp-screening',
          text: 'Must screen for expedited processing per 7 CFR 273.2(i)',
          source: '7 CFR 273.2(i)',
          status: 'approved',
        },
      ],
      approvedAt: '2026-04-19T12:00:00Z',
      approvedBy: 'testuser',
    })
    expect(result.success).toBe(true)
  })

  test('accepts unapproved criteria set', () => {
    const result = criteriaSetSchema.safeParse({
      criteria: [],
      approvedAt: null,
      approvedBy: null,
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write types and schemas**

```typescript
// src/services/form-authoring/types.ts
import { z } from 'zod'
import type { ProjectState } from '../forms/shaping/commands'
import type { PolicyChunk } from '../rag'

export const criterionStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'added',
])

export type CriterionStatus = z.infer<typeof criterionStatusSchema>

export const criterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  status: criterionStatusSchema,
})

export type Criterion = z.infer<typeof criterionSchema>

export const criteriaSetSchema = z.object({
  criteria: z.array(criterionSchema),
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
})

export type CriteriaSet = z.infer<typeof criteriaSetSchema>

export interface SectionEvalResult {
  criterionId: string
  pass: boolean
  explanation: string
  retry?: number
}

export interface EvalResults {
  sections: Record<
    string,
    {
      results: SectionEvalResult[]
      generatedAt: string
    }
  >
}

export interface AuthoringStageConfig {
  criteria: { modelId: string }
  structure: { modelId: string }
  generation: { modelId: string }
  evaluation: { modelId: string }
}

export type AuthoringStage =
  | 'criteria'
  | 'structure'
  | 'sections'
  | 'complete'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/form-authoring/types.ts test/form-authoring/types.test.ts
git commit -m "feat(form-authoring): add types and Zod schemas for authoring pipeline"
```

---

## Task 2: Criteria Helpers

**Files:**
- Create: `src/services/form-authoring/criteria.ts`
- Test: `test/form-authoring/criteria.test.ts`

- [ ] **Step 1: Write the failing test for criteria helpers**

```typescript
// test/form-authoring/criteria.test.ts
import { describe, expect, test } from 'bun:test'
import {
  emptyCriteriaSet,
  mergeCriteriaEdits,
  approveCriteriaSet,
  serializeCriteriaSet,
  parseCriteriaSet,
} from '../../src/services/form-authoring/criteria'
import type { CriteriaSet, Criterion } from '../../src/services/form-authoring/types'

describe('emptyCriteriaSet', () => {
  test('returns an empty unapproved set', () => {
    const set = emptyCriteriaSet()
    expect(set.criteria).toEqual([])
    expect(set.approvedAt).toBeNull()
    expect(set.approvedBy).toBeNull()
  })
})

describe('mergeCriteriaEdits', () => {
  const agentCriteria: Criterion[] = [
    { id: 'c1', text: 'Must collect SSN', source: '7 CFR 273.2', status: 'pending' },
    { id: 'c2', text: 'Must verify identity', source: '7 CFR 273.2(b)', status: 'pending' },
  ]

  test('approves specified criteria', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      { approve: ['c1'], reject: [], add: [], edit: [] },
    )
    expect(result.criteria[0].status).toBe('approved')
    expect(result.criteria[1].status).toBe('pending')
  })

  test('rejects specified criteria', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      { approve: [], reject: ['c2'], add: [], edit: [] },
    )
    expect(result.criteria[1].status).toBe('rejected')
  })

  test('adds new human criteria', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      {
        approve: [],
        reject: [],
        add: [{ text: 'Must include work registration', source: '7 CFR 273.7' }],
        edit: [],
      },
    )
    expect(result.criteria).toHaveLength(3)
    expect(result.criteria[2].status).toBe('added')
    expect(result.criteria[2].text).toBe('Must include work registration')
  })

  test('edits existing criteria text', () => {
    const result = mergeCriteriaEdits(
      { criteria: agentCriteria, approvedAt: null, approvedBy: null },
      {
        approve: [],
        reject: [],
        add: [],
        edit: [{ id: 'c1', text: 'Must collect SSN (last 4 digits)', source: '7 CFR 273.2' }],
      },
    )
    expect(result.criteria[0].text).toBe('Must collect SSN (last 4 digits)')
  })
})

describe('approveCriteriaSet', () => {
  test('sets approvedAt and approvedBy, marks all pending as approved', () => {
    const set: CriteriaSet = {
      criteria: [
        { id: 'c1', text: 'Test', source: 'CFR', status: 'pending' },
        { id: 'c2', text: 'Test2', source: 'CFR', status: 'added' },
        { id: 'c3', text: 'Test3', source: 'CFR', status: 'rejected' },
      ],
      approvedAt: null,
      approvedBy: null,
    }
    const result = approveCriteriaSet(set, 'testuser')
    expect(result.approvedBy).toBe('testuser')
    expect(result.approvedAt).toBeTruthy()
    expect(result.criteria[0].status).toBe('approved')
    expect(result.criteria[1].status).toBe('added')
    expect(result.criteria[2].status).toBe('rejected')
  })
})

describe('serialize/parse round-trip', () => {
  test('round-trips a criteria set through JSON', () => {
    const set: CriteriaSet = {
      criteria: [
        { id: 'c1', text: 'Must collect SSN', source: '7 CFR 273.2', status: 'approved' },
      ],
      approvedAt: '2026-04-19T12:00:00Z',
      approvedBy: 'testuser',
    }
    const json = serializeCriteriaSet(set)
    const parsed = parseCriteriaSet(json)
    expect(parsed).toEqual(set)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/criteria.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write criteria helpers**

```typescript
// src/services/form-authoring/criteria.ts
import { criteriaSetSchema, type CriteriaSet, type Criterion } from './types'

export function emptyCriteriaSet(): CriteriaSet {
  return { criteria: [], approvedAt: null, approvedBy: null }
}

export interface CriteriaEdits {
  approve: string[]
  reject: string[]
  add: Array<{ text: string; source: string }>
  edit: Array<{ id: string; text: string; source: string }>
}

let nextId = 0
function generateCriterionId(): string {
  return `criterion-${Date.now()}-${++nextId}`
}

export function mergeCriteriaEdits(
  set: CriteriaSet,
  edits: CriteriaEdits,
): CriteriaSet {
  const criteria = set.criteria.map((c): Criterion => {
    if (edits.approve.includes(c.id)) return { ...c, status: 'approved' }
    if (edits.reject.includes(c.id)) return { ...c, status: 'rejected' }
    const edited = edits.edit.find((e) => e.id === c.id)
    if (edited) return { ...c, text: edited.text, source: edited.source }
    return c
  })

  for (const added of edits.add) {
    criteria.push({
      id: generateCriterionId(),
      text: added.text,
      source: added.source,
      status: 'added',
    })
  }

  return { ...set, criteria }
}

export function approveCriteriaSet(
  set: CriteriaSet,
  username: string,
): CriteriaSet {
  return {
    criteria: set.criteria.map((c) =>
      c.status === 'pending' ? { ...c, status: 'approved' } : c,
    ),
    approvedAt: new Date().toISOString(),
    approvedBy: username,
  }
}

export function serializeCriteriaSet(set: CriteriaSet): string {
  return JSON.stringify(set, null, 2)
}

export function parseCriteriaSet(json: string): CriteriaSet {
  return criteriaSetSchema.parse(JSON.parse(json))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/criteria.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/form-authoring/criteria.ts test/form-authoring/criteria.test.ts
git commit -m "feat(form-authoring): add criteria set helpers (merge, approve, serialize)"
```

---

## Task 3: SNAP Wisconsin Policy Corpus

**Files:**
- Create: `catalog/references/snap-wisconsin.md`

- [ ] **Step 1: Write the failing test for corpus loading**

```typescript
// test/form-authoring/snap-corpus.test.ts
import { describe, expect, test } from 'bun:test'
import { loadPolicyCorpus } from '../../src/services/rag'

describe('SNAP Wisconsin corpus', () => {
  test('loads snap-wisconsin chunks', () => {
    const chunks = loadPolicyCorpus({ slug: 'snap-wisconsin' })
    expect(chunks.length).toBeGreaterThanOrEqual(8)
    expect(chunks.every((c) => c.formSlug === 'snap-wisconsin')).toBe(true)
  })

  test('each chunk has a regulatory source citation', () => {
    const chunks = loadPolicyCorpus({ slug: 'snap-wisconsin' })
    for (const chunk of chunks) {
      expect(chunk.source).toBeTruthy()
      expect(chunk.text.length).toBeGreaterThan(50)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/snap-corpus.test.ts`
Expected: FAIL — no chunks loaded (snap-wisconsin not in CORPUS_FILES)

- [ ] **Step 3: Add snap-wisconsin.md corpus file and update corpus loader**

Create `catalog/references/snap-wisconsin.md` with frontmatter and 10-15 sections covering:
- Eligibility categories (7 CFR 273.1-273.4)
- Expedited processing (7 CFR 273.2(i))
- Income: earned vs unearned (7 CFR 273.9(b))
- Resources and BBCE exclusions (7 CFR 273.8)
- Household composition (7 CFR 273.1(b))
- Citizenship/immigration (7 CFR 273.4)
- Work requirements with WI ABAWD waiver (7 CFR 273.7)
- Rights and responsibilities
- Certification/signature
- Authorized representatives (7 CFR 273.2(n))

Format each section as:

```markdown
---
status: stable
formSlug: snap-wisconsin
title: Wisconsin SNAP Application (7 CFR 273)
source: 7 CFR 273 — Supplemental Nutrition Assistance Program
---

# SNAP Wisconsin — Policy Excerpts

Regulatory excerpts from 7 CFR 273 governing SNAP eligibility
determination, application processing, and benefit calculation
as implemented by Wisconsin DHS.

## Section — 7 CFR 273.2(a) (Application filing and processing)

<verbatim regulatory text about application filing requirements>

## Section — 7 CFR 273.2(i) (Expedited service screening)

<verbatim regulatory text about expedited processing criteria>
```

Then update the corpus loader to include snap-wisconsin:

```typescript
// In src/services/rag/corpus.ts, add to CORPUS_FILES:
const CORPUS_FILES: Array<{ path: string }> = [
  { path: 'pardon-application.md' },
  { path: 'i-9.md' },
  { path: 'w-9.md' },
  { path: 'snap-wisconsin.md' },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/snap-corpus.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add catalog/references/snap-wisconsin.md src/services/rag/corpus.ts test/form-authoring/snap-corpus.test.ts
git commit -m "feat(rag): add SNAP Wisconsin policy corpus (7 CFR 273, 10+ sections)"
```

---

## Task 4: Project-Scoped Corpus Loading

**Files:**
- Modify: `src/services/rag/corpus.ts`
- Modify: `src/services/rag/index.ts`
- Test: `test/form-authoring/project-corpus.test.ts`

- [ ] **Step 1: Write the failing test for project-scoped loading**

```typescript
// test/form-authoring/project-corpus.test.ts
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadPolicyCorpus } from '../../src/services/rag'

describe('project-scoped corpus loading', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'project-corpus-'))
    mkdirSync(join(tempDir, 'references'), { recursive: true })
    writeFileSync(
      join(tempDir, 'references', 'local-policy.md'),
      `---
formSlug: local-test
title: Local Test Policy
source: Test Source
---

## Section — Test 1.1 (First section)

This is the first test section of local policy.

## Section — Test 1.2 (Second section)

This is the second test section of local policy.
`,
    )
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('loads chunks from projectDir references/', () => {
    const chunks = loadPolicyCorpus({ projectDir: tempDir })
    expect(chunks.length).toBe(2)
    expect(chunks[0].formSlug).toBe('local-test')
    expect(chunks[0].source).toBe('Test 1.1 (First section)')
  })

  test('combines catalog and project corpus', () => {
    const chunks = loadPolicyCorpus({ projectDir: tempDir })
    const catalogChunks = loadPolicyCorpus()
    // Project chunks should be returned (catalog chunks are separate)
    expect(chunks.length).toBe(2)
    expect(catalogChunks.length).toBeGreaterThan(0)
  })

  test('returns empty array when projectDir has no references/', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'empty-project-'))
    const chunks = loadPolicyCorpus({ projectDir: emptyDir })
    expect(chunks).toEqual([])
    rmSync(emptyDir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/project-corpus.test.ts`
Expected: FAIL — `projectDir` option not recognized

- [ ] **Step 3: Extend corpus loader with projectDir support**

Update `src/services/rag/corpus.ts`:

Add `projectDir` to `LoadPolicyCorpusOptions`. When `projectDir` is set, scan `{projectDir}/references/*.md` for corpus files instead of using the hardcoded `CORPUS_FILES` list. Use `readdirSync` to discover files dynamically.

```typescript
export interface LoadPolicyCorpusOptions {
  slug?: string
  baseDir?: string
  projectDir?: string
}

export function loadPolicyCorpus(
  options: LoadPolicyCorpusOptions = {},
): PolicyChunk[] {
  if (options.projectDir) {
    return loadProjectCorpus(options.projectDir, options.slug)
  }

  const baseDir =
    options.baseDir ?? join(process.cwd(), 'catalog', 'references')
  // ... existing catalog loading logic unchanged ...
}
```

Add a `loadProjectCorpus` function that reads `{projectDir}/references/*.md`, parsing each with the same `parseFrontmatter`/`parseSections` logic. Return empty array if the directory doesn't exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/project-corpus.test.ts`
Expected: PASS

- [ ] **Step 5: Verify existing corpus tests still pass**

Run: `bun test test/form-authoring/snap-corpus.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/rag/corpus.ts test/form-authoring/project-corpus.test.ts
git commit -m "feat(rag): support project-scoped corpus loading via projectDir option"
```

---

## Task 5: Prompt Builders

**Files:**
- Create: `src/services/form-authoring/prompts.ts`
- Test: `test/form-authoring/prompts.test.ts`

- [ ] **Step 1: Write the failing test for prompt builders**

```typescript
// test/form-authoring/prompts.test.ts
import { describe, expect, test } from 'bun:test'
import {
  buildCriteriaPrompt,
  buildStructurePrompt,
  buildSectionPrompt,
  buildEvalPrompt,
} from '../../src/services/form-authoring/prompts'
import type { PolicyChunk } from '../../src/services/rag'
import type { Criterion } from '../../src/services/form-authoring/types'

const sampleChunks: PolicyChunk[] = [
  {
    id: 'snap/1',
    source: '7 CFR 273.2(i)',
    title: 'SNAP Wisconsin',
    text: 'Expedited service must be provided within 7 days.',
    formSlug: 'snap-wisconsin',
  },
  {
    id: 'snap/2',
    source: '7 CFR 273.9(b)',
    title: 'SNAP Wisconsin',
    text: 'Income includes earned and unearned categories.',
    formSlug: 'snap-wisconsin',
  },
]

const sampleCriteria: Criterion[] = [
  {
    id: 'c1',
    text: 'Must screen for expedited processing',
    source: '7 CFR 273.2(i)',
    status: 'approved',
  },
]

describe('buildCriteriaPrompt', () => {
  test('includes all corpus text', () => {
    const prompt = buildCriteriaPrompt(sampleChunks)
    expect(prompt).toContain('7 CFR 273.2(i)')
    expect(prompt).toContain('Expedited service must be provided')
    expect(prompt).toContain('7 CFR 273.9(b)')
  })

  test('instructs agent to produce criteria with citations', () => {
    const prompt = buildCriteriaPrompt(sampleChunks)
    expect(prompt).toContain('criteria')
    expect(prompt).toContain('citation')
  })
})

describe('buildStructurePrompt', () => {
  test('includes criteria and corpus', () => {
    const prompt = buildStructurePrompt(sampleCriteria, sampleChunks, null)
    expect(prompt).toContain('Must screen for expedited processing')
    expect(prompt).toContain('7 CFR 273.2(i)')
  })

  test('includes current state when provided', () => {
    const state = {
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      dataSpec: { id: 's1', title: 'Test', description: '', groups: [] },
    }
    const prompt = buildStructurePrompt(sampleCriteria, sampleChunks, state)
    expect(prompt).toContain('Current form state')
  })
})

describe('buildSectionPrompt', () => {
  test('includes group context and scoped corpus', () => {
    const prompt = buildSectionPrompt(
      'income-group',
      'Income Information',
      sampleCriteria,
      sampleChunks,
    )
    expect(prompt).toContain('income-group')
    expect(prompt).toContain('Income Information')
  })
})

describe('buildEvalPrompt', () => {
  test('includes criteria and current form state', () => {
    const state = {
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      dataSpec: { id: 's1', title: 'Test', description: '', groups: [] },
    }
    const prompt = buildEvalPrompt('income-group', state, sampleCriteria, sampleChunks)
    expect(prompt).toContain('income-group')
    expect(prompt).toContain('pass')
    expect(prompt).toContain('fail')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/prompts.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write prompt builders**

```typescript
// src/services/form-authoring/prompts.ts
import type { ProjectState } from '../forms/shaping/commands'
import type { PolicyChunk } from '../rag'
import type { Criterion } from './types'

function formatCorpus(chunks: PolicyChunk[]): string {
  return chunks
    .map((c) => `### ${c.source}\n\n${c.text}`)
    .join('\n\n')
}

function formatCriteria(criteria: Criterion[]): string {
  return criteria
    .filter((c) => c.status === 'approved' || c.status === 'added')
    .map((c) => `- [${c.id}] ${c.text} (${c.source})`)
    .join('\n')
}

function formatState(state: ProjectState): string {
  const groups = state.dataSpec.groups.map((g) => ({
    id: g.id,
    title: g.title,
    fields: g.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      type: r.fieldType,
    })),
  }))
  return `## Current FormSpec\n${JSON.stringify(state.formSpec, null, 2)}\n\n## Current groups and fields\n${JSON.stringify(groups, null, 2)}`
}

export function buildCriteriaPrompt(corpus: PolicyChunk[]): string {
  return `You are a regulatory compliance analyst. Given the following policy corpus, identify the criteria a compliant application form must satisfy. Each criterion should be a clear English sentence with a specific regulatory citation.

## Policy Corpus

${formatCorpus(corpus)}

## Instructions

Analyze the corpus and produce a list of criteria. Each criterion must:
1. State what the form must collect or verify
2. Include a specific regulatory citation (e.g., "7 CFR 273.2(i)")
3. Be independently verifiable against a completed form

Return criteria as a JSON array. Each item has: id (kebab-case slug), text (the requirement), source (the citation).`
}

export function buildStructurePrompt(
  criteria: Criterion[],
  corpus: PolicyChunk[],
  state: ProjectState | null,
): string {
  const stateSection = state
    ? `\n\n## Current form state\n${formatState(state)}\n\nBuild on this existing structure.`
    : '\n\nStart from an empty form.'

  return `You are a form design assistant building a government benefits application form. Using the approved evaluation criteria and policy corpus, propose the page and group structure.

## Approved Criteria

${formatCriteria(criteria)}

## Policy Corpus

${formatCorpus(corpus)}
${stateSection}

## Instructions

Propose addPage and addGroup commands to create the form skeleton. Each page should correspond to a logical section of the application (e.g., "Household Composition", "Income Information"). Each group within a page should correspond to a cohesive set of related fields.

Call the addPage and addGroup tools. For each command, explain in your response which criteria it addresses and cite the relevant regulation.`
}

export function buildSectionPrompt(
  groupId: string,
  groupTitle: string,
  criteria: Criterion[],
  scopedCorpus: PolicyChunk[],
): string {
  return `You are a form design assistant. Generate the fields for the "${groupTitle}" section (group id: ${groupId}).

## Relevant Criteria

${formatCriteria(criteria)}

## Relevant Policy

${formatCorpus(scopedCorpus)}

## Instructions

Propose addField, setFieldSensitivity, setFieldCondition, and relabelField commands to populate this section. Each field should:
1. Have a clear, user-friendly label
2. Use the appropriate field type (text, date, boolean, choice, number, etc.)
3. Be marked required or optional per regulation
4. Have sensitivity set for PII fields (SSN, DOB, etc.)

Call the appropriate tools. Cite the regulation that requires each field.`
}

export function buildEvalPrompt(
  groupId: string,
  state: ProjectState,
  criteria: Criterion[],
  corpus: PolicyChunk[],
): string {
  return `You are an evaluation judge assessing whether a form section meets regulatory criteria. Evaluate the "${groupId}" section of the form.

## Form State

${formatState(state)}

## Criteria to Evaluate

${formatCriteria(criteria)}

## Policy Corpus

${formatCorpus(corpus)}

## Instructions

For each criterion that is relevant to this section, score it as:
- **pass**: The form section fully satisfies this criterion
- **fail**: The form section is missing required elements for this criterion
- **partial**: The form section partially addresses this criterion

Return a JSON array of results. Each item has: criterionId, pass (boolean — true for pass, false for fail/partial), explanation (one sentence).`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/prompts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/form-authoring/prompts.ts test/form-authoring/prompts.test.ts
git commit -m "feat(form-authoring): add prompt builders for all four pipeline stages"
```

---

## Task 6: Pipeline Orchestrator (Stages 1-3)

**Files:**
- Create: `src/services/form-authoring/pipeline.ts`
- Test: `test/form-authoring/pipeline.test.ts`

- [ ] **Step 1: Write the failing test for analyzeCriteria**

```typescript
// test/form-authoring/pipeline.test.ts
import { describe, expect, mock, test, beforeEach } from 'bun:test'
import type { PolicyChunk } from '../../src/services/rag'
import type { Criterion } from '../../src/services/form-authoring/types'

// We mock the `ai` module to intercept generateText and generateObject calls.
const mockGenerateObject = mock()

mock.module('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mock(),
}))

// Mock bedrock provider
mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => (model: string) => ({ modelId: model })),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  fromIni: mock(() => ({})),
  fromNodeProviderChain: mock(() => ({})),
}))

const { createAuthoringPipeline } = await import(
  '../../src/services/form-authoring/pipeline'
)

const sampleChunks: PolicyChunk[] = [
  {
    id: 'snap/1',
    source: '7 CFR 273.2(i)',
    title: 'SNAP',
    text: 'Expedited service screening criteria.',
    formSlug: 'snap-wisconsin',
  },
]

describe('analyzeCriteria', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
  })

  test('returns criteria from LLM response', async () => {
    const expectedCriteria: Criterion[] = [
      {
        id: 'exp-screening',
        text: 'Must screen for expedited processing',
        source: '7 CFR 273.2(i)',
        status: 'pending',
      },
    ]

    mockGenerateObject.mockResolvedValueOnce({
      object: expectedCriteria.map(({ status, ...rest }) => rest),
    })

    const pipeline = createAuthoringPipeline()
    const result = await pipeline.analyzeCriteria(sampleChunks)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('exp-screening')
    expect(result[0].status).toBe('pending')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/pipeline.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the pipeline orchestrator**

```typescript
// src/services/form-authoring/pipeline.ts
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import type { Command, ProjectState } from '../forms/shaping/commands'
import { commandTools } from '../forms/shaping/tools'
import type { PolicyChunk } from '../rag'
import { HAIKU_MODEL_ID, SONNET_MODEL_ID } from '../extraction'
import {
  buildCriteriaPrompt,
  buildStructurePrompt,
  buildSectionPrompt,
} from './prompts'
import type {
  AuthoringStageConfig,
  Criterion,
  SectionEvalResult,
} from './types'

const DEFAULT_CONFIG: AuthoringStageConfig = {
  criteria: { modelId: SONNET_MODEL_ID },
  structure: { modelId: SONNET_MODEL_ID },
  generation: { modelId: SONNET_MODEL_ID },
  evaluation: { modelId: HAIKU_MODEL_ID },
}

export interface AuthoringPipeline {
  analyzeCriteria(corpus: PolicyChunk[]): Promise<Criterion[]>
  planStructure(
    criteria: Criterion[],
    corpus: PolicyChunk[],
    state: ProjectState | null,
  ): Promise<{ commands: Command[]; explanation: string }>
  generateSection(
    groupId: string,
    groupTitle: string,
    criteria: Criterion[],
    scopedCorpus: PolicyChunk[],
  ): Promise<{ commands: Command[]; explanation: string }>
}

export function createAuthoringPipeline(
  config?: Partial<AuthoringStageConfig>,
): AuthoringPipeline {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  const criterionResultSchema = z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      source: z.string(),
    }),
  )

  return {
    async analyzeCriteria(corpus) {
      const response = await generateObject({
        model: bedrock(cfg.criteria.modelId),
        schema: criterionResultSchema,
        temperature: 0,
        messages: [{ role: 'user', content: buildCriteriaPrompt(corpus) }],
      })
      return response.object.map((c) => ({
        ...c,
        status: 'pending' as const,
      }))
    },

    async planStructure(criteria, corpus, state) {
      const response = await generateText({
        model: bedrock(cfg.structure.modelId),
        tools: commandTools,
        temperature: 0,
        messages: [
          { role: 'user', content: buildStructurePrompt(criteria, corpus, state) },
        ],
      })
      const commands: Command[] = (response.toolCalls ?? []).map((call) => ({
        kind: call.toolName,
        ...(call.input as object),
      })) as Command[]
      const explanation =
        (response.text ?? '').trim() || 'Proposed form structure.'
      return { commands, explanation }
    },

    async generateSection(groupId, groupTitle, criteria, scopedCorpus) {
      const response = await generateText({
        model: bedrock(cfg.generation.modelId),
        tools: commandTools,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: buildSectionPrompt(
              groupId,
              groupTitle,
              criteria,
              scopedCorpus,
            ),
          },
        ],
      })
      const commands: Command[] = (response.toolCalls ?? []).map((call) => ({
        kind: call.toolName,
        ...(call.input as object),
      })) as Command[]
      const explanation =
        (response.text ?? '').trim() || `Generated fields for ${groupTitle}.`
      return { commands, explanation }
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Add tests for planStructure and generateSection**

Add to `test/form-authoring/pipeline.test.ts`:

```typescript
// Add at module scope alongside earlier mocks:
const mockGenerateText = mock()
mock.module('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
}))

describe('planStructure', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
  })

  test('returns commands from tool calls', async () => {
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        { toolName: 'addPage', input: { title: 'Household Info' } },
        {
          toolName: 'addGroup',
          input: { pageId: 'page-new-abc', title: 'Members' },
        },
      ],
      text: 'Created household section.',
    })

    const pipeline = createAuthoringPipeline()
    const result = await pipeline.planStructure(
      [
        {
          id: 'c1',
          text: 'Collect household composition',
          source: '7 CFR 273.1(b)',
          status: 'approved',
        },
      ],
      sampleChunks,
      null,
    )
    expect(result.commands).toHaveLength(2)
    expect(result.commands[0].kind).toBe('addPage')
    expect(result.explanation).toBe('Created household section.')
  })
})

describe('generateSection', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
  })

  test('returns field commands for a group', async () => {
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        {
          toolName: 'addField',
          input: {
            groupId: 'income-group',
            label: 'Monthly earned income',
            fieldType: 'currency',
            required: true,
          },
        },
      ],
      text: 'Added income field.',
    })

    const pipeline = createAuthoringPipeline()
    const result = await pipeline.generateSection(
      'income-group',
      'Income Information',
      [],
      sampleChunks,
    )
    expect(result.commands).toHaveLength(1)
    expect(result.commands[0].kind).toBe('addField')
  })
})
```

- [ ] **Step 6: Run all pipeline tests**

Run: `bun test test/form-authoring/pipeline.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/services/form-authoring/pipeline.ts test/form-authoring/pipeline.test.ts
git commit -m "feat(form-authoring): add pipeline orchestrator (analyzeCriteria, planStructure, generateSection)"
```

---

## Task 7: Auto-Evaluator (Stage 4)

**Files:**
- Create: `src/services/form-authoring/evaluator.ts`
- Test: `test/form-authoring/evaluator.test.ts`

- [ ] **Step 1: Write the failing test for evaluateSection**

```typescript
// test/form-authoring/evaluator.test.ts
import { describe, expect, mock, test, beforeEach } from 'bun:test'
import type { Criterion } from '../../src/services/form-authoring/types'

const mockGenerateObject = mock()

mock.module('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mock(),
}))

mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => (model: string) => ({ modelId: model })),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  fromIni: mock(() => ({})),
  fromNodeProviderChain: mock(() => ({})),
}))

const { createAuthoringEvaluator } = await import(
  '../../src/services/form-authoring/evaluator'
)

const sampleState = {
  formSpec: {
    id: 'f1',
    specId: 's1',
    title: 'SNAP Application',
    pages: [{ id: 'p1', title: 'Income', groups: ['income-group'] }],
  },
  dataSpec: {
    id: 's1',
    title: 'SNAP',
    description: '',
    groups: [
      {
        id: 'income-group',
        title: 'Income Information',
        requirements: [
          { id: 'f1', label: 'Monthly earned income', fieldType: 'currency', required: true },
        ],
      },
    ],
  },
}

const criteria: Criterion[] = [
  {
    id: 'income-types',
    text: 'Must distinguish earned vs unearned income',
    source: '7 CFR 273.9(b)',
    status: 'approved',
  },
]

describe('evaluateSection', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
  })

  test('returns pass/fail results per criterion', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        {
          criterionId: 'income-types',
          pass: false,
          explanation: 'Missing unearned income distinction',
        },
      ],
    })

    const evaluator = createAuthoringEvaluator()
    const result = await evaluator.evaluateSection(
      'income-group',
      sampleState,
      criteria,
      [],
    )
    expect(result).toHaveLength(1)
    expect(result[0].pass).toBe(false)
    expect(result[0].criterionId).toBe('income-types')
  })

  test('returns empty array when no criteria are relevant', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: [],
    })

    const evaluator = createAuthoringEvaluator()
    const result = await evaluator.evaluateSection(
      'income-group',
      sampleState,
      [],
      [],
    )
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/evaluator.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the evaluator**

```typescript
// src/services/form-authoring/evaluator.ts
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { ProjectState } from '../forms/shaping/commands'
import type { PolicyChunk } from '../rag'
import { HAIKU_MODEL_ID } from '../extraction'
import { buildEvalPrompt } from './prompts'
import type { SectionEvalResult } from './types'

export interface AuthoringEvaluator {
  evaluateSection(
    groupId: string,
    state: ProjectState,
    criteria: Criterion[],
    corpus: PolicyChunk[],
  ): Promise<SectionEvalResult[]>
}

import type { Criterion } from './types'

const evalResultSchema = z.array(
  z.object({
    criterionId: z.string(),
    pass: z.boolean(),
    explanation: z.string(),
  }),
)

export function createAuthoringEvaluator(
  modelId?: string,
): AuthoringEvaluator {
  const model = modelId ?? HAIKU_MODEL_ID
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async evaluateSection(groupId, state, criteria, corpus) {
      if (criteria.length === 0) return []

      const response = await generateObject({
        model: bedrock(model),
        schema: evalResultSchema,
        temperature: 0,
        messages: [
          { role: 'user', content: buildEvalPrompt(groupId, state, criteria, corpus) },
        ],
      })
      return response.object
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/evaluator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/form-authoring/evaluator.ts test/form-authoring/evaluator.test.ts
git commit -m "feat(form-authoring): add LLM-as-judge evaluator for section criteria scoring"
```

---

## Task 8: Service Public API

**Files:**
- Create: `src/services/form-authoring/index.ts`

- [ ] **Step 1: Write the index barrel export**

```typescript
// src/services/form-authoring/index.ts
export {
  type CriteriaEdits,
  approveCriteriaSet,
  emptyCriteriaSet,
  mergeCriteriaEdits,
  parseCriteriaSet,
  serializeCriteriaSet,
} from './criteria'
export { createAuthoringEvaluator, type AuthoringEvaluator } from './evaluator'
export { createAuthoringPipeline, type AuthoringPipeline } from './pipeline'
export type {
  AuthoringStage,
  AuthoringStageConfig,
  Criterion,
  CriteriaSet,
  CriterionStatus,
  EvalResults,
  SectionEvalResult,
} from './types'
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `bun test test/form-authoring/`
Expected: All PASS

- [ ] **Step 3: Run full check**

Run: `bun run check`
Expected: PASS (lint + types + tests)

- [ ] **Step 4: Commit**

```bash
git add src/services/form-authoring/index.ts
git commit -m "feat(form-authoring): add public API barrel export"
```

---

## Task 9: SNAP Fixture

**Files:**
- Create: `fixtures/snap-wisconsin/manifest.json`
- Create: `fixtures/snap-wisconsin/ground-truth.json`
- Modify: `fixtures/index.ts`

- [ ] **Step 1: Write the failing test for fixture loading**

```typescript
// test/form-authoring/snap-fixture.test.ts
import { describe, expect, test } from 'bun:test'
import { loadFixtureForEvaluation, loadAllFixturesForEvaluation } from '../../fixtures'

describe('SNAP Wisconsin fixture', () => {
  test('loads via loadFixtureForEvaluation', () => {
    const fixture = loadFixtureForEvaluation('snap-wisconsin')
    expect(fixture).toBeTruthy()
    expect(fixture.slug).toBe('snap-wisconsin')
    expect(fixture.groundTruth.groups.length).toBeGreaterThanOrEqual(6)
  })

  test('appears in loadAllFixturesForEvaluation', () => {
    const all = loadAllFixturesForEvaluation()
    const snap = all.find((f) => f.slug === 'snap-wisconsin')
    expect(snap).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/snap-fixture.test.ts`
Expected: FAIL — fixture not found

- [ ] **Step 3: Create SNAP fixture manifest**

```json
// fixtures/snap-wisconsin/manifest.json
{
  "name": "Wisconsin SNAP Application (FoodShare Wisconsin)",
  "specVersion": "2026-04-19",
  "groundTruthModel": "manual",
  "reviewed": true,
  "notes": "Manual ground truth for RAG authoring pipeline evaluation. 6+ pages, 10+ groups, 50+ fields covering SNAP eligibility per 7 CFR 273."
}
```

- [ ] **Step 4: Create SNAP ground truth**

Create `fixtures/snap-wisconsin/ground-truth.json` with a DataCollectionSpec containing:
- 6+ pages: Applicant Information, Household Composition, Income, Resources, Expenses, Rights & Signature
- 10+ groups covering all major SNAP application sections
- 50+ fields with appropriate types, required flags, and sensitivity labels
- Groups and fields drawn from 7 CFR 273 requirements

Structure follows existing fixture format (see `fixtures/i-9/ground-truth.json` for reference).

- [ ] **Step 5: Update fixtures/index.ts to include SNAP**

Check current `fixtures/index.ts` and add `snap-wisconsin` to the fixture list. The fixture does not have a PDF (this is a corpus-only fixture), so handle the case where `loadFixturePdf` would be called on a fixture with no PDF. The simplest approach: the existing `loadFixtureForEvaluation` should work if the directory has `manifest.json` and `ground-truth.json`. If it requires a PDF, make the PDF field optional or provide an empty buffer.

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test test/form-authoring/snap-fixture.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add fixtures/snap-wisconsin/ fixtures/index.ts test/form-authoring/snap-fixture.test.ts
git commit -m "feat(fixtures): add SNAP Wisconsin ground truth fixture (6 pages, 10 groups, 50+ fields)"
```

---

## Task 10: Pipeline Stage Detection

The design spec says pipeline stage is derived from artifact presence in git (no stored state). This task adds a helper that reads a project's git repo and returns which authoring stage the project is in.

**Files:**
- Modify: `src/services/form-authoring/pipeline.ts` (add `detectStage` helper)
- Test: `test/form-authoring/pipeline.test.ts` (add stage detection tests)

- [ ] **Step 1: Write the failing test for detectStage**

Add to `test/form-authoring/pipeline.test.ts`:

```typescript
import { detectAuthoringStage } from '../../src/services/form-authoring/pipeline'
import type { AuthoringStage } from '../../src/services/form-authoring/types'

describe('detectAuthoringStage', () => {
  test('returns "criteria" when no artifacts exist', () => {
    const stage = detectAuthoringStage({
      hasCriteria: false,
      criteriaApproved: false,
      hasPages: false,
      uncoveredGroupCount: 0,
    })
    expect(stage).toBe('criteria')
  })

  test('returns "criteria" when criteria exist but are unapproved', () => {
    const stage = detectAuthoringStage({
      hasCriteria: true,
      criteriaApproved: false,
      hasPages: false,
      uncoveredGroupCount: 0,
    })
    expect(stage).toBe('criteria')
  })

  test('returns "structure" when criteria approved but no pages', () => {
    const stage = detectAuthoringStage({
      hasCriteria: true,
      criteriaApproved: true,
      hasPages: false,
      uncoveredGroupCount: 0,
    })
    expect(stage).toBe('structure')
  })

  test('returns "sections" when pages exist with uncovered groups', () => {
    const stage = detectAuthoringStage({
      hasCriteria: true,
      criteriaApproved: true,
      hasPages: true,
      uncoveredGroupCount: 3,
    })
    expect(stage).toBe('sections')
  })

  test('returns "complete" when all groups are covered', () => {
    const stage = detectAuthoringStage({
      hasCriteria: true,
      criteriaApproved: true,
      hasPages: true,
      uncoveredGroupCount: 0,
    })
    expect(stage).toBe('complete')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/pipeline.test.ts`
Expected: FAIL — `detectAuthoringStage` not found

- [ ] **Step 3: Write detectAuthoringStage**

Add to `src/services/form-authoring/pipeline.ts`:

```typescript
export interface StageDetectionInput {
  hasCriteria: boolean
  criteriaApproved: boolean
  hasPages: boolean
  uncoveredGroupCount: number
}

export function detectAuthoringStage(
  input: StageDetectionInput,
): AuthoringStage {
  if (!input.hasCriteria || !input.criteriaApproved) return 'criteria'
  if (!input.hasPages) return 'structure'
  if (input.uncoveredGroupCount > 0) return 'sections'
  return 'complete'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Export from index.ts**

Update `src/services/form-authoring/index.ts` to add:

```typescript
export { detectAuthoringStage, type StageDetectionInput } from './pipeline'
```

- [ ] **Step 6: Commit**

```bash
git add src/services/form-authoring/pipeline.ts src/services/form-authoring/index.ts test/form-authoring/pipeline.test.ts
git commit -m "feat(form-authoring): add pipeline stage detection from artifact presence"
```

---

## Task 11: Authoring Route Handlers

**Files:**
- Create: `src/entrypoints/app/routes/owner/edit/authoring.tsx`
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`
- Test: `test/form-authoring/authoring-routes.test.ts`

- [ ] **Step 1: Write the failing test for route handlers**

```typescript
// test/form-authoring/authoring-routes.test.ts
import { describe, expect, mock, test, beforeEach } from 'bun:test'

const mockAnalyzeCriteria = mock()
const mockPlanStructure = mock()
const mockGenerateSection = mock()
const mockEvaluateSection = mock()

mock.module('ai', () => ({
  generateObject: mock(),
  generateText: mock(),
}))

mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => (model: string) => ({ modelId: model })),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  fromIni: mock(() => ({})),
  fromNodeProviderChain: mock(() => ({})),
}))

// Test the route factory function produces a valid Hono app
import { Hono } from 'hono'

describe('authoring routes', () => {
  test('route module exports createAuthoringRoutes', async () => {
    const mod = await import(
      '../../src/entrypoints/app/routes/owner/edit/authoring'
    )
    expect(typeof mod.createAuthoringRoutes).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/form-authoring/authoring-routes.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write authoring route handlers**

```typescript
// src/entrypoints/app/routes/owner/edit/authoring.tsx
import { Hono } from 'hono'
import {
  createAuthoringPipeline,
  createAuthoringEvaluator,
  parseCriteriaSet,
  serializeCriteriaSet,
  emptyCriteriaSet,
  mergeCriteriaEdits,
  approveCriteriaSet,
  detectAuthoringStage,
  type CriteriaEdits,
  type CriteriaSet,
  type EvalResults,
} from '../../../../../services/form-authoring'
import { loadPolicyCorpus } from '../../../../../services/rag'
import type { ProjectService } from '../../../../../services/projects'
import { UnauthenticatedError } from '../../../../../shared/errors'

export function createAuthoringRoutes(service: ProjectService): Hono {
  const app = new Hono()
  const pipeline = createAuthoringPipeline()
  const evaluator = createAuthoringEvaluator()

  // POST /:owner/:slug/edit/:branch/authoring/analyze-criteria
  // Runs Stage 1: corpus analysis -> criteria generation
  app.post(
    '/:owner/:slug/edit/:branch/authoring/analyze-criteria',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
      const criteria = await pipeline.analyzeCriteria(corpus)

      const set: CriteriaSet = {
        criteria,
        approvedAt: null,
        approvedBy: null,
      }

      // Persist criteria.json to git
      await service.commitFile(
        slug,
        branch,
        'forms/default/criteria.json',
        serializeCriteriaSet(set),
        'Pipeline stage 1: generate evaluation criteria',
        user,
      )

      return c.json({ criteria: set })
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/update-criteria
  // Human edits to criteria (approve, reject, add, edit individual items)
  app.post(
    '/:owner/:slug/edit/:branch/authoring/update-criteria',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const body = (await c.req.json()) as CriteriaEdits
      const existing = await loadCriteria(service, slug, branch)
      const updated = mergeCriteriaEdits(existing, body)

      await service.commitFile(
        slug,
        branch,
        'forms/default/criteria.json',
        serializeCriteriaSet(updated),
        'Update evaluation criteria',
        user,
      )

      return c.json({ criteria: updated })
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/approve-criteria
  // Freeze criteria set and advance to Stage 2
  app.post(
    '/:owner/:slug/edit/:branch/authoring/approve-criteria',
    async (c) => {
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const existing = await loadCriteria(service, slug, branch)
      const approved = approveCriteriaSet(existing, user.login)

      await service.commitFile(
        slug,
        branch,
        'forms/default/criteria.json',
        serializeCriteriaSet(approved),
        'Approve evaluation criteria',
        user,
      )

      return c.json({ criteria: approved })
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/plan-structure
  // Stage 2: generate page/group skeleton
  app.post(
    '/:owner/:slug/edit/:branch/authoring/plan-structure',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const criteria = await loadCriteria(service, slug, branch)
      const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
      const view = await service.getProject(owner, slug, user, branch)

      const state =
        view.formSpec && view.spec
          ? { formSpec: view.formSpec, dataSpec: view.spec }
          : null

      const approvedCriteria = criteria.criteria.filter(
        (c) => c.status === 'approved' || c.status === 'added',
      )

      const result = await pipeline.planStructure(
        approvedCriteria,
        corpus,
        state,
      )

      return c.json(result)
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/generate-section
  // Stage 3: generate fields for a specific group
  app.post(
    '/:owner/:slug/edit/:branch/authoring/generate-section',
    async (c) => {
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const body = (await c.req.json()) as {
        groupId: string
        groupTitle: string
      }
      const criteria = await loadCriteria(service, slug, branch)
      const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })

      const approvedCriteria = criteria.criteria.filter(
        (c) => c.status === 'approved' || c.status === 'added',
      )

      const result = await pipeline.generateSection(
        body.groupId,
        body.groupTitle,
        approvedCriteria,
        corpus,
      )

      return c.json(result)
    },
  )

  // POST /:owner/:slug/edit/:branch/authoring/evaluate-section
  // Stage 4: evaluate a section against criteria
  app.post(
    '/:owner/:slug/edit/:branch/authoring/evaluate-section',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const body = (await c.req.json()) as { groupId: string }
      const criteria = await loadCriteria(service, slug, branch)
      const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
      const view = await service.getProject(owner, slug, user, branch)

      if (!view.formSpec || !view.spec) {
        return c.json({ error: 'No form state' }, 400)
      }

      const approvedCriteria = criteria.criteria.filter(
        (c) => c.status === 'approved' || c.status === 'added',
      )

      const results = await evaluator.evaluateSection(
        body.groupId,
        { formSpec: view.formSpec, dataSpec: view.spec },
        approvedCriteria,
        corpus,
      )

      return c.json({ results })
    },
  )

  // GET /:owner/:slug/edit/:branch/authoring/stage
  // Returns current pipeline stage
  app.get(
    '/:owner/:slug/edit/:branch/authoring/stage',
    async (c) => {
      const owner = c.req.param('owner')
      const slug = c.req.param('slug')
      const branch = c.req.param('branch')
      const user = c.get('user')
      if (!user) throw new UnauthenticatedError()

      const view = await service.getProject(owner, slug, user, branch)
      let criteria: CriteriaSet = emptyCriteriaSet()
      try {
        criteria = await loadCriteria(service, slug, branch)
      } catch {
        // No criteria yet
      }

      const hasPages = (view.formSpec?.pages?.length ?? 0) > 0
      const uncoveredGroupCount = view.spec
        ? view.spec.groups.filter((g) => g.requirements.length === 0).length
        : 0

      const stage = detectAuthoringStage({
        hasCriteria: criteria.criteria.length > 0,
        criteriaApproved: criteria.approvedAt !== null,
        hasPages,
        uncoveredGroupCount,
      })

      return c.json({ stage, criteria })
    },
  )

  return app
}

async function loadCriteria(
  service: ProjectService,
  slug: string,
  branch: string,
): Promise<CriteriaSet> {
  const buf = await service.getFileContent('', slug, branch, 'forms/default/criteria.json')
  if (!buf) return emptyCriteriaSet()
  return parseCriteriaSet(buf.toString())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/form-authoring/authoring-routes.test.ts`
Expected: PASS

- [ ] **Step 5: Add commitFile to ProjectService interface**

The routes need `service.commitFile()`. Check if the project service already has this capability. It has `repo.commit()` internally. Add a thin wrapper method `commitFile` to the `ProjectService` interface and implementation:

```typescript
// Add to ProjectService interface in project-service.ts:
commitFile(
  slug: string,
  branch: string,
  path: string,
  content: string,
  message: string,
  user: SessionUser,
): Promise<string>
```

Implementation delegates to `repo.commit()`.

- [ ] **Step 6: Mount authoring routes in edit index**

In `src/entrypoints/app/routes/owner/edit/index.tsx`, import and mount:

```typescript
import { createAuthoringRoutes } from './authoring'

// Inside createEditRoutes:
const authoringRoutes = createAuthoringRoutes(service)
app.route('/', authoringRoutes)
```

- [ ] **Step 7: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/authoring.tsx src/entrypoints/app/routes/owner/edit/index.tsx src/services/projects/project-service.ts test/form-authoring/authoring-routes.test.ts
git commit -m "feat(form-authoring): add authoring pipeline route handlers with stage progression"
```

---

## Task 12: Pipeline Stage Indicator UI

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`
- Create: `src/entrypoints/app/routes/owner/edit/authoring-components.tsx`

- [ ] **Step 1: Create the authoring UI components**

```typescript
// src/entrypoints/app/routes/owner/edit/authoring-components.tsx
import type { FC } from 'hono/jsx'
import { StepIndicator } from '../../../../../design-system/components/flex-step-indicator'
import type {
  AuthoringStage,
  CriteriaSet,
  Criterion,
  SectionEvalResult,
} from '../../../../../services/form-authoring'

const STAGE_LABELS: Record<AuthoringStage, string> = {
  criteria: 'Evaluation Criteria',
  structure: 'Form Structure',
  sections: 'Section Fields',
  complete: 'Complete',
}

const STAGE_ORDER: AuthoringStage[] = [
  'criteria',
  'structure',
  'sections',
  'complete',
]

export const PipelineStageIndicator: FC<{
  currentStage: AuthoringStage
}> = ({ currentStage }) => {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const steps = STAGE_ORDER.map((stage, i) => ({
    label: STAGE_LABELS[stage],
    state: i < currentIndex ? ('complete' as const) : i === currentIndex ? ('current' as const) : undefined,
  }))

  return (
    <StepIndicator
      steps={steps}
      currentLabel={STAGE_LABELS[currentStage]}
      variant="counters"
    />
  )
}

export const CriteriaList: FC<{
  criteria: Criterion[]
  editable: boolean
  editBase: string
  branch: string
}> = ({ criteria, editable, editBase, branch }) => {
  return (
    <flex-criteria-editor
      data-edit-base={editBase}
      data-branch={branch}
      data-editable={editable ? 'true' : 'false'}
    >
      <ol class="criteria-list">
        {criteria.map((c) => (
          <li class="criteria-list__item" data-status={c.status} data-id={c.id}>
            <span class="criteria-list__text">{c.text}</span>
            <span class="criteria-list__citation">{c.source}</span>
            {editable ? (
              <span class="criteria-list__actions">
                <button type="button" data-action="approve" data-criterion-id={c.id}>
                  Approve
                </button>
                <button type="button" data-action="reject" data-criterion-id={c.id}>
                  Reject
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {editable ? (
        <div class="criteria-list__controls">
          <button type="button" data-action="add-criterion" class="flex-button" data-variant="outline">
            Add criterion
          </button>
          <button type="button" data-action="approve-all" class="flex-button">
            Approve criteria
          </button>
        </div>
      ) : null}
    </flex-criteria-editor>
  )
}

export const EvalScorecard: FC<{
  results: SectionEvalResult[]
  criteria: Criterion[]
}> = ({ results, criteria }) => {
  if (results.length === 0) return null

  const criteriaMap = new Map(criteria.map((c) => [c.id, c]))

  return (
    <flex-eval-scorecard>
      <ul class="eval-scorecard__list">
        {results.map((r) => {
          const criterion = criteriaMap.get(r.criterionId)
          return (
            <li class="eval-scorecard__item" data-pass={r.pass ? 'true' : 'false'}>
              <span class="eval-scorecard__icon">{r.pass ? '\u2713' : '\u2717'}</span>
              <span class="eval-scorecard__text">
                {criterion?.text ?? r.criterionId}
              </span>
              <details class="eval-scorecard__explanation">
                <summary>Details</summary>
                <p>{r.explanation}</p>
              </details>
              {r.retry ? (
                <span class="eval-scorecard__retry">Retry {r.retry}</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </flex-eval-scorecard>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `bun run --no-warnings tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/authoring-components.tsx
git commit -m "feat(form-authoring): add pipeline stage indicator and criteria/eval UI components"
```

---

## Task 13: Criteria Editor Client Component

**Files:**
- Create: `src/design-system/components/flex-criteria-editor/client.ts`
- Create: `src/design-system/components/flex-criteria-editor/styles.css`
- Modify: `src/design-system/register.ts`

- [ ] **Step 1: Write the client-side criteria editor**

```typescript
// src/design-system/components/flex-criteria-editor/client.ts
export class FlexCriteriaEditor extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
  }

  private handleClick(e: Event) {
    const target = e.target as HTMLElement
    const action = target.closest('[data-action]')?.getAttribute('data-action')
    if (!action) return

    const editBase = this.dataset.editBase ?? ''
    const branch = this.dataset.branch ?? ''

    if (action === 'approve' || action === 'reject') {
      const criterionId = target
        .closest('[data-criterion-id]')
        ?.getAttribute('data-criterion-id')
      if (!criterionId) return
      this.updateCriteria(editBase, branch, {
        approve: action === 'approve' ? [criterionId] : [],
        reject: action === 'reject' ? [criterionId] : [],
        add: [],
        edit: [],
      })
    }

    if (action === 'approve-all') {
      this.approveCriteria(editBase, branch)
    }

    if (action === 'add-criterion') {
      this.promptAddCriterion(editBase, branch)
    }
  }

  private async updateCriteria(
    editBase: string,
    branch: string,
    edits: { approve: string[]; reject: string[]; add: Array<{ text: string; source: string }>; edit: never[] },
  ) {
    const res = await fetch(
      `${editBase}/authoring/update-criteria`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      },
    )
    if (res.ok) window.location.reload()
  }

  private async approveCriteria(editBase: string, branch: string) {
    const res = await fetch(
      `${editBase}/authoring/approve-criteria`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    )
    if (res.ok) window.location.reload()
  }

  private promptAddCriterion(editBase: string, branch: string) {
    const text = prompt('Criterion text:')
    if (!text) return
    const source = prompt('Regulatory citation:') ?? ''
    this.updateCriteria(editBase, branch, {
      approve: [],
      reject: [],
      add: [{ text, source }],
      edit: [],
    })
  }
}

if (!customElements.get('flex-criteria-editor')) {
  customElements.define('flex-criteria-editor', FlexCriteriaEditor)
}
```

- [ ] **Step 2: Write the criteria editor styles**

```css
/* src/design-system/components/flex-criteria-editor/styles.css */
.criteria-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--flex-space-sm);
}

.criteria-list__item {
  display: flex;
  align-items: center;
  gap: var(--flex-space-sm);
  padding: var(--flex-space-sm) var(--flex-space-md);
  border: 1px solid var(--flex-color-border);
  border-radius: var(--flex-radius-md);
}

.criteria-list__item[data-status="approved"] {
  border-color: var(--flex-color-success);
}

.criteria-list__item[data-status="rejected"] {
  opacity: 0.5;
  text-decoration: line-through;
}

.criteria-list__text {
  flex: 1;
}

.criteria-list__citation {
  font-size: var(--flex-text-xs);
  color: var(--flex-color-text-muted);
  white-space: nowrap;
}

.criteria-list__actions {
  display: flex;
  gap: var(--flex-space-xs);
}

.criteria-list__controls {
  display: flex;
  gap: var(--flex-space-sm);
  margin-block-start: var(--flex-space-md);
}
```

- [ ] **Step 3: Register in design-system/register.ts**

Add the import to `src/design-system/register.ts`:

```typescript
import './components/flex-criteria-editor/client'
```

- [ ] **Step 4: Verify types compile**

Run: `bun run --no-warnings tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-criteria-editor/ src/design-system/register.ts
git commit -m "feat(design-system): add flex-criteria-editor custom element with approve/reject/add"
```

---

## Task 14: Eval Scorecard Client Component

**Files:**
- Create: `src/design-system/components/flex-eval-scorecard/client.ts`
- Create: `src/design-system/components/flex-eval-scorecard/styles.css`
- Modify: `src/design-system/register.ts`

- [ ] **Step 1: Write the eval scorecard styles**

```css
/* src/design-system/components/flex-eval-scorecard/styles.css */
.eval-scorecard__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--flex-space-xs);
}

.eval-scorecard__item {
  display: flex;
  align-items: center;
  gap: var(--flex-space-sm);
  padding: var(--flex-space-xs) var(--flex-space-sm);
}

.eval-scorecard__icon {
  font-size: var(--flex-text-sm);
}

.eval-scorecard__item[data-pass="true"] .eval-scorecard__icon {
  color: var(--flex-color-success);
}

.eval-scorecard__item[data-pass="false"] .eval-scorecard__icon {
  color: var(--flex-color-error);
}

.eval-scorecard__text {
  flex: 1;
}

.eval-scorecard__explanation {
  font-size: var(--flex-text-xs);
  color: var(--flex-color-text-muted);
}

.eval-scorecard__retry {
  font-size: var(--flex-text-xs);
  color: var(--flex-color-warning);
}
```

- [ ] **Step 2: Write the eval scorecard client**

```typescript
// src/design-system/components/flex-eval-scorecard/client.ts
export class FlexEvalScorecard extends HTMLElement {
  connectedCallback() {
    // Scorecard is read-only server-rendered; no client behavior needed yet.
    // Future: toggle detail expansion, trigger retry.
  }
}

if (!customElements.get('flex-eval-scorecard')) {
  customElements.define('flex-eval-scorecard', FlexEvalScorecard)
}
```

- [ ] **Step 3: Register in design-system/register.ts**

Add to `src/design-system/register.ts`:

```typescript
import './components/flex-eval-scorecard/client'
```

- [ ] **Step 4: Commit**

```bash
git add src/design-system/components/flex-eval-scorecard/ src/design-system/register.ts
git commit -m "feat(design-system): add flex-eval-scorecard component for criteria pass/fail display"
```

---

## Task 15: Wire Stage Indicator into Editor Page

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`

- [ ] **Step 1: Pass authoring stage to EditorPage**

In the GET `/:owner/:slug/edit/:branch` handler in `index.tsx`, detect the authoring stage and pass it to the EditorPage component:

```typescript
import { detectAuthoringStage, emptyCriteriaSet, parseCriteriaSet } from '../../../../../services/form-authoring'

// Inside the GET /:owner/:slug/edit/:branch handler, after getting view:
let authoringStage: AuthoringStage | null = null
try {
  const critBuf = await service.getFileContent('', slug, branch, 'forms/default/criteria.json')
  const criteria = critBuf ? parseCriteriaSet(critBuf.toString()) : emptyCriteriaSet()
  const hasPages = (view.formSpec?.pages?.length ?? 0) > 0
  const uncoveredGroupCount = view.spec
    ? view.spec.groups.filter((g) => g.requirements.length === 0).length
    : 0
  authoringStage = detectAuthoringStage({
    hasCriteria: criteria.criteria.length > 0,
    criteriaApproved: criteria.approvedAt !== null,
    hasPages,
    uncoveredGroupCount,
  })
} catch {
  // Not an authoring project
}
```

Pass `authoringStage` to `EditorPage` as an optional prop.

- [ ] **Step 2: Render stage indicator in EditorPage**

In `components.tsx`, import `PipelineStageIndicator` from `authoring-components.tsx` and render it conditionally in the `EditingShell` when `authoringStage` is present:

```typescript
{authoringStage ? (
  <div class="editor-breadcrumb__pipeline">
    <PipelineStageIndicator currentStage={authoringStage} />
  </div>
) : null}
```

Place this in the `editor-breadcrumb` section, before the branch controls.

- [ ] **Step 3: Verify types compile and server renders**

Run: `bun run --no-warnings tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/index.tsx src/entrypoints/app/routes/owner/edit/components.tsx
git commit -m "feat(form-authoring): wire pipeline stage indicator into editor breadcrumb"
```

---

## Task 16: Integration Test — Full Pipeline Round-Trip

**Files:**
- Test: `test/form-authoring/integration.test.ts`

- [ ] **Step 1: Write an integration test that exercises the full pipeline**

This test mocks the LLM layer and verifies the pipeline stages produce the expected artifacts:

```typescript
// test/form-authoring/integration.test.ts
import { describe, expect, mock, test, beforeEach } from 'bun:test'

const mockGenerateObject = mock()
const mockGenerateText = mock()

mock.module('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
}))

mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => (model: string) => ({ modelId: model })),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  fromIni: mock(() => ({})),
  fromNodeProviderChain: mock(() => ({})),
}))

const { createAuthoringPipeline } = await import(
  '../../src/services/form-authoring/pipeline'
)
const { createAuthoringEvaluator } = await import(
  '../../src/services/form-authoring/evaluator'
)
const { loadPolicyCorpus } = await import('../../src/services/rag')

describe('full pipeline round-trip', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
    mockGenerateText.mockReset()
  })

  test('stage 1 -> 2 -> 3 -> 4 produces commands and eval results', async () => {
    // Stage 1: criteria
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        { id: 'exp-screening', text: 'Must screen for expedited processing', source: '7 CFR 273.2(i)' },
        { id: 'household-comp', text: 'Must collect household composition', source: '7 CFR 273.1(b)' },
      ],
    })

    const pipeline = createAuthoringPipeline()
    const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
    const criteria = await pipeline.analyzeCriteria(corpus)
    expect(criteria).toHaveLength(2)
    expect(criteria[0].status).toBe('pending')

    // Stage 2: structure
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        { toolName: 'addPage', input: { title: 'Screening' } },
        { toolName: 'addGroup', input: { pageId: 'page-new-1', title: 'Expedited Screening' } },
        { toolName: 'addPage', input: { title: 'Household' } },
        { toolName: 'addGroup', input: { pageId: 'page-new-2', title: 'Household Members' } },
      ],
      text: 'Created screening and household pages.',
    })

    const approvedCriteria = criteria.map((c) => ({ ...c, status: 'approved' as const }))
    const structure = await pipeline.planStructure(approvedCriteria, corpus, null)
    expect(structure.commands).toHaveLength(4)
    expect(structure.commands[0].kind).toBe('addPage')

    // Stage 3: section generation
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        {
          toolName: 'addField',
          input: {
            groupId: 'screening-group',
            label: 'Monthly income below $150?',
            fieldType: 'boolean',
            required: true,
          },
        },
      ],
      text: 'Added expedited screening fields.',
    })

    const section = await pipeline.generateSection(
      'screening-group',
      'Expedited Screening',
      approvedCriteria,
      corpus,
    )
    expect(section.commands).toHaveLength(1)
    expect(section.commands[0].kind).toBe('addField')

    // Stage 4: evaluation
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        {
          criterionId: 'exp-screening',
          pass: true,
          explanation: 'Screening question addresses expedited criteria.',
        },
      ],
    })

    const evaluator = createAuthoringEvaluator()
    const state = {
      formSpec: { id: 'f1', specId: 's1', title: 'SNAP', pages: [{ id: 'p1', title: 'Screening', groups: ['screening-group'] }] },
      dataSpec: {
        id: 's1', title: 'SNAP', description: '',
        groups: [{
          id: 'screening-group',
          title: 'Expedited Screening',
          requirements: [
            { id: 'f1', label: 'Monthly income below $150?', fieldType: 'boolean', required: true },
          ],
        }],
      },
    }
    const evalResults = await evaluator.evaluateSection(
      'screening-group',
      state,
      approvedCriteria,
      corpus,
    )
    expect(evalResults).toHaveLength(1)
    expect(evalResults[0].pass).toBe(true)
  })
})
```

- [ ] **Step 2: Run the integration test**

Run: `bun test test/form-authoring/integration.test.ts`
Expected: PASS

- [ ] **Step 3: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add test/form-authoring/integration.test.ts
git commit -m "test(form-authoring): add full pipeline round-trip integration test"
```

---

## Task 17: Final Verification and Cleanup

- [ ] **Step 1: Run full test suite**

Run: `bun run check`
Expected: All lint, type check, and tests PASS

- [ ] **Step 2: Verify architecture dependency rule**

Run: `bun test test/architecture/`
Expected: PASS — new service follows dependency direction (shared -> services -> entrypoints)

- [ ] **Step 3: Verify no regressions in existing shaping**

Run: `bun test test/forms/`
Expected: All existing shaping tests PASS

- [ ] **Step 4: Start dev server and verify editor loads**

Run: `bun run dev`
Navigate to an existing project's edit page. Verify:
- Page loads without errors
- Stage indicator does not appear on non-authoring projects (no criteria.json)
- Existing chat shaping still works

- [ ] **Step 5: Commit any final fixes**

If any issues found, fix and commit.
