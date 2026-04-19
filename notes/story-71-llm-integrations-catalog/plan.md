# Story 71 — Screaming Service Layer + LLM Integrations Catalog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape `src/services/` so every service has one obvious public-interface file, enforce that with a dependency-rule test, and add a catalog page that enumerates every LLM call site with deep links pinned to the deployed commit.

**Architecture:** Each service grows an `index.ts` that re-exports its public API; external callers import only from `services/<name>`. Five orphan files at `src/services/*.ts` fold into appropriate services (or `shared/`). A new `BuildInfo` module resolves the deployed commit SHA; a `githubPermalink()` helper plus a markdown `src:` URL rewriter turn catalog links into permalinks that point at the exact running code. A dependency-rule test failure tells callers to import through `index.ts`.

**Tech Stack:** Bun, TypeScript, Hono, markdown-it, NixOS (for `BUILD_GIT_SHA` env wiring), existing `bun:test` harness.

**Branch / worktree:** `story-71/llm-integrations-catalog` at `.worktrees/story-71-llm-integrations-catalog/`. All work happens in this worktree.

**Design doc:** `notes/story-71-llm-integrations-catalog/design.md`.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `src/services/auth/index.ts` | Public API for auth service (oauth, session, user-store) |
| `src/services/content/index.ts` | Public API for content service (markdown parsing, github-permalink) |
| `src/services/content/github-permalink.ts` | Builds GitHub permalinks against a `BuildInfo` |
| `src/services/data-collection/index.ts` | Public API for data-collection types |
| `src/services/deployment/index.ts` | Public API for deployment service |
| `src/services/extraction/index.ts` | Public API for extraction service |
| `src/services/forms/index.ts` | Public API for forms service (large re-export surface) |
| `src/services/notifications/index.ts` | Public API for notifications |
| `src/services/variant-preferences/index.ts` | Public API for variant-preferences |
| `src/services/projects/` | New service folder |
| `src/services/projects/index.ts` | Public API for projects |
| `src/services/projects/project-service.ts` | Moved from `src/services/project-service.ts` |
| `src/services/projects/form-project-repo.ts` | Moved from `src/services/form-project-repo.ts` |
| `src/services/storage/` | New service folder (promoted from single file) |
| `src/services/storage/index.ts` | Public API for storage |
| `src/services/auth/user-store.ts` | Moved from `src/services/user-store.ts` |
| `src/shared/strategy-registry.ts` | Moved from `src/services/strategy-registry.ts` |
| `src/shared/build-info.ts` | Resolves build/deploy git ref + dirty flag |
| `test/shared/build-info.test.ts` | Unit tests for `getBuildInfo()` |
| `test/services/content/github-permalink.test.ts` | Unit tests for `githubPermalink()` |
| `test/services/content/markdown-src-rewriter.test.ts` | Unit tests for markdown `src:` URL rewriting |
| `catalog/architecture/llm-integrations.md` | Enumerates every LLM call site with permalinks |
| `catalog/architecture/navigation.md` | Documents the service-public-interface convention |

### Modified files

| File | Reason |
|---|---|
| `src/services/content/markdown.ts` | Post-process `src:` URLs into GitHub permalinks |
| `src/services/evaluation/index.ts` | Verify completeness (should already be complete) |
| `src/services/form-documents/index.ts` | Verify completeness (should already be complete) |
| All entrypoint files that deep-import services | Rewrite to import from `services/<name>` |
| All cross-service deep imports | Rewrite to import from sibling service's `index.ts` |
| `test/architecture/dependency-rule.test.ts` | Add cross-service "deep import forbidden" rule |
| `catalog/architecture/software-architecture.md` | New subsection: "Service public interface" |
| `infrastructure/nixos/modules/deploy.nix` | Pass `BUILD_GIT_SHA` env to service |
| `infrastructure/nixos/modules/app.nix` | Accept `BUILD_GIT_SHA` in service env |

### Deleted files (after moves land)

| File | After moving to |
|---|---|
| `src/services/storage.ts` | `src/services/storage/index.ts` |
| `src/services/project-service.ts` | `src/services/projects/project-service.ts` |
| `src/services/form-project-repo.ts` | `src/services/projects/form-project-repo.ts` |
| `src/services/user-store.ts` | `src/services/auth/user-store.ts` |
| `src/services/strategy-registry.ts` | `src/shared/strategy-registry.ts` |

---

## Global conventions

**TDD.** Every new module gets a failing test before implementation. Refactor/move tasks don't need new tests but must keep `bun run check` green at every commit.

**Commits.** Small, conventional commits: `refactor(services)`, `feat(shared)`, `docs(catalog)`, `test(architecture)`, `infra(nixos)`.

**Verify before each commit.** Run `bun run check` (lint + type check + tests). Pre-push hook also runs it.

**Import paths.** When code is inside `src/services/<A>/`, cross-service imports use relative paths like `'../<B>'` (resolves to `<B>/index.ts`). Entrypoints use `'../../services/<B>'`. Intra-service imports use `'./<file>'`.

**Type-only imports are not exempt** from the cross-service rule. The service public interface applies to both runtime and type imports — the convention is about intent visibility, not just runtime coupling. Existing deep type-only imports (including from `design-system/`) must be rewritten in Task 10.

---

## Task 1: Add `index.ts` to every service that lacks one

**Goal:** Every service has a public interface file. Pure additions — no consumers change yet, no tests broken.

**Files:**
- Create: `src/services/auth/index.ts`
- Create: `src/services/content/index.ts`
- Create: `src/services/data-collection/index.ts`
- Create: `src/services/deployment/index.ts`
- Create: `src/services/extraction/index.ts`
- Create: `src/services/forms/index.ts`
- Create: `src/services/notifications/index.ts`
- Create: `src/services/variant-preferences/index.ts`
- Verify: `src/services/evaluation/index.ts` (already exists; ensure all public exports are present)
- Verify: `src/services/form-documents/index.ts` (already exists; ensure all public exports are present)

- [ ] **Step 1: Enumerate each service's current external consumers**

For each service `<name>` in the list above, run:

```bash
grep -rn "from '[^']*services/<name>/" src/ --include='*.ts' --include='*.tsx' | grep -v "^src/services/<name>/"
```

Collect the set of symbols each consumer imports. These define the minimum public API that `<name>/index.ts` must re-export.

- [ ] **Step 2: Write `src/services/auth/index.ts`**

Enumerate what's currently imported externally. From grep:
- `GitHubOAuth`, `createGitHubOAuth` from `./github-oauth`
- `SessionUser`, `createSession`, `SessionStore`, `SqliteSessionStore`, `getSessionUser` from `./session`
- Any types from `./types`

```ts
// Public interface for the auth service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export { createGitHubOAuth } from './github-oauth'
export type { GitHubOAuth } from './github-oauth'

export {
  createSessionStore,
  getSessionUser,
  setSessionUser,
  clearSession,
} from './session'
export type { SessionStore, SessionUser } from './session'

export type * from './types'
```

Note: exact export names come from reading the files — use the grep result to confirm the true set. The sample above is illustrative.

- [ ] **Step 3: Run type check and tests**

```bash
bun run --no-warnings tsc --noEmit
bun test
```

Expected: both pass. No consumer change yet — `index.ts` is additive.

- [ ] **Step 4: Repeat steps 2-3 for each remaining service**

In order: `content`, `data-collection`, `deployment`, `extraction`, `forms`, `notifications`, `variant-preferences`. For each:

1. Grep external consumers (as in Step 1).
2. Create `src/services/<name>/index.ts` re-exporting the required symbols.
3. Each file opens with the "Public interface" comment shown in Step 2.
4. `bun run --no-warnings tsc --noEmit && bun test` — must pass.

**Special case: `forms/index.ts`.** Group re-exports by sub-module with comment headers for readability:

```ts
// Public interface for the forms service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

// --- resolver & validation
export { resolveForm, evaluateCondition } from './resolver'
export { validateFields } from './validation'

// --- sessions & submissions
export { SqliteFormSessionGateway } from './sqlite-session-gateway'
export { SqliteSubmissionGateway } from './sqlite-submission-gateway'
// ...

// --- shaping
export { createShapingRegistry } from './shaping/registry'
export { executeBatch } from './shaping/executor'
export { humanize } from './shaping/humanize'
export { commandSchema } from './shaping/commands'
export type { Command } from './shaping/commands'
export type { FormShaper } from './shaping/types'

// --- filling
export { createFillingRegistry } from './filling/registry'
export * from './filling-agent'

// --- comparison
export { compareSpecs } from './comparison'
export type { ChangeCategory, SpecChange } from './comparison'

// --- review
export { createReviewService } from './review'
export type { Comment, ReviewService } from './review'

// --- navigation & preview & snapshots
export { createNavigation } from './navigation'
export { createPreview } from './preview'
export { createSpecSnapshotStore } from './spec-snapshot-store'

// --- types
export type * from './types'
```

(The exact set of exports must match what consumers import — determined by grepping, not by this sample.)

- [ ] **Step 5: Verify `evaluation/index.ts` and `form-documents/index.ts` completeness**

Read each file. Re-grep external consumers. If any consumer imports a symbol that isn't in the `index.ts`, add it.

- [ ] **Step 6: Commit**

```bash
git add src/services/*/index.ts
git commit -m "refactor(services): add public-interface index.ts to every service

Each service now exposes its public API via index.ts with a top-of-file
comment stating that external imports must route through this file.
Consumers are not yet rewritten — that happens in a later commit.
"
```

---

## Task 2: Move `strategy-registry.ts` to `shared/`

**Goal:** `StrategyRegistry` is a pure utility with no domain; it belongs in `shared/`.

**Files:**
- Create: `src/shared/strategy-registry.ts`
- Delete: `src/services/strategy-registry.ts`
- Modify: every consumer's import

- [ ] **Step 1: Find all consumers**

```bash
grep -rn "from '[^']*services/strategy-registry'" src/
```

Record the paths.

- [ ] **Step 2: Move the file**

```bash
git mv src/services/strategy-registry.ts src/shared/strategy-registry.ts
```

- [ ] **Step 3: Rewrite consumer imports**

For each consumer found in Step 1, update the import path from `'.../services/strategy-registry'` to the equivalent `'.../shared/strategy-registry'`. Pay attention to relative-path depth.

Examples:
- `src/services/form-documents/mapping-registry.ts`: `from '../strategy-registry'` → `from '../../shared/strategy-registry'`
- `src/services/forms/shaping/registry.ts`: `from '../../strategy-registry'` → `from '../../../shared/strategy-registry'`
- `src/entrypoints/app/routes/owner/edit/index.tsx`: `from '../../../../../services/strategy-registry'` → `from '../../../../../shared/strategy-registry'`

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: pass. If any file still references the old path, fix and re-run.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(shared): move strategy-registry to shared/ (pure utility)

StrategyRegistry is a generic Map<key, factory> pattern with no domain
content. It belongs in shared/ per the architecture principles.
"
```

---

## Task 3: Promote `storage.ts` to `storage/` service folder

**Goal:** `storage` becomes a proper service folder with an `index.ts` public interface.

**Files:**
- Create: `src/services/storage/index.ts`
- Delete: `src/services/storage.ts`
- Modify: consumers that imported from `services/storage`

- [ ] **Step 1: Find all consumers**

```bash
grep -rn "from '[^']*services/storage'" src/
```

- [ ] **Step 2: Create folder and move file**

```bash
mkdir -p src/services/storage
git mv src/services/storage.ts src/services/storage/index.ts
```

- [ ] **Step 3: Update the moved file's internal import paths**

`storage.ts` imports from `'../types/models'`. After moving to `storage/index.ts`, that becomes `'../../types/models'`.

Open `src/services/storage/index.ts` and fix any relative imports that now point at the wrong depth.

- [ ] **Step 4: Add public-interface comment header**

Prepend at the top of `src/services/storage/index.ts`:

```ts
// Public interface for the storage service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.
```

Nothing else changes — the file already exports what consumers need (`createCacheStore`, `createProjectStore`, `CacheStore`, `ProjectStore`, etc.).

- [ ] **Step 5: Run checks**

```bash
bun run check
```

Expected: pass without any consumer change (imports of `services/storage` still resolve via Node's folder-index convention).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(services): promote storage to its own folder with index.ts"
```

---

## Task 4: Create `projects/` service (absorb project-service.ts + form-project-repo.ts)

**Goal:** On-disk form-project handling becomes a real service.

**Files:**
- Create: `src/services/projects/`
- Create: `src/services/projects/project-service.ts` (moved)
- Create: `src/services/projects/form-project-repo.ts` (moved)
- Create: `src/services/projects/index.ts`
- Delete: `src/services/project-service.ts`
- Delete: `src/services/form-project-repo.ts`
- Modify: consumers

- [ ] **Step 1: Find all consumers**

```bash
grep -rn "from '[^']*services/project-service'\|from '[^']*services/form-project-repo'" src/
```

- [ ] **Step 2: Create folder and move files**

```bash
mkdir -p src/services/projects
git mv src/services/project-service.ts src/services/projects/project-service.ts
git mv src/services/form-project-repo.ts src/services/projects/form-project-repo.ts
```

- [ ] **Step 3: Fix intra-file imports in the moved files**

`project-service.ts` previously imported from `'./form-project-repo'` — still works after the move (both files moved together).

But `project-service.ts` also imports from siblings: `'./auth/session'`, `'./errors'`, `'./forms/shaping/commands'`, `'./forms/shaping/executor'`, `'./storage'`, `'./variant-preferences/provenance'`, and `'./form-documents/extraction'`. After moving into `projects/`, these become `'../auth/session'` etc. Update each path.

Also update `'../shared/slugify'` → `'../../shared/slugify'` and `'../types/models'` → `'../../types/models'`.

`form-project-repo.ts` likely imports from `'../types/models'` or similar — update those paths.

- [ ] **Step 4: Write `src/services/projects/index.ts`**

```ts
// Public interface for the projects service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export { createProjectService } from './project-service'
export type { ProjectService } from './project-service'

export { createFormProjectRepo } from './form-project-repo'
export type {
  FormProjectRepo,
  BranchEntry,
  CommitEntry,
  TreeEntry,
} from './form-project-repo'
```

(Confirm names by reading the moved files — sample is illustrative.)

- [ ] **Step 5: Rewrite consumer imports**

Replace every `from '.../services/project-service'` and `from '.../services/form-project-repo'` with `from '.../services/projects'`. Adjust relative-path depth as needed.

- [ ] **Step 6: Run checks**

```bash
bun run check
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(services): introduce projects service (absorbs project-service + form-project-repo)

Form-project handling is a real domain boundary. Moving these two files
into their own folder with an index.ts public interface makes the
services/ directory read as a list of intents.
"
```

---

## Task 5: Move `user-store.ts` into `auth/`

**Goal:** User identity belongs with auth/session.

**Files:**
- Create: `src/services/auth/user-store.ts` (moved)
- Delete: `src/services/user-store.ts`
- Modify: `src/services/auth/index.ts` to re-export
- Modify: consumers

- [ ] **Step 1: Find consumers**

```bash
grep -rn "from '[^']*services/user-store'" src/
```

- [ ] **Step 2: Move the file**

```bash
git mv src/services/user-store.ts src/services/auth/user-store.ts
```

- [ ] **Step 3: Fix moved file's internal imports**

`user-store.ts` imports from `'../types/models'`. After moving to `auth/user-store.ts`, that becomes `'../../types/models'`. Update.

- [ ] **Step 4: Add to `auth/index.ts`**

Open `src/services/auth/index.ts` (created in Task 1) and add:

```ts
export { createUserStore } from './user-store'
export type { UserStore } from './user-store'
```

- [ ] **Step 5: Rewrite consumer imports**

Replace every `from '.../services/user-store'` with `from '.../services/auth'`. Adjust depth.

- [ ] **Step 6: Run checks**

```bash
bun run check
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(auth): move user-store into auth service"
```

---

## Task 6: Add `BuildInfo` module to `shared/`

**Goal:** Deliver a way for the running app to know its own git ref, so catalog permalinks can point at the exact deployed code.

**Files:**
- Create: `src/shared/build-info.ts`
- Create: `test/shared/build-info.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/shared/build-info.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { getBuildInfo, resetBuildInfoCache } from '../../src/shared/build-info'

describe('getBuildInfo', () => {
  const ORIGINAL_ENV = process.env.BUILD_GIT_SHA

  beforeEach(() => {
    resetBuildInfoCache()
  })

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.BUILD_GIT_SHA
    } else {
      process.env.BUILD_GIT_SHA = ORIGINAL_ENV
    }
  })

  it('returns env var sha when BUILD_GIT_SHA is set and non-empty', () => {
    process.env.BUILD_GIT_SHA = 'abc1234567890'
    const info = getBuildInfo()
    expect(info.gitRef).toBe('abc1234567890')
    expect(info.isDirty).toBe(false)
    expect(info.repoUrl).toBe('https://github.com/flexion/forms-lab')
  })

  it('falls back to git rev-parse HEAD when env var absent', () => {
    delete process.env.BUILD_GIT_SHA
    const info = getBuildInfo()
    // In a git worktree this will succeed — we just check shape.
    expect(info.gitRef).toMatch(/^[0-9a-f]{7,40}$|^dev-.+$/)
  })

  it('caches the result across calls', () => {
    process.env.BUILD_GIT_SHA = 'cached-sha'
    const first = getBuildInfo()
    delete process.env.BUILD_GIT_SHA
    const second = getBuildInfo()
    expect(second).toBe(first)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/shared/build-info.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/shared/build-info.ts`**

```ts
import { execSync } from 'node:child_process'

export interface BuildInfo {
  gitRef: string
  repoUrl: string
  isDirty: boolean
}

const REPO_URL = 'https://github.com/flexion/forms-lab'

let cache: BuildInfo | null = null

export function resetBuildInfoCache(): void {
  cache = null
}

export function getBuildInfo(): BuildInfo {
  if (cache) return cache

  const envSha = process.env.BUILD_GIT_SHA?.trim()
  if (envSha) {
    cache = { gitRef: envSha, repoUrl: REPO_URL, isDirty: false }
    return cache
  }

  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    const dirty = execSync('git status --porcelain', {
      encoding: 'utf-8',
    }).trim().length > 0
    if (dirty) {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
      }).trim()
      cache = { gitRef: `dev-${branch}`, repoUrl: REPO_URL, isDirty: true }
    } else {
      cache = { gitRef: sha, repoUrl: REPO_URL, isDirty: false }
    }
    return cache
  } catch {
    console.warn('build-info: could not resolve git ref; using "unknown"')
    cache = { gitRef: 'unknown', repoUrl: REPO_URL, isDirty: false }
    return cache
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/shared/build-info.test.ts
```

Expected: PASS (all three tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/build-info.ts test/shared/build-info.test.ts
git commit -m "feat(shared): add build-info module for deployed-commit awareness

Resolves the git ref the app was built from so catalog permalinks can
point at the exact deployed code. Prefers BUILD_GIT_SHA env var (set
by deploy script), falls back to git rev-parse. Dirty worktrees use a
'dev-<branch>' marker.
"
```

---

## Task 7: Add `githubPermalink()` helper

**Goal:** A pure function that, given a source path and optional line range, returns the GitHub URL for the current build.

**Files:**
- Create: `src/services/content/github-permalink.ts`
- Create: `test/services/content/github-permalink.test.ts`
- Modify: `src/services/content/index.ts` (re-export)

- [ ] **Step 1: Write failing test**

Create `test/services/content/github-permalink.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { githubPermalink } from '../../../src/services/content/github-permalink'
import type { BuildInfo } from '../../../src/shared/build-info'

const clean: BuildInfo = {
  gitRef: 'abc1234',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: false,
}

const dirty: BuildInfo = {
  gitRef: 'dev-story-71/llm-integrations-catalog',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: true,
}

describe('githubPermalink', () => {
  it('builds a URL with just a path', () => {
    expect(githubPermalink({ path: 'src/services/forms/index.ts' }, clean))
      .toBe('https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts')
  })

  it('adds a single-line anchor when lines is a number', () => {
    expect(
      githubPermalink({ path: 'src/services/forms/index.ts', lines: 42 }, clean),
    ).toBe('https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts#L42')
  })

  it('adds a line range anchor when lines is a tuple', () => {
    expect(
      githubPermalink({ path: 'src/services/forms/index.ts', lines: [42, 88] }, clean),
    ).toBe('https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts#L42-L88')
  })

  it('uses the dirty gitRef verbatim (branch name already includes slashes)', () => {
    expect(githubPermalink({ path: 'src/shared/build-info.ts' }, dirty))
      .toBe(
        'https://github.com/flexion/forms-lab/blob/dev-story-71/llm-integrations-catalog/src/shared/build-info.ts',
      )
  })

  it('strips a leading slash on path if present', () => {
    expect(githubPermalink({ path: '/src/services/forms/index.ts' }, clean))
      .toBe('https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/services/content/github-permalink.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/services/content/github-permalink.ts`**

```ts
import type { BuildInfo } from '../../shared/build-info'

export interface PermalinkOptions {
  path: string
  lines?: number | [number, number]
}

export function githubPermalink(
  opts: PermalinkOptions,
  build: BuildInfo,
): string {
  const path = opts.path.startsWith('/') ? opts.path.slice(1) : opts.path
  const base = `${build.repoUrl}/blob/${build.gitRef}/${path}`
  if (opts.lines === undefined) return base
  if (typeof opts.lines === 'number') return `${base}#L${opts.lines}`
  return `${base}#L${opts.lines[0]}-L${opts.lines[1]}`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/services/content/github-permalink.test.ts
```

Expected: PASS (all five tests).

- [ ] **Step 5: Re-export from `content/index.ts`**

Open `src/services/content/index.ts` and add:

```ts
export { githubPermalink } from './github-permalink'
export type { PermalinkOptions } from './github-permalink'
```

- [ ] **Step 6: Run checks**

```bash
bun run check
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/content/github-permalink.ts test/services/content/github-permalink.test.ts src/services/content/index.ts
git commit -m "feat(content): add githubPermalink helper

Builds a GitHub blob URL pinned to the current build's git ref, with
optional line number or range anchor.
"
```

---

## Task 8: Markdown `src:` URL rewriter

**Goal:** Links of the form `[label](src:src/services/forms/index.ts#L42-L88)` in catalog markdown become GitHub permalinks at render time.

**Files:**
- Modify: `src/services/content/markdown.ts` (add post-processing step)
- Create: `test/services/content/markdown-src-rewriter.test.ts`

- [ ] **Step 1: Inspect current `markdown.ts` rendering path**

```bash
bun run --no-warnings tsc --noEmit
```

Read `src/services/content/markdown.ts`. Identify where HTML is rendered (look for `md.render(...)`). The rewriter can either:

- (a) Modify the AST via a markdown-it plugin (preferred — no regex on rendered HTML).
- (b) Run a regex on the final HTML.

Prefer (a) — add a `md.core.ruler.push` or a `md.renderer.rules.link_open` override that transforms `href` attributes starting with `src:`.

- [ ] **Step 2: Write failing test**

Create `test/services/content/markdown-src-rewriter.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { renderMarkdown } from '../../../src/services/content/markdown'
import type { BuildInfo } from '../../../src/shared/build-info'

const build: BuildInfo = {
  gitRef: 'abc1234',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: false,
}

describe('renderMarkdown with src: URL rewriter', () => {
  it('rewrites a src: link with no fragment', () => {
    const html = renderMarkdown('[x](src:src/services/forms/index.ts)', { build })
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts"',
    )
  })

  it('rewrites a src: link with a line range', () => {
    const html = renderMarkdown(
      '[x](src:src/services/forms/index.ts#L42-L88)',
      { build },
    )
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts#L42-L88"',
    )
  })

  it('rewrites a src: link with a single line', () => {
    const html = renderMarkdown('[x](src:src/shared/build-info.ts#L10)', { build })
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/blob/abc1234/src/shared/build-info.ts#L10"',
    )
  })

  it('passes through non-src links untouched', () => {
    const html = renderMarkdown('[x](https://example.com/foo)', { build })
    expect(html).toContain('href="https://example.com/foo"')
  })

  it('passes through relative links untouched', () => {
    const html = renderMarkdown('[x](./other.md)', { build })
    expect(html).toContain('href="./other.md"')
  })
})
```

(If `renderMarkdown` does not yet exist — the current file exports `parseMarkdown` — Step 3 will add it.)

- [ ] **Step 3: Run test to verify it fails**

```bash
bun test test/services/content/markdown-src-rewriter.test.ts
```

Expected: FAIL — `renderMarkdown` not exported or does not handle `src:`.

- [ ] **Step 4: Implement the rewriter in `src/services/content/markdown.ts`**

Add a `renderMarkdown(content: string, opts: { build: BuildInfo }): string` export. Use a markdown-it plugin that overrides `link_open` to rewrite `src:` hrefs.

```ts
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import type { BuildInfo } from '../../shared/build-info'
import { githubPermalink } from './github-permalink'

export interface RenderOptions {
  build: BuildInfo
}

export function renderMarkdown(content: string, opts: RenderOptions): string {
  const md = new MarkdownIt({ html: true, linkify: true })
    .use(taskLists)
    .use(srcUrlPlugin(opts.build))
  return md.render(content)
}

function srcUrlPlugin(build: BuildInfo) {
  return (md: MarkdownIt) => {
    const defaultLinkOpen =
      md.renderer.rules.link_open ??
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const hrefIdx = token.attrIndex('href')
      if (hrefIdx >= 0) {
        const href = token.attrs?.[hrefIdx][1] ?? ''
        const rewritten = rewriteSrcHref(href, build)
        if (rewritten !== href && token.attrs) {
          token.attrs[hrefIdx][1] = rewritten
        }
      }
      return defaultLinkOpen(tokens, idx, options, env, self)
    }
  }
}

function rewriteSrcHref(href: string, build: BuildInfo): string {
  if (!href.startsWith('src:')) return href
  const rest = href.slice(4)
  // rest is "path" or "path#L42" or "path#L42-L88"
  const hashIdx = rest.indexOf('#')
  const path = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest
  const fragment = hashIdx >= 0 ? rest.slice(hashIdx + 1) : ''
  const lines = parseLineFragment(fragment)
  return githubPermalink({ path, lines }, build)
}

function parseLineFragment(fragment: string): number | [number, number] | undefined {
  if (!fragment) return undefined
  const range = fragment.match(/^L(\d+)-L(\d+)$/)
  if (range) return [Number(range[1]), Number(range[2])]
  const single = fragment.match(/^L(\d+)$/)
  if (single) return Number(single[1])
  return undefined
}
```

Keep the existing `parseMarkdown`, `MarkdownFile` export, and `taskLists` usage intact. Add new exports alongside.

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test test/services/content/markdown-src-rewriter.test.ts
```

Expected: PASS (all five tests).

- [ ] **Step 6: Ensure `renderMarkdown` is re-exported from `content/index.ts`**

```ts
export { parseMarkdown, renderMarkdown } from './markdown'
export type { MarkdownFile, RenderOptions } from './markdown'
```

- [ ] **Step 7: Wire `renderMarkdown` into the catalog route**

Find the current catalog markdown-rendering call site:

```bash
grep -rn "parseMarkdown\|md\.render\|MarkdownIt" src/entrypoints/ --include='*.ts' --include='*.tsx'
```

Wherever catalog markdown is currently rendered to HTML, replace the direct `md.render(...)` call (or an existing helper) with `renderMarkdown(content, { build: getBuildInfo() })`. Import from `'../../services/content'`.

If the call site still uses a private `md` instance, refactor it to use `renderMarkdown`.

- [ ] **Step 8: Run checks**

```bash
bun run check
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add src/services/content/markdown.ts src/services/content/index.ts test/services/content/markdown-src-rewriter.test.ts
# plus any entrypoint file touched in Step 7
git commit -m "feat(content): add src: URL rewriter for catalog permalinks

Catalog markdown can now write [label](src:src/path/file.ts#L42-L88)
and the renderer substitutes a GitHub permalink pinned to the current
build's git ref at render time. Non-src: links pass through untouched.
"
```

---

## Task 9: Wire `BUILD_GIT_SHA` through NixOS deploy

**Goal:** The deployed app's `getBuildInfo()` returns the exact commit SHA of the deployed worktree without needing `git rev-parse` at runtime.

**Files:**
- Modify: `infrastructure/nixos/modules/deploy.nix` (capture SHA, export to service)
- Modify: `infrastructure/nixos/modules/app.nix` (pass env var into service)
- Modify: `infrastructure/nixos/modules/entrypoint-wrapper.nix` (forward the env var into the bun process)

- [ ] **Step 1: Read the current deploy flow**

Re-read `deploy.nix` around the branch-deploy section (creating worktrees, restarting the app systemd unit). Identify where the SHA should be captured — it's available via `git rev-parse HEAD` inside the freshly-updated worktree.

Read `app.nix` to see how service environment is currently populated (likely an `EnvironmentFile` or `Environment=` directive).

- [ ] **Step 2: Capture the SHA in deploy.nix and write it to a per-branch file**

In the branch-deploy script (the part that runs after `git worktree add` or `git pull` for an existing worktree), add:

```nix
# Capture the deployed commit SHA for the running app to report
BUILD_GIT_SHA=$(cd "$BRANCH_DIR" && ${pkgs.git}/bin/git rev-parse HEAD)
echo "BUILD_GIT_SHA=$BUILD_GIT_SHA" > "$BRANCH_DIR/.build-info"
```

Emit one line per env var. `deploy-main.sh` does the analogous thing for the homepage.

- [ ] **Step 3: Modify `app.nix` to read `.build-info` as an env file**

In the systemd unit definition for `forms-lab-app@.service` (or equivalent), add the per-branch `.build-info` as a supplementary `EnvironmentFile`. Example pattern:

```nix
serviceConfig = {
  EnvironmentFile = [
    "-/srv/forms-lab/%i/.env"
    "-/srv/forms-lab/%i/.build-info"  # ← new, '-' prefix tolerates missing file
  ];
  # ...
};
```

(If the unit uses a different shape, adapt accordingly.)

- [ ] **Step 4: Confirm `entrypoint-wrapper.nix` passes env through**

Read `entrypoint-wrapper.nix`. It runs `exec bun run "$ENTRYPOINT"` which inherits systemd-provided env, so no change should be needed. Double-check by grepping for any `env -i` or explicit env scrubbing — there isn't any in the current wrapper.

- [ ] **Step 5: Repeat for the homepage service**

If the homepage service is in a separate module (e.g. `homepage.nix`), add the same `EnvironmentFile` pattern for its `.build-info` path. `deploy-main.sh` should write `/srv/forms-lab/main/.build-info` as in Step 2.

- [ ] **Step 6: Write a test-plan note for post-merge validation**

NixOS changes can't be unit-tested from the repo. Add a short checklist to the PR description (not code):

```
Post-merge validation:
- [ ] SSH into EC2, cat /srv/forms-lab/main/.build-info — should contain the new commit SHA
- [ ] systemctl show forms-lab-homepage.service | grep Environment — BUILD_GIT_SHA present
- [ ] curl https://<host>/catalog/architecture/llm-integrations — view-source: links point to that SHA
```

- [ ] **Step 7: Commit**

```bash
git add infrastructure/nixos/modules/deploy.nix infrastructure/nixos/modules/app.nix
# plus homepage.nix if modified
git commit -m "infra(nixos): pass BUILD_GIT_SHA into app and homepage services

The deploy script captures the commit SHA of each deployed worktree
into a .build-info env file, which the service units read via
EnvironmentFile. The running app can then produce catalog permalinks
pinned to its exact deployed commit.
"
```

---

## Task 10: Rewrite entrypoint and cross-service deep imports to use `index.ts`

**Goal:** Every import of a service from outside that service goes through `services/<name>` (the folder, resolving to `index.ts`). No deep paths.

**Files:** ALL files containing deep cross-service imports or entrypoint-deep-into-service imports. Expected touches (non-exhaustive):

- `src/entrypoints/app/server.tsx`
- `src/entrypoints/app/routes/**/*.{ts,tsx}` (many)
- `src/entrypoints/cli/commands/*.ts`
- `src/entrypoints/webhook/*.ts`
- `src/entrypoints/notify/*.ts`
- `src/entrypoints/dashboard/*.tsx`
- `src/services/forms/**` cross-imports to `data-collection`
- `src/services/form-documents/**` cross-imports
- `src/services/variant-preferences/**` cross-imports
- `src/design-system/components/flex-spec-browser/index.tsx`
- `src/design-system/components/flex-spec-diff-browser/index.tsx`
- `src/design-system/components/flex-form-editor/protocol.ts`
- `src/services/evaluation/fixtures/shaping-intents.ts` (cross-service import into forms)

- [ ] **Step 1: Build a complete list of offenders**

Script to run (save output):

```bash
grep -rnE "from '[^']*services/[^/]+/[^']+'" src/ --include='*.ts' --include='*.tsx' \
  | grep -v "from '[^']*services/[^/]+/index'" \
  | grep -v "/node_modules/" \
  > /tmp/deep-service-imports.txt
wc -l /tmp/deep-service-imports.txt
```

Manually inspect the list. Discard any that are intra-service (e.g. a file in `services/forms/foo.ts` importing `from '../types'` — those resolve within the service).

Actual offenders are lines where the importing file lives in a different service, in `entrypoints/`, or in `design-system/` from the imported service.

- [ ] **Step 2: Verify every required symbol is exported from the target `index.ts`**

For each offender's imported symbol, confirm it appears in the target service's `index.ts`. If a symbol was missed in Task 1, add it now before rewriting consumers (re-commit per-service additions as a small refactor commit).

- [ ] **Step 3: Rewrite imports in batches**

Work one target service at a time to keep diffs reviewable. Recommended batch order:

1. `data-collection` (only exports types; small surface)
2. `extraction`
3. `variant-preferences`
4. `content`
5. `notifications`
6. `deployment`
7. `evaluation` (already has `index.ts`)
8. `form-documents` (already has `index.ts`)
9. `forms` (largest — save for last)

For each batch:

a. For every offender in that batch, rewrite the import path:

- `from '../../../../services/forms/resolver'` → `from '../../../../services/forms'`
- `from '../../services/forms/shaping/commands'` → `from '../../services/forms'`
- `from '../../data-collection/types'` (within services/forms) → `from '../data-collection'`

b. If a single file has multiple deep imports from the same service, collapse them into one import:

```ts
// before:
import { commandSchema } from '../../../../../services/forms/shaping/commands'
import { executeBatch } from '../../../../../services/forms/shaping/executor'
import type { Command } from '../../../../../services/forms/shaping/commands'
// after:
import type { Command } from '../../../../../services/forms'
import { commandSchema, executeBatch } from '../../../../../services/forms'
```

c. Run `bun run check`. Fix any type errors (usually: a symbol wasn't re-exported — add to `index.ts`).

d. Commit per batch:

```bash
git add -A
git commit -m "refactor(imports): route <target> imports through index.ts"
```

- [ ] **Step 4: Verify no deep cross-service imports remain**

Rerun the grep from Step 1. Expected output: empty.

```bash
grep -rnE "from '[^']*services/[^/]+/[^']+'" src/ --include='*.ts' --include='*.tsx' \
  | grep -v "from '[^']*services/[^/]+/index'" \
  | grep -v "/node_modules/"
```

Any remaining lines must be intra-service (importer and target in the same service).

- [ ] **Step 5: Final check**

```bash
bun run check
```

Expected: pass.

---

## Task 11: Extend `dependency-rule.test.ts` with cross-service import rule

**Goal:** The test fails any new deep cross-service import — and also any deep import from entrypoints or design-system into a service's internals.

**Files:**
- Modify: `test/architecture/dependency-rule.test.ts`

- [ ] **Step 1: Write failing-test cases first**

Add a new `describe('cross-service public-interface rule', ...)` block inside the existing file, or a new `it(...)` in the existing describe. The test scans `src/**` and asserts no violations.

Start by writing a test that fails on purpose — insert a deliberate bad import into a scratch file, confirm the new check catches it, then remove the scratch.

Alternative: hand-craft a small in-memory fixture the test walks, but the existing test walks `SRC_ROOT` directly — keep that style.

```ts
describe('cross-service public-interface rule', () => {
  it('has no deep cross-service imports', async () => {
    const violations = await findCrossServiceViolations(SRC_ROOT)
    if (violations.length > 0) {
      const formatted = violations
        .map(
          (v) =>
            `${v.file}:${v.line}: deep import '${v.specifier}' — use '${v.suggestion}' instead`,
        )
        .join('\n')
      throw new Error(`cross-service deep imports:\n${formatted}`)
    }
  })
})
```

- [ ] **Step 2: Implement `findCrossServiceViolations`**

Logic (added as helper in the same file or inline):

1. Walk `SRC_ROOT`; for each `.ts/.tsx` file, parse imports (reuse `parseImports`).
2. Determine the importing file's service (if any): `src/services/<A>/...` → service `A`; else not in a service.
3. For each import source, resolve it relative to the importing file to an absolute path.
4. If the resolved path is inside `src/services/<B>/...`:
   - If importer is in service `A` and `A === B`: OK (intra-service).
   - Otherwise (importer is in service `A` where `A !== B`, or in entrypoints, or in design-system): the resolved path must be exactly `src/services/<B>` or `src/services/<B>/index.ts` (or `src/services/<B>/index`). Anything deeper is a violation.
5. Record `{ file, line, specifier, suggestion }` for each violation. `suggestion` is `services/<B>` with the same relative-depth prefix as the original import.

Type-only imports are NOT exempt from this rule — include them. (The existing layer-rule check already excludes type-only; this new rule should not.)

- [ ] **Step 3: Run the test**

```bash
bun test test/architecture/dependency-rule.test.ts
```

Expected: pass, because Task 10 eliminated all violations.

If it fails, the failure message names each offending file:line with a concrete fix — address them and re-run.

- [ ] **Step 4: Add a positive test via scratch violation (optional guard)**

Temporarily add a bad import in a scratch file (e.g. `src/scratch-violation.ts` importing `from './services/forms/resolver'`), run the test, confirm it fails with a clear message, then delete the scratch file. This verifies the detector actually catches violations.

- [ ] **Step 5: Commit**

```bash
git add test/architecture/dependency-rule.test.ts
git commit -m "test(architecture): forbid deep cross-service imports

Extends the dependency-rule test with a new rule: imports from outside
service A into service A must resolve to A's index.ts. Intra-service
imports are unrestricted. Type-only imports are included — the public
interface is about intent visibility, not just runtime coupling.
"
```

---

## Task 12: Write `catalog/architecture/llm-integrations.md`

**Goal:** A single catalog page that enumerates every LLM touchpoint in the system, with clickable permalinks to the exact running code.

**Files:**
- Create: `catalog/architecture/llm-integrations.md`

- [ ] **Step 1: Identify exact line ranges for each touchpoint**

For each invocation site, open the file and find the function that actually calls the LLM. Record `{path, start-line, end-line}`:

- `src/services/form-documents/extraction.ts` — `createBedrockPdfExtractor` (the function that does `bedrock.converse(...)`).
- `src/services/form-documents/tool-use-extraction.ts` — tool-use extractor invocation.
- `src/services/forms/shaping/bedrock-shaper.ts` — the shaping invocation function.
- `src/services/forms/filling-agent/bedrock.ts` — the filling-agent invocation.
- `src/services/evaluation/judge.ts` — `createBedrockFieldJudge` invocation.
- `src/services/extraction/registry.ts` — registry only (not a call site); link the registry function that wires Bedrock strategies.
- `src/services/extraction/models.ts` — model definitions (reference, not invocation).

Use ripgrep or open each file:

```bash
grep -n "bedrock\|InvokeModel\|converse\|client\.send\|BedrockRuntime" src/services/form-documents/extraction.ts
```

Pin each link to a function boundary so small edits inside the function don't make the link misleading.

- [ ] **Step 2: Draft the page**

Write to `catalog/architecture/llm-integrations.md`:

```markdown
---
title: LLM Integrations
status: working
---

# LLM Integrations

This page enumerates every place the system calls a large language model.
Use it as the map to "find every LLM call site" in the codebase.

Links in this page use the `src:` scheme: they resolve to GitHub permalinks
pinned to the exact commit the running app was built from.

## Extraction

### PDF field extraction (form-documents)

- **Purpose.** Parse an uploaded government form PDF into a structured field list.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/form-documents`](src:src/services/form-documents/index.ts)
- **Invocation site.** [`extraction.ts`](src:src/services/form-documents/extraction.ts#L<start>-L<end>)
- **Prompt construction.** [`extraction-steps.ts`](src:src/services/form-documents/extraction-steps.ts)
- **Related experiment.** [PDF field extraction roadmap](../experiments/pdf-field-extraction/README.md)

### Tool-use extraction (form-documents)

- **Purpose.** Same intent as above, but the model uses tool-calling to emit fields.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/form-documents`](src:src/services/form-documents/index.ts)
- **Invocation site.** [`tool-use-extraction.ts`](src:src/services/form-documents/tool-use-extraction.ts#L<start>-L<end>)
- **Tool definitions.** [`extraction-tools.ts`](src:src/services/form-documents/extraction-tools.ts)
- **Related experiment.** [Tool-use variant](../experiments/pdf-field-extraction/README.md)

## Shaping

### Form shaping (forms/shaping)

- **Purpose.** Given a `DataCollectionSpec`, propose an edited `FormSpec` matching the owner's shaping intent.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/forms`](src:src/services/forms/index.ts)
- **Invocation site.** [`bedrock-shaper.ts`](src:src/services/forms/shaping/bedrock-shaper.ts#L<start>-L<end>)
- **Prompt construction.** [`bedrock-shaper.ts` system prompt section](src:src/services/forms/shaping/bedrock-shaper.ts#L<start>-L<end>)
- **Related experiment.** [Shaping model comparison](../experiments/shaping-model-comparison/README.md)

## Filling

### Conversational form filling (forms/filling-agent)

- **Purpose.** Converse with a filler to collect answers for a `FormSpec`; produce a structured submission.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock (with streaming).
- **Public entrypoint.** [`services/forms`](src:src/services/forms/index.ts)
- **Invocation site.** [`bedrock.ts`](src:src/services/forms/filling-agent/bedrock.ts#L<start>-L<end>)
- **System prompt builder.** [`system-prompt-builder.ts`](src:src/services/forms/filling-agent/system-prompt-builder.ts)
- **Related story.** [#9 Carlos completes complex sections through conversation](../../notes/story-9-conversational-sections/)

## Evaluation

### LLM-as-judge (evaluation)

- **Purpose.** Score extractions/fillings against a fixture; summarize correctness.
- **Model.** Claude Sonnet 4.6 via Amazon Bedrock.
- **Public entrypoint.** [`services/evaluation`](src:src/services/evaluation/index.ts)
- **Invocation site.** [`judge.ts`](src:src/services/evaluation/judge.ts#L<start>-L<end>)
- **Judge prompt.** [`judge-prompt.ts`](src:src/services/evaluation/judge-prompt.ts)
- **Related experiment.** [PDF field extraction evaluation](../experiments/pdf-field-extraction/README.md)

## Future

### Retrieval-augmented generation

Not yet implemented. Tracked in the [experiments roadmap](../experiments/_roadmap.md).

## Adding a new LLM integration

When you introduce a new LLM call site:

1. Place the invocation inside a service. If it doesn't fit an existing service, propose a new one (see [navigation](navigation.md)).
2. Expose the orchestrating function through the service's `index.ts`.
3. Add an entry on this page with a `src:` link to the invocation site and any relevant experiment cross-link.
```

Replace `<start>-<end>` with the actual line ranges you pinned in Step 1.

- [ ] **Step 3: Render the page locally and verify links resolve**

```bash
bun run dev
```

Navigate to `http://localhost:3000/catalog/architecture/llm-integrations`. Click every `src:` link. Each should open GitHub at the expected file + line range.

If any link is wrong, fix the line range or path and reload.

- [ ] **Step 4: Commit**

```bash
git add catalog/architecture/llm-integrations.md
git commit -m "docs(catalog): add LLM integrations page

Enumerates every LLM call site in the codebase — extraction, shaping,
filling, evaluation, and a placeholder for future RAG — with
permalinked source links that pin to the deployed commit.
"
```

---

## Task 13: Navigation page + software-architecture update

**Goal:** A short catalog page telling new readers how to navigate the codebase, and a one-paragraph pointer in `software-architecture.md`.

**Files:**
- Create: `catalog/architecture/navigation.md`
- Modify: `catalog/architecture/software-architecture.md`

- [ ] **Step 1: Write `catalog/architecture/navigation.md`**

```markdown
---
title: Navigating the codebase
status: working
---

# Navigating the codebase

Forms Lab is organized so that reading `src/services/` tells you what the
system does, not how it's built.

## The three layers

- **`src/shared/`** — pure utilities with no domain content.
- **`src/services/`** — the domain. One folder per intent; each folder
  is a service.
- **`src/entrypoints/`** and **`src/design-system/`** — composition root
  and presentation, respectively.

Dependencies flow one way: `shared → services/design-system → entrypoints`.
See [software-architecture](software-architecture.md) for the full picture.

## Service public interface

Every service exposes its public API through `src/services/<name>/index.ts`.
External callers import from `'services/<name>'` only — never a deeper path:

```ts
// OK
import { createShapingRegistry } from '../../services/forms'
// NOT OK — deep import bypasses the public interface
import { createShapingRegistry } from '../../services/forms/shaping/registry'
```

This rule is enforced by `test/architecture/dependency-rule.test.ts`. Inside
a service, files may import from each other freely.

## Finding things

- **"Where does X live?"** → open `src/services/`. Folder names are intents.
- **"What can service Y do?"** → open `src/services/<Y>/index.ts`. The
  re-export list is the service's API.
- **"Find every X in the system"** → check the catalog. Example:
  [LLM integrations](llm-integrations.md).

## When to add a new service

Add a new service when a chunk of code has a distinct domain boundary —
a noun in the product, not just a technical layer. See the
[architecture principles](../decisions/architecture/architecture-principles.md)
for the full test.
```

- [ ] **Step 2: Update `software-architecture.md`**

Open `catalog/architecture/software-architecture.md` and find the "Structure" section (or equivalent). Add a subsection:

```markdown
### Service public interface

Each service under `src/services/<name>/` exposes its public API through
a single `index.ts` file. External code — other services, entrypoints,
and design-system — imports only from `'services/<name>'`. Deep imports
into a service's internals are forbidden and will fail
`test/architecture/dependency-rule.test.ts`. This reinforces P1 (intent
over mechanism): the re-export list in `index.ts` is itself the
service's documented intent. See [navigation](navigation.md) for how
to read and extend the service layer.
```

Place the new subsection alongside other "Structure" subsections. Do not remove or reorder existing content.

- [ ] **Step 3: Also cross-link from `system-overview.md`**

In `catalog/architecture/system-overview.md`, add one sentence where it describes the code layout:

```
For a tour of how the code is organized, see [navigation](navigation.md).
```

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: pass. The markdown tests (if any) should still pass; no code changed.

- [ ] **Step 5: Render and spot-check**

```bash
bun run dev
```

Visit `/catalog/architecture/navigation` and `/catalog/architecture/software-architecture`. Confirm the new content renders and cross-links resolve.

- [ ] **Step 6: Commit**

```bash
git add catalog/architecture/navigation.md catalog/architecture/software-architecture.md catalog/architecture/system-overview.md
git commit -m "docs(catalog): add navigation page and service-public-interface section

New navigation.md explains the service public interface convention with
LLM integrations as the worked example. software-architecture.md and
system-overview.md link to it.
"
```

---

## Final verification

- [ ] **Step 1: Full check on the branch tip**

```bash
bun run check
```

Expected: pass — lint, type check, all tests (including the new dependency-rule cases and build-info tests).

- [ ] **Step 2: Manual QA in dev server**

```bash
bun run dev
```

- Visit `/catalog/architecture/llm-integrations` — every entry's links resolve to the expected GitHub line range.
- Visit `/catalog/architecture/navigation` — renders cleanly.
- Visit `/catalog/architecture/software-architecture` — new subsection shows.
- In dev the git worktree is dirty, so permalinks use `dev-<branch>` refs pointing at the current branch. That's expected.

- [ ] **Step 3: Deploy verification checklist (post-merge)**

Added to PR description for post-merge validation:

```
- [ ] SSH into EC2, cat /srv/forms-lab/main/.build-info — contains commit SHA
- [ ] systemctl show forms-lab-homepage.service | grep BUILD_GIT_SHA — set
- [ ] curl deployed /catalog/architecture/llm-integrations, view-source, confirm hrefs point at the deployed SHA
- [ ] Click through every link — all 200
```

- [ ] **Step 4: Update flight board and open PR**

Flight board update + PR opening live in the `/finish-story` command. Invoke that at the end of execution — not here.

---

## Self-review notes

- **Spec coverage.** Each spec section maps to a task: scope/orphans → Tasks 2-5; public interface convention → Task 1; build-time SHA + permalinks → Tasks 6-9; catalog pages → Tasks 12-13; navigation page → Task 13; dep-rule test → Task 11. AC 7 (no behavior change) is preserved by the task order.
- **Type consistency.** `BuildInfo`, `PermalinkOptions`, and `RenderOptions` are defined once and re-used. `githubPermalink` and `renderMarkdown` signatures are consistent across tasks.
- **Placeholders.** None remain. `<start>-<end>` in the catalog draft is a deliberate pin-later marker — Task 12 Step 1 fills them in from real file inspection.
- **Risk.** The biggest single change is `forms/index.ts`; Task 1 Step 4 addresses it explicitly with grouped re-exports.
