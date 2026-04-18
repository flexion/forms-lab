# Form Delivery UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace in-memory form session/submission storage with SQLite, add "Forms" to site navigation, require auth on all form routes, and add a read-only submission detail view.

**Architecture:** Three new SQLite-backed stores (`SqliteFormSessionGateway`, `SqliteSubmissionGateway`, `SpecSnapshotStore`) implement existing gateway interfaces. Navigation adds a "Forms" link to the header. The submission detail view reuses `FormReview` with a `readOnly` prop. Auth middleware moves to the form router root.

**Tech Stack:** Bun, Hono, bun:sqlite, JSX (server-rendered)

**Working directory:** `/home/daniel/src/forms-lab/.worktrees/story-6-forms`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/forms/sqlite-session-gateway.ts` | Create | SQLite-backed FormSessionGateway |
| `src/services/forms/sqlite-submission-gateway.ts` | Create | SQLite-backed SubmissionGateway |
| `src/services/forms/spec-snapshot-store.ts` | Create | Ephemeral spec snapshot cache by git SHA |
| `src/services/forms/types.ts` | Modify | Add `specVersion` to FormSession, `sessionId` to Submission, extend SubmissionGateway with `listByOwner` |
| `src/services/forms/session.ts` | Modify | Update InMemoryFormSessionGateway to match new type (add specVersion to createSession) |
| `src/design-system/components/flex-form-review/index.tsx` | Modify | Add `readOnly` prop to suppress Change links and submit button |
| `src/design-system/components/flex-layout/index.tsx` | Modify | Add "Forms" nav item to header |
| `src/entrypoints/app/routes/forms/index.tsx` | Modify | Add auth to all routes, add submission detail route, wire spec snapshot, update createSession call |
| `src/entrypoints/app/server.tsx` | Modify | Wire SQLite gateways and snapshot store instead of in-memory |
| `test/forms/sqlite-session-gateway.test.ts` | Create | Tests for SQLite session gateway |
| `test/forms/sqlite-submission-gateway.test.ts` | Create | Tests for SQLite submission gateway |
| `test/forms/spec-snapshot-store.test.ts` | Create | Tests for spec snapshot store |
| `test/forms/routes.test.ts` | Modify | Add tests for submission detail view, update auth expectations |

---

### Task 1: Extend Types

Add `specVersion` to `FormSession`, `sessionId` to `Submission`, and `listByOwner` to `SubmissionGateway`. These changes enable tracking which spec version a session was created against, linking submissions back to sessions, and querying submissions by owner.

**Files:**
- Modify: `src/services/forms/types.ts:47-96`

- [ ] **Step 1: Update FormSession type**

In `src/services/forms/types.ts`, add `specVersion` to the `FormSession` interface:

```typescript
export interface FormSession {
  id: string
  specId: string
  formSpecId: string
  ownerId: string
  fields: Record<string, FieldEntry>
  status: 'active' | 'submitted'
  specVersion: string
  createdAt: string
}
```

- [ ] **Step 2: Update Submission type**

In the same file, add `sessionId` to `Submission` and make `specVersion` required:

```typescript
export interface Submission {
  id: string
  sessionId: string
  specId: string
  formSpecId: string
  ownerId: string
  data: Record<string, unknown>
  submittedAt: string
  specVersion: string
}
```

- [ ] **Step 3: Update FormSessionGateway interface**

Add `specVersion` parameter to `createSession`:

```typescript
export interface FormSessionGateway {
  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
    specVersion: string,
  ): FormSession
  getSession(id: string): FormSession | null
  listByOwner(ownerId: string): FormSession[]
  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void
  submit(sessionId: string): Submission
}
```

- [ ] **Step 4: Update SubmissionGateway interface**

Add `listByOwner`:

```typescript
export interface SubmissionGateway {
  save(submission: Submission): void
  getSubmission(id: string): Submission | null
  listByOwner(ownerId: string): Submission[]
}
```

- [ ] **Step 5: Update InMemoryFormSessionGateway**

In `src/services/forms/session.ts`, update to match:

```typescript
export class InMemoryFormSessionGateway implements FormSessionGateway {
  private sessions = new Map<string, FormSession>()

  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
    specVersion: string,
  ): FormSession {
    const session: FormSession = {
      id: crypto.randomUUID(),
      specId,
      formSpecId,
      ownerId,
      fields: {},
      status: 'active',
      specVersion,
      createdAt: new Date().toISOString(),
    }
    this.sessions.set(session.id, session)
    return session
  }

  getSession(id: string): FormSession | null {
    return this.sessions.get(id) ?? null
  }

  listByOwner(ownerId: string): FormSession[] {
    return [...this.sessions.values()].filter((s) => s.ownerId === ownerId)
  }

  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    session.fields = { ...session.fields, ...fields }
  }

  submit(sessionId: string): Submission {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    session.status = 'submitted'
    const data: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(session.fields)) {
      if (entry.value !== null) {
        data[key] = entry.value
      }
    }
    const submission: Submission = {
      id: crypto.randomUUID(),
      sessionId,
      specId: session.specId,
      formSpecId: session.formSpecId,
      ownerId: session.ownerId,
      data,
      specVersion: session.specVersion,
      submittedAt: new Date().toISOString(),
    }
    return submission
  }
}
```

- [ ] **Step 6: Update InMemorySubmissionGateway**

In `src/services/forms/submission.ts`, add `listByOwner`:

```typescript
export class InMemorySubmissionGateway implements SubmissionGateway {
  private submissions = new Map<string, Submission>()

  save(submission: Submission): void {
    this.submissions.set(submission.id, submission)
  }

  getSubmission(id: string): Submission | null {
    return this.submissions.get(id) ?? null
  }

  listByOwner(ownerId: string): Submission[] {
    return [...this.submissions.values()].filter(
      (s) => s.ownerId === ownerId,
    )
  }
}
```

- [ ] **Step 7: Fix callers of createSession**

In `src/entrypoints/app/routes/forms/index.tsx`, update `handleCreateSession` (around line 297):

```typescript
    const session = sessionGateway.createSession(
      specs.dataSpec.id,
      specs.formSpec.id,
      user.login,
      specs.sha,
    )
```

And in `handleSubmit` (around line 481-484), update to use `submission.specVersion` from the session instead of manually pinning — it's now set automatically by `submit()`. Remove the manual `submission.specVersion = specs.sha` line.

- [ ] **Step 8: Run tests to verify nothing broke**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/`

Expected: All existing tests pass (they use InMemoryFormSessionGateway which now has the updated signature).

- [ ] **Step 9: Commit**

```bash
git add src/services/forms/types.ts src/services/forms/session.ts src/services/forms/submission.ts src/entrypoints/app/routes/forms/index.tsx
git commit -m "feat(forms): extend types with specVersion, sessionId, and listByOwner

Add specVersion to FormSession (tracked at creation), sessionId to
Submission (links back to session), and listByOwner to SubmissionGateway.
Update in-memory implementations to match."
```

---

### Task 2: Spec Snapshot Store

A simple SQLite-backed cache keyed by git SHA. Stores DataCollectionSpec and FormSpec JSON so submissions can be rendered using the exact spec they were submitted against.

**Files:**
- Create: `src/services/forms/spec-snapshot-store.ts`
- Create: `test/forms/spec-snapshot-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/forms/spec-snapshot-store.test.ts`:

```typescript
import { unlinkSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'bun:test'
import { createSpecSnapshotStore } from '../../src/services/forms/spec-snapshot-store'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_DB = 'data/test-spec-snapshots.sqlite'
const TEST_SHA = 'abc1234567890def'

afterAll(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {}
})

describe('SpecSnapshotStore', () => {
  it('returns null for unknown SHA', () => {
    const store = createSpecSnapshotStore(TEST_DB)
    expect(store.get('nonexistent')).toBeNull()
  })

  it('round-trips a snapshot', () => {
    const store = createSpecSnapshotStore(TEST_DB)
    store.put(TEST_SHA, 'benefits-app', testDataSpec, testFormSpec)
    const result = store.get(TEST_SHA)
    expect(result).not.toBeNull()
    expect(result!.specId).toBe('benefits-app')
    expect(result!.dataCollectionSpec.id).toBe(testDataSpec.id)
    expect(result!.formSpec.id).toBe(testFormSpec.id)
  })

  it('overwrites existing snapshot for same SHA', () => {
    const store = createSpecSnapshotStore(TEST_DB)
    store.put(TEST_SHA, 'benefits-app', testDataSpec, testFormSpec)
    store.put(TEST_SHA, 'benefits-app', testDataSpec, {
      ...testFormSpec,
      title: 'Updated Title',
    })
    const result = store.get(TEST_SHA)
    expect(result!.formSpec.title).toBe('Updated Title')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/spec-snapshot-store.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/services/forms/spec-snapshot-store.ts`:

```typescript
import { Database } from 'bun:sqlite'
import type { DataCollectionSpec } from '../data-collection/types'
import type { FormSpec } from './types'

export interface SpecSnapshot {
  specVersion: string
  specId: string
  dataCollectionSpec: DataCollectionSpec
  formSpec: FormSpec
  cachedAt: string
}

export interface SpecSnapshotStore {
  get(specVersion: string): SpecSnapshot | null
  put(
    specVersion: string,
    specId: string,
    dataCollectionSpec: DataCollectionSpec,
    formSpec: FormSpec,
  ): void
}

export function createSpecSnapshotStore(dbPath: string): SpecSnapshotStore {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS spec_snapshots (
      spec_version TEXT PRIMARY KEY,
      spec_id TEXT NOT NULL,
      data_collection_spec TEXT NOT NULL,
      form_spec TEXT NOT NULL,
      cached_at TEXT NOT NULL
    )
  `)

  return {
    get(specVersion: string): SpecSnapshot | null {
      const row = db
        .query(
          'SELECT spec_version, spec_id, data_collection_spec, form_spec, cached_at FROM spec_snapshots WHERE spec_version = ?',
        )
        .get(specVersion) as {
        spec_version: string
        spec_id: string
        data_collection_spec: string
        form_spec: string
        cached_at: string
      } | null
      if (!row) return null
      return {
        specVersion: row.spec_version,
        specId: row.spec_id,
        dataCollectionSpec: JSON.parse(
          row.data_collection_spec,
        ) as DataCollectionSpec,
        formSpec: JSON.parse(row.form_spec) as FormSpec,
        cachedAt: row.cached_at,
      }
    },

    put(
      specVersion: string,
      specId: string,
      dataCollectionSpec: DataCollectionSpec,
      formSpec: FormSpec,
    ): void {
      db.run(
        'INSERT OR REPLACE INTO spec_snapshots (spec_version, spec_id, data_collection_spec, form_spec, cached_at) VALUES (?, ?, ?, ?, ?)',
        [
          specVersion,
          specId,
          JSON.stringify(dataCollectionSpec),
          JSON.stringify(formSpec),
          new Date().toISOString(),
        ],
      )
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/spec-snapshot-store.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/spec-snapshot-store.ts test/forms/spec-snapshot-store.test.ts
git commit -m "feat(forms): add SpecSnapshotStore for caching specs by git SHA

Ephemeral SQLite cache keyed by commit SHA. Submissions reference a
snapshot so they can be rendered against the exact spec version used
at submission time."
```

---

### Task 3: SQLite Form Session Gateway

Replace the in-memory session store with a SQLite-backed implementation.

**Files:**
- Create: `src/services/forms/sqlite-session-gateway.ts`
- Create: `test/forms/sqlite-session-gateway.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/forms/sqlite-session-gateway.test.ts`:

```typescript
import { unlinkSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'bun:test'
import { SqliteFormSessionGateway } from '../../src/services/forms/sqlite-session-gateway'

const TEST_DB = 'data/test-form-sessions.sqlite'

afterAll(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {}
})

describe('SqliteFormSessionGateway', () => {
  it('creates and retrieves a session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    const session = gw.createSession('spec-1', 'form-1', 'alice', 'sha123')
    expect(session.id).toBeTruthy()
    expect(session.specId).toBe('spec-1')
    expect(session.formSpecId).toBe('form-1')
    expect(session.ownerId).toBe('alice')
    expect(session.specVersion).toBe('sha123')
    expect(session.status).toBe('active')
    expect(session.fields).toEqual({})

    const retrieved = gw.getSession(session.id)
    expect(retrieved).toEqual(session)
  })

  it('returns null for unknown session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    expect(gw.getSession('nonexistent')).toBeNull()
  })

  it('lists sessions by owner', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    gw.createSession('spec-1', 'form-1', 'bob', 'sha1')
    gw.createSession('spec-1', 'form-1', 'bob', 'sha1')
    gw.createSession('spec-1', 'form-1', 'carol', 'sha1')
    const bobSessions = gw.listByOwner('bob')
    expect(bobSessions.length).toBeGreaterThanOrEqual(2)
    expect(bobSessions.every((s) => s.ownerId === 'bob')).toBe(true)
  })

  it('writes and merges fields', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    const session = gw.createSession('spec-1', 'form-1', 'dave', 'sha1')
    gw.writeFields(session.id, {
      name: { value: 'Dave' },
      email: { value: 'dave@example.com' },
    })
    const updated = gw.getSession(session.id)
    expect(updated!.fields.name.value).toBe('Dave')
    expect(updated!.fields.email.value).toBe('dave@example.com')

    gw.writeFields(session.id, {
      email: { value: 'dave2@example.com' },
      phone: { value: '555-1234' },
    })
    const merged = gw.getSession(session.id)
    expect(merged!.fields.name.value).toBe('Dave')
    expect(merged!.fields.email.value).toBe('dave2@example.com')
    expect(merged!.fields.phone.value).toBe('555-1234')
  })

  it('throws on writeFields for unknown session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    expect(() =>
      gw.writeFields('nonexistent', { x: { value: 1 } }),
    ).toThrow('Session "nonexistent" not found')
  })

  it('submits a session and returns a submission', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    const session = gw.createSession('spec-1', 'form-1', 'eve', 'sha456')
    gw.writeFields(session.id, {
      name: { value: 'Eve' },
      optional: { value: null },
    })
    const submission = gw.submit(session.id)
    expect(submission.id).toBeTruthy()
    expect(submission.sessionId).toBe(session.id)
    expect(submission.specId).toBe('spec-1')
    expect(submission.ownerId).toBe('eve')
    expect(submission.specVersion).toBe('sha456')
    expect(submission.data).toEqual({ name: 'Eve' })

    const updated = gw.getSession(session.id)
    expect(updated!.status).toBe('submitted')
  })

  it('throws on submit for unknown session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    expect(() => gw.submit('nonexistent')).toThrow(
      'Session "nonexistent" not found',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/sqlite-session-gateway.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/services/forms/sqlite-session-gateway.ts`:

```typescript
import { Database } from 'bun:sqlite'
import type {
  FieldEntry,
  FormSession,
  FormSessionGateway,
  Submission,
} from './types'

export class SqliteFormSessionGateway implements FormSessionGateway {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.run('PRAGMA journal_mode = WAL')
    this.db.run(`
      CREATE TABLE IF NOT EXISTS form_sessions (
        id TEXT PRIMARY KEY,
        spec_id TEXT NOT NULL,
        form_spec_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        fields TEXT NOT NULL DEFAULT '{}',
        spec_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
  }

  private rowToSession(row: Record<string, unknown>): FormSession {
    return {
      id: row.id as string,
      specId: row.spec_id as string,
      formSpecId: row.form_spec_id as string,
      ownerId: row.owner_id as string,
      status: row.status as 'active' | 'submitted',
      fields: JSON.parse(row.fields as string) as Record<string, FieldEntry>,
      specVersion: row.spec_version as string,
      createdAt: row.created_at as string,
    }
  }

  createSession(
    specId: string,
    formSpecId: string,
    ownerId: string,
    specVersion: string,
  ): FormSession {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    this.db.run(
      `INSERT INTO form_sessions (id, spec_id, form_spec_id, owner_id, spec_version, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`,
      [id, specId, formSpecId, ownerId, specVersion, now, now],
    )
    return this.getSession(id)!
  }

  getSession(id: string): FormSession | null {
    const row = this.db
      .query('SELECT * FROM form_sessions WHERE id = ?')
      .get(id) as Record<string, unknown> | null
    if (!row) return null
    return this.rowToSession(row)
  }

  listByOwner(ownerId: string): FormSession[] {
    const rows = this.db
      .query(
        'SELECT * FROM form_sessions WHERE owner_id = ? ORDER BY created_at DESC',
      )
      .all(ownerId) as Record<string, unknown>[]
    return rows.map((row) => this.rowToSession(row))
  }

  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void {
    const session = this.getSession(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    const merged = { ...session.fields, ...fields }
    this.db.run(
      'UPDATE form_sessions SET fields = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(merged), new Date().toISOString(), sessionId],
    )
  }

  submit(sessionId: string): Submission {
    const session = this.getSession(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    this.db.run(
      'UPDATE form_sessions SET status = ?, updated_at = ? WHERE id = ?',
      ['submitted', new Date().toISOString(), sessionId],
    )
    const data: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(session.fields)) {
      if (entry.value !== null) {
        data[key] = entry.value
      }
    }
    return {
      id: crypto.randomUUID(),
      sessionId,
      specId: session.specId,
      formSpecId: session.formSpecId,
      ownerId: session.ownerId,
      data,
      specVersion: session.specVersion,
      submittedAt: new Date().toISOString(),
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/sqlite-session-gateway.test.ts`

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/sqlite-session-gateway.ts test/forms/sqlite-session-gateway.test.ts
git commit -m "feat(forms): add SqliteFormSessionGateway

SQLite-backed implementation of FormSessionGateway. Persists sessions,
fields (as JSON), and status across server restarts."
```

---

### Task 4: SQLite Submission Gateway

Replace the in-memory submission store with a SQLite-backed implementation.

**Files:**
- Create: `src/services/forms/sqlite-submission-gateway.ts`
- Create: `test/forms/sqlite-submission-gateway.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/forms/sqlite-submission-gateway.test.ts`:

```typescript
import { unlinkSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'bun:test'
import { SqliteSubmissionGateway } from '../../src/services/forms/sqlite-submission-gateway'
import type { Submission } from '../../src/services/forms/types'

const TEST_DB = 'data/test-form-submissions.sqlite'

afterAll(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {}
})

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: crypto.randomUUID(),
    sessionId: 'session-1',
    specId: 'spec-1',
    formSpecId: 'form-1',
    ownerId: 'alice',
    data: { name: 'Alice' },
    specVersion: 'sha123',
    submittedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('SqliteSubmissionGateway', () => {
  it('saves and retrieves a submission', () => {
    const gw = new SqliteSubmissionGateway(TEST_DB)
    const submission = makeSubmission()
    gw.save(submission)
    const retrieved = gw.getSubmission(submission.id)
    expect(retrieved).toEqual(submission)
  })

  it('returns null for unknown submission', () => {
    const gw = new SqliteSubmissionGateway(TEST_DB)
    expect(gw.getSubmission('nonexistent')).toBeNull()
  })

  it('lists submissions by owner', () => {
    const gw = new SqliteSubmissionGateway(TEST_DB)
    gw.save(makeSubmission({ ownerId: 'bob' }))
    gw.save(makeSubmission({ ownerId: 'bob' }))
    gw.save(makeSubmission({ ownerId: 'carol' }))
    const bobSubmissions = gw.listByOwner('bob')
    expect(bobSubmissions.length).toBeGreaterThanOrEqual(2)
    expect(bobSubmissions.every((s) => s.ownerId === 'bob')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/sqlite-submission-gateway.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/services/forms/sqlite-submission-gateway.ts`:

```typescript
import { Database } from 'bun:sqlite'
import type { Submission, SubmissionGateway } from './types'

export class SqliteSubmissionGateway implements SubmissionGateway {
  private db: Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.run('PRAGMA journal_mode = WAL')
    this.db.run(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        spec_id TEXT NOT NULL,
        form_spec_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        data TEXT NOT NULL,
        spec_version TEXT NOT NULL,
        submitted_at TEXT NOT NULL
      )
    `)
  }

  private rowToSubmission(row: Record<string, unknown>): Submission {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      specId: row.spec_id as string,
      formSpecId: row.form_spec_id as string,
      ownerId: row.owner_id as string,
      data: JSON.parse(row.data as string) as Record<string, unknown>,
      specVersion: row.spec_version as string,
      submittedAt: row.submitted_at as string,
    }
  }

  save(submission: Submission): void {
    this.db.run(
      `INSERT OR REPLACE INTO form_submissions
       (id, session_id, spec_id, form_spec_id, owner_id, data, spec_version, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submission.id,
        submission.sessionId,
        submission.specId,
        submission.formSpecId,
        submission.ownerId,
        JSON.stringify(submission.data),
        submission.specVersion,
        submission.submittedAt,
      ],
    )
  }

  getSubmission(id: string): Submission | null {
    const row = this.db
      .query('SELECT * FROM form_submissions WHERE id = ?')
      .get(id) as Record<string, unknown> | null
    if (!row) return null
    return this.rowToSubmission(row)
  }

  listByOwner(ownerId: string): Submission[] {
    const rows = this.db
      .query(
        'SELECT * FROM form_submissions WHERE owner_id = ? ORDER BY submitted_at DESC',
      )
      .all(ownerId) as Record<string, unknown>[]
    return rows.map((row) => this.rowToSubmission(row))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/sqlite-submission-gateway.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/sqlite-submission-gateway.ts test/forms/sqlite-submission-gateway.test.ts
git commit -m "feat(forms): add SqliteSubmissionGateway

SQLite-backed implementation of SubmissionGateway. Persists submissions
across server restarts with listByOwner support."
```

---

### Task 5: Wire SQLite Gateways in Server

Replace in-memory gateways with SQLite in the app server. Wire the spec snapshot store to cache specs on submission.

**Files:**
- Modify: `src/entrypoints/app/server.tsx:1-66, 314-357`
- Modify: `src/entrypoints/app/routes/forms/index.tsx:48-59, 466-492`

- [ ] **Step 1: Update server.tsx imports and gateway creation**

In `src/entrypoints/app/server.tsx`, replace the in-memory imports and gateway construction.

Replace:
```typescript
import { InMemoryFormSessionGateway } from '../../services/forms/session'
import { InMemorySubmissionGateway } from '../../services/forms/submission'
```
With:
```typescript
import { SqliteFormSessionGateway } from '../../services/forms/sqlite-session-gateway'
import { SqliteSubmissionGateway } from '../../services/forms/sqlite-submission-gateway'
import { createSpecSnapshotStore } from '../../services/forms/spec-snapshot-store'
```

Replace:
```typescript
const sessionGateway = new InMemoryFormSessionGateway()
const submissionGateway = new InMemorySubmissionGateway()
```
With:
```typescript
const formsDbPath = process.env.FORMS_DB_PATH ?? 'data/forms.sqlite'
mkdirSync(dirname(formsDbPath), { recursive: true })
const sessionGateway = new SqliteFormSessionGateway(formsDbPath)
const submissionGateway = new SqliteSubmissionGateway(formsDbPath)
const specSnapshotStore = createSpecSnapshotStore(formsDbPath)
```

- [ ] **Step 2: Pass specSnapshotStore to form router**

In `src/entrypoints/app/routes/forms/index.tsx`, add `specSnapshotStore` to the `FormRouterDeps` interface:

```typescript
interface FormRouterDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  specSnapshotStore?: {
    get(specVersion: string): {
      specVersion: string
      specId: string
      dataCollectionSpec: DataCollectionSpec
      formSpec: FormSpec
      cachedAt: string
    } | null
    put(
      specVersion: string,
      specId: string,
      dataCollectionSpec: DataCollectionSpec,
      formSpec: FormSpec,
    ): void
  }
  getSpecs: (specId: string, ref?: string) => Promise<ResolvedSpecs | null>
  listSpecs: () => Promise<ResolvedSpecs[]>
  getEditHref?: (specId: string, branch: string) => string | null
}
```

Destructure it in `createFormRouter`:
```typescript
  const {
    sessionGateway,
    submissionGateway,
    specSnapshotStore,
    getSpecs,
    listSpecs,
    getEditHref,
  } = deps
```

- [ ] **Step 3: Snapshot specs on submission**

In `handleSubmit`, after saving the submission, cache the specs:

```typescript
  async function handleSubmit(c: Context) {
    const branch = readBranch(c)
    const specId = c.req.param('specId')
    const sessionId = c.req.param('sessionId')
    if (!specId || !sessionId) return c.notFound()
    const specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    if (session.status === 'submitted') {
      return c.text('This form has already been submitted.', 409)
    }
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)
    specSnapshotStore?.put(
      specs.sha,
      specs.dataSpec.id,
      specs.dataSpec,
      specs.formSpec,
    )
    const prefix = formPathPrefix(specs.dataSpec.id, branch)
    return c.redirect(
      resolveUrl(
        `${prefix}/sessions/${session.id}/confirmation?submissionId=${submission.id}`,
      ),
    )
  }
```

- [ ] **Step 4: Wire specSnapshotStore in server.tsx**

In the `createFormRouter` call in `server.tsx`, add:

```typescript
app.route(
  '/forms',
  createFormRouter({
    sessionGateway,
    submissionGateway,
    specSnapshotStore,
    async getSpecs(specId, ref) {
      // ... existing implementation
    },
    async listSpecs() {
      // ... existing implementation
    },
    getEditHref(specId, branch) {
      // ... existing implementation
    },
  }),
)
```

- [ ] **Step 5: Run tests**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/`

Expected: All tests pass. Existing route tests use in-memory gateways (no specSnapshotStore passed — it's optional).

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/server.tsx src/entrypoints/app/routes/forms/index.tsx
git commit -m "feat(forms): wire SQLite gateways and spec snapshot store

Replace in-memory session and submission gateways with SQLite-backed
implementations. Cache specs on submission via SpecSnapshotStore."
```

---

### Task 6: Navigation — Add "Forms" to Header

Add the "Forms" link to the site header for both authenticated and anonymous users. Add a "My sessions" link to the forms index page for authenticated users.

**Files:**
- Modify: `src/design-system/components/flex-layout/index.tsx:78-109`
- Modify: `src/entrypoints/app/routes/forms/index.tsx:142-175`

- [ ] **Step 1: Add "Forms" nav item to Layout header (authenticated)**

In `src/design-system/components/flex-layout/index.tsx`, update the authenticated nav section (lines 84-96) to include Forms between Home and Projects:

```tsx
          {props.user ? (
            <>
              <HeaderNavItem
                href={resolveUrl('/forms')}
                label="Forms"
                current={props.currentPath?.startsWith('/forms') ?? false}
              />
              <HeaderNavItem
                href={resolveUrl(`/${props.user.login}`)}
                label="Projects"
                current={props.currentPath === `/${props.user.login}`}
              />
              <HeaderNavItem
                href={resolveUrl('/catalog')}
                label="Catalog"
                current={props.currentPath?.startsWith('/catalog') ?? false}
              />
            </>
          ) : (
            <>
              <HeaderNavItem
                href={resolveUrl('/forms')}
                label="Forms"
                current={props.currentPath?.startsWith('/forms') ?? false}
              />
              <HeaderNavItem
                href={resolveUrl('/catalog')}
                label="Catalog"
                current={props.currentPath?.startsWith('/catalog') ?? false}
              />
              <HeaderNavItem
                href={resolveUrl('/auth/signin')}
                label="Sign in"
              />
            </>
          )}
```

- [ ] **Step 2: Add "My sessions" link to forms index page**

In `src/entrypoints/app/routes/forms/index.tsx`, update the forms index handler (the `forms.get('/', ...)` route) to show a "My sessions" link when authenticated:

```tsx
  forms.get('/', requireAuth(), async (c) => {
    const user = c.get('user')
    const allSpecs = await listSpecs()
    return c.html(
      <Layout user={user} title="Forms" currentPath="/forms">
        <div class="flex-form" data-size="large">
          <div class="l-cluster" style="justify-content: space-between; align-items: baseline;">
            <h1>Available Forms</h1>
            <a href={resolveUrl('/forms/sessions')}>My sessions</a>
          </div>
          {allSpecs.length === 0 ? (
            <p>No forms available.</p>
          ) : (
            <table class="flex-table" data-variant="borderless">
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {allSpecs.map(({ dataSpec, formSpec }) => (
                  <tr key={dataSpec.id}>
                    <th scope="row">
                      <a href={resolveUrl(`/forms/${dataSpec.id}`)}>
                        {formSpec.title}
                      </a>
                    </th>
                    <td>{formSpec.description ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>,
    )
  })
```

Note: the forms index route now has `requireAuth()` since all `/forms` routes require auth.

- [ ] **Step 3: Run tests and fix expectations**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/routes.test.ts`

Two existing tests expect unauthenticated access to `/forms` and `/forms/benefits-app` — these need updating since auth is now required everywhere. Update the tests:

In `test/forms/routes.test.ts`, update these tests:

The test `'forms index is accessible without auth'` should now expect a redirect:
```typescript
  it('forms index requires auth', async () => {
    const app = createUnauthTestApp()
    const res = await app.request('/forms')
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toContain('/auth/signin')
  })
```

The test `'landing page is accessible without auth'` should now expect a redirect:
```typescript
  it('landing page requires auth', async () => {
    const app = createUnauthTestApp()
    const res = await app.request('/forms/benefits-app')
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toContain('/auth/signin')
  })
```

- [ ] **Step 4: Add auth middleware to remaining form routes**

In `src/entrypoints/app/routes/forms/index.tsx`, add `requireAuth()` to the form landing routes and forms index. The simplest approach: add a blanket auth middleware at the top of the router:

```typescript
  // All form routes require authentication
  forms.use('*', requireAuth())
```

Add this right after `const forms = new Hono()` and remove the individual `requireAuth()` calls from specific routes (the `forms.use('/:specId/sessions/*', ...)` and `forms.post('/:specId/sessions', ...)` lines) since the blanket middleware covers them.

- [ ] **Step 5: Run tests again**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/routes.test.ts`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/design-system/components/flex-layout/index.tsx src/entrypoints/app/routes/forms/index.tsx test/forms/routes.test.ts
git commit -m "feat(forms): add Forms nav link and require auth on all form routes

Add 'Forms' to header navigation for all users. Add 'My sessions'
link to forms catalog page. All /forms routes now require auth."
```

---

### Task 7: Submission Detail View

Add a read-only submission detail route and update `FormReview` to support a `readOnly` prop.

**Files:**
- Modify: `src/design-system/components/flex-form-review/index.tsx:21-76`
- Modify: `src/entrypoints/app/routes/forms/index.tsx`
- Modify: `test/forms/routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/forms/routes.test.ts`:

```typescript
  it('GET /forms/sessions/:sessionId/submission shows read-only review', async () => {
    const app = createTestApp()

    // Create and complete a session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
      }),
    })
    await app.request(`${baseUrl}/pages/1`, {
      method: 'POST',
      body: new URLSearchParams({
        employed: 'Yes',
        employmentType: 'Full-time',
        monthlyIncome: '5000',
      }),
    })
    await app.request(`${baseUrl}/pages/2`, {
      method: 'POST',
      body: new URLSearchParams({
        startDate: '2026-05-01',
        dependents: '2',
        agreeTerms: 'on',
      }),
    })
    await app.request(`${baseUrl}/submit`, { method: 'POST' })

    // View submission detail
    const res = await app.request(`/forms/sessions/${sessionId}/submission`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Alice Johnson')
    expect(html).toContain('alice@example.com')
    expect(html).toContain('Full-time')
    // Should NOT have Change links or Submit button
    expect(html).not.toContain('>Change<')
    expect(html).not.toContain('>Submit<')
  })

  it('submission detail returns 404 for active (non-submitted) session', async () => {
    const app = createTestApp()
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]

    const res = await app.request(`/forms/sessions/${sessionId}/submission`)
    expect(res.status).toBe(404)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/routes.test.ts`

Expected: FAIL — route not found (404).

- [ ] **Step 3: Add readOnly prop to FormReview**

In `src/design-system/components/flex-form-review/index.tsx`, update the interface and component:

```tsx
interface FormReviewProps {
  pages: ReviewPage[]
  fields: Record<string, FormFieldEntry>
  submitUrl?: string
  editBaseUrl?: string
  readOnly?: boolean
}

export const FormReview: FC<FormReviewProps> = ({
  pages,
  fields,
  submitUrl,
  editBaseUrl,
  readOnly,
}) => {
  return (
    <Form size="large">
      <h1>{readOnly ? 'Submission details' : 'Review your answers'}</h1>
      {!readOnly && <p>Check your answers before submitting.</p>}
      {pages.map((page, pageIndex) => (
        <section key={page.id}>
          <div class="l-cluster" style="justify-content: space-between">
            <h2>{page.title}</h2>
            {!readOnly && editBaseUrl && (
              <a href={`${editBaseUrl}/${pageIndex}`}>
                Change
                <span class="u-visually-hidden"> {page.title}</span>
              </a>
            )}
          </div>
          {page.groups.map((group) => (
            <dl key={group.id} class="flex-summary-list">
              {group.requirements.map((req) => {
                const entry = fields[req.fieldName]
                const displayValue = formatValue(entry?.value)
                return (
                  <div key={req.fieldName} class="flex-summary-list__row">
                    <dt class="flex-summary-list__key">{req.label}</dt>
                    <dd class="flex-summary-list__value">
                      {displayValue === 'Not provided' ? (
                        <span class="u-text-muted">{displayValue}</span>
                      ) : (
                        displayValue
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          ))}
        </section>
      ))}
      {!readOnly && submitUrl && (
        <form method="post" action={submitUrl}>
          <button type="submit" class="flex-button">
            Submit
          </button>
        </form>
      )}
    </Form>
  )
}
```

- [ ] **Step 4: Add submission detail route**

In `src/entrypoints/app/routes/forms/index.tsx`, add a new handler `handleSubmissionDetail` and mount it.

Add the handler after the existing handlers:

```typescript
  async function handleSubmissionDetail(c: Context) {
    const user = c.get('user')
    if (!user) return c.text('Unauthorized', 401)
    const sessionId = c.req.param('sessionId')
    if (!sessionId) return c.notFound()
    const session = sessionGateway.getSession(sessionId)
    if (!session) return c.notFound()
    if (session.ownerId !== user.login) return c.notFound()
    if (session.status !== 'submitted') return c.notFound()

    // Try to load specs from snapshot cache, fall back to live specs
    let dataSpec: DataCollectionSpec | null = null
    let formSpec: FormSpec | null = null
    const snapshot = specSnapshotStore?.get(session.specVersion)
    if (snapshot) {
      dataSpec = snapshot.dataCollectionSpec
      formSpec = snapshot.formSpec
    } else {
      const specs = await getSpecs(session.specId)
      if (specs) {
        dataSpec = specs.dataSpec
        formSpec = specs.formSpec
      }
    }
    if (!dataSpec || !formSpec) return c.notFound()

    const resolved = resolveFormSpec(formSpec, dataSpec)
    const reviewPages = buildReviewPages(resolved, session.fields)

    return c.html(
      <Layout user={user} title="Submission Details" currentPath="/forms">
        <FormReview
          pages={reviewPages}
          fields={session.fields}
          readOnly
        />
      </Layout>,
    )
  }
```

Mount the route (add before the `return forms` statement, near the other session routes):

```typescript
  // Submission detail (read-only review of completed form)
  forms.get('/sessions/:sessionId/submission', handleSubmissionDetail)
```

- [ ] **Step 5: Update My Sessions page to link to submission detail**

In the `forms.get('/sessions', ...)` handler, update the completed sessions to link to the detail view:

Replace the submitted session list item (around lines 235-244):
```tsx
                    {submitted.map((s) => {
                      const title = titles.get(s.specId) ?? s.specId
                      return (
                        <li key={s.id}>
                          <a
                            href={resolveUrl(
                              `/forms/sessions/${s.id}/submission`,
                            )}
                          >
                            <strong>{title}</strong>
                          </a>
                          <span class="u-text-muted">
                            {' '}
                            — submitted{' '}
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </li>
                      )
                    })}
```

- [ ] **Step 6: Run tests**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/routes.test.ts`

Expected: All tests pass, including the two new submission detail tests.

- [ ] **Step 7: Commit**

```bash
git add src/design-system/components/flex-form-review/index.tsx src/entrypoints/app/routes/forms/index.tsx test/forms/routes.test.ts
git commit -m "feat(forms): add read-only submission detail view

Add GET /forms/sessions/:sessionId/submission route that renders a
read-only FormReview for completed submissions. Add readOnly prop
to FormReview component. Link completed sessions to detail view
from My Sessions page."
```

---

### Task 8: Full Integration Verification

Run the full test suite and type-check to verify everything works together.

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun run --no-warnings tsc --noEmit`

Expected: No type errors.

- [ ] **Step 2: Run full test suite**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test`

Expected: All form-related tests pass. Pre-existing failures (layout tokens, smoke tests) remain unchanged.

- [ ] **Step 3: Run lint**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bunx @biomejs/biome check .`

Expected: No new lint errors. Pre-existing errors remain unchanged.

- [ ] **Step 4: Manual smoke test (if dev server available)**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun run dev`

Verify:
1. Header shows "Forms" link
2. `/forms` requires sign-in
3. Can create and fill out a form session
4. Submission persists across server restart
5. "My sessions" shows in-progress and completed sessions
6. Clicking a completed session shows read-only review
