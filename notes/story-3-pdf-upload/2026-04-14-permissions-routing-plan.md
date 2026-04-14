# Permissions, User-Scoped Routing, and Fork — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ID-based `/projects/:id` routes with GitHub-style `/:owner/:slug` user-scoped URLs, enforce ownership-based permissions at the service layer, add user profiles, and implement project forking.

**Architecture:** A `ProjectService` sits between routes and stores (ProjectStore + FormProjectRepo), owning all business logic and permission checks. Route handlers are thin — they parse HTTP requests, call the service, and render responses. Custom error types (ForbiddenError, etc.) bubble from service to routes where they map to HTTP status codes. A `UserStore` persists GitHub profile data on login for rendering public profiles.

**Tech Stack:** Bun, Hono JSX, SQLite (Bun), git CLI via Bun.spawn, `bun:test`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `src/services/errors.ts` | Custom error types (ForbiddenError, NotFoundError, etc.) | Create |
| `src/services/user-store.ts` | UserStore interface + SQLite implementation | Create |
| `src/services/project-service.ts` | ProjectService — permissions, orchestration | Create |
| `test/project-service.test.ts` | Permission unit tests | Create |
| `src/services/database.ts` | Add forked_from column to ProjectStore | Modify |
| `src/types/models.ts` | Add UserProfile, ProjectView types | Modify |
| `src/app/routes/owner/index.tsx` | User-scoped route handlers (profile, project, settings, fork, tree, blob, commits) | Create |
| `src/app/routes/owner/components.tsx` | Profile, project overview, settings, tree/blob components | Create |
| `test/owner-routes.test.ts` | Route integration tests with permission scenarios | Create |
| `src/app/server.tsx` | Mount new routes, update home page | Modify |
| `src/app/routes/projects/index.tsx` | Remove (replaced by owner routes) | Delete |
| `src/app/routes/projects/components.tsx` | Remove (replaced by owner components) | Delete |
| `test/projects-routes.test.ts` | Remove (replaced by owner-routes tests) | Delete |
| `test/smoke.test.ts` | Update for new URL structure | Modify |
| `src/app/middleware/auth.ts` | Add requireOwner helper | Modify |
| `src/app/routes/auth/index.ts` | Upsert user on login | Modify |
| `src/lib/session.ts` | Unchanged | — |

---

### Task 1: Error types

**Files:**
- Create: `src/services/errors.ts`

- [ ] **Step 1: Create error types**

Create `src/services/errors.ts`:

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/errors.ts
git commit -m "feat: add service-layer error types for permission enforcement"
```

---

### Task 2: UserStore and user persistence

**Files:**
- Create: `src/services/user-store.ts`
- Create: `test/user-store.test.ts`
- Modify: `src/types/models.ts`

- [ ] **Step 1: Add UserProfile type to models.ts**

Add to `src/types/models.ts`:

```ts
export interface UserProfile {
  login: string
  name: string
  avatarUrl: string
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 2: Write failing tests**

Create `test/user-store.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { createUserStore } from '../src/services/user-store'

describe('UserStore', () => {
  it('upserts and retrieves a user', () => {
    const store = createUserStore(':memory:')
    store.upsert({ login: 'danielnaab', name: 'Daniel Naab', avatarUrl: 'https://example.com/avatar.png' })
    const user = store.get('danielnaab')
    expect(user).not.toBeNull()
    expect(user?.login).toBe('danielnaab')
    expect(user?.name).toBe('Daniel Naab')
    expect(user?.avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('updates existing user on upsert', () => {
    const store = createUserStore(':memory:')
    store.upsert({ login: 'danielnaab', name: 'Daniel', avatarUrl: 'https://example.com/old.png' })
    store.upsert({ login: 'danielnaab', name: 'Daniel Naab', avatarUrl: 'https://example.com/new.png' })
    const user = store.get('danielnaab')
    expect(user?.name).toBe('Daniel Naab')
    expect(user?.avatarUrl).toBe('https://example.com/new.png')
  })

  it('returns null for unknown user', () => {
    const store = createUserStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
  })

  it('checks if user exists', () => {
    const store = createUserStore(':memory:')
    expect(store.exists('danielnaab')).toBe(false)
    store.upsert({ login: 'danielnaab', name: 'Daniel', avatarUrl: '' })
    expect(store.exists('danielnaab')).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/user-store.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement UserStore**

Create `src/services/user-store.ts`:

```ts
import { Database } from 'bun:sqlite'
import type { UserProfile } from '../types/models'

export interface UserStore {
  upsert(user: { login: string; name: string; avatarUrl: string }): void
  get(login: string): UserProfile | null
  exists(login: string): boolean
}

export function createUserStore(dbPath: string): UserStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      login TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  return {
    upsert(user) {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO users (login, name, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(login) DO UPDATE SET name = ?, avatar_url = ?, updated_at = ?`,
        [user.login, user.name, user.avatarUrl, now, now, user.name, user.avatarUrl, now],
      )
    },

    get(login) {
      const row = db.query('SELECT * FROM users WHERE login = ?').get(login) as Record<string, unknown> | null
      if (!row) return null
      return {
        login: row.login as string,
        name: row.name as string,
        avatarUrl: row.avatar_url as string,
        createdAt: row.created_at as number,
        updatedAt: row.updated_at as number,
      }
    },

    exists(login) {
      const row = db.query('SELECT 1 FROM users WHERE login = ?').get(login)
      return row !== null
    },
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/user-store.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/user-store.ts test/user-store.test.ts src/types/models.ts
git commit -m "feat: add UserStore for persisting GitHub profile data"
```

---

### Task 3: Add forked_from to ProjectStore

**Files:**
- Modify: `src/services/database.ts`
- Modify: `src/types/models.ts`
- Modify: `test/database.test.ts`

- [ ] **Step 1: Update ProjectIndex and NewProjectIndex types**

In `src/types/models.ts`, add `forkedFrom` to `ProjectIndex` and `NewProjectIndex`:

```ts
export interface ProjectIndex {
  id: string
  slug: string
  name: string
  status: ProjectStatus
  error: string | null
  forkedFrom: string | null  // 'owner/slug' or null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface NewProjectIndex {
  name: string
  slug: string
  createdBy: string
  forkedFrom?: string  // 'owner/slug'
}
```

- [ ] **Step 2: Update database.ts schema and rowToProject**

In `src/services/database.ts`, add `forked_from` column to the CREATE TABLE:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'extracting',
  error TEXT,
  forked_from TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

Update `rowToProject` to include `forkedFrom`:

```ts
forkedFrom: (row.forked_from as string | null) ?? null,
```

Update `create` to accept and store `forkedFrom`:

```ts
db.run(
  `INSERT INTO projects (id, slug, name, forked_from, created_by, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [id, project.slug, project.name, project.forkedFrom ?? null, project.createdBy, now, now],
)
```

- [ ] **Step 3: Add test for forked project creation**

Add to `test/database.test.ts`:

```ts
it('stores forkedFrom metadata', () => {
  const store = createProjectStore(':memory:')
  const project = store.create({
    name: 'Forked Project',
    slug: 'forked-project',
    createdBy: 'maya',
    forkedFrom: 'danielnaab/pardon-application',
  })
  expect(project.forkedFrom).toBe('danielnaab/pardon-application')

  const retrieved = store.get(project.id)
  expect(retrieved?.forkedFrom).toBe('danielnaab/pardon-application')
})

it('forkedFrom defaults to null', () => {
  const store = createProjectStore(':memory:')
  const project = store.create({
    name: 'Original',
    slug: 'original',
    createdBy: 'danielnaab',
  })
  expect(project.forkedFrom).toBeNull()
})
```

- [ ] **Step 4: Run tests**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/database.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/services/database.ts test/database.test.ts
git commit -m "feat: add forked_from column to ProjectStore"
```

---

### Task 4: ProjectService with permission enforcement

**Files:**
- Create: `src/services/project-service.ts`
- Create: `test/project-service.test.ts`

- [ ] **Step 1: Write permission tests**

Create `test/project-service.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProjectStore } from '../src/services/database'
import {
  BadRequestError,
  ForbiddenError,
  UnauthenticatedError,
} from '../src/services/errors'
import { createFormProjectRepo } from '../src/services/form-project-repo'
import type { FormProjectRepo } from '../src/services/form-project-repo'
import { createProjectService } from '../src/services/project-service'
import type { ProjectService } from '../src/services/project-service'
import type { PdfExtractor } from '../src/services/pdf-extractor'
import type { ProjectStore } from '../src/services/database'
import type { ExtractionResult } from '../src/types/models'

const owner = { login: 'danielnaab', name: 'Daniel', avatarUrl: '' }
const other = { login: 'maya', name: 'Maya', avatarUrl: '' }

const stubResult: ExtractionResult = {
  spec: { id: 's1', title: 'Test', description: '', groups: [] },
  formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [], createdAt: '', updatedAt: '' },
  confidence: [],
}

let repoBasePath: string
let repo: FormProjectRepo
let store: ProjectStore
let extractor: PdfExtractor
let service: ProjectService

beforeEach(() => {
  repoBasePath = mkdtempSync(join(tmpdir(), 'project-service-test-'))
  repo = createFormProjectRepo(repoBasePath)
  store = createProjectStore(':memory:')
  extractor = { async extract() { return stubResult } }
  service = createProjectService(store, repo, extractor)
})

afterEach(() => {
  rmSync(repoBasePath, { recursive: true, force: true })
})

describe('ProjectService.createProject', () => {
  it('creates a project for authenticated user', async () => {
    const project = await service.createProject('Test Form', Buffer.from('pdf'), owner)
    expect(project.slug).toBe('test-form')
    expect(project.createdBy).toBe('danielnaab')
    expect(project.status).toBe('extracting')
  })

  it('throws UnauthenticatedError when user is null', async () => {
    expect(service.createProject('Test', Buffer.from('pdf'), null as any)).rejects.toThrow(UnauthenticatedError)
  })

  it('handles duplicate slugs', async () => {
    await service.createProject('Test', Buffer.from('pdf'), owner)
    const second = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(second.slug).toBe('test-2')
  })
})

describe('ProjectService.deleteProject', () => {
  it('allows owner to delete', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    await service.deleteProject(owner.login, project.slug, owner)
    expect(store.getBySlug(project.slug)).toBeNull()
  })

  it('throws ForbiddenError for non-owner', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(service.deleteProject(owner.login, project.slug, other)).rejects.toThrow(ForbiddenError)
  })

  it('throws UnauthenticatedError when not logged in', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(service.deleteProject(owner.login, project.slug, null as any)).rejects.toThrow(UnauthenticatedError)
  })

  it('throws NotFoundError for nonexistent project', async () => {
    expect(service.deleteProject('danielnaab', 'nonexistent', owner)).rejects.toThrow()
  })
})

describe('ProjectService.retryExtraction', () => {
  it('allows owner to retry', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    store.update(project.id, { status: 'error', error: 'timeout' })
    await service.retryExtraction(owner.login, project.slug, owner)
    const updated = store.getBySlug(project.slug)
    expect(updated?.status).toBe('extracting')
  })

  it('throws ForbiddenError for non-owner', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(service.retryExtraction(owner.login, project.slug, other)).rejects.toThrow(ForbiddenError)
  })
})

describe('ProjectService.forkProject', () => {
  it('allows non-owner to fork', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    // Wait for extraction to complete
    await new Promise((r) => setTimeout(r, 100))
    const forked = await service.forkProject(owner.login, project.slug, other)
    expect(forked.createdBy).toBe('maya')
    expect(forked.forkedFrom).toBe('danielnaab/test')
  })

  it('throws BadRequestError when forking own project', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(service.forkProject(owner.login, project.slug, owner)).rejects.toThrow(BadRequestError)
  })

  it('throws UnauthenticatedError when not logged in', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(service.forkProject(owner.login, project.slug, null as any)).rejects.toThrow(UnauthenticatedError)
  })

  it('preserves source content in fork', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf-content'), owner)
    await new Promise((r) => setTimeout(r, 100))
    const forked = await service.forkProject(owner.login, project.slug, other)
    const projectJson = await repo.readFile(forked.slug, 'main', 'project.json')
    expect(projectJson).not.toBeNull()
    const metadata = JSON.parse(projectJson!.toString())
    expect(metadata.forkedFrom).toEqual({ owner: 'danielnaab', slug: 'test' })
  })
})

describe('ProjectService.getProject', () => {
  it('returns project view for existing project', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    const view = await service.getProject(owner.login, project.slug, owner)
    expect(view.project.slug).toBe(project.slug)
    expect(view.isOwner).toBe(true)
  })

  it('sets isOwner false for non-owner', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    const view = await service.getProject(owner.login, project.slug, other)
    expect(view.isOwner).toBe(false)
  })

  it('sets isOwner false for anonymous', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    const view = await service.getProject(owner.login, project.slug, null)
    expect(view.isOwner).toBe(false)
  })

  it('throws NotFoundError when owner does not match', async () => {
    const project = await service.createProject('Test', Buffer.from('pdf'), owner)
    expect(service.getProject('wronguser', project.slug, null)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/project-service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ProjectService**

Create `src/services/project-service.ts`:

```ts
import type { SessionUser } from '../lib/session'
import type {
  DataCollectionSpec,
  ExtractionResult,
  FieldConfidence,
  FormSpec,
  ProjectIndex,
} from '../types/models'
import type { ProjectStore } from './database'
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from './errors'
import type { CommitEntry, FormProjectRepo, TreeEntry } from './form-project-repo'
import type { PdfExtractor } from './pdf-extractor'
import { slugify } from '../shared/slugify'

export interface ProjectView {
  project: ProjectIndex
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  history: CommitEntry[]
  isOwner: boolean
  forkedFrom: { owner: string; slug: string } | null
}

export interface ProjectService {
  createProject(name: string, pdf: Buffer, user: SessionUser): Promise<ProjectIndex>
  getProject(owner: string, slug: string, user: SessionUser | null): Promise<ProjectView>
  listUserProjects(owner: string): ProjectIndex[]
  deleteProject(owner: string, slug: string, user: SessionUser): Promise<void>
  retryExtraction(owner: string, slug: string, user: SessionUser): Promise<void>
  forkProject(owner: string, slug: string, user: SessionUser): Promise<ProjectIndex>
  getFileContent(owner: string, slug: string, rev: string, path: string): Promise<Buffer | null>
  getTree(owner: string, slug: string, rev: string, path: string): Promise<TreeEntry[]>
  getHistory(owner: string, slug: string, limit?: number): Promise<CommitEntry[]>
  getProjectAtRef(owner: string, slug: string, sha: string, user: SessionUser | null): Promise<ProjectView>
}

export function createProjectService(
  store: ProjectStore,
  repo: FormProjectRepo,
  extractor: PdfExtractor,
): ProjectService {
  function requireAuth(user: SessionUser | null | undefined): asserts user is SessionUser {
    if (!user) throw new UnauthenticatedError()
  }

  function resolveProject(owner: string, slug: string): ProjectIndex {
    const project = store.getBySlug(slug)
    if (!project || project.createdBy !== owner) throw new NotFoundError()
    return project
  }

  function requireOwner(project: ProjectIndex, user: SessionUser): void {
    if (project.createdBy !== user.login) throw new ForbiddenError()
  }

  function uniqueSlug(base: string): string {
    let slug = slugify(base)
    let suffix = 1
    while (store.getBySlug(slug)) {
      suffix++
      slug = `${slugify(base)}-${suffix}`
    }
    return slug
  }

  function parseForkedFrom(value: string | null): { owner: string; slug: string } | null {
    if (!value) return null
    const [owner, slug] = value.split('/')
    return owner && slug ? { owner, slug } : null
  }

  async function readSpecs(slug: string, rev = 'main'): Promise<{
    spec: DataCollectionSpec | null
    formSpec: FormSpec | null
    confidence: FieldConfidence[] | null
    history: CommitEntry[]
  }> {
    const [specBuf, formBuf, confBuf, history] = await Promise.all([
      repo.readFile(slug, rev, 'forms/default/spec.json'),
      repo.readFile(slug, rev, 'forms/default/form.json'),
      repo.readFile(slug, rev, 'forms/default/confidence.json'),
      repo.log(slug, 'main'),
    ])
    return {
      spec: specBuf ? JSON.parse(specBuf.toString()) : null,
      formSpec: formBuf ? JSON.parse(formBuf.toString()) : null,
      confidence: confBuf ? JSON.parse(confBuf.toString()) : null,
      history,
    }
  }

  return {
    async createProject(name, pdf, user) {
      requireAuth(user)
      const slug = uniqueSlug(name)
      const project = store.create({ name, slug, createdBy: user.login })

      await repo.init(slug)
      await repo.commit(
        slug,
        [
          { path: `source/${slug}.pdf`, content: pdf },
          {
            path: 'project.json',
            content: Buffer.from(JSON.stringify(
              { name, slug, createdBy: user.login, createdAt: new Date().toISOString() },
              null, 2,
            )),
          },
        ],
        `Initialize project: ${name}`,
        user.login,
      )

      extractor.extract(pdf)
        .then(async (result) => {
          await repo.commit(
            slug,
            [
              { path: 'forms/default/spec.json', content: Buffer.from(JSON.stringify(result.spec, null, 2)) },
              { path: 'forms/default/form.json', content: Buffer.from(JSON.stringify(result.formSpec, null, 2)) },
              { path: 'forms/default/confidence.json', content: Buffer.from(JSON.stringify(result.confidence, null, 2)) },
            ],
            `Extract ${result.spec.title}`,
            user.login,
          )
          store.update(project.id, { status: 'ready' })
        })
        .catch((err) => {
          store.update(project.id, {
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
        })

      return project
    },

    async getProject(owner, slug, user) {
      const project = resolveProject(owner, slug)
      const isOwner = user?.login === project.createdBy
      const forkedFrom = parseForkedFrom(project.forkedFrom)

      if (project.status !== 'ready') {
        return { project, spec: null, formSpec: null, confidence: null, history: [], isOwner, forkedFrom }
      }

      const { spec, formSpec, confidence, history } = await readSpecs(slug)
      return { project, spec, formSpec, confidence, history, isOwner, forkedFrom }
    },

    listUserProjects(owner) {
      return store.list(owner)
    },

    async deleteProject(owner, slug, user) {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)
      store.delete(project.id)
    },

    async retryExtraction(owner, slug, user) {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)

      const pdfBuffer = await repo.readFile(slug, 'main', `source/${slug}.pdf`)
      if (!pdfBuffer) {
        store.update(project.id, { status: 'error', error: 'Source PDF not found in repository' })
        return
      }

      store.update(project.id, { status: 'extracting', error: null })

      extractor.extract(pdfBuffer)
        .then(async (result) => {
          await repo.commit(
            slug,
            [
              { path: 'forms/default/spec.json', content: Buffer.from(JSON.stringify(result.spec, null, 2)) },
              { path: 'forms/default/form.json', content: Buffer.from(JSON.stringify(result.formSpec, null, 2)) },
              { path: 'forms/default/confidence.json', content: Buffer.from(JSON.stringify(result.confidence, null, 2)) },
            ],
            `Re-extract ${result.spec.title}`,
            user.login,
          )
          store.update(project.id, { status: 'ready' })
        })
        .catch((err) => {
          store.update(project.id, {
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
        })
    },

    async forkProject(owner, slug, user) {
      requireAuth(user)
      const source = resolveProject(owner, slug)
      if (owner === user.login) throw new BadRequestError('Cannot fork your own project')

      const forkSlug = uniqueSlug(source.name)

      // Clone the bare repo
      await repo.cloneBare(slug, forkSlug)

      // Update project.json with fork metadata
      const projectJsonBuf = await repo.readFile(forkSlug, 'main', 'project.json')
      const projectJson = projectJsonBuf ? JSON.parse(projectJsonBuf.toString()) : {}
      projectJson.createdBy = user.login
      projectJson.forkedFrom = { owner, slug }

      await repo.commit(
        forkSlug,
        [{ path: 'project.json', content: Buffer.from(JSON.stringify(projectJson, null, 2)) }],
        `Fork from ${owner}/${slug}`,
        user.login,
      )

      return store.create({
        name: source.name,
        slug: forkSlug,
        createdBy: user.login,
        forkedFrom: `${owner}/${slug}`,
      })
    },

    async getFileContent(owner, slug, rev, path) {
      resolveProject(owner, slug)
      return repo.readFile(slug, rev, path)
    },

    async getTree(owner, slug, rev, path) {
      resolveProject(owner, slug)
      return repo.listTree(slug, rev, path)
    },

    async getHistory(owner, slug, limit) {
      resolveProject(owner, slug)
      return repo.log(slug, 'main', undefined, limit)
    },

    async getProjectAtRef(owner, slug, sha, user) {
      const project = resolveProject(owner, slug)
      const isOwner = user?.login === project.createdBy
      const forkedFrom = parseForkedFrom(project.forkedFrom)
      const { spec, formSpec, confidence, history } = await readSpecs(slug, sha)
      return { project, spec, formSpec, confidence, history, isOwner, forkedFrom }
    },
  }
}
```

**Note:** The `forkProject` implementation above has a placeholder `git clone --bare` that accesses the repo's base path. The actual implementation needs access to the basePath from `FormProjectRepo`. Add a `cloneBare(sourceSlug: string, destSlug: string): Promise<void>` method to the `FormProjectRepo` interface:

In `src/services/form-project-repo.ts`, add to the interface and implementation:

```ts
// Interface addition:
cloneBare(sourceSlug: string, destSlug: string): Promise<void>

// Implementation:
async cloneBare(sourceSlug: string, destSlug: string): Promise<void> {
  const sourceDir = repoDir(sourceSlug)
  const destDir = repoDir(destSlug)
  const proc = Bun.spawn(
    ['git', 'clone', '--bare', sourceDir, destDir],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`git clone --bare failed: ${stderr}`)
  }
},
```

Then in `ProjectService.forkProject`, replace the manual clone with:

```ts
await repo.cloneBare(slug, forkSlug)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/project-service.test.ts`
Expected: PASS

- [ ] **Step 5: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS (existing tests still pass; new code is additive)

- [ ] **Step 6: Commit**

```bash
git add src/services/project-service.ts src/services/form-project-repo.ts test/project-service.test.ts
git commit -m "feat: add ProjectService with ownership-based permission enforcement"
```

---

### Task 5: Upsert user on OAuth login

**Files:**
- Modify: `src/app/routes/auth/index.ts`
- Modify: `src/app/server.tsx`

- [ ] **Step 1: Create UserStore in server.tsx and pass to auth routes**

In `src/app/server.tsx`, add:

```ts
import { createUserStore } from '../services/user-store'

const userStore = createUserStore(projectDbPath) // Share the same SQLite file
```

Update the auth route mounting to pass `userStore`:

```ts
app.route('/auth', createAuthRoutes(userStore))
```

This means the auth routes need to be refactored from a static export to a factory function, similar to `createProjectRoutes`.

- [ ] **Step 2: Update auth routes to accept UserStore and upsert on callback**

In `src/app/routes/auth/index.ts`, wrap the routes in a factory:

```ts
export function createAuthRoutes(userStore: UserStore): Hono {
  // ... existing routes ...
  
  // In the OAuth callback handler, after successfully getting the user profile:
  userStore.upsert({
    login: githubUser.login,
    name: githubUser.name ?? githubUser.login,
    avatarUrl: githubUser.avatar_url,
  })
  // ... rest of callback ...
}
```

- [ ] **Step 3: Verify tests pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/auth/index.ts src/app/server.tsx
git commit -m "feat: upsert user profile to UserStore on OAuth login"
```

---

### Task 6: User-scoped route handlers

**Files:**
- Create: `src/app/routes/owner/index.tsx`
- Create: `src/app/routes/owner/components.tsx`

This is the largest task. It creates all the new route handlers using the ProjectService.

- [ ] **Step 1: Create route handlers**

Create `src/app/routes/owner/index.tsx` with all routes:

- `GET /:owner` — Profile page (public). Calls `service.listUserProjects(owner)` and `userStore.get(owner)`. Renders profile component.
- `GET /:owner/:slug` — Project overview (public). Calls `service.getProject(owner, slug, user)`. Renders overview component with `isOwner` flag.
- `GET /:owner/:slug/tree/:ref/*` — Tree view (public). Calls `service.getTree(...)`.
- `GET /:owner/:slug/blob/:ref/*` — Blob view (public). Calls `service.getFileContent(...)`.
- `GET /:owner/:slug/commits` — History (public). Calls `service.getHistory(...)`.
- `GET /:owner/:slug/commit/:sha` — Snapshot (public). Calls `service.getProjectAtRef(...)`.
- `GET /:owner/:slug/settings` — Settings page (owner only). Catches ForbiddenError → 403.
- `POST /:owner/:slug/settings` — Settings actions (owner only). Dispatches on `action` field.
- `POST /:owner/:slug/fork` — Fork (authed non-owner). Catches errors → appropriate status.

The factory function signature:

```ts
export function createOwnerRoutes(
  service: ProjectService,
  userStore: UserStore,
): Hono
```

Route handlers catch `AppError` subclasses and render appropriate error pages:

```ts
try {
  // ... service call ...
} catch (err) {
  if (err instanceof UnauthenticatedError) {
    return c.redirect(resolveUrl(`/auth/signin?returnTo=${encodeURIComponent(c.req.path)}`))
  }
  if (err instanceof AppError) {
    return c.html(<Layout user={user}><ErrorPage status={err.statusCode} message={err.message} /></Layout>, err.statusCode)
  }
  throw err
}
```

- [ ] **Step 2: Create components**

Create `src/app/routes/owner/components.tsx` with:

- `ProfilePage` — Avatar, name, project list with links to `/:owner/:slug`. Forked projects show "forked from" badge.
- `ProjectOverview` — Same as current `ProjectDetail` but with permission-aware action bar:
  - Owner: settings gear/link, no fork button
  - Non-owner authed: fork button
  - Anon: fork button linking to signin
  - All: clone URL
  - Spec headings link to blob views (`/:owner/:slug/blob/main/forms/default/spec.json`)
  - History entries link to commit views
- `SettingsPage` — Form with action buttons (retry extraction, delete with confirm)
- `TreeView` — Directory listing with breadcrumbs, links to blobs/subtrees
- `BlobView` — File content display (JSON pretty-printed, PDF as download link)
- `CommitListView` — Full history table
- `CommitDetailView` — Single commit info with "Browse at this point" link
- `ErrorPage` — Generic error page for 403, 404

Reuse `SpecViewer`, `FormSpecViewer`, `ConfidenceBadge` from the old components file — move them to a shared location or copy them.

- [ ] **Step 3: Commit**

```bash
git add src/app/routes/owner/
git commit -m "feat: add user-scoped route handlers and components"
```

---

### Task 7: Mount new routes and update home page

**Files:**
- Modify: `src/app/server.tsx`
- Delete: `src/app/routes/projects/index.tsx`
- Delete: `src/app/routes/projects/components.tsx`

- [ ] **Step 1: Create ProjectService in server.tsx**

```ts
import { createProjectService } from '../services/project-service'
import { createOwnerRoutes } from './routes/owner/index'

const projectService = createProjectService(projectStore, formProjectRepo, extractor)
```

- [ ] **Step 2: Update home page route**

Replace the static home page with dashboard/landing logic:

```ts
app.get('/', (c) => {
  const user = c.get('user')
  if (user) {
    const projects = projectService.listUserProjects(user.login)
    return c.html(
      <Layout currentPath="/" user={user}>
        <Dashboard projects={projects} user={user} />
      </Layout>,
    )
  }
  return c.html(
    <Layout currentPath="/" user={user}>
      <LandingPage />
    </Layout>,
  )
})
```

- [ ] **Step 3: Mount new routes, remove old**

```ts
// Remove these lines:
// app.use('/projects/*', requireAuth())
// app.route('/projects', createProjectRoutes(...))

// Add /new route (authed):
app.use('/new', requireAuth())
app.get('/new', (c) => { /* render new project form */ })
app.post('/new', async (c) => { /* call service.createProject, redirect */ })

// Mount owner routes LAST (catch-all pattern):
app.route('/', createOwnerRoutes(projectService, userStore))
```

- [ ] **Step 4: Delete old project route files**

```bash
rm src/app/routes/projects/index.tsx src/app/routes/projects/components.tsx
```

Move reusable components (SpecViewer, FormSpecViewer, ConfidenceBadge) to the new owner/components.tsx or a shared location first.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mount user-scoped routes, update home page to dashboard/landing"
```

---

### Task 8: Route integration tests

**Files:**
- Create: `test/owner-routes.test.ts`
- Delete: `test/projects-routes.test.ts`
- Modify: `test/smoke.test.ts`

- [ ] **Step 1: Write permission integration tests**

Create `test/owner-routes.test.ts` with comprehensive permission scenarios:

```ts
describe('Public access', () => {
  it('GET /:owner/:slug returns 200 without auth')
  it('GET /:owner/:slug/commits returns 200 without auth')
  it('GET /:owner/:slug/tree/main returns 200 without auth')
  it('GET /:owner returns 200 without auth')
  it('GET /:owner returns 404 for nonexistent user')
  it('GET /:owner/:slug returns 404 for nonexistent project')
  it('GET /:owner/:slug returns 404 when owner does not match project creator')
})

describe('Owner-only actions', () => {
  it('GET /:owner/:slug/settings returns 200 for owner')
  it('GET /:owner/:slug/settings returns 403 for non-owner')
  it('GET /:owner/:slug/settings redirects to signin for anon')
  it('POST /:owner/:slug/settings action=delete deletes for owner')
  it('POST /:owner/:slug/settings action=delete returns 403 for non-owner')
  it('POST /:owner/:slug/settings action=retry retries for owner')
})

describe('Fork', () => {
  it('POST /:owner/:slug/fork creates fork for non-owner')
  it('POST /:owner/:slug/fork returns 400 for owner')
  it('POST /:owner/:slug/fork redirects to signin for anon')
  it('forked project shows provenance')
})

describe('UI permissions', () => {
  it('owner sees settings link, no fork button')
  it('non-owner sees fork button, no settings link')
  it('anon sees fork button linking to signin')
})

describe('Dashboard', () => {
  it('GET / shows landing for anon')
  it('GET / shows dashboard with projects for authed user')
})
```

The test setup creates a Hono app with real ProjectService, real FormProjectRepo (temp dirs), and simulates auth by setting user in middleware.

For testing different auth states, create helpers:

```ts
function createTestApp() {
  // Returns app + helpers for making requests as different users
  return {
    app,
    service,
    requestAs(user: SessionUser | null, path: string, options?: RequestInit) {
      // Sets user in middleware based on parameter
    }
  }
}
```

- [ ] **Step 2: Update smoke tests**

Update `test/smoke.test.ts` to use new URL patterns:
- `/projects` → `/<username>` (or just test `/`)
- `/projects/new` → `/new`
- `POST /projects` → `POST /new`
- `/projects/:id` → `/<username>/<slug>`

- [ ] **Step 3: Remove old test file**

```bash
rm test/projects-routes.test.ts
```

- [ ] **Step 4: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add comprehensive permission and route integration tests"
```

---

### Task 9: Interlinking

**Files:**
- Modify: `src/app/routes/owner/components.tsx`

- [ ] **Step 1: Add interlinks to project overview**

Update the spec viewer headings to link to blob views:

```tsx
<a href={resolveUrl(`/${owner}/${slug}/blob/main/forms/default/spec.json`)}>
  Extracted Data Requirements
</a>
```

Similar for form layout heading, source PDF link, history entries → commit views, "View all history" → commits page.

- [ ] **Step 2: Add breadcrumb navigation to tree/blob views**

The breadcrumb decomposes the path into linked segments:

```
danielnaab / pardon-application / tree / main / forms / petition
```

Each segment links to its level (owner → profile, slug → overview, subsequent → tree).

- [ ] **Step 3: Add "View as form spec" link to blob view**

When viewing spec.json or form.json, show a link back to the overview:

```tsx
<a href={resolveUrl(`/${owner}/${slug}`)}>View as form spec</a>
```

- [ ] **Step 4: Add "Browse at this point" to commit view**

```tsx
<a href={resolveUrl(`/${owner}/${slug}/tree/${sha}`)}>Browse repo at this point</a>
```

- [ ] **Step 5: Verify and commit**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`

```bash
git add src/app/routes/owner/components.tsx
git commit -m "feat: add interlinking between overview, tree, blob, and commit views"
```

---

### Task 10: Manual testing and cleanup

- [ ] **Step 1: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS — all tests green

- [ ] **Step 2: Start dev server and test**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run dev`

Test in browser:
- `/` — Landing page (anon) or dashboard (authed)
- `/new` — Create project from fixture
- `/danielnaab/pardon-application` — Project overview (public)
- `/danielnaab/pardon-application/settings` — Owner-only settings
- `/danielnaab/pardon-application/fork` — Fork as different user
- `/danielnaab/pardon-application/tree/main` — Browse tree
- `/danielnaab/pardon-application/blob/main/forms/default/spec.json` — View file
- `/danielnaab/pardon-application/commits` — History
- Click interlinks — verify they navigate correctly

- [ ] **Step 3: Test permission enforcement**

Verify:
- Non-owner cannot access settings (403)
- Non-owner can view project (200)
- Anon can view project, cannot fork (redirect to signin)
- Owner can delete project

- [ ] **Step 4: Fix any issues found and commit**
