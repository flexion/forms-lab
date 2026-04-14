# Git-Backed Form Project Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SQLite as the source of truth for form specs with bare git repos managed by the app, expose version history in the UI, and serve repos read-only over HTTP.

**Architecture:** A `FormProjectRepo` service wraps git CLI plumbing commands to read/write bare repos without working tree checkouts. The existing `ProjectStore` in SQLite becomes a thin operational index (slug, status, owner). Routes wire both together: SQLite for status/listing, git for spec content. Caddy serves repos as static files (dumb HTTP transport) for `git clone`.

**Tech Stack:** Bun, Hono JSX, git CLI (plumbing commands via `Bun.spawn`), SQLite (Bun), NixOS/Caddy

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `src/services/form-project-repo.ts` | Git bare repo interface + implementation | Create |
| `test/form-project-repo.test.ts` | Git service unit tests | Create |
| `src/services/database.ts` | ProjectStore — slim index (remove spec columns, add slug) | Modify |
| `src/types/models.ts` | Update StoredProject, NewProject, add ProjectIndex type | Modify |
| `test/database.test.ts` | Update for new schema | Modify |
| `src/app/routes/projects/index.tsx` | Wire git service, update all handlers | Modify |
| `src/app/routes/projects/components.tsx` | Add version history, clone URL, snapshot banner | Modify |
| `test/projects-routes.test.ts` | Update with mock git service | Modify |
| `src/app/server.tsx` | Create and inject FormProjectRepo | Modify |
| `infrastructure/nixos/modules/caddy.nix` | Add `/git/*` static file route | Modify |
| `infrastructure/nixos/modules/deploy.nix` | Add REPOS_PATH env var, ensure directory | Modify |

---

### Task 1: Git service layer — init, commit, readFile

**Files:**
- Create: `src/services/form-project-repo.ts`
- Create: `test/form-project-repo.test.ts`

- [ ] **Step 1: Write failing tests for init and commit+readFile**

Create `test/form-project-repo.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFormProjectRepo } from '../src/services/form-project-repo'
import type { FormProjectRepo } from '../src/services/form-project-repo'

describe('FormProjectRepo', () => {
  let basePath: string
  let repo: FormProjectRepo

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'form-repos-'))
    repo = createFormProjectRepo(basePath)
  })

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true })
  })

  describe('init', () => {
    it('creates a bare git repo', async () => {
      await repo.init('test-project')
      const proc = Bun.spawn(
        ['git', '--git-dir', join(basePath, 'test-project.git'), 'rev-parse', '--is-bare-repository'],
        { stdout: 'pipe' },
      )
      const output = await new Response(proc.stdout).text()
      await proc.exited
      expect(output.trim()).toBe('true')
    })
  })

  describe('commit + readFile', () => {
    it('commits files and reads them back', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [{ path: 'project.json', content: Buffer.from('{"name":"test"}') }],
        'Initial commit',
        'testuser',
      )

      const content = await repo.readFile('my-project', 'main', 'project.json')
      expect(content).not.toBeNull()
      expect(content!.toString()).toBe('{"name":"test"}')
    })

    it('returns null for missing file', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [{ path: 'project.json', content: Buffer.from('{}') }],
        'Initial',
        'testuser',
      )
      const content = await repo.readFile('my-project', 'main', 'nope.json')
      expect(content).toBeNull()
    })

    it('preserves files from previous commits', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [{ path: 'a.txt', content: Buffer.from('aaa') }],
        'First',
        'testuser',
      )
      await repo.commit(
        'my-project',
        [{ path: 'b.txt', content: Buffer.from('bbb') }],
        'Second',
        'testuser',
      )

      const a = await repo.readFile('my-project', 'main', 'a.txt')
      const b = await repo.readFile('my-project', 'main', 'b.txt')
      expect(a!.toString()).toBe('aaa')
      expect(b!.toString()).toBe('bbb')
    })

    it('handles nested paths', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [
          { path: 'forms/petition/spec.json', content: Buffer.from('{"id":"s1"}') },
          { path: 'source/form.pdf', content: Buffer.from('pdf-bytes') },
        ],
        'Add form',
        'testuser',
      )

      const spec = await repo.readFile('my-project', 'main', 'forms/petition/spec.json')
      expect(spec!.toString()).toBe('{"id":"s1"}')
      const pdf = await repo.readFile('my-project', 'main', 'source/form.pdf')
      expect(pdf!.toString()).toBe('pdf-bytes')
    })

    it('handles binary content (PDF)', async () => {
      await repo.init('my-project')
      const pdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
      await repo.commit(
        'my-project',
        [{ path: 'source/form.pdf', content: pdfBytes }],
        'Add PDF',
        'testuser',
      )
      const content = await repo.readFile('my-project', 'main', 'source/form.pdf')
      expect(Buffer.compare(content!, pdfBytes)).toBe(0)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/form-project-repo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the git service**

Create `src/services/form-project-repo.ts`:

```ts
import { mkdirSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface FileEntry {
  path: string
  content: Buffer
}

export interface TreeEntry {
  name: string
  type: 'blob' | 'tree'
  sha: string
}

export interface CommitEntry {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string
}

export interface FormProjectRepo {
  init(slug: string): Promise<void>
  commit(slug: string, files: FileEntry[], message: string, author: string): Promise<string>
  readFile(slug: string, rev: string, path: string): Promise<Buffer | null>
  listTree(slug: string, rev: string, path: string): Promise<TreeEntry[]>
  log(slug: string, rev: string, path?: string, limit?: number): Promise<CommitEntry[]>
}

export function createFormProjectRepo(basePath: string): FormProjectRepo {
  mkdirSync(basePath, { recursive: true })

  function repoPath(slug: string): string {
    return join(basePath, `${slug}.git`)
  }

  async function git(
    dir: string,
    args: string[],
    options?: { env?: Record<string, string>; stdin?: Buffer },
  ): Promise<string> {
    const proc = Bun.spawn(['git', '--git-dir', dir, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: options?.env ? { ...process.env, ...options.env } : undefined,
      stdin: options?.stdin ? new Blob([options.stdin]) : undefined,
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    if (exitCode !== 0) {
      throw new Error(`git ${args[0]} failed (${exitCode}): ${stderr}`)
    }
    return stdout.trim()
  }

  async function hasHead(dir: string): Promise<boolean> {
    const proc = Bun.spawn(
      ['git', '--git-dir', dir, 'rev-parse', '--verify', 'HEAD'],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const exitCode = await proc.exited
    return exitCode === 0
  }

  return {
    async init(slug) {
      const dir = repoPath(slug)
      await git(dir, ['init', '--bare', '--initial-branch=main', dir])
    },

    async commit(slug, files, message, author) {
      const dir = repoPath(slug)
      const indexPath = join(tmpdir(), `git-index-${crypto.randomUUID()}`)

      try {
        const head = await hasHead(dir)
        if (head) {
          await git(dir, ['read-tree', 'HEAD'], {
            env: { GIT_INDEX_FILE: indexPath },
          })
        }

        for (const file of files) {
          const blobSha = await git(dir, ['hash-object', '-w', '--stdin'], {
            stdin: file.content,
          })
          await git(dir, ['update-index', '--add', '--cacheinfo', `100644,${blobSha},${file.path}`], {
            env: { GIT_INDEX_FILE: indexPath },
          })
        }

        const treeSha = await git(dir, ['write-tree'], {
          env: { GIT_INDEX_FILE: indexPath },
        })

        const commitArgs = ['commit-tree', treeSha, '-m', message]
        if (head) {
          commitArgs.push('-p', 'HEAD')
        }
        const email = `${author}@users.noreply.github.com`
        const commitSha = await git(dir, commitArgs, {
          env: {
            GIT_AUTHOR_NAME: author,
            GIT_AUTHOR_EMAIL: email,
            GIT_COMMITTER_NAME: author,
            GIT_COMMITTER_EMAIL: email,
          },
        })

        await git(dir, ['update-ref', 'refs/heads/main', commitSha])
        await git(dir, ['update-server-info'])

        return commitSha
      } finally {
        try { unlinkSync(indexPath) } catch {}
      }
    },

    async readFile(slug, rev, path) {
      const dir = repoPath(slug)
      const proc = Bun.spawn(
        ['git', '--git-dir', dir, 'show', `${rev}:${path}`],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      const [stdout, exitCode] = await Promise.all([
        new Response(proc.stdout).arrayBuffer(),
        proc.exited,
      ])
      if (exitCode !== 0) return null
      return Buffer.from(stdout)
    },

    async listTree(slug, rev, path) {
      const dir = repoPath(slug)
      const proc = Bun.spawn(
        ['git', '--git-dir', dir, 'ls-tree', rev, path.endsWith('/') ? path : `${path}/`],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      const [stdout, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        proc.exited,
      ])
      if (exitCode !== 0) return []
      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [info, name] = line.split('\t')
          const [, type, sha] = info.split(' ')
          return { name, type: type as 'blob' | 'tree', sha }
        })
    },

    async log(slug, rev, path, limit = 20) {
      const dir = repoPath(slug)
      const args = [
        'log',
        `--format=%H%x00%h%x00%s%x00%an%x00%aI`,
        `-n${limit}`,
        rev,
      ]
      if (path) {
        args.push('--', path)
      }
      const proc = Bun.spawn(
        ['git', '--git-dir', dir, ...args],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      const [stdout, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        proc.exited,
      ])
      if (exitCode !== 0) return []
      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [sha, shortSha, message, author, date] = line.split('\0')
          return { sha, shortSha, message, author, date }
        })
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/form-project-repo.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/services/form-project-repo.ts test/form-project-repo.test.ts
git commit -m "$(cat <<'EOF'
feat: add FormProjectRepo service for bare git repo operations

Provides init, commit, readFile, listTree, and log operations
against bare git repos using plumbing commands via Bun.spawn.
No working tree checkout required.
EOF
)"
```

---

### Task 2: Git service layer — log and listTree tests

**Files:**
- Modify: `test/form-project-repo.test.ts`

- [ ] **Step 1: Add tests for log and listTree**

Append to `test/form-project-repo.test.ts`, inside the outer `describe`:

```ts
  describe('log', () => {
    it('returns commit history', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [{ path: 'a.txt', content: Buffer.from('v1') }],
        'First commit',
        'alice',
      )
      await repo.commit(
        'my-project',
        [{ path: 'b.txt', content: Buffer.from('v2') }],
        'Second commit',
        'bob',
      )

      const entries = await repo.log('my-project', 'main')
      expect(entries).toHaveLength(2)
      expect(entries[0].message).toBe('Second commit')
      expect(entries[0].author).toBe('bob')
      expect(entries[0].shortSha).toHaveLength(7)
      expect(entries[1].message).toBe('First commit')
      expect(entries[1].author).toBe('alice')
    })

    it('filters log by path', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [{ path: 'forms/a/spec.json', content: Buffer.from('{}') }],
        'Add form A',
        'user',
      )
      await repo.commit(
        'my-project',
        [{ path: 'forms/b/spec.json', content: Buffer.from('{}') }],
        'Add form B',
        'user',
      )

      const allEntries = await repo.log('my-project', 'main')
      expect(allEntries).toHaveLength(2)

      const formAEntries = await repo.log('my-project', 'main', 'forms/a/')
      expect(formAEntries).toHaveLength(1)
      expect(formAEntries[0].message).toBe('Add form A')
    })

    it('respects limit', async () => {
      await repo.init('my-project')
      for (let i = 0; i < 5; i++) {
        await repo.commit(
          'my-project',
          [{ path: `file${i}.txt`, content: Buffer.from(`v${i}`) }],
          `Commit ${i}`,
          'user',
        )
      }
      const entries = await repo.log('my-project', 'main', undefined, 3)
      expect(entries).toHaveLength(3)
    })
  })

  describe('listTree', () => {
    it('lists entries in a directory', async () => {
      await repo.init('my-project')
      await repo.commit(
        'my-project',
        [
          { path: 'forms/a/spec.json', content: Buffer.from('{}') },
          { path: 'forms/b/spec.json', content: Buffer.from('{}') },
        ],
        'Add forms',
        'user',
      )

      const entries = await repo.listTree('my-project', 'main', 'forms')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['forms/a', 'forms/b'])
      expect(entries[0].type).toBe('tree')
    })
  })
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/form-project-repo.test.ts`
Expected: PASS — all tests pass (these test already-implemented methods)

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add test/form-project-repo.test.ts
git commit -m "test: add log and listTree tests for FormProjectRepo"
```

---

### Task 3: Slim down ProjectStore and types

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/services/database.ts`
- Modify: `test/database.test.ts`

- [ ] **Step 1: Write failing tests for new ProjectStore schema**

Replace the `ProjectStore` describe block in `test/database.test.ts`:

```ts
describe('ProjectStore', () => {
  it('creates and retrieves a project', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Pardon Application',
      slug: 'pardon-application',
      createdBy: 'testuser',
    })
    expect(project.id).toBeDefined()
    expect(project.name).toBe('Pardon Application')
    expect(project.slug).toBe('pardon-application')
    expect(project.status).toBe('extracting')
    expect(project.createdBy).toBe('testuser')

    const retrieved = store.get(project.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.name).toBe('Pardon Application')
    expect(retrieved?.slug).toBe('pardon-application')
  })

  it('finds by slug', () => {
    const store = createProjectStore(':memory:')
    store.create({
      name: 'Pardon Application',
      slug: 'pardon-application',
      createdBy: 'testuser',
    })
    const found = store.getBySlug('pardon-application')
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Pardon Application')
  })

  it('returns null for missing project', () => {
    const store = createProjectStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
    expect(store.getBySlug('nonexistent')).toBeNull()
  })

  it('lists projects filtered by user', () => {
    const store = createProjectStore(':memory:')
    store.create({ name: 'A', slug: 'a', createdBy: 'alice' })
    store.create({ name: 'B', slug: 'b', createdBy: 'bob' })
    store.create({ name: 'C', slug: 'c', createdBy: 'alice' })

    const aliceProjects = store.list('alice')
    expect(aliceProjects).toHaveLength(2)
    expect(aliceProjects.map((p) => p.name).sort()).toEqual(['A', 'C'])

    const allProjects = store.list()
    expect(allProjects).toHaveLength(3)
  })

  it('enforces unique slugs', () => {
    const store = createProjectStore(':memory:')
    store.create({ name: 'First', slug: 'my-form', createdBy: 'user' })
    expect(() =>
      store.create({ name: 'Second', slug: 'my-form', createdBy: 'user' }),
    ).toThrow()
  })

  it('deletes a project', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Delete Me',
      slug: 'delete-me',
      createdBy: 'testuser',
    })
    expect(store.get(project.id)).not.toBeNull()
    store.delete(project.id)
    expect(store.get(project.id)).toBeNull()
  })

  it('updates project status and error', () => {
    const store = createProjectStore(':memory:')
    const project = store.create({
      name: 'Test',
      slug: 'test',
      createdBy: 'user',
    })

    const updated = store.update(project.id, { status: 'ready' })
    expect(updated.status).toBe('ready')

    const errored = store.update(project.id, {
      status: 'error',
      error: 'Something broke',
    })
    expect(errored.status).toBe('error')
    expect(errored.error).toBe('Something broke')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/database.test.ts`
Expected: FAIL — type errors (slug not in NewProject, getBySlug not on store)

- [ ] **Step 3: Update types in models.ts**

In `src/types/models.ts`, replace `StoredProject` and `NewProject` (lines 207-227):

```ts
export interface ProjectIndex {
  id: string
  slug: string
  name: string
  status: ProjectStatus
  error: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface NewProjectIndex {
  name: string
  slug: string
  createdBy: string
}
```

Keep the old `StoredProject` and `NewProject` types temporarily (they're used in tests that will be updated in later tasks). Add a comment marking them for removal.

- [ ] **Step 4: Update ProjectStore interface and implementation in database.ts**

Replace the `ProjectStore` interface and `createProjectStore` function in `src/services/database.ts` (lines 63-207):

```ts
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

export function createProjectStore(dbPath: string): ProjectStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'extracting',
      error TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  function rowToProject(row: Record<string, unknown>): ProjectIndex {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      status: row.status as ProjectStatus,
      error: (row.error as string | null) ?? null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }
  }

  return {
    create(project: NewProjectIndex): ProjectIndex {
      const id = crypto.randomUUID()
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO projects (id, slug, name, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'extracting', ?, ?, ?)`,
        [id, project.slug, project.name, project.createdBy, now, now],
      )
      return this.get(id)!
    },

    get(id: string): ProjectIndex | null {
      const row = db
        .query('SELECT * FROM projects WHERE id = ?')
        .get(id) as Record<string, unknown> | null
      if (!row) return null
      return rowToProject(row)
    },

    getBySlug(slug: string): ProjectIndex | null {
      const row = db
        .query('SELECT * FROM projects WHERE slug = ?')
        .get(slug) as Record<string, unknown> | null
      if (!row) return null
      return rowToProject(row)
    },

    list(userId?: string): ProjectIndex[] {
      const query = userId
        ? db.query(
            'SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC',
          )
        : db.query('SELECT * FROM projects ORDER BY created_at DESC')
      const rows = (userId ? query.all(userId) : query.all()) as Record<
        string,
        unknown
      >[]
      return rows.map(rowToProject)
    },

    update(
      id: string,
      changes: Partial<Pick<ProjectIndex, 'status' | 'error'>>,
    ): ProjectIndex {
      const sets: string[] = ['updated_at = ?']
      const values: (string | number | null)[] = [Math.floor(Date.now() / 1000)]

      if (changes.status !== undefined) {
        sets.push('status = ?')
        values.push(changes.status)
      }
      if (changes.error !== undefined) {
        sets.push('error = ?')
        values.push(changes.error)
      }

      values.push(id)
      db.run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, values)
      return this.get(id)!
    },

    delete(id: string): void {
      db.run('DELETE FROM projects WHERE id = ?', [id])
    },
  }
}
```

Update imports at the top of `database.ts`: remove `DataCollectionSpec`, `FieldConfidence`, `FormSpec`, `NewProject`, `StoredProject`. Add `NewProjectIndex`, `ProjectIndex`:

```ts
import type {
  NewProjectIndex,
  ProjectIndex,
  ProjectStatus,
} from '../types/models'
```

- [ ] **Step 5: Run database tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/database.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/types/models.ts src/services/database.ts test/database.test.ts
git commit -m "$(cat <<'EOF'
refactor: slim ProjectStore to operational index

Remove spec, formSpec, confidence, and sourcePdf from SQLite.
Add slug column (unique). Specs now live in git bare repos.
EOF
)"
```

---

### Task 4: Add slugify utility

**Files:**
- Modify: `src/shared/slugify.ts` (or add to existing utils)
- Create: `test/slugify.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/slugify.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { slugify } from '../src/shared/slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Pardon Application')).toBe('pardon-application')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugify("Application for Pardon (Form DOJ-1)")).toBe('application-for-pardon-form-doj-1')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('handles .pdf extension removal', () => {
    expect(slugify('my-form.pdf')).toBe('my-form')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/slugify.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement slugify**

Create `src/shared/slugify.ts`:

```ts
export function slugify(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/slugify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/shared/slugify.ts test/slugify.test.ts
git commit -m "feat: add slugify utility for project and form names"
```

---

### Task 5: Wire git service into app and update project creation

**Files:**
- Modify: `src/app/routes/projects/index.tsx`
- Modify: `src/app/server.tsx`
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Write failing test for project creation with git**

Replace the `createTestApp` function and imports in `test/projects-routes.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { createProjectRoutes } from '../src/app/routes/projects/index'
import { createProjectStore } from '../src/services/database'
import { createFormProjectRepo } from '../src/services/form-project-repo'
import type { FormProjectRepo } from '../src/services/form-project-repo'
import type { PdfExtractor } from '../src/services/pdf-extractor'
import type { ExtractionResult } from '../src/types/models'

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

let repoBasePath: string
let repo: FormProjectRepo

beforeEach(() => {
  repoBasePath = mkdtempSync(join(tmpdir(), 'form-repos-test-'))
  repo = createFormProjectRepo(repoBasePath)
})

afterEach(() => {
  rmSync(repoBasePath, { recursive: true, force: true })
})

function createTestApp() {
  const projectStore = createProjectStore(':memory:')
  const extractor: PdfExtractor = {
    async extract(): Promise<ExtractionResult> {
      return stubResult
    },
  }
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { login: 'testuser', name: 'Test User', avatarUrl: '' })
    await next()
  })
  app.route('/projects', createProjectRoutes(projectStore, extractor, repo))
  return { app, projectStore, extractor }
}
```

Update the fixture creation test in `POST /projects`:

```ts
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
    expect(projects[0].slug).toBeDefined()
    expect(projects[0].status).toBe('extracting')

    // Verify git repo was created with source PDF
    await new Promise((r) => setTimeout(r, 100))
    const projectJson = await repo.readFile(projects[0].slug, 'main', 'project.json')
    expect(projectJson).not.toBeNull()
    const metadata = JSON.parse(projectJson!.toString())
    expect(metadata.name).toBe(projects[0].name)
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: FAIL — `createProjectRoutes` doesn't accept 3 args

- [ ] **Step 3: Update route handler to accept and use git service**

Rewrite `src/app/routes/projects/index.tsx`:

```ts
import { Hono } from 'hono'
import {
  demoFixtures,
  getFixture,
  loadFixturePdf,
} from '../../../../fixtures/index'
import { resolveUrl } from '../../../lib/base-path'
import type { ProjectStore } from '../../../services/database'
import type { FormProjectRepo } from '../../../services/form-project-repo'
import type { PdfExtractor } from '../../../services/pdf-extractor'
import { slugify } from '../../../shared/slugify'
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
} from '../../../types/models'
import { Layout } from '../../components/flex-layout'
import { NewProjectPage, ProjectDetail, ProjectList } from './components'

export function createProjectRoutes(
  projectStore: ProjectStore,
  extractor: PdfExtractor,
  repo: FormProjectRepo,
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

    const slug = slugify(name)
    const project = projectStore.create({
      name,
      slug,
      createdBy: user.login,
    })

    // Commit source PDF and metadata to git repo
    await repo.init(slug)
    await repo.commit(
      slug,
      [
        {
          path: 'project.json',
          content: Buffer.from(JSON.stringify({
            name,
            description: `Extracted from ${name}`,
            createdBy: user.login,
            createdAt: new Date().toISOString(),
          }, null, 2)),
        },
        { path: `source/${slug}.pdf`, content: pdf },
      ],
      `Initialize project: ${name}`,
      user.login,
    )

    // Fire-and-forget extraction
    extractor
      .extract(pdf)
      .then(async (result) => {
        const formSlug = slugify(result.spec.title)
        await repo.commit(
          slug,
          [
            {
              path: `forms/${formSlug}/spec.json`,
              content: Buffer.from(JSON.stringify(result.spec, null, 2)),
            },
            {
              path: `forms/${formSlug}/form.json`,
              content: Buffer.from(JSON.stringify(result.formSpec, null, 2)),
            },
            {
              path: `forms/${formSlug}/confidence.json`,
              content: Buffer.from(JSON.stringify(result.confidence, null, 2)),
            },
          ],
          `Extract ${result.spec.title}`,
          user.login,
        )
        projectStore.update(project.id, { status: 'ready' })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  projects.get('/:id', async (c) => {
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

    let spec: DataCollectionSpec | null = null
    let formSpec: FormSpec | null = null
    let confidence: FieldConfidence[] | null = null

    if (project.status === 'ready') {
      const forms = await repo.listTree(project.slug, 'main', 'forms')
      if (forms.length > 0) {
        const formDir = forms[0].name
        const specBuf = await repo.readFile(project.slug, 'main', `${formDir}/spec.json`)
        const formBuf = await repo.readFile(project.slug, 'main', `${formDir}/form.json`)
        const confBuf = await repo.readFile(project.slug, 'main', `${formDir}/confidence.json`)
        if (specBuf) spec = JSON.parse(specBuf.toString())
        if (formBuf) formSpec = JSON.parse(formBuf.toString())
        if (confBuf) confidence = JSON.parse(confBuf.toString())
      }
    }

    const history = await repo.log(project.slug, 'main', undefined, 20)

    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectDetail
          project={project}
          spec={spec}
          formSpec={formSpec}
          confidence={confidence}
          history={history}
          cloneUrl={`/git/${project.slug}.git`}
        />
      </Layout>,
    )
  })

  projects.get('/:id/version/:sha', async (c) => {
    const user = c.get('user')
    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    const sha = c.req.param('sha')
    const forms = await repo.listTree(project.slug, sha, 'forms')
    let spec: DataCollectionSpec | null = null
    let formSpec: FormSpec | null = null
    let confidence: FieldConfidence[] | null = null

    if (forms.length > 0) {
      const formDir = forms[0].name
      const specBuf = await repo.readFile(project.slug, sha, `${formDir}/spec.json`)
      const formBuf = await repo.readFile(project.slug, sha, `${formDir}/form.json`)
      const confBuf = await repo.readFile(project.slug, sha, `${formDir}/confidence.json`)
      if (specBuf) spec = JSON.parse(specBuf.toString())
      if (formBuf) formSpec = JSON.parse(formBuf.toString())
      if (confBuf) confidence = JSON.parse(confBuf.toString())
    }

    const history = await repo.log(project.slug, 'main', undefined, 20)

    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectDetail
          project={project}
          spec={spec}
          formSpec={formSpec}
          confidence={confidence}
          history={history}
          cloneUrl={`/git/${project.slug}.git`}
          viewingSha={sha}
        />
      </Layout>,
    )
  })

  projects.post('/:id/retry', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    projectStore.update(project.id, { status: 'extracting', error: null })

    // Read the source PDF from git for re-extraction
    const projectJson = await repo.readFile(project.slug, 'main', 'project.json')
    const sourceName = projectJson ? slugify(JSON.parse(projectJson.toString()).name) : project.slug
    const pdf = await repo.readFile(project.slug, 'main', `source/${sourceName}.pdf`)
    if (!pdf) {
      projectStore.update(project.id, { status: 'error', error: 'Source PDF not found in repository' })
      return c.redirect(resolveUrl(`/projects/${project.id}`))
    }

    extractor
      .extract(pdf)
      .then(async (result) => {
        const formSlug = slugify(result.spec.title)
        await repo.commit(
          project.slug,
          [
            {
              path: `forms/${formSlug}/spec.json`,
              content: Buffer.from(JSON.stringify(result.spec, null, 2)),
            },
            {
              path: `forms/${formSlug}/form.json`,
              content: Buffer.from(JSON.stringify(result.formSpec, null, 2)),
            },
            {
              path: `forms/${formSlug}/confidence.json`,
              content: Buffer.from(JSON.stringify(result.confidence, null, 2)),
            },
          ],
          `Re-extract ${result.spec.title}`,
          user.login,
        )
        projectStore.update(project.id, { status: 'ready' })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  projects.post('/:id/delete', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    projectStore.delete(project.id)
    return c.redirect(resolveUrl('/projects'))
  })

  return projects
}
```

- [ ] **Step 4: Update server.tsx to create and inject git repo service**

In `src/app/server.tsx`, add imports and create repo (after line 10):

```ts
import { createFormProjectRepo } from '../services/form-project-repo'
```

After the extractor creation (after line 30), add:

```ts
const reposPath = process.env.REPOS_PATH ?? 'data/repos'
const formProjectRepo = createFormProjectRepo(reposPath)
```

Update the route mounting (line 130):

```ts
app.route('/projects', createProjectRoutes(projectStore, extractor, formProjectRepo))
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: Some tests may fail due to component prop changes — that's expected. The creation and routing tests should pass. Component updates come in the next task.

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/app/routes/projects/index.tsx src/app/server.tsx test/projects-routes.test.ts
git commit -m "$(cat <<'EOF'
feat: wire git service into project routes

Project creation now inits a bare repo and commits source PDF.
Extraction results are committed to git instead of SQLite.
Project detail reads specs from git.
EOF
)"
```

---

### Task 6: Update components for new data flow

**Files:**
- Modify: `src/app/routes/projects/components.tsx`
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Update ProjectDetail component to accept new props**

In `src/app/routes/projects/components.tsx`, update the imports and component signatures:

```ts
import type { FC } from 'hono/jsx'
import type { DemoFixture } from '../../../../fixtures/index'
import { resolveUrl } from '../../../lib/base-path'
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
  ProjectIndex,
} from '../../../types/models'
import type { CommitEntry } from '../../../services/form-project-repo'
```

Replace `ProjectList` to use `ProjectIndex`:

```ts
export const ProjectList: FC<{ projects: ProjectIndex[] }> = ({
  projects,
}) => (
  <div class="l-stack">
    <div class="l-cluster justify-between">
      <h1>My Projects</h1>
      <a href={resolveUrl('/projects/new')} class="flex-button">
        New Project
      </a>
    </div>
    {projects.length === 0 ? (
      <p>No projects yet. Create one to get started.</p>
    ) : (
      <table class="flex-table" data-variant="borderless" data-stacked>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const created = new Date(p.createdAt * 1000).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' },
            )
            return (
              <tr key={p.id}>
                <td data-label="Name">
                  <a href={resolveUrl(`/projects/${p.id}`)}>
                    <strong>{p.name}</strong>
                  </a>
                </td>
                <td data-label="Status">
                  <span class="badge" data-status={p.status}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </td>
                <td data-label="Created" class="text-muted text-sm">
                  {created}
                </td>
                <td data-label="Actions">
                  {p.status !== 'extracting' && (
                    <div class="l-cluster">
                      <a
                        href={resolveUrl(`/projects/${p.id}`)}
                        aria-label={`View ${p.name}`}
                      >
                        View
                      </a>
                      <form
                        method="post"
                        action={resolveUrl(`/projects/${p.id}/delete`)}
                        onsubmit="return confirm('Delete this project?')"
                      >
                        <button
                          type="submit"
                          class="delete-confirm__trigger"
                          aria-label={`Delete ${p.name}`}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )}
  </div>
)
```

Replace `ProjectDetail` and views to accept spec data as props:

```ts
export const ProjectDetail: FC<{
  project: ProjectIndex
  spec?: DataCollectionSpec | null
  formSpec?: FormSpec | null
  confidence?: FieldConfidence[] | null
  history?: CommitEntry[]
  cloneUrl?: string
  viewingSha?: string
}> = ({ project, spec, formSpec, confidence, history, cloneUrl, viewingSha }) => {
  if (project.status === 'extracting') {
    return <ExtractingView project={project} />
  }
  if (project.status === 'error') {
    return <ErrorView project={project} />
  }
  return (
    <ReadyView
      project={project}
      spec={spec ?? null}
      formSpec={formSpec ?? null}
      confidence={confidence ?? null}
      history={history ?? []}
      cloneUrl={cloneUrl ?? ''}
      viewingSha={viewingSha}
    />
  )
}

const ExtractingView: FC<{ project: ProjectIndex }> = ({ project }) => (
  <div class="l-stack">
    <a href={resolveUrl('/projects')} class="project-back-link">
      &larr; Back to projects
    </a>
    <meta http-equiv="refresh" content="3" />
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--info" role="status" aria-live="polite">
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

const ErrorView: FC<{ project: ProjectIndex }> = ({ project }) => (
  <div class="l-stack">
    <a href={resolveUrl('/projects')} class="project-back-link">
      &larr; Back to projects
    </a>
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

const ReadyView: FC<{
  project: ProjectIndex
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  history: CommitEntry[]
  cloneUrl: string
  viewingSha?: string
}> = ({ project, spec, formSpec, confidence, history, cloneUrl, viewingSha }) => {
  const groupCount = spec?.groups.length ?? 0
  const fieldCount =
    spec?.groups.reduce((sum, g) => sum + g.requirements.length, 0) ?? 0
  const pageCount = formSpec?.pages.length ?? 0
  const lowConfCount =
    confidence?.filter((c) => c.confidence < 0.8).length ?? 0

  return (
    <div class="l-stack">
      <a href={resolveUrl('/projects')} class="project-back-link">
        &larr; Back to projects
      </a>
      <h1>{project.name}</h1>
      {viewingSha && (
        <div class="flex-alert flex-alert--info" role="status">
          <p>
            Viewing historical version <code>{viewingSha.slice(0, 7)}</code>.{' '}
            <a href={resolveUrl(`/projects/${project.id}`)}>
              Return to latest
            </a>
          </p>
        </div>
      )}
      <div class="project-summary">
        <span>
          <strong>{groupCount}</strong> groups
        </span>
        <span>
          <strong>{fieldCount}</strong> fields
        </span>
        <span>
          <strong>{pageCount}</strong> pages
        </span>
        <span>
          <strong>{lowConfCount}</strong> low confidence
        </span>
      </div>
      {spec && (
        <SpecViewer spec={spec} confidence={confidence ?? []} />
      )}
      {formSpec && spec && (
        <FormSpecViewer formSpec={formSpec} spec={spec} />
      )}
      {cloneUrl && (
        <section class="l-stack">
          <h2>Clone</h2>
          <code class="clone-url">git clone {cloneUrl}</code>
        </section>
      )}
      {history.length > 0 && (
        <VersionHistory
          projectId={project.id}
          history={history}
          currentSha={viewingSha}
        />
      )}
    </div>
  )
}
```

Add a `VersionHistory` component (after `FormSpecViewer`):

```ts
const VersionHistory: FC<{
  projectId: string
  history: CommitEntry[]
  currentSha?: string
}> = ({ projectId, history, currentSha }) => (
  <section class="l-stack">
    <h2>Version History</h2>
    <table class="flex-table" data-variant="borderless" data-stacked>
      <thead>
        <tr>
          <th scope="col">Commit</th>
          <th scope="col">Message</th>
          <th scope="col">Author</th>
          <th scope="col">Date</th>
        </tr>
      </thead>
      <tbody>
        {history.map((entry) => {
          const isCurrent = entry.sha === currentSha
          const date = new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <tr key={entry.sha}>
              <td data-label="Commit">
                {isCurrent ? (
                  <code><strong>{entry.shortSha}</strong></code>
                ) : (
                  <a href={resolveUrl(`/projects/${projectId}/version/${entry.sha}`)}>
                    <code>{entry.shortSha}</code>
                  </a>
                )}
              </td>
              <td data-label="Message">{entry.message}</td>
              <td data-label="Author" class="text-muted text-sm">{entry.author}</td>
              <td data-label="Date" class="text-muted text-sm">{date}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </section>
)
```

Keep the existing `ConfidenceBadge`, `SpecViewer`, and `FormSpecViewer` components unchanged.

- [ ] **Step 2: Update remaining route tests**

Update the tests in `test/projects-routes.test.ts` to work with the new data flow. Key changes:

For the ready-state tests, specs now come from git, not SQLite. Update `createReadyProject`:

```ts
describe('Project detail - ready state', () => {
  async function createReadyProject() {
    const { app, projectStore } = createTestApp()
    const slug = 'summary-test'
    const project = projectStore.create({
      name: 'Summary Test',
      slug,
      createdBy: 'testuser',
    })

    await repo.init(slug)
    await repo.commit(
      slug,
      [
        { path: 'project.json', content: Buffer.from('{"name":"Summary Test"}') },
      ],
      'Init',
      'testuser',
    )
    await repo.commit(
      slug,
      [
        {
          path: 'forms/test/spec.json',
          content: Buffer.from(JSON.stringify({
            id: 'spec-1',
            title: 'Test',
            description: 'A test form',
            groups: [
              {
                id: 'g1',
                title: 'Personal Info',
                requirements: [
                  {
                    id: 'f1',
                    fieldName: 'firstName',
                    label: 'First name',
                    fieldType: 'text',
                    required: true,
                  },
                  {
                    id: 'f2',
                    fieldName: 'maidenName',
                    label: 'Maiden name',
                    fieldType: 'text',
                    required: false,
                    condition: {
                      field: 'marital-status',
                      operator: 'equals',
                      value: 'married',
                    },
                  },
                ],
              },
            ],
          })),
        },
        {
          path: 'forms/test/form.json',
          content: Buffer.from(JSON.stringify({
            id: 'form-1',
            specId: 'spec-1',
            title: 'Test',
            pages: [
              {
                id: 'page-1',
                title: 'Personal Information',
                groups: ['g1'],
                deliveryMode: 'conversational',
              },
            ],
            createdAt: '2026-04-11',
            updatedAt: '2026-04-11',
          })),
        },
        {
          path: 'forms/test/confidence.json',
          content: Buffer.from(JSON.stringify([
            { fieldId: 'f1', confidence: 0.95 },
            { fieldId: 'f2', confidence: 0.6, flags: ['conditional-logic-unclear'] },
          ])),
        },
      ],
      'Extract test form',
      'testuser',
    )
    projectStore.update(project.id, { status: 'ready' })
    return { app, project }
  }

  it('shows summary bar with counts', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('project-summary')
  })

  it('shows back link', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Back to projects')
  })

  it('shows condition for conditional fields', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('marital-status')
    expect(html).toContain('equals')
  })

  it('shows form layout with resolved group names', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('form-page-card')
    expect(html).toContain('Personal Information')
    expect(html).toContain('Personal Info')
  })

  it('shows version history', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Version History')
    expect(html).toContain('Extract test form')
    expect(html).toContain('Init')
  })

  it('shows clone URL', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('git clone')
    expect(html).toContain('/git/summary-test.git')
  })
})
```

Update the `GET /projects/:id` extracting test:

```ts
describe('GET /projects/:id', () => {
  it('shows extracting status with auto-refresh', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Test',
      slug: 'test',
      createdBy: 'testuser',
    })
    await repo.init('test')
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Extracting form structure')
    expect(html).toContain('http-equiv="refresh"')
  })

  it('returns 404 for missing project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/nonexistent')
    expect(res.status).toBe(404)
  })
})
```

Update error state and confidence tests similarly — replace `sourcePdf: Buffer.from('pdf')` and `description: 'Test'` with `slug: '<slug>'`, add `await repo.init('<slug>')`. Remove `projectStore.update` calls that set spec/formSpec/confidence (those now live in git).

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: PASS

- [ ] **Step 4: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS (or biome formatting fixes needed — run `bunx @biomejs/biome check --write .`)

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/app/routes/projects/components.tsx test/projects-routes.test.ts
git commit -m "$(cat <<'EOF'
feat: update components for git-backed data flow

ProjectDetail now receives spec data as props (read from git).
Add VersionHistory component and clone URL display.
Add snapshot banner for viewing past versions.
EOF
)"
```

---

### Task 7: Version history snapshot route test

**Files:**
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Add test for version snapshot viewing**

Add to `test/projects-routes.test.ts`:

```ts
describe('GET /projects/:id/version/:sha', () => {
  it('renders spec at a specific commit', async () => {
    const { app, projectStore } = createTestApp()
    const slug = 'versioned-project'
    const project = projectStore.create({
      name: 'Versioned Project',
      slug,
      createdBy: 'testuser',
    })
    await repo.init(slug)

    await repo.commit(
      slug,
      [
        {
          path: 'forms/form-v1/spec.json',
          content: Buffer.from(JSON.stringify({
            id: 'spec-1', title: 'V1 Form', description: 'Version 1',
            groups: [{ id: 'g1', title: 'Group', requirements: [] }],
          })),
        },
        {
          path: 'forms/form-v1/form.json',
          content: Buffer.from(JSON.stringify({
            id: 'form-1', specId: 'spec-1', title: 'V1',
            pages: [], createdAt: '', updatedAt: '',
          })),
        },
        {
          path: 'forms/form-v1/confidence.json',
          content: Buffer.from('[]'),
        },
      ],
      'Version 1',
      'testuser',
    )
    const log = await repo.log(slug, 'main')
    const v1sha = log[0].sha
    projectStore.update(project.id, { status: 'ready' })

    await repo.commit(
      slug,
      [
        {
          path: 'forms/form-v1/spec.json',
          content: Buffer.from(JSON.stringify({
            id: 'spec-1', title: 'V2 Form', description: 'Version 2',
            groups: [{ id: 'g1', title: 'Updated Group', requirements: [] }],
          })),
        },
      ],
      'Version 2',
      'testuser',
    )

    // View V1 snapshot
    const res = await app.request(`/projects/${project.id}/version/${v1sha}`)
    const html = await res.text()
    expect(html).toContain('V1 Form')
    expect(html).toContain(v1sha.slice(0, 7))
    expect(html).toContain('Return to latest')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: PASS (route was implemented in Task 5)

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add test/projects-routes.test.ts
git commit -m "test: add version snapshot route integration test"
```

---

### Task 8: Clean up old types and add clone-url styles

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/app/routes/projects/styles.css`

- [ ] **Step 1: Remove deprecated StoredProject and NewProject types**

In `src/types/models.ts`, remove the old `StoredProject` interface (lines 207-220) and `NewProject` interface (lines 222-227). Keep `ProjectStatus` — it's used by `ProjectIndex`.

- [ ] **Step 2: Search for remaining references**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && grep -rn 'StoredProject\|NewProject' src/ test/ --include='*.ts' --include='*.tsx'`
Expected: No matches (if any remain, update them to use `ProjectIndex` / `NewProjectIndex`)

- [ ] **Step 3: Add clone URL style**

In `src/app/routes/projects/styles.css`, add:

```css
.clone-url {
  display: block;
  padding: var(--flex-space-xs) var(--flex-space-sm);
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-border);
  border-radius: var(--flex-radius-sm);
  font-size: var(--flex-text-sm);
  word-break: break-all;
}
```

- [ ] **Step 4: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add src/types/models.ts src/app/routes/projects/styles.css
git commit -m "$(cat <<'EOF'
chore: remove deprecated StoredProject/NewProject types, add clone-url style
EOF
)"
```

---

### Task 9: Infrastructure — read-only git HTTP serving

**Files:**
- Modify: `infrastructure/nixos/modules/caddy.nix`
- Modify: `infrastructure/nixos/modules/deploy.nix`

- [ ] **Step 1: Add git static file route to Caddy**

In `infrastructure/nixos/modules/caddy.nix`, add a route for serving bare repos. Insert after the webhook `handle` block (after line 23), before the branch imports:

```nix
        # Read-only git HTTP (dumb transport — serves bare repo files)
        handle /git/* {
          root * /srv/forms-lab/repos
          uri strip_prefix /git
          file_server browse
        }
```

- [ ] **Step 2: Add REPOS_PATH env var to deploy script**

In `infrastructure/nixos/modules/deploy.nix`, add to the per-branch `.env` (after line 80, before `ENVEOF`):

```bash
REPOS_PATH=/srv/forms-lab/repos
```

- [ ] **Step 3: Ensure repos directory exists**

In `infrastructure/nixos/modules/deploy.nix`, after the `DEPLOY_ROOT` assignment (line 10), add directory creation near the top of the script (after `set -euo pipefail`):

```bash
    mkdir -p "$DEPLOY_ROOT/repos"
```

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab--story-3-pdf-upload
git add infrastructure/nixos/modules/caddy.nix infrastructure/nixos/modules/deploy.nix
git commit -m "$(cat <<'EOF'
infra(caddy): add read-only git HTTP serving for form project repos

Serves bare repos at /git/<slug>.git via dumb HTTP transport.
Adds REPOS_PATH env var and ensures repos directory exists on deploy.
EOF
)"
```

---

### Task 10: Manual testing and verification

- [ ] **Step 1: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS — all lint, types, and tests green

- [ ] **Step 2: Start dev server**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run dev`

- [ ] **Step 3: Test in browser**

Verify:
- `/projects` — List page renders correctly
- `/projects/new` — Fixture cards and upload form work
- Create project from fixture — redirects to detail, shows "Extracting..."
- Detail page (ready) — Shows spec, form layout, clone URL, version history
- Click a commit in version history — Shows snapshot with "Viewing historical version" banner and "Return to latest" link
- Delete a project — Confirms, removes from list
- Verify `data/repos/<slug>.git` exists after project creation

- [ ] **Step 4: Test git clone**

Run: `cd /tmp && git clone http://localhost:3000/git/<slug>.git`
Verify: Clone succeeds, contains `project.json`, `source/`, `forms/`

- [ ] **Step 5: Fix any issues found, commit**
