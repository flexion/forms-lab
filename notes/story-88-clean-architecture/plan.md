# Clean Architecture Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the codebase so route handlers are thin (parse request, call service, render response) and services own all business logic with clean, intent-revealing public interfaces.

**Architecture:** Route-driven extraction — move logic out of controllers into existing or new service methods, guided by what callers actually need. Five phases: cross-cutting, forms, owner/authoring, infrastructure, form-authoring integration.

**Tech Stack:** Bun, Hono (middleware + JSX), TypeScript, existing test suite as safety net.

---

## File Structure

### New files

- `src/entrypoints/app/middleware/require-project-owner.ts` — Hono middleware for owner-write guards
- `src/entrypoints/app/middleware/json-errors.ts` — Hono error handler for JSON API routes
- `src/services/variant-preferences/badge.ts` — Badge resolution utility
- `src/services/forms/visibility.ts` — filterVisibleGroups, buildReviewPages
- `src/services/forms/submission.ts` — submitForm, getSubmissionContext, generateFilledPdf
- `src/services/forms/conversation.ts` — initializeConversation, advanceConversation, isConversationFinished
- `src/services/storage/types.ts` — CacheStore, ProjectStore interfaces
- `src/services/storage/sqlite-cache-store.ts` — SQLite CacheStore implementation
- `src/services/storage/sqlite-project-store.ts` — SQLite ProjectStore implementation
- `test/services/forms/visibility.test.ts` — Tests for extracted visibility functions
- `test/services/forms/submission.test.ts` — Tests for submission orchestration
- `test/services/forms/conversation.test.ts` — Tests for conversation lifecycle
- `test/services/variant-preferences/badge.test.ts` — Tests for badge resolution

### Modified files

- `src/entrypoints/app/routes/forms/index.tsx` — Remove extracted logic, call service methods
- `src/entrypoints/app/routes/owner/index.tsx` — Use badge utility
- `src/entrypoints/app/routes/owner/edit/index.tsx` — Use middleware, extract composeExplanation + shapeWithPreference
- `src/entrypoints/app/routes/owner/edit/authoring.tsx` — Use middleware, slim handlers (story-87 branch)
- `src/entrypoints/app/routes/owner/compare/index.tsx` — Use badge utility
- `src/services/forms/index.ts` — Add new exports, reorganize, rename Sqlite* → factory functions
- `src/services/forms/shaping/humanize.ts` — Add composeExplanation
- `src/services/variant-preferences/index.ts` — Add badge exports
- `src/services/storage/index.ts` — Re-export from split files
- `src/services/extraction/index.ts` — Group model IDs into object
- `src/services/evaluation/index.ts` — Reorder with section comments

---

## Task 1: Create branch and worktree

**Files:**
- None (git setup)

- [ ] **Step 1: Create branch off story-87/rag-authoring-pipeline**

```bash
git checkout story-87/rag-authoring-pipeline
git pull
git checkout -b story-88/clean-architecture
```

- [ ] **Step 2: Verify tests pass on the base branch**

Run: `bun run check`
Expected: All lint, type checks, and tests pass.

- [ ] **Step 3: Push branch to establish remote tracking**

```bash
git push -u origin story-88/clean-architecture
```

---

## Task 2: Badge resolution utility (Phase 1b)

Starting with this because it has no dependencies and is consumed by later tasks.

**Files:**
- Create: `src/services/variant-preferences/badge.ts`
- Create: `test/services/variant-preferences/badge.test.ts`
- Modify: `src/services/variant-preferences/index.ts`

- [ ] **Step 1: Write failing test for resolveVariantBadge**

```typescript
// test/services/variant-preferences/badge.test.ts
import { describe, expect, it } from 'bun:test'
import { resolveShapingBadgeFromLog, resolveVariantBadge } from '../../../src/services/variant-preferences'

describe('resolveVariantBadge', () => {
  const registry = {
    list: () => [
      { id: 'hybrid-v1', metadata: { name: 'Hybrid V1' } },
      { id: 'basic', metadata: { name: 'Basic' } },
    ],
  }

  it('returns variant name from registry', () => {
    const result = resolveVariantBadge(registry, 'hybrid-v1')
    expect(result).toEqual({ variantId: 'hybrid-v1', variantName: 'Hybrid V1' })
  })

  it('falls back to raw ID when variant not in registry', () => {
    const result = resolveVariantBadge(registry, 'unknown-variant')
    expect(result).toEqual({ variantId: 'unknown-variant', variantName: 'unknown-variant' })
  })
})

describe('resolveShapingBadgeFromLog', () => {
  const registry = {
    list: () => [
      { id: 'hybrid-v1', metadata: { name: 'Hybrid V1' } },
    ],
  }

  it('returns badge from most recent LLM entry with variantId', () => {
    const log = [
      { source: 'manual' as const, variantId: undefined },
      { source: 'llm' as const, variantId: 'hybrid-v1' },
      { source: 'manual' as const, variantId: undefined },
    ]
    const result = resolveShapingBadgeFromLog(log, registry)
    expect(result).toEqual({ variantId: 'hybrid-v1', variantName: 'Hybrid V1' })
  })

  it('returns null when no LLM entries with variantId exist', () => {
    const log = [
      { source: 'manual' as const, variantId: undefined },
    ]
    const result = resolveShapingBadgeFromLog(log, registry)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/services/variant-preferences/badge.test.ts`
Expected: FAIL — cannot resolve `resolveVariantBadge` from the service.

- [ ] **Step 3: Implement badge resolution**

```typescript
// src/services/variant-preferences/badge.ts

interface VariantListItem {
  id: string
  metadata: { name: string }
}

interface VariantListable {
  list(): VariantListItem[]
}

interface LogEntryLike {
  source: string
  variantId?: string
}

export function resolveVariantBadge(
  registry: VariantListable,
  variantId: string,
): { variantId: string; variantName: string } {
  const meta = registry.list().find((v) => v.id === variantId)
  return { variantId, variantName: meta?.metadata.name ?? variantId }
}

export function resolveShapingBadgeFromLog(
  log: LogEntryLike[],
  registry: VariantListable,
): { variantId: string; variantName: string } | null {
  const lastLlmEntry = [...log]
    .reverse()
    .find((e) => e.source === 'llm' && e.variantId)
  if (!lastLlmEntry?.variantId) return null
  return resolveVariantBadge(registry, lastLlmEntry.variantId)
}
```

- [ ] **Step 4: Export from service index**

Add to `src/services/variant-preferences/index.ts`:

```typescript
export { resolveShapingBadgeFromLog, resolveVariantBadge } from './badge'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/services/variant-preferences/badge.test.ts`
Expected: PASS

- [ ] **Step 6: Run full check**

Run: `bun run check`
Expected: All pass (no breaking changes — new code only).

- [ ] **Step 7: Commit**

```bash
git add src/services/variant-preferences/badge.ts src/services/variant-preferences/index.ts test/services/variant-preferences/badge.test.ts
git commit -m "feat(variant-preferences): add badge resolution utility

Extract duplicated badge resolution logic from owner, edit, and compare
routes into a shared service function."
```

---

## Task 3: JSON API error middleware (Phase 1c)

**Files:**
- Create: `src/entrypoints/app/middleware/json-errors.ts`

- [ ] **Step 1: Create the error middleware**

```typescript
// src/entrypoints/app/middleware/json-errors.ts
import type { Context, ErrorHandler } from 'hono'
import { AppError } from '../../../shared/errors'

export const jsonErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as 400 | 401 | 403 | 404)
  }
  console.error(`[${c.req.method} ${c.req.path}]`, err)
  return c.json(
    { error: err instanceof Error ? err.message : String(err) },
    500,
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `bun run --no-warnings tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/app/middleware/json-errors.ts
git commit -m "feat(middleware): add JSON API error handler

Shared error handler for JSON endpoints — maps AppError subclasses to
status codes and logs with route context."
```

---

## Task 4: Owner project guard middleware (Phase 1a)

**Files:**
- Create: `src/entrypoints/app/middleware/require-project-owner.ts`

- [ ] **Step 1: Create the middleware**

```typescript
// src/entrypoints/app/middleware/require-project-owner.ts
import { createMiddleware } from 'hono/factory'
import type { SessionUser } from '../../../services/auth'
import type { ProjectService, ProjectView } from '../../../services/projects'
import { ForbiddenError, UnauthenticatedError } from '../../../shared/errors'

declare module 'hono' {
  interface ContextVariableMap {
    projectView: ProjectView
  }
}

export function requireProjectOwner(service: ProjectService) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user') as SessionUser | null
    if (!user) throw new UnauthenticatedError()

    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const branch = c.req.param('branch')

    if (branch === 'main') {
      throw new ForbiddenError('main is read-only')
    }

    const view = await service.getProject(owner, slug, user, branch)
    if (!view.isOwner) throw new ForbiddenError()

    c.set('projectView', view)
    await next()
  })
}
```

- [ ] **Step 2: Verify types compile**

Run: `bun run --no-warnings tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/app/middleware/require-project-owner.ts
git commit -m "feat(middleware): add requireProjectOwner guard

Extracts auth, branch-write protection, and ownership checks into
reusable Hono middleware. Sets projectView on context for handlers."
```

---

## Task 5: Move visibility functions to forms service (Phase 2a)

**Files:**
- Create: `src/services/forms/visibility.ts`
- Create: `test/services/forms/visibility.test.ts`
- Modify: `src/services/forms/index.ts`
- Modify: `src/entrypoints/app/routes/forms/index.tsx` (later, in Task 9)

- [ ] **Step 1: Write failing test for filterVisibleGroups**

```typescript
// test/services/forms/visibility.test.ts
import { describe, expect, it } from 'bun:test'
import { buildReviewPages, filterVisibleGroups } from '../../../src/services/forms'

describe('filterVisibleGroups', () => {
  it('returns all groups when no conditions are set', () => {
    const groups = [
      { id: 'g1', title: 'Group 1', requirements: [{ id: 'r1', fieldName: 'name', label: 'Name', fieldType: 'text' as const, required: true }] },
    ]
    const fields = {}
    const result = filterVisibleGroups(groups, fields)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g1')
  })

  it('filters out groups whose condition is not met', () => {
    const groups = [
      { id: 'g1', title: 'G1', requirements: [], condition: { field: 'toggle', operator: 'equals' as const, value: 'yes' } },
      { id: 'g2', title: 'G2', requirements: [] },
    ]
    const fields = { toggle: { value: 'no' } }
    const result = filterVisibleGroups(groups, fields)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g2')
  })

  it('filters out requirements whose condition is not met', () => {
    const groups = [
      {
        id: 'g1',
        title: 'G1',
        requirements: [
          { id: 'r1', fieldName: 'always', label: 'Always', fieldType: 'text' as const, required: true },
          { id: 'r2', fieldName: 'conditional', label: 'Conditional', fieldType: 'text' as const, required: false, condition: { field: 'toggle', operator: 'equals' as const, value: 'yes' } },
        ],
      },
    ]
    const fields = { toggle: { value: 'no' } }
    const result = filterVisibleGroups(groups, fields)
    expect(result[0].requirements).toHaveLength(1)
    expect(result[0].requirements[0].fieldName).toBe('always')
  })
})

describe('buildReviewPages', () => {
  it('builds review pages from resolved form', () => {
    const resolved = {
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      dataSpec: { id: 's1', title: 'Test', groups: [] },
      pages: [
        {
          page: { id: 'p1', title: 'Page 1', groups: ['g1'] },
          groups: [
            { id: 'g1', title: 'G1', requirements: [{ id: 'r1', fieldName: 'name', label: 'Name', fieldType: 'text' as const, required: true }] },
          ],
        },
      ],
    }
    const fields = {}
    const result = buildReviewPages(resolved, fields)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
    expect(result[0].title).toBe('Page 1')
    expect(result[0].groups[0].requirements[0].fieldName).toBe('name')
  })

  it('excludes pages whose condition is not met', () => {
    const resolved = {
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      dataSpec: { id: 's1', title: 'Test', groups: [] },
      pages: [
        {
          page: { id: 'p1', title: 'Page 1', groups: ['g1'], condition: { field: 'x', operator: 'equals' as const, value: 'yes' } },
          groups: [{ id: 'g1', title: 'G1', requirements: [] }],
        },
      ],
    }
    const fields = { x: { value: 'no' } }
    const result = buildReviewPages(resolved, fields)
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/services/forms/visibility.test.ts`
Expected: FAIL — `filterVisibleGroups` is not exported from forms service.

- [ ] **Step 3: Implement visibility.ts**

```typescript
// src/services/forms/visibility.ts
import type { RequirementGroup } from '../data-collection'
import { evaluateCondition } from './resolver'
import type { FieldEntry, ResolvedForm } from './types'

export function filterVisibleGroups(
  groups: RequirementGroup[],
  fields: Record<string, FieldEntry>,
): RequirementGroup[] {
  return groups
    .filter((g) => evaluateCondition(g.condition, fields))
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) =>
        evaluateCondition(r.condition, fields),
      ),
    }))
}

export function buildReviewPages(
  resolved: ResolvedForm,
  fields: Record<string, FieldEntry>,
): Array<{
  id: string
  title: string
  groups: Array<{
    id: string
    requirements: Array<{ fieldName: string; label: string }>
  }>
}> {
  return resolved.pages
    .filter((rp) => evaluateCondition(rp.page.condition, fields))
    .map((rp) => ({
      id: rp.page.id,
      title: rp.page.title,
      groups: filterVisibleGroups(rp.groups, fields).map((g) => ({
        id: g.id,
        requirements: g.requirements.map((r) => ({
          fieldName: r.fieldName,
          label: r.label,
        })),
      })),
    }))
}
```

- [ ] **Step 4: Export from forms service index**

Add to `src/services/forms/index.ts`:

```typescript
export { buildReviewPages, filterVisibleGroups } from './visibility'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/services/forms/visibility.test.ts`
Expected: PASS

- [ ] **Step 6: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/forms/visibility.ts src/services/forms/index.ts test/services/forms/visibility.test.ts
git commit -m "feat(forms): extract visibility functions from route into service

Move filterVisibleGroups and buildReviewPages into forms service where
they belong alongside the existing navigation functions."
```

---

## Task 6: Submission orchestration (Phase 2b, 2c, 2d)

**Files:**
- Create: `src/services/forms/submission.ts`
- Create: `test/services/forms/submission.test.ts`
- Modify: `src/services/forms/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// test/services/forms/submission.test.ts
import { describe, expect, it } from 'bun:test'
import { generateFilledPdf, getSubmissionContext, submitForm } from '../../../src/services/forms'

describe('submitForm', () => {
  it('submits session, saves submission, and caches snapshot', () => {
    const submission = { id: 'sub-1', specId: 's1', formSpecId: 'f1', ownerId: 'u1', data: { name: 'Jane' }, submittedAt: '2026-01-01', specVersion: 'sha1', sessionId: 'sess-1' }
    const sessionGateway = {
      submit: (id: string) => { expect(id).toBe('sess-1'); return submission },
    }
    const submissionGateway = {
      save: (s: unknown) => { expect(s).toBe(submission) },
    }
    let snapshotPut = false
    const specSnapshotStore = {
      put: (_version: string, _specId: string, _ds: unknown, _fs: unknown) => { snapshotPut = true },
    }
    const specs = {
      dataSpec: { id: 's1', title: 'Test', groups: [] },
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      sha: 'sha1',
    }

    const result = submitForm(
      { sessionGateway: sessionGateway as any, submissionGateway: submissionGateway as any, specSnapshotStore: specSnapshotStore as any },
      'sess-1',
      specs,
    )

    expect(result).toBe(submission)
    expect(snapshotPut).toBe(true)
  })

  it('works without specSnapshotStore', () => {
    const submission = { id: 'sub-1', specId: 's1', formSpecId: 'f1', ownerId: 'u1', data: {}, submittedAt: '2026-01-01', specVersion: 'sha1', sessionId: 'sess-1' }
    const sessionGateway = { submit: () => submission }
    const submissionGateway = { save: () => {} }
    const specs = { dataSpec: { id: 's1', title: 'T', groups: [] }, formSpec: { id: 'f1', specId: 's1', title: 'T', pages: [] }, sha: 'sha1' }

    const result = submitForm(
      { sessionGateway: sessionGateway as any, submissionGateway: submissionGateway as any },
      'sess-1',
      specs,
    )
    expect(result.id).toBe('sub-1')
  })
})

describe('getSubmissionContext', () => {
  it('returns snapshot data when available', async () => {
    const snapshot = {
      specVersion: 'sha1',
      specId: 's1',
      dataCollectionSpec: { id: 's1', title: 'T', groups: [] },
      formSpec: { id: 'f1', specId: 's1', title: 'T', pages: [] },
      cachedAt: '2026-01-01',
    }
    const deps = {
      specSnapshotStore: { get: (_v: string) => snapshot },
      getSpecs: async () => null,
    }

    const result = await getSubmissionContext(deps as any, 'sha1', 's1')
    expect(result).not.toBeNull()
    expect(result!.dataSpec.id).toBe('s1')
  })

  it('falls back to getSpecs when no snapshot', async () => {
    const specs = { dataSpec: { id: 's1', title: 'T', groups: [] }, formSpec: { id: 'f1', specId: 's1', title: 'T', pages: [] }, sha: 'sha1' }
    const deps = {
      specSnapshotStore: { get: () => null },
      getSpecs: async (specId: string) => specId === 's1' ? specs : null,
    }

    const result = await getSubmissionContext(deps as any, 'sha1', 's1')
    expect(result).not.toBeNull()
    expect(result!.dataSpec.id).toBe('s1')
  })

  it('returns null when neither source has data', async () => {
    const deps = {
      specSnapshotStore: { get: () => null },
      getSpecs: async () => null,
    }
    const result = await getSubmissionContext(deps as any, 'sha1', 's1')
    expect(result).toBeNull()
  })
})

describe('generateFilledPdf', () => {
  it('returns filled PDF buffer', async () => {
    const pdfBuffer = Buffer.from('fake-pdf')
    const mapping = { fields: [] }
    const filledBuffer = Buffer.from('filled-pdf')

    const result = await generateFilledPdf(
      { specId: 's1', specVersion: 'sha1', data: { name: 'Jane' } } as any,
      async () => pdfBuffer,
      async () => mapping as any,
      async (_pdf, _mapping, _data) => ({ pdf: filledBuffer, unmapped: [] }),
    )
    expect(result).not.toBeNull()
  })

  it('returns null when source PDF not available', async () => {
    const result = await generateFilledPdf(
      { specId: 's1', specVersion: 'sha1', data: {} } as any,
      async () => null,
      async () => ({ fields: [] }) as any,
      async () => ({ pdf: Buffer.from(''), unmapped: [] }),
    )
    expect(result).toBeNull()
  })

  it('returns null when field mapping not available', async () => {
    const result = await generateFilledPdf(
      { specId: 's1', specVersion: 'sha1', data: {} } as any,
      async () => Buffer.from('pdf'),
      async () => null,
      async () => ({ pdf: Buffer.from(''), unmapped: [] }),
    )
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/forms/submission.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement submission.ts**

```typescript
// src/services/forms/submission.ts
import type { DataCollectionSpec } from '../data-collection'
import type { FormSessionGateway, FormSpec, Submission, SubmissionGateway } from './types'
import type { SpecSnapshotStore } from './spec-snapshot-store'

export interface ResolvedSpecs {
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
  sha: string
}

export interface SubmitFormDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  specSnapshotStore?: SpecSnapshotStore
}

export function submitForm(
  deps: SubmitFormDeps,
  sessionId: string,
  specs: ResolvedSpecs,
): Submission {
  const submission = deps.sessionGateway.submit(sessionId)
  deps.submissionGateway.save(submission)
  deps.specSnapshotStore?.put(
    specs.sha,
    specs.dataSpec.id,
    specs.dataSpec,
    specs.formSpec,
  )
  return submission
}

export interface GetSubmissionContextDeps {
  specSnapshotStore?: SpecSnapshotStore
  getSpecs: (specId: string, ref?: string) => Promise<ResolvedSpecs | null>
}

export async function getSubmissionContext(
  deps: GetSubmissionContextDeps,
  specVersion: string,
  specId: string,
): Promise<{ dataSpec: DataCollectionSpec; formSpec: FormSpec } | null> {
  const snapshot = deps.specSnapshotStore?.get(specVersion)
  if (snapshot) {
    return {
      dataSpec: snapshot.dataCollectionSpec,
      formSpec: snapshot.formSpec,
    }
  }
  const specs = await deps.getSpecs(specId)
  if (!specs) return null
  return { dataSpec: specs.dataSpec, formSpec: specs.formSpec }
}

export async function generateFilledPdf(
  submission: { specId: string; specVersion: string; data: Record<string, unknown> },
  getSourcePdf: (specId: string, specVersion: string) => Promise<Buffer | null>,
  getFieldMapping: (specId: string, specVersion: string) => Promise<unknown | null>,
  fillPdf: (pdf: Buffer, mapping: unknown, data: Record<string, unknown>) => Promise<{ pdf: Buffer }>,
): Promise<Buffer | null> {
  const sourcePdf = await getSourcePdf(submission.specId, submission.specVersion)
  if (!sourcePdf) return null

  const fieldMapping = await getFieldMapping(submission.specId, submission.specVersion)
  if (!fieldMapping) return null

  const result = await fillPdf(sourcePdf, fieldMapping, submission.data)
  return result.pdf
}
```

- [ ] **Step 4: Export from forms service index**

Add to `src/services/forms/index.ts`:

```typescript
export { generateFilledPdf, getSubmissionContext, type ResolvedSpecs, type SubmitFormDeps, submitForm } from './submission'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test test/services/forms/submission.test.ts`
Expected: PASS

- [ ] **Step 6: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/forms/submission.ts src/services/forms/index.ts test/services/forms/submission.test.ts
git commit -m "feat(forms): add submission orchestration functions

Extract submitForm, getSubmissionContext, and generateFilledPdf from
the forms route into the service layer."
```

---

## Task 7: Conversation service methods (Phase 2e)

**Files:**
- Create: `src/services/forms/conversation.ts`
- Create: `test/services/forms/conversation.test.ts`
- Modify: `src/services/forms/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// test/services/forms/conversation.test.ts
import { describe, expect, it } from 'bun:test'
import { advanceConversation, initializeConversation, isConversationFinished } from '../../../src/services/forms'

describe('isConversationFinished', () => {
  it('returns true when last assistant message indicates completion', () => {
    const messages = [
      { id: '1', sessionId: 's1', role: 'assistant' as const, content: 'You are all set! Everything is complete.', createdAt: '2026-01-01' },
    ]
    expect(isConversationFinished(messages)).toBe(true)
  })

  it('returns false when last message is from user', () => {
    const messages = [
      { id: '1', sessionId: 's1', role: 'user' as const, content: 'complete', createdAt: '2026-01-01' },
    ]
    expect(isConversationFinished(messages)).toBe(false)
  })

  it('returns false when assistant message does not indicate completion', () => {
    const messages = [
      { id: '1', sessionId: 's1', role: 'assistant' as const, content: 'What is your name?', createdAt: '2026-01-01' },
    ]
    expect(isConversationFinished(messages)).toBe(false)
  })

  it('returns false for empty messages', () => {
    expect(isConversationFinished([])).toBe(false)
  })
})

describe('initializeConversation', () => {
  it('returns existing messages if conversation already started', async () => {
    const existing = [
      { id: '1', sessionId: 's1', role: 'assistant' as const, content: 'Hello!', createdAt: '2026-01-01' },
    ]
    const gateway = { getMessages: () => existing, appendMessage: () => {} }
    const agent = { advance: async () => ({ message: '', fieldsCollected: {}, finished: false, toolCalls: [] }) }
    const page = { page: { id: 'p1', title: 'P', groups: [] }, groups: [] }

    const result = await initializeConversation(gateway as any, agent as any, 's1', page as any, {})
    expect(result).toEqual(existing)
  })

  it('generates initial greeting when no messages exist', async () => {
    const messages: any[] = []
    const gateway = {
      getMessages: () => messages,
      appendMessage: (_id: string, msg: any) => { messages.push(msg) },
    }
    const agent = {
      advance: async () => ({ message: 'Hello! How can I help?', fieldsCollected: {}, finished: false, toolCalls: [] }),
    }
    const page = { page: { id: 'p1', title: 'P', groups: [] }, groups: [] }

    const result = await initializeConversation(gateway as any, agent as any, 's1', page as any, {})
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('assistant')
    expect(result[0].content).toBe('Hello! How can I help?')
  })
})

describe('advanceConversation', () => {
  it('appends user and assistant messages and returns response', async () => {
    const messages: any[] = []
    const gateway = {
      getMessages: () => [...messages],
      appendMessage: (_id: string, msg: any) => { messages.push(msg) },
    }
    const agent = {
      advance: async () => ({ message: 'Got it!', fieldsCollected: { name: { value: 'Jane' } }, finished: false, toolCalls: [] }),
    }
    const sessionGateway = {
      writeFields: (_id: string, _fields: any) => {},
    }
    const page = { page: { id: 'p1', title: 'P', groups: [] }, groups: [] }

    const result = await advanceConversation(gateway as any, agent as any, sessionGateway as any, 's1', page as any, {}, 'My name is Jane')
    expect(result.message).toBe('Got it!')
    expect(result.finished).toBe(false)
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
  })

  it('writes collected fields to session', async () => {
    const messages: any[] = []
    const gateway = {
      getMessages: () => [...messages],
      appendMessage: (_id: string, msg: any) => { messages.push(msg) },
    }
    const collectedFields = { name: { value: 'Jane' } }
    const agent = {
      advance: async () => ({ message: 'Ok', fieldsCollected: collectedFields, finished: false, toolCalls: [] }),
    }
    let writtenFields: any = null
    const sessionGateway = {
      writeFields: (_id: string, fields: any) => { writtenFields = fields },
    }
    const page = { page: { id: 'p1', title: 'P', groups: [] }, groups: [] }

    await advanceConversation(gateway as any, agent as any, sessionGateway as any, 's1', page as any, {}, 'hi')
    expect(writtenFields).toEqual(collectedFields)
  })

  it('does not write fields when none collected', async () => {
    const messages: any[] = []
    const gateway = {
      getMessages: () => [...messages],
      appendMessage: (_id: string, msg: any) => { messages.push(msg) },
    }
    const agent = {
      advance: async () => ({ message: 'Ok', fieldsCollected: {}, finished: false, toolCalls: [] }),
    }
    let writeFieldsCalled = false
    const sessionGateway = {
      writeFields: () => { writeFieldsCalled = true },
    }
    const page = { page: { id: 'p1', title: 'P', groups: [] }, groups: [] }

    await advanceConversation(gateway as any, agent as any, sessionGateway as any, 's1', page as any, {}, 'hi')
    expect(writeFieldsCalled).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/services/forms/conversation.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement conversation.ts**

```typescript
// src/services/forms/conversation.ts
import type { ConversationGateway, ConversationMessage, FillingAgent } from './filling-agent/types'
import type { FieldEntry, FormSessionGateway, ResolvedPage } from './types'

export function isConversationFinished(messages: ConversationMessage[]): boolean {
  if (messages.length === 0) return false
  const last = messages[messages.length - 1]
  if (last.role !== 'assistant') return false
  const lower = last.content.toLowerCase()
  return lower.includes('complete') || lower.includes('all set')
}

export async function initializeConversation(
  gateway: ConversationGateway,
  agent: FillingAgent,
  sessionId: string,
  page: ResolvedPage,
  fields: Record<string, FieldEntry>,
): Promise<ConversationMessage[]> {
  let messages = gateway.getMessages(sessionId)
  if (messages.length > 0) return messages

  const turn = await agent.advance(
    { groups: page.groups, collectedFields: fields, messages: [] },
    null,
  )

  const assistantMessage: ConversationMessage = {
    id: crypto.randomUUID(),
    sessionId,
    role: 'assistant',
    content: turn.message,
    toolCalls: turn.toolCalls,
    createdAt: new Date().toISOString(),
  }
  gateway.appendMessage(sessionId, assistantMessage)

  return gateway.getMessages(sessionId)
}

export async function advanceConversation(
  gateway: ConversationGateway,
  agent: FillingAgent,
  sessionGateway: FormSessionGateway,
  sessionId: string,
  page: ResolvedPage,
  fields: Record<string, FieldEntry>,
  userMessage: string,
): Promise<{ message: string; finished: boolean }> {
  const messages = gateway.getMessages(sessionId)

  const turn = await agent.advance(
    { groups: page.groups, collectedFields: fields, messages },
    userMessage,
  )

  gateway.appendMessage(sessionId, {
    id: crypto.randomUUID(),
    sessionId,
    role: 'user',
    content: userMessage,
    createdAt: new Date().toISOString(),
  })

  gateway.appendMessage(sessionId, {
    id: crypto.randomUUID(),
    sessionId,
    role: 'assistant',
    content: turn.message,
    toolCalls: turn.toolCalls,
    createdAt: new Date().toISOString(),
  })

  if (Object.keys(turn.fieldsCollected).length > 0) {
    sessionGateway.writeFields(sessionId, turn.fieldsCollected)
  }

  return { message: turn.message, finished: turn.finished }
}
```

- [ ] **Step 4: Export from forms service index**

Add to `src/services/forms/index.ts`:

```typescript
export { advanceConversation, initializeConversation, isConversationFinished } from './conversation'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test test/services/forms/conversation.test.ts`
Expected: PASS

- [ ] **Step 6: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/forms/conversation.ts src/services/forms/index.ts test/services/forms/conversation.test.ts
git commit -m "feat(forms): extract conversation lifecycle into service

Move initializeConversation, advanceConversation, and
isConversationFinished from the forms route into the service layer."
```

---

## Task 8: Move composeExplanation to forms/shaping (Phase 3c)

**Files:**
- Modify: `src/services/forms/shaping/humanize.ts`
- Modify: `src/services/forms/index.ts`
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx` (later, in Task 11)

- [ ] **Step 1: Add composeExplanation to humanize.ts**

Append to `src/services/forms/shaping/humanize.ts`:

```typescript
import { executeBatch } from './executor'

export function composeExplanation(
  commands: Command[],
  summary: string | undefined,
  formSpec: ProjectState['formSpec'],
  dataSpec: ProjectState['dataSpec'],
): string {
  let state: ProjectState = { formSpec, dataSpec }
  const lines: string[] = []
  for (const command of commands) {
    lines.push(`- ${humanize(command, state)}`)
    const next = executeBatch(state, [command])
    if (next.ok) state = next.state
  }
  if (summary) return [summary, '', ...lines].join('\n')
  return lines.join('\n')
}
```

- [ ] **Step 2: Export from forms service index**

Add to `src/services/forms/index.ts`:

```typescript
export { composeExplanation } from './shaping/humanize'
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `bun test test/forms/shaping/`
Expected: PASS (no behavior change — function is identical, just relocated).

- [ ] **Step 4: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/humanize.ts src/services/forms/index.ts
git commit -m "feat(forms/shaping): move composeExplanation into service

This function iterates commands and humanizes them with progressive
state tracking — it's shaping business logic, not route logic."
```

---

## Task 9: Update forms route to use extracted service methods (Phase 2)

This is the key refactoring step — the forms route handler shrinks significantly.

**Files:**
- Modify: `src/entrypoints/app/routes/forms/index.tsx`

- [ ] **Step 1: Replace inline visibility functions with service imports**

In `src/entrypoints/app/routes/forms/index.tsx`, remove the `filterVisibleGroups` and `buildReviewPages` function definitions (lines ~88-119) and replace with an import:

```typescript
import {
  buildReviewPages,
  filterVisibleGroups,
  // ... existing imports
} from '../../../../services/forms'
```

- [ ] **Step 2: Replace handleSubmit body with submitForm call**

Replace the body of `handleSubmit` (the three sequential calls) with:

```typescript
import { submitForm } from '../../../../services/forms'

// Inside handleSubmit, replace:
//   const submission = sessionGateway.submit(session.id)
//   submissionGateway.save(submission)
//   specSnapshotStore?.put(...)
// With:
const submission = submitForm(
  { sessionGateway, submissionGateway, specSnapshotStore },
  session.id,
  specs,
)
```

- [ ] **Step 3: Replace handleSubmissionDetail spec-lookup with getSubmissionContext**

Replace the inline snapshot/fallback logic with:

```typescript
import { getSubmissionContext } from '../../../../services/forms'

// Inside handleSubmissionDetail, replace the spec resolution block with:
const context = await getSubmissionContext(
  { specSnapshotStore, getSpecs },
  session.specVersion,
  session.specId,
)
if (!context) return c.notFound()
const { dataSpec, formSpec } = context
```

- [ ] **Step 4: Replace handlePdfDownload with generateFilledPdf**

```typescript
import { generateFilledPdf } from '../../../../services/forms'
import { fillPdf } from '../../../../services/form-documents'

// Inside handlePdfDownload, replace the chain with:
const pdfBuffer = await generateFilledPdf(
  submission,
  getSourcePdf!,
  getFieldMapping!,
  fillPdf,
)
if (!pdfBuffer) return c.notFound()
```

- [ ] **Step 5: Replace handleChatView conversation logic with service methods**

```typescript
import { initializeConversation, isConversationFinished } from '../../../../services/forms'

// Replace the "Get conversation messages" and "If no messages" blocks with:
const messages = await initializeConversation(
  conversationGateway,
  fillingAgent,
  sessionId,
  page,
  session.fields,
)
const finished = isConversationFinished(messages)
```

- [ ] **Step 6: Replace handleChatMessage orchestration with advanceConversation**

```typescript
import { advanceConversation } from '../../../../services/forms'

// Replace the agent call + message appending + field writing with:
let turn: { message: string; finished: boolean }
try {
  turn = await advanceConversation(
    conversationGateway,
    fillingAgent,
    sessionGateway,
    sessionId,
    page,
    session.fields,
    userMessage,
  )
} catch (error) {
  // existing error handling
}
```

- [ ] **Step 7: Remove the now-unused ResolvedSpecs interface from the route**

The route's local `ResolvedSpecs` interface can be replaced with the import from the service:

```typescript
import { type ResolvedSpecs } from '../../../../services/forms'
```

- [ ] **Step 8: Run the full test suite**

Run: `bun run check`
Expected: All pass — behavior is identical.

- [ ] **Step 9: Commit**

```bash
git add src/entrypoints/app/routes/forms/index.tsx
git commit -m "refactor(forms/routes): use extracted service methods

Replace inline business logic with calls to forms service methods:
filterVisibleGroups, buildReviewPages, submitForm, getSubmissionContext,
generateFilledPdf, initializeConversation, advanceConversation."
```

---

## Task 10: Update owner routes to use badge utility (Phase 1b applied)

**Files:**
- Modify: `src/entrypoints/app/routes/owner/index.tsx`
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`
- Modify: `src/entrypoints/app/routes/owner/compare/index.tsx`

- [ ] **Step 1: Replace resolveExtractionBadge in owner/index.tsx**

Remove the inline `resolveExtractionBadge` function and replace with:

```typescript
import { resolveVariantBadge } from '../../../../services/variant-preferences'

// Replace:  const extractionBadge = extractionProvenance ? resolveExtractionBadge(...) : null
// With:     const extractionBadge = extractionProvenance ? resolveVariantBadge(extractionRegistry, extractionProvenance.variantId) : null
```

- [ ] **Step 2: Replace badge logic in edit/index.tsx**

Remove the inline shaping badge derivation (lines 91-103) and replace with:

```typescript
import { resolveShapingBadgeFromLog } from '../../../../../services/variant-preferences'

// Replace the lastLlmEntry + shapingBadge block with:
const shapingBadge = resolveShapingBadgeFromLog(log, shapingRegistry)
```

- [ ] **Step 3: Replace resolveShapingBadge in compare/index.tsx**

Remove the inline `resolveShapingBadge` function and replace with:

```typescript
import { resolveShapingBadgeFromLog, resolveVariantBadge } from '../../../../../services/variant-preferences'

// Remove the resolveShapingBadge function definition
// Replace the badge derivation at lines 95-100 with:
const shapingBadge = resolveShapingBadgeFromLog(log, { list: () => shapingVariants ?? [] })
```

- [ ] **Step 4: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/routes/owner/index.tsx src/entrypoints/app/routes/owner/edit/index.tsx src/entrypoints/app/routes/owner/compare/index.tsx
git commit -m "refactor(owner): use shared badge resolution utility

Replace 3 duplicated badge resolution implementations with calls to
the variant-preferences service."
```

---

## Task 11: Update edit route to use composeExplanation from service (Phase 3c)

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`

- [ ] **Step 1: Replace inline composeExplanation with service import**

Remove the `composeExplanation` function (lines 325-340) from the bottom of the file. Add import:

```typescript
import { composeExplanation } from '../../../../../services/forms'
```

The call site in the save handler stays the same — it already calls `composeExplanation(commands, body.summary, ...)`.

- [ ] **Step 2: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/index.tsx
git commit -m "refactor(edit): use composeExplanation from forms service

Remove duplicated function definition — now imported from the service
where shaping logic belongs."
```

---

## Task 12: Apply JSON error handler to edit route JSON endpoints (Phase 1c applied)

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`

- [ ] **Step 1: Apply jsonErrorHandler to the edit router**

At the top of `createEditRoutes`, after creating the Hono app, set the error handler:

```typescript
import { jsonErrorHandler } from '../../../../../entrypoints/app/middleware/json-errors'

// After: const app = new Hono()
app.onError(jsonErrorHandler)
```

Then remove the try/catch wrappers from the `intent` and `save` handlers that currently catch and return JSON errors manually. The middleware handles this now.

Note: Keep the `handleError` function for HTML routes (edit page, preview) — those need to render error pages, not JSON.

- [ ] **Step 2: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/index.tsx
git commit -m "refactor(edit): use JSON error middleware for API endpoints

Replace manual try/catch in intent and save handlers with shared
jsonErrorHandler middleware."
```

---

## Task 13: Storage service — separate interface from implementation (Phase 4a)

**Files:**
- Create: `src/services/storage/types.ts`
- Create: `src/services/storage/sqlite-cache-store.ts`
- Create: `src/services/storage/sqlite-project-store.ts`
- Modify: `src/services/storage/index.ts`

- [ ] **Step 1: Create types.ts with interfaces**

```typescript
// src/services/storage/types.ts
import type { NewProjectIndex, ProjectIndex, ProjectStatus } from '../../types/models'

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

export interface ProjectStore {
  create(project: NewProjectIndex): ProjectIndex
  get(id: string): ProjectIndex | null
  getBySlug(slug: string): ProjectIndex | null
  list(userId?: string): ProjectIndex[]
  update(
    id: string,
    changes: Partial<Pick<ProjectIndex, 'status' | 'error'>>,
  ): ProjectIndex
  delete(id: string): void
}
```

- [ ] **Step 2: Create sqlite-cache-store.ts**

Move the `createCacheStore` function from the current `index.ts` into this new file:

```typescript
// src/services/storage/sqlite-cache-store.ts
import { Database } from 'bun:sqlite'
import type { CacheEntry, CacheStore } from './types'

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
      const row = db
        .query('SELECT key, model, result, created_at FROM cache WHERE key = ?')
        .get(key) as { key: string; model: string; result: string; created_at: number } | null
      if (!row) return null
      return { key: row.key, model: row.model, result: row.result, createdAt: row.created_at }
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

- [ ] **Step 3: Create sqlite-project-store.ts**

Move the `createProjectStore` function from the current `index.ts` into this new file. Identical implementation, just relocated.

- [ ] **Step 4: Rewrite index.ts as re-exports only**

```typescript
// src/services/storage/index.ts
// Public interface for the storage service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export type { CacheEntry, CacheStore, ProjectStore } from './types'
export { createCacheStore } from './sqlite-cache-store'
export { createProjectStore } from './sqlite-project-store'
```

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: All pass — same exports, same behavior.

- [ ] **Step 6: Commit**

```bash
git add src/services/storage/
git commit -m "refactor(storage): separate interfaces from SQLite implementation

Split index.ts into types.ts (interfaces), sqlite-cache-store.ts, and
sqlite-project-store.ts. Public API unchanged — callers see only
interfaces and factory functions."
```

---

## Task 14: Extraction service — group model constants (Phase 4b)

**Files:**
- Create: `src/services/extraction/model-ids.ts`
- Modify: `src/services/extraction/index.ts`
- Modify: `src/services/extraction/models.ts`

- [ ] **Step 1: Check current models.ts content**

Read `src/services/extraction/models.ts` to see the existing constants.

- [ ] **Step 2: Keep models.ts as-is, but change index.ts to export a grouped object**

```typescript
// src/services/extraction/index.ts
export type { ExtractionExemplar } from './exemplars'
export { exemplars } from './exemplars'

export {
  HAIKU_MODEL_ID,
  NOVA_PRO_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from './models'

export { createExtractorRegistry } from './registry'
```

This is already clean enough — the model IDs are consumed by CLI and shaping registry which are composition-root level. Leave as-is. The grouped object idea from the design adds indirection without clear benefit since these are already named constants.

Skip this task — mark as not needed after assessment.

- [ ] **Step 3: Run full check to confirm no changes needed**

Run: `bun run check`
Expected: PASS

---

## Task 15: Evaluation service — semantic export grouping (Phase 4c)

**Files:**
- Modify: `src/services/evaluation/index.ts`

- [ ] **Step 1: Reorder exports with section comments**

```typescript
// src/services/evaluation/index.ts
// Public interface for the evaluation service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

// Harness
export { runEvaluation } from './harness'
export { evaluationRunSchema } from './schemas'
export type { RunResult } from './types'

// Kinds (pluggable evaluation strategies)
export { pdfFieldExtractionKind } from './kinds/pdf-field-extraction'
export { createLlmJudgeKind } from './kinds/pdf-field-extraction-judge'
export { shapingCommandsKind } from './kinds/shaping-commands'

// Judges
export { createBedrockFieldJudge } from './judge'

// Fixtures (consumed by CLI evaluate command)
export {
  fixtureProjectState,
  shapingIntentFixtures,
} from './fixtures/shaping-intents'
```

- [ ] **Step 2: Run full check**

Run: `bun run check`
Expected: PASS (biome may reorder — if so, add biome-ignore comment to preserve grouping or accept its ordering).

- [ ] **Step 3: Commit**

```bash
git add src/services/evaluation/index.ts
git commit -m "refactor(evaluation): organize exports by semantic group

Group exports into Harness, Kinds, Judges, and Fixtures sections for
readability."
```

---

## Task 16: Forms service — reorganize index.ts (Phase 4d)

**Files:**
- Modify: `src/services/forms/index.ts`

- [ ] **Step 1: Reorganize with semantic grouping and factory renames**

Rename the class exports to factory-style names. Create thin wrapper functions if needed, or use `export { SqliteConversationGateway as createConversationGateway }` pattern.

```typescript
// src/services/forms/index.ts
// Public interface for the forms service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

// Navigation & visibility
export {
  countVisiblePages,
  findNextPage,
  findPrevPage,
  visiblePageNumber,
} from './navigation'
export { buildReviewPages, filterVisibleGroups } from './visibility'

// Resolution & validation
export { evaluateCondition, resolveFormSpec } from './resolver'
export { validateFields } from './validation'

// Submission
export {
  generateFilledPdf,
  getSubmissionContext,
  type ResolvedSpecs,
  submitForm,
  type SubmitFormDeps,
} from './submission'
export { createSpecSnapshotStore } from './spec-snapshot-store'

// Conversation (filling)
export {
  advanceConversation,
  initializeConversation,
  isConversationFinished,
} from './conversation'
export { createFillingRegistry } from './filling/registry'
export {
  BedrockFillingAgent,
  ScriptedFillingAgent,
  SqliteConversationGateway,
} from './filling-agent'
export type { ConversationGateway, FillingAgent } from './filling-agent/types'

// Sessions & gateways
export { SqliteFormSessionGateway } from './sqlite-session-gateway'
export { SqliteSubmissionGateway } from './sqlite-submission-gateway'

// Shaping
export { composeExplanation, humanize } from './shaping/humanize'
export type { Command, ProjectState } from './shaping/commands'
export { commandSchema } from './shaping/commands'
export { executeBatch } from './shaping/executor'
export { createShapingRegistry } from './shaping/registry'
export type { FormShaper } from './shaping/types'

// Comparison
export type { ChangeCategory, ChangeResource, SpecChange } from './comparison'
export { compareSpecs } from './comparison'

// Review
export type { Comment, ReviewService } from './review'
export { createReviewService } from './review'

// Types
export type {
  FieldEntry,
  FormPage,
  FormSessionGateway,
  FormSpec,
  ResolvedForm,
  ResolvedPage,
  Submission,
  SubmissionGateway,
} from './types'
```

Note: Keep concrete class names (`SqliteConversationGateway`, etc.) for now — renaming them to factory functions requires updating all construction sites in entrypoints, which is a separate commit. The semantic grouping is the primary win here.

- [ ] **Step 2: Run full check**

Run: `bun run check`
Expected: PASS. Biome may reorder — if so, remove section comments and let biome sort (the file header comment already documents the grouping intent).

- [ ] **Step 3: Commit**

```bash
git add src/services/forms/index.ts
git commit -m "refactor(forms): reorganize index.ts by semantic group

Group 30+ exports into Navigation, Resolution, Submission,
Conversation, Sessions, Shaping, Comparison, Review, and Types."
```

---

## Task 17: Apply owner guard middleware to authoring routes (Phase 3a — story-87)

This task modifies the authoring route from story-87 branch.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/authoring.tsx`

- [ ] **Step 1: Apply middleware and jsonErrorHandler**

At the top of `createAuthoringRoutes`:

```typescript
import { jsonErrorHandler } from '../../middleware/json-errors'
import { requireProjectOwner } from '../../middleware/require-project-owner'

export function createAuthoringRoutes(service: ProjectService): Hono {
  const app = new Hono()
  app.onError(jsonErrorHandler)

  // Apply owner guard to all mutation routes
  app.use('/:owner/:slug/edit/:branch/authoring/*', requireProjectOwner(service))

  // Handlers can now access c.get('projectView') instead of repeating auth checks
  // ...
}
```

- [ ] **Step 2: Simplify each handler**

For each of the 6 POST handlers, remove:
```typescript
const user = c.get('user') as SessionUser | null
try {
  if (!user) throw new UnauthenticatedError()
  if (branch === 'main') return c.json({ error: 'main is read-only' }, 403)
  const view = await service.getProject(owner, slug, user, branch)
  if (!view.isOwner) return c.json({ error: 'not allowed' }, 403)
```

Replace with:
```typescript
const view = c.get('projectView')
const user = c.get('user')!
```

Remove the try/catch wrapping (jsonErrorHandler handles it).

- [ ] **Step 3: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/authoring.tsx
git commit -m "refactor(authoring): apply owner guard and error middleware

Replace repeated auth/permission boilerplate in 7 handlers with
requireProjectOwner middleware and jsonErrorHandler."
```

---

## Task 18: Extract shapeWithPreference into forms/shaping (Phase 3d)

**Files:**
- Modify: `src/services/forms/shaping/registry.ts` or create `src/services/forms/shaping/shape-with-preference.ts`
- Modify: `src/services/forms/index.ts`
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`

- [ ] **Step 1: Create shapeWithPreference function**

```typescript
// Add to src/services/forms/shaping/registry.ts (or new file shape-with-preference.ts)
import type { StrategyRegistry } from '../../../shared/strategy-registry'
import type { VariantPreferencesService } from '../../variant-preferences'
import type { Command, ProjectState } from './commands'
import type { FormShaper } from './types'

export interface ShapeResult {
  commands: Command[]
  explanation: string
  variantId: string
  modelId?: string
}

export async function shapeWithPreference(
  registry: StrategyRegistry<FormShaper>,
  preferences: VariantPreferencesService | undefined,
  userLogin: string,
  intent: string,
  state: ProjectState,
  previousAttempt?: { commands: Command[]; feedback: string },
): Promise<ShapeResult> {
  const variantId =
    (preferences?.get(userLogin, 'shaping')) ?? registry.getDefaultId()
  const shaper = registry.get(variantId)
  const variantMeta = registry.list().find((v) => v.id === variantId)
  const result = await shaper.shape({ intent, state, previousAttempt })
  return {
    commands: result.commands,
    explanation: result.explanation,
    variantId,
    modelId: variantMeta?.metadata.modelId,
  }
}
```

- [ ] **Step 2: Export from forms service index**

Add to `src/services/forms/index.ts`:

```typescript
export { shapeWithPreference, type ShapeResult } from './shaping/registry'
```

- [ ] **Step 3: Update the edit route intent handler**

In `src/entrypoints/app/routes/owner/edit/index.tsx`, replace the variant resolution block (lines 177-193) with:

```typescript
import { shapeWithPreference } from '../../../../../services/forms'

// Inside the intent handler, replace:
//   const variantId = (user && variantPreferences?.get(...)) ?? shapingRegistry.getDefaultId()
//   const shaper = shapingRegistry.get(variantId)
//   const variantMeta = ...
//   const result = await shaper.shape(...)
// With:
const result = await shapeWithPreference(
  shapingRegistry,
  variantPreferences,
  user.login,
  body.intent,
  state,
  body.previousAttempt,
)
return c.json(result)
```

- [ ] **Step 4: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/ src/services/forms/index.ts src/entrypoints/app/routes/owner/edit/index.tsx
git commit -m "refactor(forms/shaping): extract shapeWithPreference orchestration

Move variant resolution + shaper invocation + metadata lookup from the
edit route into the shaping service."
```

---

## Task 19: Authoring pipeline owns corpus loading (Phase 3b + 5a)

This refactors the form-authoring service (from story-87) so routes don't need to call `loadPolicyCorpus` directly.

**Files:**
- Modify: `src/services/form-authoring/pipeline.ts`
- Modify: `src/services/form-authoring/index.ts`
- Modify: `src/entrypoints/app/routes/owner/edit/authoring.tsx`

- [ ] **Step 1: Update createAuthoringPipeline to accept a corpus loader option**

Add an optional `corpus` parameter to the pipeline factory. If not provided, it loads from the project slug internally:

```typescript
// In src/services/form-authoring/pipeline.ts

import { loadPolicyCorpus } from '../rag'

export interface AuthoringPipelineOptions {
  config?: AuthoringStageConfig
  corpus?: PolicyChunk[]
  projectSlug?: string
}

export function createAuthoringPipeline(
  options: AuthoringPipelineOptions = {},
): AuthoringPipeline {
  const config = options.config ?? DEFAULT_CONFIG
  const resolveCorpus = (): PolicyChunk[] => {
    if (options.corpus) return options.corpus
    if (options.projectSlug) return loadPolicyCorpus({ slug: options.projectSlug })
    return loadPolicyCorpus()
  }
  // ... rest of implementation

  return {
    async analyzeCriteria(): Promise<Criterion[]> {
      const corpus = resolveCorpus()
      // ... existing implementation using corpus
    },
    async planStructure(criteria, state): Promise<...> {
      const corpus = resolveCorpus()
      // ... existing implementation
    },
    async generateSection(groupId, groupTitle, criteria): Promise<...> {
      const corpus = resolveCorpus()
      // ... existing implementation
    },
  }
}
```

- [ ] **Step 2: Update pipeline method signatures**

Remove `corpus` parameter from `analyzeCriteria`, `planStructure`, and `generateSection` — the pipeline resolves its own corpus now.

- [ ] **Step 3: Update authoring routes to pass projectSlug instead of corpus**

```typescript
// In authoring.tsx handlers, replace:
//   const corpus = await loadPolicyCorpus({ slug: 'snap-wisconsin' })
//   const pipeline = createAuthoringPipeline()
//   const result = await pipeline.analyzeCriteria(corpus)
// With:
const pipeline = createAuthoringPipeline({ projectSlug: 'snap-wisconsin' })
const result = await pipeline.analyzeCriteria()
```

- [ ] **Step 4: Update tests**

Update any form-authoring tests that pass corpus to pipeline methods — they should pass corpus via the options instead.

- [ ] **Step 5: Run full check**

Run: `bun run check`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/form-authoring/ src/entrypoints/app/routes/owner/edit/authoring.tsx
git commit -m "refactor(form-authoring): pipeline owns corpus loading

Routes pass projectSlug instead of loading corpus directly. Pipeline
resolves its own corpus internally, keeping RAG as an internal
dependency of the service rather than a route concern."
```

---

## Task 20: Final verification and cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Run full check**

Run: `bun run check`
Expected: All lint, type check, and tests pass.

- [ ] **Step 2: Verify dependency rule specifically**

Run: `bun test test/architecture/dependency-rule.test.ts`
Expected: PASS — no P2 violations introduced.

- [ ] **Step 3: Check total line count reduction in forms route**

Run: `wc -l src/entrypoints/app/routes/forms/index.tsx`
Expected: Significantly less than 927 lines.

- [ ] **Step 4: Verify no TODO/fixme left behind**

Run: `grep -r "TODO\|FIXME\|HACK" src/services/forms/visibility.ts src/services/forms/submission.ts src/services/forms/conversation.ts`
Expected: No output.

- [ ] **Step 5: Commit any final formatting fixes from biome**

```bash
bunx @biomejs/biome check --write .
git add -A
git commit -m "chore: format after clean architecture refactoring" --allow-empty
```
