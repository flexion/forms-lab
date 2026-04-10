# Story 3: PDF Upload & Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maya uploads a PDF form (or picks a demo fixture), the system extracts structured DataCollectionSpec + FormSpec via Claude on Bedrock, and Maya reviews the results with confidence indicators.

**Architecture:** Two-tier SQLite (shared cache DB + per-branch project DB) behind clean interfaces. AI SDK with Bedrock provider for extraction behind a `PdfExtractor` interface. Hono routes under `/projects/*` (auth-protected). Async extraction with polling refresh.

**Tech Stack:** Bun, Hono, bun:sqlite, Vercel AI SDK (`ai` + `@ai-sdk/amazon-bedrock`), Zod

**Design spec:** `notes/2026-04-09-story-3-pdf-upload-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `src/services/database.ts` | SQLite connection management, migration runner, typed store interfaces and implementations |
| `src/services/pdf-extractor.ts` | `PdfExtractor` interface, `BedrockPdfExtractor`, `CachedPdfExtractor`, Zod schemas |
| `src/services/extraction-schemas.ts` | Zod schemas for DataCollectionSpec and FormSpec extraction |
| `fixtures/index.ts` | Demo fixture manifest (slug -> name, description, filename) |
| `src/app/routes/projects/components.tsx` | JSX components for project pages (list, new, detail, spec viewer) |
| `test/database.test.ts` | Database store tests |
| `test/pdf-extractor.test.ts` | Extractor and cache tests |
| `test/projects-routes.test.ts` | Route integration tests |

### Modified files

| File | Change |
|------|--------|
| `src/types/models.ts` | Add extraction-related types (ExtractionResult, FieldConfidence, project status) |
| `src/app/routes/projects/index.tsx` | Replace placeholder with full project routes |
| `src/app/server.tsx` | Pass dependencies (stores, extractor) to project routes |
| `package.json` | Add `ai`, `@ai-sdk/amazon-bedrock`, `zod` dependencies |

### Existing files (reference only)

| File | Used for |
|------|----------|
| `src/app/middleware/auth.ts` | `requireAuth()` already applied to `/projects/*` in server.tsx |
| `src/app/components/flex-file-input/index.tsx` | `FileInput` component for upload form |
| `src/app/components/flex-layout/index.tsx` | `Layout` wrapper for all pages |
| `src/lib/base-path.ts` | `resolveUrl()` for all URLs |
| `fixtures/pardon-application.pdf` | Test PDF (already committed) |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun add ai @ai-sdk/amazon-bedrock zod
```

- [ ] **Step 2: Verify installation**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run --no-warnings tsc --noEmit
```

Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add package.json bun.lockb
git commit -m "chore: add ai-sdk, bedrock provider, and zod dependencies"
```

---

## Task 2: Add Extraction Types to Models

**Files:**
- Modify: `src/types/models.ts`

- [ ] **Step 1: Add extraction and project store types**

Add these types at the end of `src/types/models.ts`:

```typescript
/**
 * PDF Extraction types
 */
export interface ExtractionResult {
  spec: DataCollectionSpec
  formSpec: FormSpec
  confidence: FieldConfidence[]
}

export interface FieldConfidence {
  fieldId: string
  confidence: number // 0-1
  flags?: string[] // e.g., "ambiguous-type", "conditional-logic-unclear"
}

export interface ExtractionOptions {
  model?: string // Bedrock model ID, defaults to Sonnet
}

/**
 * Project status for async extraction tracking
 */
export type ProjectStatus = 'extracting' | 'ready' | 'error'

/**
 * StoredProject - Database representation of a FormProject
 *
 * Unlike FormProject (which nests specs), StoredProject stores
 * specs as JSON strings alongside status and metadata.
 */
export interface StoredProject {
  id: string
  name: string
  description: string
  status: ProjectStatus
  sourcePdf: Buffer
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  error: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface NewProject {
  name: string
  description: string
  sourcePdf: Buffer
  createdBy: string
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run --no-warnings tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/types/models.ts
git commit -m "feat: add extraction and stored project types"
```

---

## Task 3: Database Service — CacheStore

**Files:**
- Create: `src/services/database.ts`
- Create: `test/database.test.ts`

- [ ] **Step 1: Write failing tests for CacheStore**

Create `test/database.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { createCacheStore } from '../src/services/database'

describe('CacheStore', () => {
  it('returns null for missing key', () => {
    const store = createCacheStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
  })

  it('stores and retrieves a cache entry', () => {
    const store = createCacheStore(':memory:')
    store.set('abc123', 'sonnet-4', '{"spec":{}}')
    const entry = store.get('abc123')
    expect(entry).not.toBeNull()
    expect(entry!.key).toBe('abc123')
    expect(entry!.model).toBe('sonnet-4')
    expect(entry!.result).toBe('{"spec":{}}')
    expect(entry!.createdAt).toBeGreaterThan(0)
  })

  it('overwrites existing entry on same key', () => {
    const store = createCacheStore(':memory:')
    store.set('abc123', 'sonnet-4', '{"v":1}')
    store.set('abc123', 'opus-4', '{"v":2}')
    const entry = store.get('abc123')
    expect(entry!.model).toBe('opus-4')
    expect(entry!.result).toBe('{"v":2}')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/database.test.ts
```

Expected: FAIL — `createCacheStore` does not exist.

- [ ] **Step 3: Implement CacheStore**

Create `src/services/database.ts`:

```typescript
import { Database } from 'bun:sqlite'

export interface CacheEntry {
  key: string
  model: string
  result: string
  createdAt: number
}

export interface CacheStore {
  get(key: string): CacheEntry | null
  set(key: string, model: string, result: string): void
}

export function createCacheStore(dbPath: string): CacheStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  return {
    get(key: string): CacheEntry | null {
      const row = db.query(
        'SELECT key, model, result, created_at FROM cache WHERE key = ?',
      ).get(key) as { key: string; model: string; result: string; created_at: number } | null
      if (!row) return null
      return {
        key: row.key,
        model: row.model,
        result: row.result,
        createdAt: row.created_at,
      }
    },

    set(key: string, model: string, result: string): void {
      db.run(
        'INSERT OR REPLACE INTO cache (key, model, result, created_at) VALUES (?, ?, ?, ?)',
        [key, model, result, Math.floor(Date.now() / 1000)],
      )
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/database.test.ts
```

Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/services/database.ts test/database.test.ts
git commit -m "feat: add CacheStore with in-memory SQLite support"
```

---

## Task 4: Database Service — ProjectStore

**Files:**
- Modify: `src/services/database.ts`
- Modify: `test/database.test.ts`

- [ ] **Step 1: Write failing tests for ProjectStore**

Add to `test/database.test.ts`:

```typescript
import { createCacheStore, createProjectStore } from '../src/services/database'

describe('ProjectStore', () => {
  it('creates and retrieves a project', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Pardon Application',
      description: 'Presidential pardon form',
      sourcePdf: Buffer.from('fake-pdf'),
      createdBy: 'testuser',
    })
    expect(project.id).toBeDefined()
    expect(project.name).toBe('Pardon Application')
    expect(project.status).toBe('extracting')
    expect(project.createdBy).toBe('testuser')

    const retrieved = store.get(project.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.name).toBe('Pardon Application')
    expect(Buffer.from(retrieved!.sourcePdf).toString()).toBe('fake-pdf')
  })

  it('returns null for missing project', () => {
    const store = createProjectStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
  })

  it('lists projects filtered by user', () => {
    const store = createProjectStore(':memory:')
    store.create({
      name: 'Project A',
      description: 'A',
      sourcePdf: Buffer.from('a'),
      createdBy: 'alice',
    })
    store.create({
      name: 'Project B',
      description: 'B',
      sourcePdf: Buffer.from('b'),
      createdBy: 'bob',
    })
    store.create({
      name: 'Project C',
      description: 'C',
      sourcePdf: Buffer.from('c'),
      createdBy: 'alice',
    })

    const aliceProjects = store.list('alice')
    expect(aliceProjects).toHaveLength(2)
    expect(aliceProjects.map((p) => p.name).sort()).toEqual([
      'Project A',
      'Project C',
    ])

    const allProjects = store.list()
    expect(allProjects).toHaveLength(3)
  })

  it('updates project fields', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'user',
    })

    const updated = store.update(project.id, {
      status: 'ready',
      spec: { id: 's1', title: 'Spec', description: '', groups: [] },
      formSpec: {
        id: 'f1',
        specId: 's1',
        title: 'Form',
        pages: [],
        createdAt: '',
        updatedAt: '',
      },
      confidence: [{ fieldId: 'f1', confidence: 0.9 }],
    })

    expect(updated.status).toBe('ready')
    expect(updated.spec!.title).toBe('Spec')
    expect(updated.formSpec!.title).toBe('Form')
    expect(updated.confidence).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/database.test.ts
```

Expected: FAIL — `createProjectStore` does not exist.

- [ ] **Step 3: Implement ProjectStore**

Add to `src/services/database.ts`:

```typescript
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
  NewProject,
  ProjectStatus,
  StoredProject,
} from '../types/models'

export interface ProjectStore {
  create(project: NewProject): StoredProject
  get(id: string): StoredProject | null
  list(userId?: string): StoredProject[]
  update(id: string, changes: Partial<Pick<StoredProject, 'status' | 'spec' | 'formSpec' | 'confidence' | 'error'>>): StoredProject
}

export function createProjectStore(dbPath: string): ProjectStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'extracting',
      source_pdf BLOB NOT NULL,
      spec TEXT,
      form_spec TEXT,
      confidence TEXT,
      error TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  function rowToProject(row: Record<string, unknown>): StoredProject {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      status: row.status as ProjectStatus,
      sourcePdf: row.source_pdf as Buffer,
      spec: row.spec ? JSON.parse(row.spec as string) : null,
      formSpec: row.form_spec ? JSON.parse(row.form_spec as string) : null,
      confidence: row.confidence ? JSON.parse(row.confidence as string) : null,
      error: row.error as string | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }
  }

  return {
    create(project: NewProject): StoredProject {
      const id = crypto.randomUUID()
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO projects (id, name, description, status, source_pdf, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'extracting', ?, ?, ?, ?)`,
        [id, project.name, project.description, project.sourcePdf, project.createdBy, now, now],
      )
      return this.get(id)!
    },

    get(id: string): StoredProject | null {
      const row = db.query('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | null
      if (!row) return null
      return rowToProject(row)
    },

    list(userId?: string): StoredProject[] {
      const query = userId
        ? db.query('SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC')
        : db.query('SELECT * FROM projects ORDER BY created_at DESC')
      const rows = (userId ? query.all(userId) : query.all()) as Record<string, unknown>[]
      return rows.map(rowToProject)
    },

    update(id: string, changes: Partial<Pick<StoredProject, 'status' | 'spec' | 'formSpec' | 'confidence' | 'error'>>): StoredProject {
      const sets: string[] = ['updated_at = ?']
      const values: unknown[] = [Math.floor(Date.now() / 1000)]

      if (changes.status !== undefined) {
        sets.push('status = ?')
        values.push(changes.status)
      }
      if (changes.spec !== undefined) {
        sets.push('spec = ?')
        values.push(JSON.stringify(changes.spec))
      }
      if (changes.formSpec !== undefined) {
        sets.push('form_spec = ?')
        values.push(JSON.stringify(changes.formSpec))
      }
      if (changes.confidence !== undefined) {
        sets.push('confidence = ?')
        values.push(JSON.stringify(changes.confidence))
      }
      if (changes.error !== undefined) {
        sets.push('error = ?')
        values.push(changes.error)
      }

      values.push(id)
      db.run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, values)
      return this.get(id)!
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/database.test.ts
```

Expected: PASS — all 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/services/database.ts test/database.test.ts
git commit -m "feat: add ProjectStore with SQLite backing"
```

---

## Task 5: Zod Extraction Schemas

**Files:**
- Create: `src/services/extraction-schemas.ts`

- [ ] **Step 1: Write the Zod schemas**

Create `src/services/extraction-schemas.ts`. These schemas mirror the TypeScript types in `models.ts` and are used by `generateObject()` to produce validated, structured output from the LLM.

```typescript
import { z } from 'zod'

export const validationRuleSchema = z.object({
  type: z.enum(['pattern', 'min', 'max', 'minLength', 'maxLength']),
  value: z.union([z.string(), z.number()]),
  message: z.string().optional(),
})

export const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const fieldConfidenceSchema = z.object({
  fieldId: z.string(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()).optional(),
})

export const dataRequirementSchema = z.object({
  id: z.string(),
  fieldName: z.string(),
  label: z.string(),
  fieldType: z.enum([
    'text', 'email', 'phone', 'url', 'number',
    'currency', 'date', 'boolean', 'choice', 'longText',
  ]),
  required: z.boolean(),
  helpText: z.string().optional(),
  validation: z.array(validationRuleSchema).optional(),
  condition: conditionSchema.optional(),
  sensitivity: z.enum(['low', 'medium', 'high', 'pii']).optional(),
})

export const requirementGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  requirements: z.array(dataRequirementSchema),
})

export const dataCollectionSpecSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  groups: z.array(requirementGroupSchema),
  version: z.string().optional(),
})

export const extractionResponseSchema = z.object({
  spec: dataCollectionSpecSchema,
  confidence: z.array(fieldConfidenceSchema),
})

export const formPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  groups: z.array(z.string()),
  deliveryMode: z.enum(['static', 'conversational', 'hybrid']),
})

export const formSpecSchema = z.object({
  id: z.string(),
  specId: z.string(),
  title: z.string(),
  pages: z.array(formPageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

- [ ] **Step 2: Verify types compile**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run --no-warnings tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/services/extraction-schemas.ts
git commit -m "feat: add Zod schemas for PDF extraction"
```

---

## Task 6: PdfExtractor Interface and CachedPdfExtractor

**Files:**
- Create: `src/services/pdf-extractor.ts`
- Create: `test/pdf-extractor.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/pdf-extractor.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { createCacheStore } from '../src/services/database'
import {
  type PdfExtractor,
  createCachedPdfExtractor,
} from '../src/services/pdf-extractor'
import type { ExtractionResult } from '../src/types/models'

const stubResult: ExtractionResult = {
  spec: {
    id: 'spec-1',
    title: 'Test Form',
    description: 'A test form',
    groups: [
      {
        id: 'g1',
        title: 'Personal Info',
        requirements: [
          {
            id: 'f1',
            fieldName: 'fullName',
            label: 'Full Name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  formSpec: {
    id: 'form-1',
    specId: 'spec-1',
    title: 'Test Form',
    pages: [
      {
        id: 'p1',
        title: 'Personal Info',
        groups: ['g1'],
        deliveryMode: 'static',
      },
    ],
    createdAt: '2026-04-09',
    updatedAt: '2026-04-09',
  },
  confidence: [{ fieldId: 'f1', confidence: 0.95 }],
}

function createStubExtractor(result: ExtractionResult): PdfExtractor & { callCount: number } {
  const extractor = {
    callCount: 0,
    async extract(): Promise<ExtractionResult> {
      extractor.callCount++
      return result
    },
  }
  return extractor
}

describe('CachedPdfExtractor', () => {
  it('delegates to inner extractor on cache miss', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    const result = await cached.extract(Buffer.from('test-pdf'))
    expect(result.spec.title).toBe('Test Form')
    expect(inner.callCount).toBe(1)
  })

  it('returns cached result on cache hit', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    await cached.extract(Buffer.from('test-pdf'))
    const result = await cached.extract(Buffer.from('test-pdf'))
    expect(result.spec.title).toBe('Test Form')
    expect(inner.callCount).toBe(1) // Only called once
  })

  it('uses different cache keys for different PDFs', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    await cached.extract(Buffer.from('pdf-a'))
    await cached.extract(Buffer.from('pdf-b'))
    expect(inner.callCount).toBe(2)
  })

  it('includes model in cache key', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    await cached.extract(Buffer.from('same-pdf'), { model: 'sonnet' })
    await cached.extract(Buffer.from('same-pdf'), { model: 'opus' })
    expect(inner.callCount).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/pdf-extractor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement PdfExtractor interface and CachedPdfExtractor**

Create `src/services/pdf-extractor.ts`:

```typescript
import type { CacheStore } from './database'
import type { ExtractionOptions, ExtractionResult } from '../types/models'

export interface PdfExtractor {
  extract(pdf: Buffer, options?: ExtractionOptions): Promise<ExtractionResult>
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

function cacheKey(pdf: Buffer, model: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(pdf)
  hasher.update(model)
  return hasher.digest('hex')
}

export function createCachedPdfExtractor(
  inner: PdfExtractor,
  cacheStore: CacheStore,
): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? DEFAULT_MODEL
      const key = cacheKey(pdf, model)

      const cached = cacheStore.get(key)
      if (cached) {
        return JSON.parse(cached.result) as ExtractionResult
      }

      const result = await inner.extract(pdf, options)
      cacheStore.set(key, model, JSON.stringify(result))
      return result
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/pdf-extractor.test.ts
```

Expected: PASS — all 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/services/pdf-extractor.ts test/pdf-extractor.test.ts
git commit -m "feat: add PdfExtractor interface and CachedPdfExtractor"
```

---

## Task 7: BedrockPdfExtractor

**Files:**
- Modify: `src/services/pdf-extractor.ts`

This task adds the real Bedrock implementation. It cannot be tested in CI (requires AWS credentials), so it is tested manually and the cached output becomes the test fixture.

- [ ] **Step 1: Implement BedrockPdfExtractor**

Add to `src/services/pdf-extractor.ts`:

```typescript
import { generateObject } from 'ai'
import { bedrock } from '@ai-sdk/amazon-bedrock'
import {
  extractionResponseSchema,
  formSpecSchema,
} from './extraction-schemas'
import type {
  DataCollectionSpec,
  ExtractionOptions,
  ExtractionResult,
} from '../types/models'

export function createBedrockPdfExtractor(): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? DEFAULT_MODEL

      // Step 1: Extract DataCollectionSpec + confidence from PDF
      const extraction = await generateObject({
        model: bedrock(model),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                data: pdf,
                mimeType: 'application/pdf',
              },
              {
                type: 'text',
                text: `Analyze this government PDF form and extract its structure as a DataCollectionSpec.

For each field in the form, identify:
- A unique id (kebab-case, e.g., "full-name", "date-of-birth")
- The fieldName (camelCase version)
- A human-readable label
- The field type (text, email, phone, url, number, currency, date, boolean, choice, longText)
- Whether it is required
- Any help text or instructions
- Validation rules (patterns, min/max values, length constraints)
- Conditions (fields that only appear based on other field values)
- Sensitivity level (low, medium, high, pii)

Group related fields into RequirementGroups (e.g., "Personal Information", "Employment History").

For each field, also provide a confidence score (0-1) indicating how certain you are about the extraction. Flag any ambiguous fields with descriptive flags like "ambiguous-type", "conditional-logic-unclear", "label-unclear".

Be thorough — extract every field visible in the form.`,
              },
            ],
          },
        ],
        schema: extractionResponseSchema,
      })

      const { spec, confidence } = extraction.object

      // Step 2: Generate default FormSpec from extracted spec
      const formSpecResult = await generateObject({
        model: bedrock(model),
        messages: [
          {
            role: 'user',
            content: `Given this DataCollectionSpec, generate a default FormSpec that organizes the form into logical pages.

DataCollectionSpec:
${JSON.stringify(spec, null, 2)}

Rules:
- Each page should contain 1-3 related requirement groups
- Set the specId to "${spec.id}"
- Use a unique id for the FormSpec (e.g., "form-" + specId)
- Each page needs a unique id (e.g., "page-1", "page-2")
- Set deliveryMode to "static" for simple sections, "conversational" for sections with many conditional fields (more than 3 conditions), and "hybrid" for moderately complex sections
- Set createdAt and updatedAt to "${new Date().toISOString()}"
- Give each page a descriptive title`,
          },
        ],
        schema: formSpecSchema,
      })

      return {
        spec,
        formSpec: formSpecResult.object,
        confidence,
      }
    },
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run --no-warnings tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/services/pdf-extractor.ts
git commit -m "feat: add BedrockPdfExtractor using AI SDK"
```

---

## Task 8: Demo Fixture Manifest

**Files:**
- Create: `fixtures/index.ts`

- [ ] **Step 1: Create the fixture manifest**

Create `fixtures/index.ts`:

```typescript
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

export interface DemoFixture {
  slug: string
  name: string
  description: string
  filename: string
}

export const demoFixtures: DemoFixture[] = [
  {
    slug: 'pardon-application',
    name: 'Application for Pardon After Completion of Sentence',
    description:
      'U.S. Department of Justice petition for presidential pardon. 24 pages with personal information, criminal history, employment, and character references.',
    filename: 'pardon-application.pdf',
  },
]

export function getFixture(slug: string): DemoFixture | undefined {
  return demoFixtures.find((f) => f.slug === slug)
}

export function loadFixturePdf(fixture: DemoFixture): Buffer {
  const fixturesDir = join(import.meta.dir)
  return readFileSync(join(fixturesDir, fixture.filename))
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run --no-warnings tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add fixtures/index.ts
git commit -m "feat: add demo fixture manifest with pardon application"
```

---

## Task 9: Project Route — List and New Project Pages

**Files:**
- Create: `src/app/routes/projects/components.tsx`
- Modify: `src/app/routes/projects/index.tsx`
- Create: `test/projects-routes.test.ts`

- [ ] **Step 1: Write failing tests for project list and new project pages**

Create `test/projects-routes.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createProjectStore } from '../src/services/database'
import type { PdfExtractor } from '../src/services/pdf-extractor'
import type { ExtractionResult } from '../src/types/models'
import { createProjectRoutes } from '../src/app/routes/projects/index'

const stubResult: ExtractionResult = {
  spec: {
    id: 'spec-1',
    title: 'Test Form',
    description: 'A test form',
    groups: [],
  },
  formSpec: {
    id: 'form-1',
    specId: 'spec-1',
    title: 'Test Form',
    pages: [],
    createdAt: '2026-04-09',
    updatedAt: '2026-04-09',
  },
  confidence: [],
}

function createTestApp() {
  const projectStore = createProjectStore(':memory:')
  const extractor: PdfExtractor = {
    async extract(): Promise<ExtractionResult> {
      return stubResult
    },
  }
  const app = new Hono()
  // Simulate auth by setting user in context
  app.use('*', async (c, next) => {
    c.set('user', { login: 'testuser', name: 'Test User', avatarUrl: '' })
    await next()
  })
  app.route('/projects', createProjectRoutes(projectStore, extractor))
  return { app, projectStore, extractor }
}

describe('GET /projects', () => {
  it('renders empty project list', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('My Projects')
    expect(html).toContain('New Project')
  })

  it('lists existing projects', async () => {
    const { app, projectStore } = createTestApp()
    projectStore.create({
      name: 'Pardon App',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).toContain('Pardon App')
  })
})

describe('GET /projects/new', () => {
  it('renders new project page with fixture options', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/new')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('New Project')
    expect(html).toContain('pardon-application')
    expect(html).toContain('Upload')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/projects-routes.test.ts
```

Expected: FAIL — `createProjectRoutes` does not exist.

- [ ] **Step 3: Create project page components**

Create `src/app/routes/projects/components.tsx`:

```typescript
import type { FC } from 'hono/jsx'
import { resolveUrl } from '../../../lib/base-path'
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
  StoredProject,
} from '../../../types/models'
import type { DemoFixture } from '../../../../fixtures/index'

export const ProjectList: FC<{ projects: StoredProject[] }> = ({
  projects,
}) => (
  <div class="l-stack">
    <div class="l-cluster" style="justify-content: space-between; align-items: center;">
      <h1>My Projects</h1>
      <a href={resolveUrl('/projects/new')} class="flex-button">
        New Project
      </a>
    </div>
    {projects.length === 0 ? (
      <p>No projects yet. Create one to get started.</p>
    ) : (
      <ul class="l-stack" role="list" style="list-style: none; padding: 0;">
        {projects.map((p) => (
          <li key={p.id}>
            <a
              href={resolveUrl(`/projects/${p.id}`)}
              class="flex-card flex-card--flag"
              style="display: block; text-decoration: none; color: inherit;"
            >
              <div class="l-stack" style="gap: var(--flex-space-2xs);">
                <strong>{p.name}</strong>
                <span class="flex-badge" data-status={p.status}>
                  {p.status}
                </span>
                <span style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
                  {p.description}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    )}
  </div>
)

export const NewProjectPage: FC<{ fixtures: DemoFixture[] }> = ({
  fixtures,
}) => (
  <div class="l-stack">
    <h1>New Project</h1>

    <section class="l-stack">
      <h2>Start from a demo form</h2>
      <div class="l-grid">
        {fixtures.map((f) => (
          <form method="post" action={resolveUrl('/projects')}>
            <input type="hidden" name="fixture" value={f.slug} />
            <button
              type="submit"
              class="flex-card"
              style="cursor: pointer; text-align: left; width: 100%; border: 1px solid var(--flex-gray-cool-20); background: var(--flex-white);"
            >
              <div class="l-stack" style="gap: var(--flex-space-2xs);">
                <strong>{f.name}</strong>
                <span style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
                  {f.description}
                </span>
              </div>
            </button>
          </form>
        ))}
      </div>
    </section>

    <section class="l-stack">
      <h2>Upload your own PDF</h2>
      <form
        method="post"
        action={resolveUrl('/projects')}
        enctype="multipart/form-data"
      >
        <div class="l-stack">
          <flex-file-input>
            <label class="flex-label" for="pdf-upload">
              PDF form
            </label>
            <span class="flex-file-input__hint" id="pdf-upload-hint">
              Select a government PDF form to extract
            </span>
            <div class="flex-file-input__target">
              <div class="flex-file-input__instructions" aria-hidden="true">
                Drag file here or{' '}
                <span class="flex-file-input__choose">choose from folder</span>
              </div>
              <input
                class="flex-file-input__input"
                id="pdf-upload"
                name="pdf"
                type="file"
                accept=".pdf,application/pdf"
                aria-describedby="pdf-upload-hint"
              />
            </div>
            <div class="flex-file-input__preview-area" />
          </flex-file-input>
          <div>
            <button type="submit" class="flex-button">
              Upload and Extract
            </button>
          </div>
        </div>
      </form>
    </section>
  </div>
)

export const ProjectDetail: FC<{ project: StoredProject }> = ({ project }) => {
  if (project.status === 'extracting') {
    return <ExtractingView project={project} />
  }
  if (project.status === 'error') {
    return <ErrorView project={project} />
  }
  return <ReadyView project={project} />
}

const ExtractingView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <meta http-equiv="refresh" content="3" />
    <h1>{project.name}</h1>
    <div
      class="flex-alert flex-alert--info"
      role="status"
      aria-live="polite"
    >
      <p>
        <strong>Extracting form structure...</strong>
      </p>
      <p>
        This may take up to a minute for large forms. This page will refresh
        automatically.
      </p>
    </div>
  </div>
)

const ErrorView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--error" role="alert">
      <p>
        <strong>Extraction failed</strong>
      </p>
      <p>{project.error ?? 'An unknown error occurred.'}</p>
    </div>
    <form method="post" action={resolveUrl(`/projects/${project.id}/retry`)}>
      <button type="submit" class="flex-button">
        Retry Extraction
      </button>
    </form>
  </div>
)

const ReadyView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <h1>{project.name}</h1>
    {project.spec && (
      <SpecViewer
        spec={project.spec}
        confidence={project.confidence ?? []}
      />
    )}
    {project.formSpec && <FormSpecViewer formSpec={project.formSpec} />}
  </div>
)

const ConfidenceBadge: FC<{ confidence: number; flags?: string[] }> = ({
  confidence,
  flags,
}) => {
  if (confidence >= 0.8) return null
  const level = confidence >= 0.5 ? 'medium' : 'low'
  const color =
    level === 'medium' ? 'var(--flex-gold-vivid-20)' : 'var(--flex-red-cool-vivid-30)'
  return (
    <span
      class="flex-badge"
      style={`background: ${color}; font-size: var(--flex-text-sm);`}
      title={flags?.join(', ') ?? `Confidence: ${Math.round(confidence * 100)}%`}
    >
      {level === 'medium' ? 'Review' : 'Low confidence'}
    </span>
  )
}

const SpecViewer: FC<{
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}> = ({ spec, confidence }) => {
  const confidenceMap = new Map(confidence.map((c) => [c.fieldId, c]))
  return (
    <section class="l-stack">
      <h2>Extracted Data Requirements</h2>
      <p>{spec.description}</p>
      {spec.groups.map((group) => (
        <div key={group.id} class="l-stack" style="gap: var(--flex-space-xs);">
          <h3>{group.title}</h3>
          {group.description && <p>{group.description}</p>}
          <table class="flex-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Required</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {group.requirements.map((req) => {
                const conf = confidenceMap.get(req.id)
                return (
                  <tr key={req.id}>
                    <td>
                      <strong>{req.label}</strong>
                      {req.helpText && (
                        <div style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
                          {req.helpText}
                        </div>
                      )}
                    </td>
                    <td>{req.fieldType}</td>
                    <td>{req.required ? 'Yes' : 'No'}</td>
                    <td>
                      {conf ? (
                        <ConfidenceBadge
                          confidence={conf.confidence}
                          flags={conf.flags}
                        />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}

const FormSpecViewer: FC<{ formSpec: FormSpec }> = ({ formSpec }) => (
  <section class="l-stack">
    <h2>Form Layout</h2>
    <ol class="l-stack">
      {formSpec.pages.map((page) => (
        <li key={page.id} class="l-stack" style="gap: var(--flex-space-2xs);">
          <strong>{page.title}</strong>
          {page.description && <p>{page.description}</p>}
          <span class="flex-badge">{page.deliveryMode}</span>
          <span style="color: var(--flex-gray-cool-50); font-size: var(--flex-text-sm);">
            Groups: {page.groups.join(', ')}
          </span>
        </li>
      ))}
    </ol>
  </section>
)
```

- [ ] **Step 4: Rewrite project routes with dependency injection**

Replace `src/app/routes/projects/index.tsx`:

```typescript
import { Hono } from 'hono'
import { resolveUrl } from '../../../lib/base-path'
import { Layout } from '../../components/flex-layout'
import type { ProjectStore } from '../../../services/database'
import type { PdfExtractor } from '../../../services/pdf-extractor'
import { demoFixtures, getFixture, loadFixturePdf } from '../../../../fixtures/index'
import { ProjectList, NewProjectPage, ProjectDetail } from './components'

export function createProjectRoutes(
  projectStore: ProjectStore,
  extractor: PdfExtractor,
): Hono {
  const projects = new Hono()

  projects.get('/', (c) => {
    const user = c.get('user')
    const userProjects = projectStore.list(user?.login)
    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectList projects={userProjects} />
      </Layout>,
    )
  })

  projects.get('/new', (c) => {
    const user = c.get('user')
    return c.html(
      <Layout currentPath="/projects" user={user}>
        <NewProjectPage fixtures={demoFixtures} />
      </Layout>,
    )
  })

  projects.post('/', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const contentType = c.req.header('content-type') ?? ''
    let pdf: Buffer
    let name: string

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody()
      const file = body.pdf
      if (!(file instanceof File) || file.size === 0) {
        return c.html(
          <Layout currentPath="/projects" user={user}>
            <NewProjectPage fixtures={demoFixtures} />
          </Layout>,
          400,
        )
      }
      pdf = Buffer.from(await file.arrayBuffer())
      name = file.name.replace(/\.pdf$/i, '')
    } else {
      const body = await c.req.parseBody()
      const fixtureSlug = body.fixture as string
      const fixture = getFixture(fixtureSlug)
      if (!fixture) {
        return c.html(
          <Layout currentPath="/projects" user={user}>
            <NewProjectPage fixtures={demoFixtures} />
          </Layout>,
          400,
        )
      }
      pdf = loadFixturePdf(fixture)
      name = fixture.name
    }

    const project = projectStore.create({
      name,
      description: `Extracted from ${name}`,
      sourcePdf: pdf,
      createdBy: user.login,
    })

    // Fire-and-forget extraction
    extractor
      .extract(pdf)
      .then((result) => {
        projectStore.update(project.id, {
          status: 'ready',
          spec: result.spec,
          formSpec: result.formSpec,
          confidence: result.confidence,
        })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  projects.get('/:id', (c) => {
    const user = c.get('user')
    const project = projectStore.get(c.req.param('id'))
    if (!project) {
      return c.html(
        <Layout currentPath="/projects" user={user}>
          <h1>Project not found</h1>
        </Layout>,
        404,
      )
    }
    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectDetail project={project} />
      </Layout>,
    )
  })

  projects.post('/:id/retry', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    projectStore.update(project.id, { status: 'extracting', error: null })

    extractor
      .extract(project.sourcePdf)
      .then((result) => {
        projectStore.update(project.id, {
          status: 'ready',
          spec: result.spec,
          formSpec: result.formSpec,
          confidence: result.confidence,
        })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  return projects
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/projects-routes.test.ts
```

Expected: PASS — all 3 tests.

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/app/routes/projects/index.tsx src/app/routes/projects/components.tsx test/projects-routes.test.ts
git commit -m "feat: add project list, new project, and detail routes"
```

---

## Task 10: Wire Dependencies in Server

**Files:**
- Modify: `src/app/server.tsx`
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Write failing test for POST /projects with fixture**

Add to `test/projects-routes.test.ts`:

```typescript
describe('POST /projects', () => {
  it('creates project from fixture selection', async () => {
    const { app, projectStore } = createTestApp()
    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'fixture=pardon-application',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/projects/')

    const projects = projectStore.list('testuser')
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe(
      'Application for Pardon After Completion of Sentence',
    )
    expect(projects[0].status).toBe('extracting')
  })

  it('returns 400 for unknown fixture', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'fixture=nonexistent',
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /projects/:id', () => {
  it('shows extracting status with auto-refresh', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Extracting form structure')
    expect(html).toContain('http-equiv="refresh"')
  })

  it('shows ready project with spec details', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'ready',
      spec: stubResult.spec,
      formSpec: stubResult.formSpec,
      confidence: stubResult.confidence,
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Test Form')
    expect(html).toContain('Extracted Data Requirements')
  })

  it('returns 404 for missing project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/nonexistent')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

These should pass with the existing implementation from Task 9.

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/projects-routes.test.ts
```

Expected: PASS — all 8 tests.

- [ ] **Step 3: Update server.tsx to wire dependencies**

Replace the project route mounting in `src/app/server.tsx`. Change lines 7-8 and 109-111:

Replace:
```typescript
import projects from './routes/projects/index'
```

With:
```typescript
import { createProjectRoutes } from './routes/projects/index'
import { createProjectStore, createCacheStore } from '../services/database'
import {
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from '../services/pdf-extractor'
```

Replace:
```typescript
// Mount projects routes with auth guard
app.use('/projects/*', requireAuth())
app.route('/projects', projects)
```

With:
```typescript
// Initialize stores and services
const cacheDbPath = process.env.CACHE_DB_PATH ?? './data/cache.db'
const projectDbPath = process.env.PROJECT_DB_PATH ?? './data/projects.db'
const cacheStore = createCacheStore(cacheDbPath)
const projectStore = createProjectStore(projectDbPath)
const extractor = createCachedPdfExtractor(
  createBedrockPdfExtractor(),
  cacheStore,
)

// Mount projects routes with auth guard
app.use('/projects/*', requireAuth())
app.route('/projects', createProjectRoutes(projectStore, extractor))
```

- [ ] **Step 4: Create data directory**

```bash
mkdir -p /home/daniel/src/forms-lab--story-3-pdf-upload/data
echo '*.db' > /home/daniel/src/forms-lab--story-3-pdf-upload/data/.gitignore
```

- [ ] **Step 5: Verify full build**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run --no-warnings tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Run all tests**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/app/server.tsx test/projects-routes.test.ts data/.gitignore
git commit -m "feat: wire database and extractor dependencies in server"
```

---

## Task 11: Error View and Retry Route Tests

**Files:**
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Add error and retry tests**

Add to `test/projects-routes.test.ts`:

```typescript
describe('GET /projects/:id (error state)', () => {
  it('shows error message and retry button', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Failed Project',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'error',
      error: 'Model timeout after 60 seconds',
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Extraction failed')
    expect(html).toContain('Model timeout after 60 seconds')
    expect(html).toContain('Retry')
  })
})

describe('POST /projects/:id/retry', () => {
  it('resets status to extracting and redirects', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Retry Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, { status: 'error', error: 'timeout' })

    const res = await app.request(`/projects/${project.id}/retry`, {
      method: 'POST',
    })
    expect(res.status).toBe(302)

    // Give async extraction a tick to start
    await new Promise((r) => setTimeout(r, 50))
    const updated = projectStore.get(project.id)
    // Status should be 'ready' since stub extractor resolves immediately
    expect(updated!.status).toBe('ready')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/projects-routes.test.ts
```

Expected: PASS — all 10+ tests.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add test/projects-routes.test.ts
git commit -m "test: add error state and retry route tests"
```

---

## Task 12: Confidence Badge Display Tests

**Files:**
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Add confidence badge tests**

Add to `test/projects-routes.test.ts`:

```typescript
describe('Confidence indicators', () => {
  it('shows badge for low-confidence fields', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Confidence Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'ready',
      spec: {
        id: 'spec-1',
        title: 'Test',
        description: '',
        groups: [
          {
            id: 'g1',
            title: 'Group',
            requirements: [
              {
                id: 'low-conf',
                fieldName: 'ambiguous',
                label: 'Ambiguous Field',
                fieldType: 'text',
                required: true,
              },
              {
                id: 'high-conf',
                fieldName: 'clear',
                label: 'Clear Field',
                fieldType: 'text',
                required: true,
              },
            ],
          },
        ],
      },
      formSpec: {
        id: 'form-1',
        specId: 'spec-1',
        title: 'Test',
        pages: [],
        createdAt: '',
        updatedAt: '',
      },
      confidence: [
        { fieldId: 'low-conf', confidence: 0.3, flags: ['ambiguous-type'] },
        { fieldId: 'high-conf', confidence: 0.95 },
      ],
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Low confidence')
    // High confidence field should NOT have a badge
    expect(html).not.toContain('Review') // 0.95 is above 0.8 threshold
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun test test/projects-routes.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add test/projects-routes.test.ts
git commit -m "test: add confidence badge display tests"
```

---

## Task 13: Full Check and Push

- [ ] **Step 1: Run full check**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bun run check
```

Expected: Lint, type check, and all tests pass.

- [ ] **Step 2: Fix any lint/format issues**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
bunx @biomejs/biome check --write .
```

If changes are needed, commit them:

```bash
git add -u
git commit -m "style: fix lint and formatting issues"
```

- [ ] **Step 3: Push**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git push
```
