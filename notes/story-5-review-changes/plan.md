# Story 5: Review Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a branch-based editing model with a PR-style review page (semantic diffs, side-by-side previews, comments) and branch-qualified form testing.

**Architecture:** Bare git repos gain multi-branch semantics. Editing happens on named branches; `main` is the published state. A new comparison service produces domain-aware diffs. A new review service manages PR-like flows (comments, merge, close). Routes follow GitHub conventions (`/:owner/:slug/compare/:base...:branch`).

**Tech Stack:** Bun, Hono (server-rendered JSX), git CLI via `Bun.spawn`, `bun:test` for unit tests, Playwright for component conformance.

**Working directory:** `/home/daniel/src/forms-lab/.worktrees/story-5-review-changes/`

**Base branch:** `origin/story-4/form-shaping` (this work layers on top of story-4)

---

## File Structure

### New files

- `src/services/forms/comparison/types.ts` — `SpecChange`, change categories
- `src/services/forms/comparison/data-collection-spec-differ.ts` — DCS diff algorithm
- `src/services/forms/comparison/form-spec-differ.ts` — FormSpec diff algorithm
- `src/services/forms/comparison/index.ts` — Public `compareSpecs()` API
- `src/services/forms/review/types.ts` — `Review`, `Comment` types
- `src/services/forms/review/comments.ts` — Comment CRUD backed by git
- `src/services/forms/review/index.ts` — Review orchestration (merge, close)
- `src/entrypoints/app/routes/owner/compare/index.tsx` — Review route factory
- `src/entrypoints/app/routes/owner/compare/components.tsx` — Review page JSX
- `src/entrypoints/app/routes/owner/compare/styles.css` — Review page styles
- `src/design-system/components/flex-branch-indicator/index.tsx` — Branch pill
- `src/design-system/components/flex-branch-switcher/index.tsx` — Branch dropdown
- `src/design-system/components/flex-change-indicator/index.tsx` — Change dot
- `src/design-system/components/flex-semantic-diff/index.tsx` — Diff list view
- `src/design-system/components/flex-preview-banner/index.tsx` — Non-prod banner
- `test/services/forms/comparison/data-collection-spec-differ.test.ts`
- `test/services/forms/comparison/form-spec-differ.test.ts`
- `test/services/forms/review/comments.test.ts`
- `test/services/forms/review/merge.test.ts`
- `test/entrypoints/app/compare-route.test.ts`

### Modified files

- `src/services/form-project-repo.ts` — Add branch operations, parameterize commit()
- `src/services/project-service.ts` — Add branch methods, commit to active branch
- `src/entrypoints/app/routes/owner/edit/index.tsx` — Accept `:branch` param, gate main
- `src/entrypoints/app/routes/forms/index.tsx` — Accept optional `:branch`, show banner
- `src/entrypoints/app/server.tsx` — Mount compare routes

---

## Task 1: Add read-only branch operations to FormProjectRepo

**Goal:** Expose `listBranches()` and `getBranchDiff()` — these are reads, safe to ship before any mutations.

**Files:**
- Modify: `src/services/form-project-repo.ts`
- Test: `test/services/form-project-repo.branches.test.ts` (create)

- [ ] **Step 1.1: Write failing tests for listBranches and getBranchDiff**

```typescript
// test/services/form-project-repo.branches.test.ts
import { describe, expect, it, beforeEach } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFormProjectRepo } from '../../src/services/form-project-repo'

describe('FormProjectRepo branches', () => {
  let basePath: string
  let repo: ReturnType<typeof createFormProjectRepo>
  const slug = 'test-project'
  const author = 'tester'

  beforeEach(async () => {
    basePath = mkdtempSync(join(tmpdir(), 'repo-branches-'))
    repo = createFormProjectRepo(basePath)
    await repo.init(slug)
    await repo.commit(slug, [{ path: 'a.txt', content: Buffer.from('hello') }], 'init', author)
  })

  it('lists only main for a fresh repo', async () => {
    const branches = await repo.listBranches(slug)
    expect(branches.map((b) => b.name)).toEqual(['main'])
  })

  it('getBranchDiff returns empty array when refs match', async () => {
    const diff = await repo.getBranchDiff(slug, 'main', 'main')
    expect(diff).toEqual([])
  })
})
```

- [ ] **Step 1.2: Run test to confirm failure**

`bun test test/services/form-project-repo.branches.test.ts`
Expected: FAIL with `repo.listBranches is not a function`.

- [ ] **Step 1.3: Implement listBranches and getBranchDiff**

Add to the `FormProjectRepo` interface:

```typescript
export interface BranchEntry {
  name: string
  sha: string
  ahead: number  // commits ahead of main (0 for main itself)
}

export interface FormProjectRepo {
  // ...existing
  listBranches(slug: string): Promise<BranchEntry[]>
  getBranchDiff(slug: string, base: string, head: string): Promise<string[]>
}
```

Implementation inside `createFormProjectRepo()`:

```typescript
async listBranches(slug: string): Promise<BranchEntry[]> {
  const output = await git(slug, [
    'for-each-ref',
    '--format=%(refname:short)%00%(objectname)',
    'refs/heads/',
  ])
  if (!output.trim()) return []
  const entries = output.trim().split('\n').map((line) => {
    const [name, sha] = line.split('\0')
    return { name, sha }
  })
  const result: BranchEntry[] = []
  for (const entry of entries) {
    let ahead = 0
    if (entry.name !== 'main') {
      try {
        const count = await git(slug, ['rev-list', '--count', `main..${entry.name}`])
        ahead = parseInt(count.trim(), 10) || 0
      } catch {
        ahead = 0
      }
    }
    result.push({ ...entry, ahead })
  }
  return result
},

async getBranchDiff(slug: string, base: string, head: string): Promise<string[]> {
  const output = await git(slug, ['diff', '--name-only', `${base}...${head}`])
  if (!output.trim()) return []
  return output.trim().split('\n')
},
```

- [ ] **Step 1.4: Run tests to verify pass**

`bun test test/services/form-project-repo.branches.test.ts`
Expected: PASS.

- [ ] **Step 1.5: Commit**

```bash
git add src/services/form-project-repo.ts test/services/form-project-repo.branches.test.ts
git commit -m "feat(form-project-repo): add listBranches and getBranchDiff"
```

---

## Task 2: Parameterize commit() by target branch

**Goal:** Let the caller choose which branch to advance. Default stays `main` for backward compat.

**Files:**
- Modify: `src/services/form-project-repo.ts`
- Test: `test/services/form-project-repo.branches.test.ts` (extend)

- [ ] **Step 2.1: Add test for committing to a non-main branch**

```typescript
it('commit can target a non-main branch', async () => {
  await repo.createBranch(slug, 'feature', 'main')
  const sha = await repo.commit(
    slug,
    [{ path: 'a.txt', content: Buffer.from('changed') }],
    'edit on feature',
    author,
    { branch: 'feature' },
  )
  const mainSha = (await repo.listBranches(slug)).find((b) => b.name === 'main')!.sha
  const featureSha = (await repo.listBranches(slug)).find((b) => b.name === 'feature')!.sha
  expect(featureSha).toBe(sha)
  expect(mainSha).not.toBe(sha)
})
```

This also exercises `createBranch` which we implement in Task 3 — mark this test `.skip` until Task 3 is done if you implement strictly sequentially.

- [ ] **Step 2.2: Update commit() signature**

Add an optional options parameter:

```typescript
commit(
  slug: string,
  files: FileEntry[],
  message: string,
  author: string,
  options?: { branch?: string },
): Promise<string>
```

Inside the implementation, replace the hardcoded `refs/heads/main`:

```typescript
const branch = options?.branch ?? 'main'
const branchRef = `refs/heads/${branch}`

// At the parent-lookup site, reference the target branch (if it exists)
// instead of HEAD:
const hasBranch = await (async () => {
  try {
    await git(slug, ['rev-parse', '--verify', branchRef])
    return true
  } catch {
    return false
  }
})()

if (hasBranch) {
  await git(slug, ['read-tree', branchRef], { env: authorEnv })
}

// ...

const commitArgs = ['commit-tree', treeSha, '-m', message]
if (hasBranch) {
  commitArgs.push('-p', branchRef)
}
// ...

await git(slug, ['update-ref', branchRef, commitSha], { env: authorEnv })
```

Retain `update-server-info` call. Remove `hasHead` reliance in this path (the branch existence check replaces it).

- [ ] **Step 2.3: Run existing and new tests**

`bun test test/services/form-project-repo*.test.ts`
Expected: PASS (existing `commit` callers that passed no options keep committing to `main`).

- [ ] **Step 2.4: Commit**

```bash
git add src/services/form-project-repo.ts test/services/form-project-repo.branches.test.ts
git commit -m "feat(form-project-repo): parameterize commit by target branch"
```

---

## Task 3: Add createBranch, deleteBranch, mergeBranch (fast-forward only)

**Goal:** Round out branch mutations. Merge is fast-forward only; non-ff returns an explicit error.

**Files:**
- Modify: `src/services/form-project-repo.ts`
- Test: `test/services/form-project-repo.branches.test.ts` (extend)

- [ ] **Step 3.1: Write failing tests**

```typescript
it('creates and deletes a branch', async () => {
  await repo.createBranch(slug, 'feature', 'main')
  let branches = await repo.listBranches(slug)
  expect(branches.map((b) => b.name).sort()).toEqual(['feature', 'main'])
  await repo.deleteBranch(slug, 'feature')
  branches = await repo.listBranches(slug)
  expect(branches.map((b) => b.name)).toEqual(['main'])
})

it('fast-forward merges a branch into main', async () => {
  await repo.createBranch(slug, 'feature', 'main')
  await repo.commit(slug, [{ path: 'b.txt', content: Buffer.from('x') }], 'add b', author, { branch: 'feature' })
  const result = await repo.mergeBranch(slug, 'feature', 'main')
  expect(result.ok).toBe(true)
  const main = (await repo.listBranches(slug)).find((b) => b.name === 'main')!
  const feature = (await repo.listBranches(slug)).find((b) => b.name === 'feature')!
  expect(main.sha).toBe(feature.sha)
})

it('returns non-ff error when main has diverged', async () => {
  await repo.createBranch(slug, 'feature', 'main')
  await repo.commit(slug, [{ path: 'a.txt', content: Buffer.from('on-feature') }], 'feature change', author, { branch: 'feature' })
  await repo.commit(slug, [{ path: 'a.txt', content: Buffer.from('on-main') }], 'main change', author)
  const result = await repo.mergeBranch(slug, 'feature', 'main')
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toBe('not-fast-forward')
})
```

- [ ] **Step 3.2: Implement**

Add to the interface:

```typescript
export type MergeResult =
  | { ok: true; sha: string }
  | { ok: false; reason: 'not-fast-forward' | 'unknown-branch' }

createBranch(slug: string, name: string, startPoint: string): Promise<void>
deleteBranch(slug: string, name: string): Promise<void>
mergeBranch(slug: string, source: string, target: string): Promise<MergeResult>
```

Implementations:

```typescript
async createBranch(slug, name, startPoint): Promise<void> {
  await git(slug, ['branch', name, startPoint])
  await git(slug, ['update-server-info'])
},

async deleteBranch(slug, name): Promise<void> {
  await git(slug, ['branch', '-D', name])
  await git(slug, ['update-server-info'])
},

async mergeBranch(slug, source, target): Promise<MergeResult> {
  // Verify both exist
  try {
    await git(slug, ['rev-parse', '--verify', `refs/heads/${source}`])
    await git(slug, ['rev-parse', '--verify', `refs/heads/${target}`])
  } catch {
    return { ok: false, reason: 'unknown-branch' }
  }
  // Check fast-forwardability: target must be ancestor of source
  try {
    await git(slug, ['merge-base', '--is-ancestor', `refs/heads/${target}`, `refs/heads/${source}`])
  } catch {
    return { ok: false, reason: 'not-fast-forward' }
  }
  const sourceSha = (await git(slug, ['rev-parse', `refs/heads/${source}`])).trim()
  await git(slug, ['update-ref', `refs/heads/${target}`, sourceSha])
  await git(slug, ['update-server-info'])
  return { ok: true, sha: sourceSha }
},
```

- [ ] **Step 3.3: Verify tests**

`bun test test/services/form-project-repo.branches.test.ts`
Expected: all PASS.

- [ ] **Step 3.4: Commit**

```bash
git add src/services/form-project-repo.ts test/services/form-project-repo.branches.test.ts
git commit -m "feat(form-project-repo): add create/delete/merge branch operations"
```

---

## Task 4: Comparison types

**Goal:** Define the `SpecChange` shape. No logic yet — just the vocabulary the differs emit.

**Files:**
- Create: `src/services/forms/comparison/types.ts`

- [ ] **Step 4.1: Write the types file**

```typescript
// src/services/forms/comparison/types.ts

export type ChangeCategory = 'added' | 'removed' | 'modified' | 'moved' | 'renamed'

export type ChangeResource = 'data-collection-spec' | 'form-spec'

export interface SpecChange {
  category: ChangeCategory
  resource: ChangeResource
  // Hierarchical path: e.g., ['page:abc', 'group:xyz', 'field:zip']
  path: string[]
  // Human-readable description, e.g., "Added page 'Military Service'"
  description: string
  // Optional extra context (field counts, from/to values)
  details?: Record<string, unknown>
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/services/forms/comparison/types.ts
git commit -m "feat(comparison): define SpecChange types"
```

---

## Task 5: DataCollectionSpec differ

**Goal:** Pure function that compares two `DataCollectionSpec` values and returns `SpecChange[]`. No git, no I/O.

**Files:**
- Create: `src/services/forms/comparison/data-collection-spec-differ.ts`
- Test: `test/services/forms/comparison/data-collection-spec-differ.test.ts`

Before writing, read `src/services/data-collection/types.ts` to confirm the `DataCollectionSpec` and `RequirementGroup` / `DataRequirement` shapes, and adjust field-level comparisons accordingly.

- [ ] **Step 5.1: Write failing test**

```typescript
// test/services/forms/comparison/data-collection-spec-differ.test.ts
import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../../src/services/data-collection/types'
import { diffDataCollectionSpecs } from '../../../../src/services/forms/comparison/data-collection-spec-differ'

const baseSpec: DataCollectionSpec = {
  id: 'form1',
  title: 'Tax Form',
  description: '',
  groups: [
    {
      id: 'income',
      title: 'Income',
      requirements: [
        { id: 'employer', fieldName: 'employer', fieldType: 'text', label: 'Employer', required: false },
      ],
    },
  ],
}

describe('diffDataCollectionSpecs', () => {
  it('returns empty array for identical specs', () => {
    expect(diffDataCollectionSpecs(baseSpec, baseSpec)).toEqual([])
  })

  it('detects added requirement group', () => {
    const head: DataCollectionSpec = {
      ...baseSpec,
      groups: [
        ...baseSpec.groups,
        { id: 'military', title: 'Military Service', requirements: [] },
      ],
    }
    const changes = diffDataCollectionSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('added')
    expect(changes[0].description).toContain('Military Service')
  })

  it('detects a field marked as required', () => {
    const head: DataCollectionSpec = {
      ...baseSpec,
      groups: [
        {
          ...baseSpec.groups[0],
          requirements: [{ ...baseSpec.groups[0].requirements[0], required: true }],
        },
      ],
    }
    const changes = diffDataCollectionSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('modified')
    expect(changes[0].description).toContain('required')
  })

  it('detects a renamed group (same id, different title)', () => {
    const head: DataCollectionSpec = {
      ...baseSpec,
      groups: [{ ...baseSpec.groups[0], title: 'Wages' }],
    }
    const changes = diffDataCollectionSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('renamed')
  })
})
```

- [ ] **Step 5.2: Run test to confirm failure**

`bun test test/services/forms/comparison/data-collection-spec-differ.test.ts`
Expected: FAIL with import error.

- [ ] **Step 5.3: Implement the differ**

```typescript
// src/services/forms/comparison/data-collection-spec-differ.ts
import type { DataCollectionSpec, DataRequirement, RequirementGroup } from '../../data-collection/types'
import type { SpecChange } from './types'

export function diffDataCollectionSpecs(
  base: DataCollectionSpec,
  head: DataCollectionSpec,
): SpecChange[] {
  const changes: SpecChange[] = []
  const baseGroups = new Map(base.groups.map((g) => [g.id, g]))
  const headGroups = new Map(head.groups.map((g) => [g.id, g]))

  // Added / renamed / modified groups
  for (const [id, headGroup] of headGroups) {
    const baseGroup = baseGroups.get(id)
    if (!baseGroup) {
      changes.push({
        category: 'added',
        resource: 'data-collection-spec',
        path: [`group:${id}`],
        description: `New requirement group: "${headGroup.title}"`,
        details: { fieldCount: headGroup.requirements.length },
      })
      continue
    }
    if (baseGroup.title !== headGroup.title) {
      changes.push({
        category: 'renamed',
        resource: 'data-collection-spec',
        path: [`group:${id}`],
        description: `Group renamed from "${baseGroup.title}" to "${headGroup.title}"`,
      })
    }
    changes.push(...diffRequirements(id, baseGroup.requirements, headGroup.requirements))
  }

  // Removed groups
  for (const [id, baseGroup] of baseGroups) {
    if (!headGroups.has(id)) {
      changes.push({
        category: 'removed',
        resource: 'data-collection-spec',
        path: [`group:${id}`],
        description: `Removed requirement group: "${baseGroup.title}"`,
      })
    }
  }

  return changes
}

function diffRequirements(
  groupId: string,
  baseReqs: DataRequirement[],
  headReqs: DataRequirement[],
): SpecChange[] {
  const changes: SpecChange[] = []
  const baseMap = new Map(baseReqs.map((r) => [r.id, r]))
  const headMap = new Map(headReqs.map((r) => [r.id, r]))

  for (const [id, headReq] of headMap) {
    const baseReq = baseMap.get(id)
    if (!baseReq) {
      changes.push({
        category: 'added',
        resource: 'data-collection-spec',
        path: [`group:${groupId}`, `field:${id}`],
        description: `Added field "${headReq.label}" to group`,
      })
      continue
    }
    const modifications: string[] = []
    if (baseReq.required !== headReq.required) {
      modifications.push(headReq.required ? 'marked as required' : 'marked as optional')
    }
    if (baseReq.fieldType !== headReq.fieldType) {
      modifications.push(`type changed from ${baseReq.fieldType} to ${headReq.fieldType}`)
    }
    if (baseReq.label !== headReq.label) {
      modifications.push(`relabeled "${baseReq.label}" → "${headReq.label}"`)
    }
    if (modifications.length > 0) {
      changes.push({
        category: 'modified',
        resource: 'data-collection-spec',
        path: [`group:${groupId}`, `field:${id}`],
        description: `Field "${headReq.label}": ${modifications.join(', ')}`,
      })
    }
  }

  for (const [id, baseReq] of baseMap) {
    if (!headMap.has(id)) {
      changes.push({
        category: 'removed',
        resource: 'data-collection-spec',
        path: [`group:${groupId}`, `field:${id}`],
        description: `Removed field "${baseReq.label}"`,
      })
    }
  }

  return changes
}
```

- [ ] **Step 5.4: Run tests to verify pass**

`bun test test/services/forms/comparison/data-collection-spec-differ.test.ts`
Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/services/forms/comparison/data-collection-spec-differ.ts \
        test/services/forms/comparison/data-collection-spec-differ.test.ts
git commit -m "feat(comparison): DataCollectionSpec differ"
```

---

## Task 6: FormSpec differ

**Goal:** Compare `FormSpec` values — pages, group assignments, delivery mode, ordering.

**Files:**
- Create: `src/services/forms/comparison/form-spec-differ.ts`
- Test: `test/services/forms/comparison/form-spec-differ.test.ts`

Before writing, re-read `src/services/forms/types.ts` for the `FormSpec` / `FormPage` shape.

- [ ] **Step 6.1: Write failing test**

```typescript
// test/services/forms/comparison/form-spec-differ.test.ts
import { describe, expect, it } from 'bun:test'
import type { FormSpec } from '../../../../src/services/forms/types'
import { diffFormSpecs } from '../../../../src/services/forms/comparison/form-spec-differ'

const baseSpec: FormSpec = {
  id: 'form1',
  specId: 'form1',
  title: 'Tax Form',
  pages: [
    { id: 'p1', title: 'Personal Info', groups: ['personal'], deliveryMode: 'static' },
    { id: 'p2', title: 'Income', groups: ['income'], deliveryMode: 'static' },
    { id: 'p3', title: 'Deductions', groups: ['ded'], deliveryMode: 'static' },
  ],
}

describe('diffFormSpecs', () => {
  it('detects a newly added page', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: [
        baseSpec.pages[0],
        baseSpec.pages[1],
        { id: 'p-military', title: 'Military Service', groups: ['military'], deliveryMode: 'static' },
        baseSpec.pages[2],
      ],
    }
    const changes = diffFormSpecs(baseSpec, head)
    const added = changes.filter((c) => c.category === 'added')
    expect(added).toHaveLength(1)
    expect(added[0].description).toContain('Military Service')
  })

  it('detects a moved (reordered) page', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: [baseSpec.pages[0], baseSpec.pages[2], baseSpec.pages[1]],
    }
    const changes = diffFormSpecs(baseSpec, head)
    const moves = changes.filter((c) => c.category === 'moved')
    expect(moves.length).toBeGreaterThan(0)
  })

  it('detects a delivery-mode change', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: baseSpec.pages.map((p) =>
        p.id === 'p2' ? { ...p, deliveryMode: 'conversational' as const } : p,
      ),
    }
    const changes = diffFormSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('modified')
    expect(changes[0].description).toMatch(/delivery mode/i)
  })
})
```

- [ ] **Step 6.2: Run to confirm failure**

`bun test test/services/forms/comparison/form-spec-differ.test.ts`
Expected: FAIL with import error.

- [ ] **Step 6.3: Implement**

```typescript
// src/services/forms/comparison/form-spec-differ.ts
import type { FormPage, FormSpec } from '../../forms/types'
import type { SpecChange } from './types'

export function diffFormSpecs(base: FormSpec, head: FormSpec): SpecChange[] {
  const changes: SpecChange[] = []
  const basePages = new Map(base.pages.map((p) => [p.id, p]))
  const headPages = new Map(head.pages.map((p) => [p.id, p]))

  // Added / renamed / modified pages
  for (const [id, headPage] of headPages) {
    const basePage = basePages.get(id)
    if (!basePage) {
      const headIdx = head.pages.findIndex((p) => p.id === id)
      changes.push({
        category: 'added',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `New page: "${headPage.title}" (position ${headIdx + 1})`,
        details: { deliveryMode: headPage.deliveryMode, groupCount: headPage.groups.length },
      })
      continue
    }
    if (basePage.title !== headPage.title) {
      changes.push({
        category: 'renamed',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Page renamed from "${basePage.title}" to "${headPage.title}"`,
      })
    }
    if (basePage.deliveryMode !== headPage.deliveryMode) {
      changes.push({
        category: 'modified',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Page "${headPage.title}" delivery mode: ${basePage.deliveryMode} → ${headPage.deliveryMode}`,
      })
    }
    changes.push(...diffPageGroups(id, headPage.title, basePage, headPage))
  }

  // Removed pages
  for (const [id, basePage] of basePages) {
    if (!headPages.has(id)) {
      changes.push({
        category: 'removed',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Removed page: "${basePage.title}"`,
      })
    }
  }

  // Moved pages: only emit if a page exists in both and its position changed
  for (const [id, headPage] of headPages) {
    if (!basePages.has(id)) continue
    const baseIdx = base.pages.findIndex((p) => p.id === id)
    const headIdx = head.pages.findIndex((p) => p.id === id)
    if (baseIdx !== headIdx) {
      changes.push({
        category: 'moved',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Page "${headPage.title}" moved from position ${baseIdx + 1} → ${headIdx + 1}`,
      })
    }
  }

  return changes
}

function diffPageGroups(
  pageId: string,
  pageTitle: string,
  basePage: FormPage,
  headPage: FormPage,
): SpecChange[] {
  const changes: SpecChange[] = []
  const baseSet = new Set(basePage.groups)
  const headSet = new Set(headPage.groups)
  for (const g of headSet) {
    if (!baseSet.has(g)) {
      changes.push({
        category: 'added',
        resource: 'form-spec',
        path: [`page:${pageId}`, `group:${g}`],
        description: `Added group "${g}" to page "${pageTitle}"`,
      })
    }
  }
  for (const g of baseSet) {
    if (!headSet.has(g)) {
      changes.push({
        category: 'removed',
        resource: 'form-spec',
        path: [`page:${pageId}`, `group:${g}`],
        description: `Removed group "${g}" from page "${pageTitle}"`,
      })
    }
  }
  return changes
}
```

- [ ] **Step 6.4: Verify**

`bun test test/services/forms/comparison/form-spec-differ.test.ts`
Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/services/forms/comparison/form-spec-differ.ts \
        test/services/forms/comparison/form-spec-differ.test.ts
git commit -m "feat(comparison): FormSpec differ"
```

---

## Task 7: Comparison public API

**Goal:** A single `compareSpecs(baseSnap, headSnap)` that aggregates both differs.

**Files:**
- Create: `src/services/forms/comparison/index.ts`

- [ ] **Step 7.1: Implement**

```typescript
// src/services/forms/comparison/index.ts
import type { DataCollectionSpec } from '../../data-collection/types'
import type { FormSpec } from '../types'
import { diffDataCollectionSpecs } from './data-collection-spec-differ'
import { diffFormSpecs } from './form-spec-differ'
import type { SpecChange } from './types'

export interface SpecSnapshot {
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
}

export function compareSpecs(base: SpecSnapshot, head: SpecSnapshot): SpecChange[] {
  return [
    ...diffDataCollectionSpecs(base.dataSpec, head.dataSpec),
    ...diffFormSpecs(base.formSpec, head.formSpec),
  ]
}

export type { SpecChange, ChangeCategory, ChangeResource } from './types'
```

- [ ] **Step 7.2: Verify everything still passes**

`bun run check`
Expected: PASS.

- [ ] **Step 7.3: Commit**

```bash
git add src/services/forms/comparison/index.ts
git commit -m "feat(comparison): aggregate compareSpecs() API"
```

---

## Task 8: Review and Comment types

**Goal:** Data vocabulary for the review service.

**Files:**
- Create: `src/services/forms/review/types.ts`

- [ ] **Step 8.1: Write types**

```typescript
// src/services/forms/review/types.ts

export interface Comment {
  id: string               // uuid
  author: string           // user login
  timestamp: string        // ISO 8601
  body: string             // markdown
  parentId?: string        // for threading
}

export interface CommentsFile {
  comments: Comment[]
}

export interface ReviewRef {
  owner: string
  slug: string
  base: string             // branch name
  head: string             // branch name
}

export type MergeOutcome =
  | { status: 'merged'; sha: string }
  | { status: 'conflict'; reason: 'not-fast-forward' }
  | { status: 'missing-branch' }
```

- [ ] **Step 8.2: Commit**

```bash
git add src/services/forms/review/types.ts
git commit -m "feat(review): Review and Comment types"
```

---

## Task 9: Comments storage

**Goal:** CRUD for comments backed by the source branch's repo. File path: `reviews/<base>---<head>/comments.json`.

**Files:**
- Create: `src/services/forms/review/comments.ts`
- Test: `test/services/forms/review/comments.test.ts`

- [ ] **Step 9.1: Write failing tests**

```typescript
// test/services/forms/review/comments.test.ts
import { describe, expect, it, beforeEach } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFormProjectRepo } from '../../../../src/services/form-project-repo'
import { createCommentsStore } from '../../../../src/services/forms/review/comments'

describe('comments store', () => {
  const slug = 'proj'
  let repo: ReturnType<typeof createFormProjectRepo>
  let store: ReturnType<typeof createCommentsStore>

  beforeEach(async () => {
    const base = mkdtempSync(join(tmpdir(), 'comments-'))
    repo = createFormProjectRepo(base)
    await repo.init(slug)
    await repo.commit(slug, [{ path: 'seed.txt', content: Buffer.from('x') }], 'init', 'tester')
    await repo.createBranch(slug, 'feature', 'main')
    store = createCommentsStore(repo)
  })

  it('starts empty', async () => {
    const comments = await store.list({ owner: 'o', slug, base: 'main', head: 'feature' })
    expect(comments).toEqual([])
  })

  it('adds and lists a comment', async () => {
    await store.add(
      { owner: 'o', slug, base: 'main', head: 'feature' },
      { body: 'Looks good', author: 'alice' },
    )
    const comments = await store.list({ owner: 'o', slug, base: 'main', head: 'feature' })
    expect(comments).toHaveLength(1)
    expect(comments[0].body).toBe('Looks good')
    expect(comments[0].author).toBe('alice')
    expect(comments[0].id).toBeTruthy()
  })
})
```

- [ ] **Step 9.2: Implement**

```typescript
// src/services/forms/review/comments.ts
import type { FormProjectRepo } from '../../form-project-repo'
import type { Comment, CommentsFile, ReviewRef } from './types'

function commentsPath(ref: ReviewRef): string {
  return `reviews/${ref.base}---${ref.head}/comments.json`
}

export function createCommentsStore(repo: FormProjectRepo) {
  async function load(ref: ReviewRef): Promise<CommentsFile> {
    const buf = await repo.readFile(ref.slug, ref.head, commentsPath(ref))
    if (!buf) return { comments: [] }
    return JSON.parse(buf.toString()) as CommentsFile
  }

  return {
    async list(ref: ReviewRef): Promise<Comment[]> {
      const file = await load(ref)
      return file.comments
    },

    async add(
      ref: ReviewRef,
      input: { body: string; author: string; parentId?: string },
    ): Promise<Comment> {
      const file = await load(ref)
      const comment: Comment = {
        id: crypto.randomUUID(),
        author: input.author,
        timestamp: new Date().toISOString(),
        body: input.body,
        parentId: input.parentId,
      }
      const next: CommentsFile = { comments: [...file.comments, comment] }
      await repo.commit(
        ref.slug,
        [{ path: commentsPath(ref), content: Buffer.from(JSON.stringify(next, null, 2)) }],
        `comment: ${input.author}`,
        input.author,
        { branch: ref.head },
      )
      return comment
    },
  }
}

export type CommentsStore = ReturnType<typeof createCommentsStore>
```

- [ ] **Step 9.3: Verify tests**

`bun test test/services/forms/review/comments.test.ts`
Expected: PASS.

- [ ] **Step 9.4: Commit**

```bash
git add src/services/forms/review/comments.ts test/services/forms/review/comments.test.ts
git commit -m "feat(review): git-backed comments store"
```

---

## Task 10: Review service (orchestration)

**Goal:** Combine snapshots, comparison, merge. One service surface for the route layer.

**Files:**
- Create: `src/services/forms/review/index.ts`
- Test: `test/services/forms/review/merge.test.ts`

- [ ] **Step 10.1: Write failing test**

```typescript
// test/services/forms/review/merge.test.ts
import { describe, expect, it, beforeEach } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFormProjectRepo } from '../../../../src/services/form-project-repo'
import { createReviewService } from '../../../../src/services/forms/review'

describe('review service merge', () => {
  const slug = 'proj'

  async function setup() {
    const base = mkdtempSync(join(tmpdir(), 'review-'))
    const repo = createFormProjectRepo(base)
    await repo.init(slug)
    await repo.commit(slug, [{ path: 'a.txt', content: Buffer.from('1') }], 'init', 'alice')
    await repo.createBranch(slug, 'feature', 'main')
    await repo.commit(slug, [{ path: 'a.txt', content: Buffer.from('2') }], 'change', 'alice', { branch: 'feature' })
    return createReviewService(repo)
  }

  it('merges fast-forwardable branch', async () => {
    const svc = await setup()
    const res = await svc.merge({ owner: 'o', slug, base: 'main', head: 'feature' })
    expect(res.status).toBe('merged')
  })
})
```

- [ ] **Step 10.2: Implement**

```typescript
// src/services/forms/review/index.ts
import type { FormProjectRepo } from '../../form-project-repo'
import { createCommentsStore } from './comments'
import type { MergeOutcome, ReviewRef } from './types'

export function createReviewService(repo: FormProjectRepo) {
  const comments = createCommentsStore(repo)

  return {
    comments,

    async merge(ref: ReviewRef): Promise<MergeOutcome> {
      const result = await repo.mergeBranch(ref.slug, ref.head, ref.base)
      if (result.ok) return { status: 'merged', sha: result.sha }
      if (result.reason === 'not-fast-forward') return { status: 'conflict', reason: 'not-fast-forward' }
      return { status: 'missing-branch' }
    },

    async close(ref: ReviewRef): Promise<void> {
      await repo.deleteBranch(ref.slug, ref.head)
    },

    async changedFiles(ref: ReviewRef): Promise<string[]> {
      return repo.getBranchDiff(ref.slug, ref.base, ref.head)
    },
  }
}

export type ReviewService = ReturnType<typeof createReviewService>
export type { Comment, ReviewRef, MergeOutcome } from './types'
```

- [ ] **Step 10.3: Verify**

`bun test test/services/forms/review/`
Expected: PASS.

- [ ] **Step 10.4: Commit**

```bash
git add src/services/forms/review/index.ts test/services/forms/review/merge.test.ts
git commit -m "feat(review): review service with merge/close/changedFiles"
```

---

## Task 11: ProjectService branch support

**Goal:** Expose branches to the app layer. Parameterize `executeCommands` and `getShapingLog` by branch.

**Files:**
- Modify: `src/services/project-service.ts`
- Test: update any existing tests in `test/services/` that exercise these methods

Before writing, read the current `ProjectService` interface end-to-end. These modifications change method signatures, so all callers must be updated.

- [ ] **Step 11.1: Extend the interface**

```typescript
// in src/services/project-service.ts

// Add:
listBranches(slug: string): Promise<BranchEntry[]>
createBranch(slug: string, name: string, startPoint: string, user: SessionUser): Promise<void>
deleteBranch(slug: string, name: string, user: SessionUser): Promise<void>

// Modify: add optional { branch } option. Default 'main' for backward compat.
executeCommands(
  owner: string,
  slug: string,
  commands: Command[],
  explanation: string,
  source: 'llm' | 'manual',
  user: SessionUser,
  options?: { branch?: string },
): Promise<ExecuteCommandsResult>

getShapingLog(owner: string, slug: string, branch?: string): Promise<ShapingLogEntry[]>
getProject(
  owner: string,
  slug: string,
  user: SessionUser | null,
  branch?: string,
): Promise<ProjectView>
```

- [ ] **Step 11.2: Implement the new methods; thread branch through existing ones**

In the existing `executeCommands` body, replace the hardcoded commit target with the passed branch:

```typescript
const targetBranch = options?.branch ?? 'main'
// ...after building files...
const sha = await repo.commit(slug, files, commitMessage, author, { branch: targetBranch })
```

`getShapingLog` and `getProject` likewise read from the given branch ref:

```typescript
const ref = branch ?? 'main'
const buf = await repo.readFile(slug, ref, 'forms/default/shaping-log.json')
```

- [ ] **Step 11.3: Run all tests and type-check**

```bash
bun run --no-warnings tsc --noEmit
bun test
```
Expected: PASS. Fix any callers that now need to pass a branch.

- [ ] **Step 11.4: Commit**

```bash
git add src/services/project-service.ts test/
git commit -m "feat(project-service): add branch methods, thread branch through edit APIs"
```

---

## Task 12: Editor routes accept :branch parameter

**Goal:** URL gains `/edit/:branch`. On main, editing is disabled; UI shows "Create branch" instead.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`

- [ ] **Step 12.1: Update routes**

Replace existing edit routes:

```typescript
app.get('/:owner/:slug/edit', async (c) => {
  // Redirect to the default branch if one exists, otherwise show "create branch" shell
  const { owner, slug } = c.req.param()
  const user = c.get('user')
  const branches = await service.listBranches(slug)
  const preferred = branches.find((b) => b.name !== 'main')?.name
  if (preferred) return c.redirect(`/${owner}/${slug}/edit/${preferred}`)
  return c.html(<EditorPage mode="no-branch" owner={owner} slug={slug} user={user} branches={branches} />)
})

app.get('/:owner/:slug/edit/:branch', async (c) => {
  const { owner, slug, branch } = c.req.param()
  const user = c.get('user')
  const view = await service.getProject(owner, slug, user, branch)
  const log = await service.getShapingLog(owner, slug, branch)
  const branches = await service.listBranches(slug)
  return c.html(<EditorPage mode="editing" view={view} owner={owner} slug={slug} branch={branch} user={user} log={log} branches={branches} />)
})

app.post('/:owner/:slug/edit/:branch/branch', async (c) => {
  // Create a new branch from startPoint, redirect to it
  const { owner, slug } = c.req.param()
  const user = c.get('user')
  const body = await c.req.parseBody()
  const name = String(body.name)
  const startPoint = String(body.startPoint ?? 'main')
  await service.createBranch(slug, name, startPoint, user)
  return c.redirect(`/${owner}/${slug}/edit/${name}`)
})

app.post('/:owner/:slug/edit/:branch/accept', async (c) => {
  const { owner, slug, branch } = c.req.param()
  if (branch === 'main') return c.json({ error: 'main is read-only' }, 403)
  // ...existing command execution, but pass { branch } ...
  const result = await service.executeCommands(owner, slug, commands, explanation, source, user, { branch })
  return c.json(result)
})
```

Apply the same 403 gate to `/intent`, `/execute`, `/undo` when `branch === 'main'`.

- [ ] **Step 12.2: Update component signatures**

`EditorPage` component gains `mode: 'no-branch' | 'editing'`, optional `branch`, `branches`. The "no-branch" mode shows a minimal shell with a form to create a branch.

- [ ] **Step 12.3: Smoke test**

`bun run --no-warnings tsc --noEmit && bun test`
Expected: PASS.

- [ ] **Step 12.4: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/
git commit -m "feat(editor): parameterize editor routes by :branch, gate main as read-only"
```

---

## Task 13: flex-branch-indicator component

**Goal:** A visual branch pill for use in the editor header and elsewhere.

**Files:**
- Create: `src/design-system/components/flex-branch-indicator/index.tsx`
- Create: `src/design-system/components/flex-branch-indicator/styles.css`
- Create: `src/design-system/components/flex-branch-indicator/meta.ts`

Follow the established pattern from `flex-banner/` (index.tsx, meta.ts, styles.css).

- [ ] **Step 13.1: Write component**

```typescript
// src/design-system/components/flex-branch-indicator/index.tsx
import type { FC } from 'hono/jsx'

interface BranchIndicatorProps {
  name: string
  isPublished?: boolean
  ahead?: number
}

export const BranchIndicator: FC<BranchIndicatorProps> = ({ name, isPublished, ahead }) => {
  return (
    <span class="flex-branch-indicator" data-published={isPublished ? 'true' : 'false'}>
      <svg aria-hidden="true" class="flex-branch-indicator__icon" width="14" height="14" viewBox="0 0 16 16">
        <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.5 2.5 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
      </svg>
      <span class="flex-branch-indicator__name">{name}</span>
      {isPublished ? <span class="flex-branch-indicator__badge">published</span> : null}
      {!isPublished && ahead != null ? (
        <span class="flex-branch-indicator__meta">{ahead} ahead</span>
      ) : null}
    </span>
  )
}
```

- [ ] **Step 13.2: Write styles using design tokens**

```css
/* src/design-system/components/flex-branch-indicator/styles.css */
@layer block {
  .flex-branch-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--flex-spacing-1);
    padding: var(--flex-spacing-05) var(--flex-spacing-1-5);
    border-radius: var(--flex-radius-md);
    border: 1px solid var(--flex-color-base-lighter);
    background: var(--flex-color-base-lightest);
    font-size: var(--flex-font-size-xs);
  }

  .flex-branch-indicator[data-published='true'] .flex-branch-indicator__badge {
    background: var(--flex-color-warning-lighter);
    color: var(--flex-color-warning-darker);
    padding: 1px var(--flex-spacing-1);
    border-radius: var(--flex-radius-sm);
    font-size: 11px;
  }
}
```

Exact tokens above may need verification against `catalog/architecture/design-tokens.md` or similar — substitute the closest existing token names.

- [ ] **Step 13.3: Register in component registry**

```typescript
// src/design-system/components/flex-branch-indicator/meta.ts
import type { ComponentMeta } from '../../registry/types'

export const meta: ComponentMeta = {
  name: 'flex-branch-indicator',
  slug: 'flex-branch-indicator',
  category: 'navigation',
}
```

- [ ] **Step 13.4: Commit**

```bash
git add src/design-system/components/flex-branch-indicator/
git commit -m "feat(flex-branch-indicator): new component for branch display"
```

---

## Task 14: flex-branch-switcher component

**Goal:** Dropdown with search, branch list, and "create new branch" affordance.

**Files:**
- Create: `src/design-system/components/flex-branch-switcher/index.tsx`
- Create: `src/design-system/components/flex-branch-switcher/styles.css`
- Create: `src/design-system/components/flex-branch-switcher/client.ts`
- Create: `src/design-system/components/flex-branch-switcher/meta.ts`

- [ ] **Step 14.1: Component**

```typescript
// src/design-system/components/flex-branch-switcher/index.tsx
import type { FC } from 'hono/jsx'

interface Branch { name: string; ahead?: number }

interface BranchSwitcherProps {
  current: string
  branches: Branch[]
  compareHref: (branch: string) => string
  createHref: string
}

export const BranchSwitcher: FC<BranchSwitcherProps> = ({ current, branches, compareHref, createHref }) => {
  return (
    <flex-branch-switcher class="flex-branch-switcher">
      <button type="button" class="flex-branch-switcher__trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="flex-branch-switcher__current">{current}</span>
        <span aria-hidden="true" class="flex-branch-switcher__caret">▾</span>
      </button>
      <div class="flex-branch-switcher__panel" role="listbox" hidden>
        <input type="search" class="flex-branch-switcher__filter" placeholder="Find a branch..." />
        <ul class="flex-branch-switcher__list">
          {branches.map((b) => (
            <li role="option" aria-selected={b.name === current ? 'true' : 'false'}>
              <a href={compareHref(b.name)}>{b.name}</a>
              {b.ahead != null && b.ahead > 0 ? <span>{b.ahead} ahead</span> : null}
            </li>
          ))}
        </ul>
        <form method="POST" action={createHref} class="flex-branch-switcher__create">
          <input name="name" placeholder="new-branch-name" required />
          <button type="submit">Create branch</button>
        </form>
      </div>
    </flex-branch-switcher>
  )
}
```

- [ ] **Step 14.2: Client behavior (toggle dropdown, filter, outside-click close)**

```typescript
// src/design-system/components/flex-branch-switcher/client.ts
class FlexBranchSwitcher extends HTMLElement {
  connectedCallback() {
    const trigger = this.querySelector<HTMLButtonElement>('.flex-branch-switcher__trigger')
    const panel = this.querySelector<HTMLElement>('.flex-branch-switcher__panel')
    const filter = this.querySelector<HTMLInputElement>('.flex-branch-switcher__filter')
    if (!trigger || !panel) return
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true'
      trigger.setAttribute('aria-expanded', String(!expanded))
      panel.hidden = expanded
    })
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target as Node)) {
        trigger.setAttribute('aria-expanded', 'false')
        panel.hidden = true
      }
    })
    filter?.addEventListener('input', () => {
      const q = filter.value.toLowerCase()
      for (const li of this.querySelectorAll<HTMLLIElement>('.flex-branch-switcher__list li')) {
        li.hidden = !(li.textContent?.toLowerCase().includes(q))
      }
    })
  }
}
customElements.define('flex-branch-switcher', FlexBranchSwitcher)
```

- [ ] **Step 14.3: Styles & meta**

Mirror flex-branch-indicator pattern. Meta `category: 'navigation'`.

- [ ] **Step 14.4: Commit**

```bash
git add src/design-system/components/flex-branch-switcher/
git commit -m "feat(flex-branch-switcher): new dropdown component"
```

---

## Task 15: flex-change-indicator component

**Goal:** Small dot / pill to mark modified resources in the editor sidebar.

**Files:**
- Create: `src/design-system/components/flex-change-indicator/index.tsx`
- Create: `src/design-system/components/flex-change-indicator/styles.css`
- Create: `src/design-system/components/flex-change-indicator/meta.ts`

- [ ] **Step 15.1: Component**

```typescript
// src/design-system/components/flex-change-indicator/index.tsx
import type { FC } from 'hono/jsx'

type Variant = 'modified' | 'added' | 'removed'

interface ChangeIndicatorProps {
  variant: Variant
  label?: string
}

const LABELS: Record<Variant, string> = {
  modified: 'Modified',
  added: 'New',
  removed: 'Removed',
}

export const ChangeIndicator: FC<ChangeIndicatorProps> = ({ variant, label }) => {
  return (
    <span class="flex-change-indicator" data-variant={variant} role="status" aria-label={label ?? LABELS[variant]}>
      <span class="flex-change-indicator__dot" aria-hidden="true" />
      {label ? <span class="flex-change-indicator__label">{label}</span> : null}
    </span>
  )
}
```

- [ ] **Step 15.2: Styles (color per variant) + meta + commit**

```css
@layer block {
  .flex-change-indicator__dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .flex-change-indicator[data-variant='modified'] .flex-change-indicator__dot { background: var(--flex-color-warning); }
  .flex-change-indicator[data-variant='added']    .flex-change-indicator__dot { background: var(--flex-color-success); }
  .flex-change-indicator[data-variant='removed']  .flex-change-indicator__dot { background: var(--flex-color-error); }
}
```

```bash
git add src/design-system/components/flex-change-indicator/
git commit -m "feat(flex-change-indicator): new change-marker component"
```

---

## Task 16: Wire branch UI into editor

**Goal:** Editor header shows `flex-branch-indicator` + `flex-branch-switcher`. Sidebar shows `flex-change-indicator` for resources that differ from base.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`

- [ ] **Step 16.1: Load change set**

At route handler time (Task 12), call `service.getChangedResources(owner, slug, branch)` — add this method:

```typescript
// project-service.ts: simple passthrough
async getChangedResources(slug: string, branch: string): Promise<{ dataSpec: boolean; formSpec: boolean; changedPageIds: string[] }> {
  const files = await repo.getBranchDiff(slug, 'main', branch)
  const dataSpec = files.includes('forms/default/spec.json')
  const formSpec = files.includes('forms/default/form.json')
  // Page-level granularity: re-diff the formSpec pages to find which page ids changed
  // (optional refinement; may be empty for the first iteration)
  return { dataSpec, formSpec, changedPageIds: [] }
}
```

- [ ] **Step 16.2: Header rendering**

In `EditorPage`:

```tsx
<header class="editor__header">
  <BranchIndicator name={branch ?? 'main'} isPublished={branch === 'main'} ahead={currentBranch?.ahead} />
  <BranchSwitcher
    current={branch ?? 'main'}
    branches={branches}
    compareHref={(b) => `/${owner}/${slug}/edit/${b}`}
    createHref={`/${owner}/${slug}/edit/${branch}/branch`}
  />
  {branch && branch !== 'main' ? (
    <a href={`/${owner}/${slug}/compare/main...${branch}`} class="editor__review-link">Review changes</a>
  ) : null}
</header>
```

- [ ] **Step 16.3: Sidebar change markers**

```tsx
{changed.dataSpec ? <ChangeIndicator variant="modified" label="DataCollectionSpec" /> : null}
{changed.formSpec ? <ChangeIndicator variant="modified" label="FormSpec" /> : null}
```

- [ ] **Step 16.4: Run tests**

`bun run check`
Expected: PASS.

- [ ] **Step 16.5: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/ src/services/project-service.ts
git commit -m "feat(editor): wire branch indicator, switcher, change markers into editor header"
```

---

## Task 17: Review route shell and header

**Goal:** Register a new route factory that renders the review page shell at `/:owner/:slug/compare/:base...:head`.

**Files:**
- Create: `src/entrypoints/app/routes/owner/compare/index.tsx`
- Create: `src/entrypoints/app/routes/owner/compare/components.tsx`
- Modify: `src/entrypoints/app/server.tsx` (mount route)

The URL contains `...` between base and head. In Hono, this is one path segment containing the literal string (no special parsing). Use a single param and split manually.

- [ ] **Step 17.1: Route factory**

```typescript
// src/entrypoints/app/routes/owner/compare/index.tsx
import { Hono } from 'hono'
import type { ProjectService } from '../../../../services/project-service'
import type { ReviewService } from '../../../../services/forms/review'
import { compareSpecs } from '../../../../services/forms/comparison'
import { ReviewPage } from './components'

function parseRange(range: string): { base: string; head: string } | null {
  const idx = range.indexOf('...')
  if (idx < 0) return null
  return { base: range.slice(0, idx), head: range.slice(idx + 3) }
}

export function createCompareRoutes(project: ProjectService, review: ReviewService) {
  const app = new Hono()

  app.get('/:owner/:slug/compare/:range', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const user = c.get('user')

    const baseView = await project.getProject(owner, slug, user, parsed.base)
    const headView = await project.getProject(owner, slug, user, parsed.head)
    const changes = compareSpecs(
      { dataSpec: baseView.dataSpec, formSpec: baseView.formSpec },
      { dataSpec: headView.dataSpec, formSpec: headView.formSpec },
    )
    const comments = await review.comments.list({ owner, slug, base: parsed.base, head: parsed.head })
    const log = await project.getShapingLog(owner, slug, parsed.head)

    return c.html(
      <ReviewPage
        owner={owner}
        slug={slug}
        base={parsed.base}
        head={parsed.head}
        changes={changes}
        comments={comments}
        log={log}
        baseView={baseView}
        headView={headView}
      />,
    )
  })

  app.post('/:owner/:slug/compare/:range/merge', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const outcome = await review.merge({ owner, slug, base: parsed.base, head: parsed.head })
    if (outcome.status === 'merged') return c.redirect(`/${owner}/${slug}`)
    return c.html(<ReviewPage.MergeError outcome={outcome} />, 409)
  })

  app.post('/:owner/:slug/compare/:range/close', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    await review.close({ owner, slug, base: parsed.base, head: parsed.head })
    return c.redirect(`/${owner}/${slug}`)
  })

  app.post('/:owner/:slug/compare/:range/comments', async (c) => {
    const { owner, slug, range } = c.req.param()
    const parsed = parseRange(range)
    if (!parsed) return c.text('invalid compare range', 400)
    const user = c.get('user')
    const body = await c.req.parseBody()
    await review.comments.add(
      { owner, slug, base: parsed.base, head: parsed.head },
      { body: String(body.body), author: user.login, parentId: body.parentId ? String(body.parentId) : undefined },
    )
    return c.redirect(`/${owner}/${slug}/compare/${range}#comments`)
  })

  return app
}
```

- [ ] **Step 17.2: Mount in server.tsx**

```typescript
// in src/entrypoints/app/server.tsx, BEFORE createOwnerRoutes
import { createCompareRoutes } from './routes/owner/compare'

const reviewService = createReviewService(repo)
app.route('/', createCompareRoutes(projectService, reviewService))
```

- [ ] **Step 17.3: ReviewPage component skeleton**

```tsx
// src/entrypoints/app/routes/owner/compare/components.tsx
import type { FC } from 'hono/jsx'
import type { SpecChange } from '../../../../services/forms/comparison'
import type { Comment } from '../../../../services/forms/review'

interface ReviewPageProps {
  owner: string
  slug: string
  base: string
  head: string
  changes: SpecChange[]
  comments: Comment[]
  log: unknown[]          // Will be typed in Task 19
  baseView: unknown
  headView: unknown
}

export const ReviewPage: FC<ReviewPageProps> & { MergeError: FC<{ outcome: unknown }> } = (props) => {
  const range = `${props.base}...${props.head}`
  return (
    <main class="compare">
      <header class="compare__header">
        <h1>{props.head}</h1>
        <p>main ← {props.head}</p>
        <form method="POST" action={`/${props.owner}/${props.slug}/compare/${range}/merge`}>
          <button type="submit">Merge to main</button>
        </form>
        <form method="POST" action={`/${props.owner}/${props.slug}/compare/${range}/close`}>
          <button type="submit">Close</button>
        </form>
        <a href={`/${props.owner}/${props.slug}/edit/${props.head}`}>Open in editor →</a>
      </header>
      <nav class="compare__tabs" role="tablist">
        <a href="#changes" role="tab">Changes ({props.changes.length})</a>
        <a href="#preview" role="tab">Preview</a>
        <a href="#history" role="tab">History ({props.log.length})</a>
        <a href="#comments" role="tab">Comments ({props.comments.length})</a>
      </nav>
      {/* panels added in Tasks 18-20 */}
    </main>
  )
}

ReviewPage.MergeError = ({ outcome }) => <div role="alert">Cannot merge: {JSON.stringify(outcome)}</div>
```

- [ ] **Step 17.4: Smoke test**

```bash
bun run dev
# Visit http://localhost:3000/<owner>/<slug>/compare/main...<some-branch>
```

Expected: header renders, tab links visible.

- [ ] **Step 17.5: Commit**

```bash
git add src/entrypoints/app/routes/owner/compare/ src/entrypoints/app/server.tsx
git commit -m "feat(compare): review route shell with merge/close/comments endpoints"
```

---

## Task 18: Changes tab (semantic diff view)

**Goal:** Render the `SpecChange[]` from the comparison as grouped, badged list entries.

**Files:**
- Create: `src/design-system/components/flex-semantic-diff/index.tsx`
- Create: `src/design-system/components/flex-semantic-diff/styles.css`
- Create: `src/design-system/components/flex-semantic-diff/meta.ts`
- Modify: `src/entrypoints/app/routes/owner/compare/components.tsx`

- [ ] **Step 18.1: Component**

```tsx
// src/design-system/components/flex-semantic-diff/index.tsx
import type { FC } from 'hono/jsx'
import type { ChangeCategory, SpecChange } from '../../../services/forms/comparison'

interface Props { changes: SpecChange[] }

const CATEGORY_LABELS: Record<ChangeCategory, string> = {
  added: 'ADDED',
  removed: 'REMOVED',
  modified: 'MODIFIED',
  moved: 'MOVED',
  renamed: 'RENAMED',
}

export const SemanticDiff: FC<Props> = ({ changes }) => {
  const byResource = new Map<string, SpecChange[]>()
  for (const c of changes) {
    const key = c.resource
    byResource.set(key, [...(byResource.get(key) ?? []), c])
  }
  return (
    <section class="flex-semantic-diff">
      {[...byResource.entries()].map(([resource, items]) => (
        <div class="flex-semantic-diff__group">
          <h3>{resource === 'data-collection-spec' ? 'DataCollectionSpec' : 'FormSpec'}</h3>
          <ul>
            {items.map((c) => (
              <li class="flex-semantic-diff__change" data-category={c.category}>
                <span class="flex-semantic-diff__badge">{CATEGORY_LABELS[c.category]}</span>
                <span class="flex-semantic-diff__description">{c.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {changes.length === 0 ? <p>No changes between these refs.</p> : null}
    </section>
  )
}
```

- [ ] **Step 18.2: Wire into ReviewPage**

In `components.tsx`, add a panel after the tab nav:

```tsx
<section id="changes" class="compare__panel">
  <SemanticDiff changes={props.changes} />
</section>
```

- [ ] **Step 18.3: Commit**

```bash
git add src/design-system/components/flex-semantic-diff/ src/entrypoints/app/routes/owner/compare/
git commit -m "feat(compare): semantic diff view on Changes tab"
```

---

## Task 19: History tab (command log between refs)

**Goal:** Show shaping log entries that are on `head` but not on `base`. Timeline layout with source + explanation.

**Files:**
- Modify: `src/services/project-service.ts` (add `getShapingLogSince` helper)
- Modify: `src/entrypoints/app/routes/owner/compare/components.tsx`

- [ ] **Step 19.1: Service helper**

```typescript
// project-service.ts
async getShapingLogSince(slug: string, base: string, head: string): Promise<ShapingLogEntry[]> {
  const headLog = await this.getShapingLog(/* owner unused */'', slug, head)
  const baseLog = await this.getShapingLog('', slug, base)
  const baseCommits = new Set(baseLog.map((e) => e.authorCommit))
  return headLog.filter((e) => !baseCommits.has(e.authorCommit))
}
```

Note: if `getShapingLog` requires `owner`, adjust the signature. The key is to diff log entries by `authorCommit`.

- [ ] **Step 19.2: History panel**

```tsx
<section id="history" class="compare__panel">
  <ol class="compare__history">
    {props.log.map((entry: any) => (
      <li>
        <time>{entry.timestamp}</time>
        <span class="compare__history-source">{entry.source}</span>
        <p>{entry.explanation}</p>
      </li>
    ))}
  </ol>
</section>
```

- [ ] **Step 19.3: Commit**

```bash
git add src/services/project-service.ts src/entrypoints/app/routes/owner/compare/
git commit -m "feat(compare): History tab showing shaping log entries on branch"
```

---

## Task 20: Comments tab

**Goal:** Render existing comments and a form to add a new one.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/compare/components.tsx`

- [ ] **Step 20.1: Panel**

```tsx
<section id="comments" class="compare__panel">
  <ol class="compare__comments">
    {props.comments.map((c) => (
      <li>
        <header>
          <strong>{c.author}</strong>
          <time>{c.timestamp}</time>
        </header>
        <div class="compare__comment-body">{c.body}</div>
      </li>
    ))}
  </ol>
  <form method="POST" action={`/${props.owner}/${props.slug}/compare/${range}/comments`}>
    <label>
      Comment
      <textarea name="body" required />
    </label>
    <button type="submit">Comment</button>
  </form>
</section>
```

- [ ] **Step 20.2: Smoke test via dev server**

Visit the review URL and add a comment. Expected: comment persists on page reload.

- [ ] **Step 20.3: Commit**

```bash
git add src/entrypoints/app/routes/owner/compare/
git commit -m "feat(compare): Comments tab with create form"
```

---

## Task 21: Preview tab (side-by-side rendered forms)

**Goal:** Render both base and head form snapshots side-by-side using the existing page renderer. Read-only — no session.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/compare/components.tsx`

The existing form renderer probably requires a `session`. For preview, either stub a read-only session with empty field values or call the renderer in a "preview" mode. Read `src/entrypoints/app/routes/forms/index.tsx` for the existing page-render function, then extract the stateless portion into a helper that takes `{ dataSpec, formSpec, pageIndex }` and returns JSX.

- [ ] **Step 21.1: Extract stateless page render helper (if not already present)**

```typescript
// src/services/forms/preview.ts (new)
import { filterVisibleGroups, resolveFormSpec } from './resolver'
import type { DataCollectionSpec, FormSpec } from '...'

export function renderFormPreview(dataSpec: DataCollectionSpec, formSpec: FormSpec) {
  const resolved = resolveFormSpec(formSpec, dataSpec)
  return resolved.pages.map((page) => ({
    title: page.title,
    groups: filterVisibleGroups(page.groups, {}),
    deliveryMode: page.deliveryMode,
  }))
}
```

(Adapt names to match existing helpers — this is illustrative.)

- [ ] **Step 21.2: Preview panel renders base and head previews**

```tsx
<section id="preview" class="compare__panel compare__preview">
  <div class="compare__preview-side" data-ref="base">
    <header>{props.base} (published)</header>
    <FormPreview preview={basePreview} />
  </div>
  <div class="compare__preview-side" data-ref="head">
    <header>{props.head}</header>
    <FormPreview preview={headPreview} />
  </div>
</section>
```

`basePreview` and `headPreview` come from `renderFormPreview(...)` on each snapshot, computed inside the route handler.

- [ ] **Step 21.3: Commit**

```bash
git add src/entrypoints/app/routes/owner/compare/ src/services/forms/preview.ts
git commit -m "feat(compare): side-by-side form preview tab"
```

---

## Task 22: Branch-qualified form URL and preview banner

**Goal:** `/:owner/:slug/forms/:branch` serves the form from that branch's specs with a warning banner. `specVersion` on submissions captures the exact branch commit SHA.

**Files:**
- Create: `src/design-system/components/flex-preview-banner/index.tsx`
- Create: `src/design-system/components/flex-preview-banner/styles.css`
- Create: `src/design-system/components/flex-preview-banner/meta.ts`
- Modify: `src/entrypoints/app/routes/forms/index.tsx`

- [ ] **Step 22.1: Banner component**

```tsx
// src/design-system/components/flex-preview-banner/index.tsx
import type { FC } from 'hono/jsx'
interface Props { branch: string; editHref: string }
export const PreviewBanner: FC<Props> = ({ branch, editHref }) => (
  <div class="flex-preview-banner" role="status">
    You are viewing a preview on branch <strong>{branch}</strong>. Submissions will reference this version.
    <a href={editHref}>Open in editor</a>
  </div>
)
```

Styles use `--flex-color-warning-lighter` for background.

- [ ] **Step 22.2: Form routes accept optional branch**

In `src/entrypoints/app/routes/forms/index.tsx`, change the route signature so the `getSpecs` dep takes `(specId, ref?)`. Add:

```typescript
app.get('/forms/:specId/branches/:branch/*', async (c) => { /* branch-scoped same flow */ })
```

Or simpler — add branch-qualified routes in parallel to the existing ones, sharing a renderer. For each handler, call `getSpecs(specId, branch)` and resolve the commit SHA once:

```typescript
const sha = await projectService.resolveSha(slug, branch) // helper: repo.log(slug, branch, undefined, 1)[0].sha
```

When building the `Submission` for save, set `specVersion = sha`.

Wrap the page output with `<PreviewBanner>` when `branch && branch !== 'main'`.

- [ ] **Step 22.3: Commit**

```bash
git add src/design-system/components/flex-preview-banner/ src/entrypoints/app/routes/forms/
git commit -m "feat(forms): branch-qualified form URLs with preview banner and SHA-pinned submissions"
```

---

## Task 23: End-to-end integration test

**Goal:** A test that exercises the full flow: create branch → edit on branch → open review page → merge → branch disappears from main's view.

**Files:**
- Create: `test/entrypoints/app/compare-route.test.ts`

- [ ] **Step 23.1: Write test**

```typescript
// test/entrypoints/app/compare-route.test.ts
import { describe, expect, it } from 'bun:test'
// Use whatever app-factory fixture already exists in test/entrypoints/app/

describe('review flow end-to-end', () => {
  it('create branch → edit → review → merge', async () => {
    // 1. Set up a project on main
    // 2. POST to create a branch
    // 3. POST an edit on that branch
    // 4. GET /owner/slug/compare/main...branch and assert 200 + change descriptions present
    // 5. POST merge; assert 302 redirect
    // 6. GET listBranches — only main remains (if close was also called) or both (if not)
    // (Implementation depends on existing app-factory fixture; substitute accordingly.)
  })
})
```

Read the existing integration tests in `test/entrypoints/app/` to learn the fixture shape; follow that pattern.

- [ ] **Step 23.2: Run full check**

```bash
bun run check
```
Expected: PASS.

- [ ] **Step 23.3: Commit**

```bash
git add test/entrypoints/app/compare-route.test.ts
git commit -m "test(compare): end-to-end review flow integration test"
```

---

## Task 24: Update existing story-4 editor to require a branch

**Goal:** Ensure the editor UI on `main` is clearly read-only (renders a "Create branch" call-to-action instead of the edit controls).

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`

- [ ] **Step 24.1: Implement mode="no-branch" view**

```tsx
{mode === 'no-branch' ? (
  <section class="editor__no-branch">
    <h1>Create a branch to start editing</h1>
    <p>The main branch is read-only. Create a branch to make changes.</p>
    <form method="POST" action={`/${owner}/${slug}/edit/main/branch`}>
      <label>Branch name <input name="name" required /></label>
      <button type="submit">Create branch</button>
    </form>
  </section>
) : null}
```

- [ ] **Step 24.2: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/
git commit -m "feat(editor): show create-branch CTA when viewing main"
```

---

## Task 25: Run full check and verify scope

- [ ] **Step 25.1: Full check**

```bash
bun run check
```
Expected: PASS.

- [ ] **Step 25.2: Manually verify the golden path in browser**

```bash
bun run dev
```

1. Visit a project's `/edit` — should see the "create branch" CTA on main.
2. Create a branch `test-feature`.
3. Make an edit (via story-4's shaping UI).
4. Click "Review changes" in the editor header.
5. Confirm the Changes, Preview, History, Comments tabs render and contain expected content.
6. Add a comment, refresh; comment persists.
7. Click "Merge to main"; redirects to project page.
8. Return to editor; `main` should reflect the merged changes.
9. Visit `/:owner/:slug/forms/test-feature` — banner displays, form renders.

- [ ] **Step 25.3: Update flight board status**

Set story-5 status to `ready-for-review` in `notes/flight-board.md`.

- [ ] **Step 25.4: Commit**

```bash
git add notes/flight-board.md
git commit -m "chore: mark story-5 ready for review"
```

---

## Self-Review Checklist

All spec requirements traced to tasks:

- Branch model (main=published, named=working) → Tasks 1-3, 11
- `main` read-only in editor → Tasks 12, 24
- Branch indicator & switcher → Tasks 13, 14, 16
- Change indicators on modified resources → Tasks 15, 16
- PR-style review page at `/:owner/:slug/compare/:base...:branch` → Task 17
- Structural semantic diff for DataCollectionSpec → Task 5
- Structural semantic diff for FormSpec → Task 6
- Domain-aware descriptions → Tasks 5, 6, 18
- Command log (History tab) → Task 19
- Side-by-side preview → Task 21
- Approve (merge) & reject (close) → Tasks 10, 17
- Comments on review pages → Tasks 9, 20
- Branch-qualified form URLs + preview banner → Task 22
- Submissions reference commit SHA → Task 22
- Integration test → Task 23

Dependencies between services flow one way (`shared → services → entrypoints`); no new cycles introduced. Comparison is pure (no git); review wraps repo + comparison; routes wrap review + project.

Open questions from the design (branch naming, non-ff merge) are addressed: free-form names (Task 3), explicit `not-fast-forward` error surfaced as a 409 (Task 17).
