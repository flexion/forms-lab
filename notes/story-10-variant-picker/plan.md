# Story 10 — Variant Picker for Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a user-toggleable variant picker for PDF extraction — including generic infrastructure (registry aliases, preferences service, badge, provenance convention, expanded fixtures) that Stories 11-18 reuse.

**Architecture:** New `variant-preferences` service persists per-user per-task variant choice in SQLite. Extraction call site reads preference from the service and dispatches through the existing extraction registry. Each extraction writes to `forms/<slug>/provenance.json`. A `/settings/variants` page shows one section per task (only `extraction` populated); an inline badge on spec views links to it.

**Tech Stack:** Bun, Hono JSX, SQLite (`bun:sqlite`), existing `StrategyRegistry`, existing `form-project-repo` git gateway, existing AI SDK extractor.

---

## File Structure

### New files

- `src/services/variant-preferences/types.ts` — `Task` union, `VariantPreference`, gateway interface
- `src/services/variant-preferences/sqlite-gateway.ts` — SQLite gateway impl
- `src/services/variant-preferences/service.ts` — validating preference service
- `src/services/variant-preferences/provenance.ts` — append/read provenance helpers
- `src/services/variant-preferences/index.ts` — public API
- `src/entrypoints/app/routes/settings/index.tsx` — picker GET/POST route
- `src/entrypoints/app/routes/settings/components.tsx` — picker page JSX
- `src/design-system/components/flex-variant-badge/index.tsx` — inline badge
- `src/services/forms/filling/registry.ts` — empty stub registry
- `src/services/mapping/registry.ts` — empty stub registry
- `test/variant-preferences/sqlite-gateway.test.ts`
- `test/variant-preferences/service.test.ts`
- `test/variant-preferences/provenance.test.ts`
- `test/design-system/flex-variant-badge.test.tsx`
- `test/entrypoints/settings-variants.test.ts`
- `fixtures/irs-w9/manifest.json`
- `fixtures/irs-w9/w9.pdf` (downloaded)
- `fixtures/uscis-i9/manifest.json`
- `fixtures/uscis-i9/i9.pdf` (downloaded)

### Modified files

- `src/services/strategy-registry.ts` — add `VariantRegistry`, `VariantMetadata` aliases
- `src/services/extraction/registry.ts` — add `catalogPath` for any missing variants (already present; verify)
- `src/entrypoints/app/server.tsx` — wire preferences service, replace direct extractor with registry lookup, mount `/settings`
- `src/services/project-service.ts` — accept `variantId` + `modelId` for extraction, write provenance
- `src/entrypoints/app/routes/owner/components.tsx` — render badge on project overview
- `src/entrypoints/app/routes/owner/edit/` — render badge on edit/review page (file to confirm)
- `fixtures/index.ts` — register new fixtures
- `catalog/experiments/pdf-field-extraction/_suite.md` — mention picker
- `catalog/experiments/pdf-field-extraction/opus-baseline.md` — mention picker
- `catalog/experiments/pdf-field-extraction/sonnet.md` — mention picker
- `catalog/experiments/pdf-field-extraction/haiku.md` — mention picker

---

## Prework: create a worktree

- [ ] **Step P1: Create a worktree for story 10**

```bash
cd /home/daniel/src/forms-lab
git worktree add .worktrees/story-10-variant-picker -b story-10/variant-picker main
cd .worktrees/story-10-variant-picker
```

Expected: new worktree under `.worktrees/story-10-variant-picker` on branch `story-10/variant-picker`.

- [ ] **Step P2: Confirm clean working tree in worktree**

```bash
git status
bun install
bun run check
```

Expected: working tree clean; `bun run check` passes on a fresh main checkout.

All subsequent tasks run from the worktree.

---

## Task 1: Add VariantRegistry/VariantMetadata type aliases

**Files:**
- Modify: `src/services/strategy-registry.ts`

- [ ] **Step 1: Add aliases at end of file**

Edit `src/services/strategy-registry.ts`, append after the `StrategyRegistry` class:

```typescript
// Cross-task-facing aliases. `VariantRegistry` is the name used by the
// variant-preferences service and the settings picker; `StrategyRegistry`
// remains for extraction-specific callers that predate the generalization.
export type VariantMetadata = StrategyMetadata
export type VariantRegistry<T> = StrategyRegistry<T>
export const VariantRegistry = StrategyRegistry
```

- [ ] **Step 2: Run type check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/strategy-registry.ts
git commit -m "feat(variants): add VariantRegistry type aliases over StrategyRegistry"
```

---

## Task 2: Define Task union and variant-preferences types

**Files:**
- Create: `src/services/variant-preferences/types.ts`

- [ ] **Step 1: Write types module**

```typescript
// src/services/variant-preferences/types.ts
export const TASKS = ['extraction', 'shaping', 'filling', 'field-mapping'] as const
export type Task = (typeof TASKS)[number]

export function isTask(value: unknown): value is Task {
  return typeof value === 'string' && (TASKS as readonly string[]).includes(value)
}

export interface VariantPreference {
  userLogin: string
  task: Task
  variantId: string
  updatedAt: number
}

export interface VariantPreferencesGateway {
  get(userLogin: string, task: Task): VariantPreference | null
  set(
    userLogin: string,
    task: Task,
    variantId: string,
  ): VariantPreference
  listByUser(userLogin: string): VariantPreference[]
}
```

- [ ] **Step 2: Type check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/variant-preferences/types.ts
git commit -m "feat(variants): define Task union and VariantPreference types"
```

---

## Task 3: SQLite gateway (TDD)

**Files:**
- Test: `test/variant-preferences/sqlite-gateway.test.ts`
- Create: `src/services/variant-preferences/sqlite-gateway.ts`

- [ ] **Step 1: Write failing test**

```typescript
// test/variant-preferences/sqlite-gateway.test.ts
import { expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createVariantPreferencesGateway } from '../../src/services/variant-preferences/sqlite-gateway'

function createGateway() {
  const dir = mkdtempSync(join(tmpdir(), 'variant-prefs-'))
  return createVariantPreferencesGateway(join(dir, 'test.sqlite'))
}

test('get returns null when no preference is set', () => {
  const gateway = createGateway()
  expect(gateway.get('alice', 'extraction')).toBeNull()
})

test('set stores and get retrieves a preference', () => {
  const gateway = createGateway()
  const stored = gateway.set('alice', 'extraction', 'haiku')
  expect(stored.userLogin).toBe('alice')
  expect(stored.task).toBe('extraction')
  expect(stored.variantId).toBe('haiku')
  expect(gateway.get('alice', 'extraction')?.variantId).toBe('haiku')
})

test('set overwrites an existing preference', () => {
  const gateway = createGateway()
  gateway.set('alice', 'extraction', 'haiku')
  gateway.set('alice', 'extraction', 'opus-baseline')
  expect(gateway.get('alice', 'extraction')?.variantId).toBe('opus-baseline')
})

test('listByUser returns all task preferences for a user', () => {
  const gateway = createGateway()
  gateway.set('alice', 'extraction', 'haiku')
  gateway.set('alice', 'shaping', 'bedrock-sonnet')
  gateway.set('bob', 'extraction', 'opus-baseline')
  const alicePrefs = gateway.listByUser('alice')
  expect(alicePrefs).toHaveLength(2)
  const tasks = alicePrefs.map((p) => p.task).sort()
  expect(tasks).toEqual(['extraction', 'shaping'])
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/variant-preferences/sqlite-gateway.test.ts
```

Expected: FAIL with `Cannot find module ... sqlite-gateway`.

- [ ] **Step 3: Write implementation**

```typescript
// src/services/variant-preferences/sqlite-gateway.ts
import { Database } from 'bun:sqlite'
import {
  isTask,
  type Task,
  type VariantPreference,
  type VariantPreferencesGateway,
} from './types'

export function createVariantPreferencesGateway(
  dbPath: string,
): VariantPreferencesGateway {
  const db = new Database(dbPath)
  db.run('PRAGMA journal_mode = WAL')
  db.run(`
    CREATE TABLE IF NOT EXISTS user_variant_preferences (
      user_login TEXT NOT NULL,
      task TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_login, task)
    )
  `)

  function rowToPreference(row: {
    user_login: string
    task: string
    variant_id: string
    updated_at: number
  }): VariantPreference {
    if (!isTask(row.task)) {
      throw new Error(`Invalid task in DB: ${row.task}`)
    }
    return {
      userLogin: row.user_login,
      task: row.task,
      variantId: row.variant_id,
      updatedAt: row.updated_at,
    }
  }

  return {
    get(userLogin: string, task: Task): VariantPreference | null {
      const row = db
        .query(
          'SELECT user_login, task, variant_id, updated_at FROM user_variant_preferences WHERE user_login = ? AND task = ?',
        )
        .get(userLogin, task) as {
        user_login: string
        task: string
        variant_id: string
        updated_at: number
      } | null
      return row ? rowToPreference(row) : null
    },

    set(userLogin: string, task: Task, variantId: string): VariantPreference {
      const now = Math.floor(Date.now() / 1000)
      db.run(
        `INSERT INTO user_variant_preferences (user_login, task, variant_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_login, task) DO UPDATE SET
           variant_id = excluded.variant_id,
           updated_at = excluded.updated_at`,
        [userLogin, task, variantId, now],
      )
      return {
        userLogin,
        task,
        variantId,
        updatedAt: now,
      }
    },

    listByUser(userLogin: string): VariantPreference[] {
      const rows = db
        .query(
          'SELECT user_login, task, variant_id, updated_at FROM user_variant_preferences WHERE user_login = ?',
        )
        .all(userLogin) as {
        user_login: string
        task: string
        variant_id: string
        updated_at: number
      }[]
      return rows.map(rowToPreference)
    },
  }
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
bun test test/variant-preferences/sqlite-gateway.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/variant-preferences/sqlite-gateway.ts test/variant-preferences/sqlite-gateway.test.ts
git commit -m "feat(variants): add SQLite gateway for per-user variant preferences"
```

---

## Task 4: Preferences service with registry validation (TDD)

**Files:**
- Test: `test/variant-preferences/service.test.ts`
- Create: `src/services/variant-preferences/service.ts`

- [ ] **Step 1: Write failing test**

```typescript
// test/variant-preferences/service.test.ts
import { expect, test } from 'bun:test'
import type {
  Task,
  VariantPreference,
  VariantPreferencesGateway,
} from '../../src/services/variant-preferences/types'
import { createVariantPreferencesService } from '../../src/services/variant-preferences/service'
import { StrategyRegistry } from '../../src/services/strategy-registry'

function inMemoryGateway(): VariantPreferencesGateway {
  const entries = new Map<string, VariantPreference>()
  const key = (user: string, task: Task) => `${user}:${task}`
  return {
    get(user, task) {
      return entries.get(key(user, task)) ?? null
    },
    set(user, task, variantId) {
      const pref: VariantPreference = {
        userLogin: user,
        task,
        variantId,
        updatedAt: 0,
      }
      entries.set(key(user, task), pref)
      return pref
    },
    listByUser(user) {
      return [...entries.values()].filter((p) => p.userLogin === user)
    },
  }
}

function registriesWithExtraction() {
  const extraction = new StrategyRegistry<{ id: string }>()
  extraction.register({
    id: 'opus',
    metadata: {
      name: 'Opus',
      description: '',
      status: 'baseline',
      courseTopics: [],
    },
    create: () => ({ id: 'opus' }),
  })
  extraction.register({
    id: 'sonnet',
    metadata: {
      name: 'Sonnet',
      description: '',
      status: 'production',
      courseTopics: [],
    },
    create: () => ({ id: 'sonnet' }),
  })
  extraction.setDefault('sonnet')
  return {
    extraction,
    shaping: new StrategyRegistry<unknown>(),
    filling: new StrategyRegistry<unknown>(),
    'field-mapping': new StrategyRegistry<unknown>(),
  }
}

test('get returns registry default when no preference set', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  expect(service.get('alice', 'extraction')).toBe('sonnet')
})

test('get returns stored preference when set', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  service.set('alice', 'extraction', 'opus')
  expect(service.get('alice', 'extraction')).toBe('opus')
})

test('set rejects unknown variantId for task', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  expect(() => service.set('alice', 'extraction', 'nonexistent')).toThrow(
    /unknown variant/i,
  )
})

test('list returns per-task defaults when unset, overrides when set', () => {
  const service = createVariantPreferencesService(
    inMemoryGateway(),
    registriesWithExtraction(),
  )
  service.set('alice', 'extraction', 'opus')
  const all = service.list('alice')
  expect(all.extraction).toBe('opus')
  // Empty registries have no default; the service returns null for those.
  expect(all.shaping).toBeNull()
  expect(all.filling).toBeNull()
  expect(all['field-mapping']).toBeNull()
})
```

- [ ] **Step 2: Run test to verify failures**

```bash
bun test test/variant-preferences/service.test.ts
```

Expected: FAIL — `service` module missing.

- [ ] **Step 3: Write implementation**

```typescript
// src/services/variant-preferences/service.ts
import type { VariantRegistry } from '../strategy-registry'
import { TASKS, type Task, type VariantPreferencesGateway } from './types'

export interface VariantPreferencesService {
  get(userLogin: string, task: Task): string | null
  set(userLogin: string, task: Task, variantId: string): void
  list(userLogin: string): Record<Task, string | null>
}

export type TaskRegistries = {
  [K in Task]: VariantRegistry<unknown>
}

export function createVariantPreferencesService(
  gateway: VariantPreferencesGateway,
  registries: TaskRegistries,
): VariantPreferencesService {
  function defaultFor(task: Task): string | null {
    const registry = registries[task]
    if (registry.list().length === 0) return null
    return registry.getDefaultId()
  }

  function ensureVariantExists(task: Task, variantId: string): void {
    const registry = registries[task]
    const ids = registry.list().map((v) => v.id)
    if (!ids.includes(variantId)) {
      throw new Error(
        `Unknown variant '${variantId}' for task '${task}'. Known: ${ids.join(', ') || '(none)'}`,
      )
    }
  }

  return {
    get(userLogin, task) {
      const stored = gateway.get(userLogin, task)
      if (stored) return stored.variantId
      return defaultFor(task)
    },
    set(userLogin, task, variantId) {
      ensureVariantExists(task, variantId)
      gateway.set(userLogin, task, variantId)
    },
    list(userLogin) {
      const stored = new Map(
        gateway.listByUser(userLogin).map((p) => [p.task, p.variantId]),
      )
      const out = {} as Record<Task, string | null>
      for (const task of TASKS) {
        const override = stored.get(task)
        out[task] = override ?? defaultFor(task)
      }
      return out
    },
  }
}
```

- [ ] **Step 4: Run tests**

```bash
bun test test/variant-preferences/service.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/variant-preferences/service.ts test/variant-preferences/service.test.ts
git commit -m "feat(variants): add preferences service with registry validation"
```

---

## Task 5: Stub registries for tasks not yet implemented

**Files:**
- Create: `src/services/forms/filling/registry.ts`
- Create: `src/services/mapping/registry.ts`

- [ ] **Step 1: Create filling stub**

```typescript
// src/services/forms/filling/registry.ts
import { StrategyRegistry } from '../../strategy-registry'

// Placeholder until Story 12 wires up conversational filling variants.
export function createFillingRegistry(): StrategyRegistry<unknown> {
  return new StrategyRegistry<unknown>()
}
```

- [ ] **Step 2: Create mapping stub**

```typescript
// src/services/mapping/registry.ts
import { StrategyRegistry } from '../strategy-registry'

// Placeholder until Story 13 wires up field-mapping variants. Relocated to
// form-documents/ when story 7 lands.
export function createMappingRegistry(): StrategyRegistry<unknown> {
  return new StrategyRegistry<unknown>()
}
```

- [ ] **Step 3: Type check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/forms/filling/registry.ts src/services/mapping/registry.ts
git commit -m "feat(variants): add empty stub registries for filling and field-mapping"
```

---

## Task 6: Provenance helpers (TDD)

**Files:**
- Test: `test/variant-preferences/provenance.test.ts`
- Create: `src/services/variant-preferences/provenance.ts`

- [ ] **Step 1: Write failing test**

```typescript
// test/variant-preferences/provenance.test.ts
import { expect, test } from 'bun:test'
import {
  appendProvenance,
  type ProvenanceFile,
  readProvenance,
} from '../../src/services/variant-preferences/provenance'

test('appendProvenance creates a new file when none exists', () => {
  const next = appendProvenance(null, 'extraction', {
    variantId: 'sonnet',
    modelId: 'claude-sonnet-4',
    timestamp: '2026-04-18T12:00:00Z',
    specVersion: 'abc123',
  })
  expect(next.extraction).toHaveLength(1)
  expect(next.extraction?.[0]?.variantId).toBe('sonnet')
})

test('appendProvenance appends to existing task entries', () => {
  const existing: ProvenanceFile = {
    extraction: [
      {
        variantId: 'sonnet',
        modelId: 'claude-sonnet-4',
        timestamp: '2026-04-18T11:00:00Z',
        specVersion: 'aaa',
      },
    ],
  }
  const next = appendProvenance(existing, 'extraction', {
    variantId: 'haiku',
    modelId: 'claude-haiku-4.5',
    timestamp: '2026-04-18T12:00:00Z',
    specVersion: 'bbb',
  })
  expect(next.extraction).toHaveLength(2)
  expect(next.extraction?.[1]?.variantId).toBe('haiku')
})

test('appendProvenance preserves unrelated task entries', () => {
  const existing: ProvenanceFile = {
    shaping: [
      {
        variantId: 'bedrock-sonnet',
        timestamp: '2026-04-18T10:00:00Z',
      },
    ],
  }
  const next = appendProvenance(existing, 'extraction', {
    variantId: 'haiku',
    timestamp: '2026-04-18T12:00:00Z',
  })
  expect(next.shaping).toHaveLength(1)
  expect(next.extraction).toHaveLength(1)
})

test('readProvenance returns the latest entry for a task', () => {
  const file: ProvenanceFile = {
    extraction: [
      { variantId: 'sonnet', timestamp: '2026-04-18T11:00:00Z' },
      { variantId: 'haiku', timestamp: '2026-04-18T12:00:00Z' },
    ],
  }
  expect(readProvenance(file, 'extraction')?.variantId).toBe('haiku')
})

test('readProvenance returns null when task has no entries', () => {
  expect(readProvenance({}, 'extraction')).toBeNull()
  expect(readProvenance(null, 'extraction')).toBeNull()
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test test/variant-preferences/provenance.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implementation**

```typescript
// src/services/variant-preferences/provenance.ts
import type { Task } from './types'

export interface ProvenanceEntry {
  variantId: string
  modelId?: string
  timestamp: string
  specVersion?: string
}

export type ProvenanceFile = Partial<Record<Task, ProvenanceEntry[]>>

export function appendProvenance(
  existing: ProvenanceFile | null,
  task: Task,
  entry: ProvenanceEntry,
): ProvenanceFile {
  const base: ProvenanceFile = existing ? { ...existing } : {}
  const prior = base[task] ?? []
  base[task] = [...prior, entry]
  return base
}

export function readProvenance(
  file: ProvenanceFile | null,
  task: Task,
): ProvenanceEntry | null {
  if (!file) return null
  const entries = file[task]
  if (!entries || entries.length === 0) return null
  return entries[entries.length - 1] ?? null
}
```

- [ ] **Step 4: Run tests**

```bash
bun test test/variant-preferences/provenance.test.ts
```

Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/variant-preferences/provenance.ts test/variant-preferences/provenance.test.ts
git commit -m "feat(variants): add provenance append/read helpers"
```

---

## Task 7: Public API index

**Files:**
- Create: `src/services/variant-preferences/index.ts`

- [ ] **Step 1: Export public surface**

```typescript
// src/services/variant-preferences/index.ts
export {
  appendProvenance,
  readProvenance,
  type ProvenanceEntry,
  type ProvenanceFile,
} from './provenance'
export {
  createVariantPreferencesService,
  type TaskRegistries,
  type VariantPreferencesService,
} from './service'
export { createVariantPreferencesGateway } from './sqlite-gateway'
export {
  isTask,
  TASKS,
  type Task,
  type VariantPreference,
  type VariantPreferencesGateway,
} from './types'
```

- [ ] **Step 2: Type check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/variant-preferences/index.ts
git commit -m "feat(variants): expose variant-preferences public API"
```

---

## Task 8: Variant badge component (TDD)

**Files:**
- Test: `test/design-system/flex-variant-badge.test.tsx`
- Create: `src/design-system/components/flex-variant-badge/index.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// test/design-system/flex-variant-badge.test.tsx
import { expect, test } from 'bun:test'
import { VariantBadge } from '../../src/design-system/components/flex-variant-badge'

async function render(element: unknown): Promise<string> {
  // Hono JSX returns string promises for async components; sync components
  // return strings directly. Await handles both.
  return String(await element)
}

test('extraction badge uses "Extracted by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'extraction',
      variantId: 'sonnet',
      variantName: 'Claude Sonnet 4',
    }),
  )
  expect(html).toContain('Extracted by')
  expect(html).toContain('Claude Sonnet 4')
  expect(html).toContain('/settings/variants?task=extraction')
})

test('shaping badge uses "Shaped by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'shaping',
      variantId: 'bedrock-sonnet',
      variantName: 'Sonnet (Bedrock)',
    }),
  )
  expect(html).toContain('Shaped by')
})

test('filling badge uses "Guided by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'filling',
      variantId: 'x',
      variantName: 'X',
    }),
  )
  expect(html).toContain('Guided by')
})

test('field-mapping badge uses "Mapped by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'field-mapping',
      variantId: 'x',
      variantName: 'X',
    }),
  )
  expect(html).toContain('Mapped by')
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test test/design-system/flex-variant-badge.test.tsx
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implementation**

```typescript
// src/design-system/components/flex-variant-badge/index.tsx
import type { FC } from 'hono/jsx'
import type { Task } from '../../../services/variant-preferences/types'
import { resolveUrl } from '../../../shared/base-path'

interface VariantBadgeProps {
  task: Task
  variantId: string
  variantName: string
}

const VERB_BY_TASK: Record<Task, string> = {
  extraction: 'Extracted by',
  shaping: 'Shaped by',
  filling: 'Guided by',
  'field-mapping': 'Mapped by',
}

export const VariantBadge: FC<VariantBadgeProps> = ({
  task,
  variantName,
}) => {
  const verb = VERB_BY_TASK[task]
  const href = resolveUrl(`/settings/variants?task=${task}`)
  return (
    <span class="variant-badge" data-task={task}>
      {verb} <strong>{variantName}</strong> ·{' '}
      <a href={href}>change →</a>
    </span>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
bun test test/design-system/flex-variant-badge.test.tsx
```

Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-variant-badge/index.tsx test/design-system/flex-variant-badge.test.tsx
git commit -m "feat(variants): add flex-variant-badge component"
```

---

## Task 9: Settings picker route (TDD)

**Files:**
- Create: `src/entrypoints/app/routes/settings/components.tsx`
- Create: `src/entrypoints/app/routes/settings/index.tsx`
- Test: `test/entrypoints/settings-variants.test.ts`

- [ ] **Step 1: Write the page component**

```typescript
// src/entrypoints/app/routes/settings/components.tsx
import type { FC } from 'hono/jsx'
import type { VariantRegistry } from '../../../services/strategy-registry'
import { TASKS, type Task } from '../../../services/variant-preferences/types'
import { resolveUrl } from '../../../shared/base-path'

const TASK_LABELS: Record<Task, string> = {
  extraction: 'Extraction',
  shaping: 'Shaping',
  filling: 'Conversational filling',
  'field-mapping': 'Field mapping',
}

interface VariantPickerPageProps {
  registries: Record<Task, VariantRegistry<unknown>>
  selections: Record<Task, string | null>
  highlightTask?: Task
  saved?: boolean
}

export const VariantPickerPage: FC<VariantPickerPageProps> = ({
  registries,
  selections,
  highlightTask,
  saved,
}) => {
  const action = resolveUrl('/settings/variants')
  return (
    <div class="variant-picker">
      <h1>Variants</h1>
      <p>
        Choose which LLM variant runs each task. Each variant has its own
        evaluation in the catalog.
      </p>
      {saved ? (
        <div class="alert alert-success" role="status">
          Preferences saved.
        </div>
      ) : null}
      <form method="POST" action={action}>
        {TASKS.map((task) => {
          const variants = registries[task].list()
          const current = selections[task]
          const highlight = highlightTask === task
          return (
            <section
              key={task}
              id={`task-${task}`}
              class={highlight ? 'task-section task-section--highlight' : 'task-section'}
            >
              <h2>{TASK_LABELS[task]}</h2>
              {variants.length === 0 ? (
                <p class="task-section__empty">
                  No variants yet — added in a later story.
                </p>
              ) : (
                <ul class="variant-list">
                  {variants.map((variant) => (
                    <li key={variant.id} class="variant-option">
                      <label>
                        <input
                          type="radio"
                          name={`variant__${task}`}
                          value={variant.id}
                          checked={current === variant.id}
                        />
                        <strong>{variant.metadata.name}</strong> —{' '}
                        {variant.metadata.description}
                        {variant.metadata.catalogPath ? (
                          <>
                            {' · '}
                            <a href={resolveUrl(variant.metadata.catalogPath)}>
                              Learn more →
                            </a>
                          </>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
        <button type="submit">Save changes</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write the route module**

```typescript
// src/entrypoints/app/routes/settings/index.tsx
import { Hono } from 'hono'
import { Layout } from '../../../design-system/components/flex-layout'
import type { VariantRegistry } from '../../../services/strategy-registry'
import type { VariantPreferencesService } from '../../../services/variant-preferences'
import { isTask, TASKS, type Task } from '../../../services/variant-preferences/types'
import { resolveUrl } from '../../../shared/base-path'
import { requireAuth } from '../../middleware/auth'
import { VariantPickerPage } from './components'

export interface SettingsRoutesDeps {
  preferences: VariantPreferencesService
  registries: Record<Task, VariantRegistry<unknown>>
}

export function createSettingsRoutes(deps: SettingsRoutesDeps) {
  const app = new Hono()
  app.use('*', requireAuth())

  app.get('/variants', (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))
    const highlight = c.req.query('task')
    const saved = c.req.query('saved') === '1'
    const selections = deps.preferences.list(user.login)
    return c.html(
      <Layout currentPath="/settings/variants" user={user}>
        <VariantPickerPage
          registries={deps.registries}
          selections={selections}
          highlightTask={isTask(highlight) ? highlight : undefined}
          saved={saved}
        />
      </Layout>,
    )
  })

  app.post('/variants', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))
    const body = await c.req.parseBody()
    for (const task of TASKS) {
      const raw = body[`variant__${task}`]
      if (typeof raw !== 'string' || raw.length === 0) continue
      const ids = deps.registries[task].list().map((v) => v.id)
      if (!ids.includes(raw)) continue
      deps.preferences.set(user.login, task, raw)
    }
    return c.redirect(resolveUrl('/settings/variants?saved=1'))
  })

  return app
}
```

- [ ] **Step 3: Write failing integration test**

```typescript
// test/entrypoints/settings-variants.test.ts
import { expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { StrategyRegistry } from '../../src/services/strategy-registry'
import { createVariantPreferencesGateway } from '../../src/services/variant-preferences/sqlite-gateway'
import { createVariantPreferencesService } from '../../src/services/variant-preferences/service'
import type { Task } from '../../src/services/variant-preferences/types'
import { createSettingsRoutes } from '../../src/entrypoints/app/routes/settings/index'
import { sessionReader } from '../../src/entrypoints/app/middleware/auth'
import {
  COOKIE_NAME,
  encryptSession,
} from '../../src/services/auth/session'

const SESSION_SECRET = 'test-secret-test-secret-test-secret'

function buildRegistries(): Record<Task, StrategyRegistry<unknown>> {
  const extraction = new StrategyRegistry<unknown>()
  extraction.register({
    id: 'sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description: 'default',
      status: 'production',
      courseTopics: [],
      catalogPath: '/catalog/experiments/pdf-field-extraction/sonnet',
    },
    create: () => ({}),
  })
  extraction.register({
    id: 'haiku',
    metadata: {
      name: 'Claude Haiku 4.5',
      description: 'fast',
      status: 'experimental',
      courseTopics: [],
    },
    create: () => ({}),
  })
  extraction.setDefault('sonnet')
  return {
    extraction,
    shaping: new StrategyRegistry<unknown>(),
    filling: new StrategyRegistry<unknown>(),
    'field-mapping': new StrategyRegistry<unknown>(),
  }
}

function buildApp() {
  process.env.SESSION_SECRET = SESSION_SECRET
  const dir = mkdtempSync(join(tmpdir(), 'settings-variants-'))
  const gateway = createVariantPreferencesGateway(join(dir, 'prefs.sqlite'))
  const registries = buildRegistries()
  const preferences = createVariantPreferencesService(gateway, registries)

  const app = new Hono()
  app.use('*', sessionReader())
  app.route('/settings', createSettingsRoutes({ preferences, registries }))
  return { app, preferences }
}

async function signedInHeaders(login: string): Promise<Headers> {
  const cookie = await encryptSession(
    { login, name: 'Test', avatarUrl: '' },
    SESSION_SECRET,
  )
  return new Headers({ Cookie: `${COOKIE_NAME}=${cookie}` })
}

test('GET /settings/variants redirects unauthenticated users to signin', async () => {
  const { app } = buildApp()
  const res = await app.request('/settings/variants')
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toContain('/auth/signin')
})

test('GET /settings/variants renders extraction section for authed user', async () => {
  const { app } = buildApp()
  const res = await app.request('/settings/variants', {
    headers: await signedInHeaders('alice'),
  })
  expect(res.status).toBe(200)
  const html = await res.text()
  expect(html).toContain('Extraction')
  expect(html).toContain('Claude Sonnet 4')
  expect(html).toContain('Claude Haiku 4.5')
  // The "Learn more" link uses the sonnet variant's catalogPath.
  expect(html).toContain('/catalog/experiments/pdf-field-extraction/sonnet')
  // Empty tabs render placeholder copy.
  expect(html).toContain('No variants yet')
})

test('POST /settings/variants persists valid selection', async () => {
  const { app, preferences } = buildApp()
  const body = new URLSearchParams({ variant__extraction: 'haiku' })
  const res = await app.request('/settings/variants', {
    method: 'POST',
    body,
    headers: {
      ...Object.fromEntries((await signedInHeaders('alice')).entries()),
      'content-type': 'application/x-www-form-urlencoded',
    },
  })
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toContain('/settings/variants?saved=1')
  expect(preferences.get('alice', 'extraction')).toBe('haiku')
})

test('POST /settings/variants ignores unknown variantId', async () => {
  const { app, preferences } = buildApp()
  const body = new URLSearchParams({ variant__extraction: 'bogus' })
  const res = await app.request('/settings/variants', {
    method: 'POST',
    body,
    headers: {
      ...Object.fromEntries((await signedInHeaders('alice')).entries()),
      'content-type': 'application/x-www-form-urlencoded',
    },
  })
  expect(res.status).toBe(302)
  // No preference stored; default still applies.
  expect(preferences.get('alice', 'extraction')).toBe('sonnet')
})
```

- [ ] **Step 4: Run tests**

```bash
bun test test/entrypoints/settings-variants.test.ts
```

Expected: 4 pass. If `encryptSession` import path differs, inspect `src/services/auth/session.ts` and fix.

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/routes/settings/ test/entrypoints/settings-variants.test.ts
git commit -m "feat(variants): add settings picker route for per-task variant selection"
```

---

## Task 10: Wire preferences + picker into server

**Files:**
- Modify: `src/entrypoints/app/server.tsx`

- [ ] **Step 1: Wire the preferences service**

Read existing imports in `src/entrypoints/app/server.tsx`, then add:

```typescript
// imports
import { createExtractorRegistry } from '../../services/extraction/registry'
import { createFillingRegistry } from '../../services/forms/filling/registry'
import { createMappingRegistry } from '../../services/mapping/registry'
import {
  createVariantPreferencesGateway,
  createVariantPreferencesService,
} from '../../services/variant-preferences'
import type { Task } from '../../services/variant-preferences/types'
import type { VariantRegistry } from '../../services/strategy-registry'
import { createSettingsRoutes } from './routes/settings/index'
```

After `createCachedPdfExtractor(...)` construction, replace the single-extractor wiring with registry-driven:

```typescript
// Registries per task
const extractionRegistry = createExtractorRegistry()
const shapingRegistry = createShapingRegistry()
const fillingRegistry = createFillingRegistry()
const mappingRegistry = createMappingRegistry()
const registries: Record<Task, VariantRegistry<unknown>> = {
  extraction: extractionRegistry as unknown as VariantRegistry<unknown>,
  shaping: shapingRegistry as unknown as VariantRegistry<unknown>,
  filling: fillingRegistry,
  'field-mapping': mappingRegistry,
}

// Variant preferences
const variantPrefsGateway = createVariantPreferencesGateway(projectDbPath)
const variantPreferences = createVariantPreferencesService(
  variantPrefsGateway,
  registries,
)
```

- [ ] **Step 2: Mount settings routes**

After the auth route mount in `server.tsx`, add:

```typescript
app.route(
  '/settings',
  createSettingsRoutes({ preferences: variantPreferences, registries }),
)
```

- [ ] **Step 3: Pass preferences and registry into project service**

Project service takes a single extractor today (`createProjectService(projectStore, formProjectRepo, extractor)`). Extend its signature to receive an **extractor resolver** that can look up a concrete extractor by variantId, plus a provenance writer. Update `createProjectService` signature in `src/services/project-service.ts`:

```typescript
export interface ExtractionContext {
  resolveExtractor(variantId: string): PdfExtractor
  resolveVariant(userLogin: string): { variantId: string; modelId?: string }
}

export function createProjectService(
  store: ProjectStore,
  repo: FormProjectRepo,
  extraction: ExtractionContext,
): ProjectService { ... }
```

This is a breaking signature change; Task 11 wires it. For this step, only the server-side construction wire-up is prepared — leave `createProjectService` untouched until Task 11.

*(Hold this step until Task 11; the detailed edits happen there. Skip this step during Task 10 and return to server wiring in Task 11 Step 4.)*

- [ ] **Step 4: Type check and run smoke tests**

```bash
bun run --no-warnings tsc --noEmit
bun test test/entrypoints/settings-variants.test.ts
```

Expected: type check passes; picker integration tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/server.tsx
git commit -m "feat(variants): wire registries, preferences, and settings routes into server"
```

---

## Task 11: Project service accepts variant + writes provenance

**Files:**
- Modify: `src/services/project-service.ts`
- Modify: `src/entrypoints/app/server.tsx`
- Modify: `src/entrypoints/app/routes/owner/index.tsx` (retry-extraction handler, if present)

- [ ] **Step 1: Update project-service signature to take an ExtractionContext**

Read `src/services/project-service.ts` to find the current `createProjectService` signature and extraction call sites (search for `extractor.extract(`).

Replace the third parameter with an `ExtractionContext`:

```typescript
import type {
  ProvenanceEntry,
  ProvenanceFile,
} from './variant-preferences/provenance'
import {
  appendProvenance,
  readProvenance,
} from './variant-preferences/provenance'
import type { Task } from './variant-preferences/types'
import type { PdfExtractor } from './ingestion/pdf-extractor'

export interface ExtractionContext {
  resolveExtractor(variantId: string): PdfExtractor
  resolveVariant(userLogin: string): { variantId: string; modelId?: string }
}

export function createProjectService(
  store: ProjectStore,
  repo: FormProjectRepo,
  extraction: ExtractionContext,
): ProjectService { /* body, see below */ }
```

Inside `fireAndForgetExtraction`, resolve the extractor per-call and append provenance after the commit:

```typescript
function fireAndForgetExtraction(
  projectId: string,
  slug: string,
  pdf: Buffer,
  author: string,
): void {
  const { variantId, modelId } = extraction.resolveVariant(author)
  const extractor = extraction.resolveExtractor(variantId)
  extractor
    .extract(pdf)
    .then(async (result) => {
      const branches = await repo.listBranches(slug)
      if (!branches.some((b) => b.name === 'import')) {
        await repo.createBranch(slug, 'import', 'main')
      }
      const sha = await repo.commit(
        slug,
        [
          { path: 'forms/default/spec.json',
            content: Buffer.from(JSON.stringify(result.spec, null, 2)) },
          { path: 'forms/default/form.json',
            content: Buffer.from(JSON.stringify(result.formSpec, null, 2)) },
          { path: 'forms/default/confidence.json',
            content: Buffer.from(JSON.stringify(result.confidence, null, 2)) },
        ],
        'Extract form specifications',
        author,
        { branch: 'import' },
      )
      await writeProvenance(slug, 'extraction', {
        variantId,
        modelId,
        timestamp: new Date().toISOString(),
        specVersion: sha,
      }, author)
      store.update(projectId, { status: 'ready' })
    })
    .catch((err) => {
      store.update(projectId, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    })
}

async function writeProvenance(
  slug: string,
  task: Task,
  entry: ProvenanceEntry,
  author: string,
): Promise<void> {
  const existingBuf = await repo.readFile(
    slug,
    'import',
    'forms/default/provenance.json',
  )
  const existing = existingBuf
    ? (JSON.parse(existingBuf.toString()) as ProvenanceFile)
    : null
  const next = appendProvenance(existing, task, entry)
  await repo.commit(
    slug,
    [
      {
        path: 'forms/default/provenance.json',
        content: Buffer.from(JSON.stringify(next, null, 2)),
      },
    ],
    'Record extraction provenance',
    author,
    { branch: 'import' },
  )
}
```

Also expose provenance read from the service so later tasks can display the badge:

```typescript
export interface ProjectService {
  // ... existing ...
  getProvenance(
    owner: string,
    slug: string,
    task: Task,
    branch?: string,
  ): Promise<ProvenanceEntry | null>
}

// inside createProjectService's return:
async getProvenance(owner, slug, task, branch = 'main') {
  resolveProject(owner, slug)
  const buf = await repo.readFile(slug, branch, 'forms/default/provenance.json')
  if (!buf) return null
  const file = JSON.parse(buf.toString()) as ProvenanceFile
  return readProvenance(file, task)
},
```

- [ ] **Step 2: Apply retry path**

`retryExtraction` also needs the variant. Change its body to resolve variant per call (same as above), passing through `user.login`.

- [ ] **Step 3: Update server.tsx construction to pass ExtractionContext**

In `src/entrypoints/app/server.tsx`, replace the current `createProjectService` call:

```typescript
const projectService = createProjectService(projectStore, formProjectRepo, {
  resolveExtractor(variantId) {
    const inner = extractionRegistry.get(variantId)
    return createCachedPdfExtractor(inner, cacheStore)
  },
  resolveVariant(userLogin) {
    const variantId = variantPreferences.get(userLogin, 'extraction')
      ?? extractionRegistry.getDefaultId()
    const meta = extractionRegistry
      .list()
      .find((v) => v.id === variantId)
    return { variantId, modelId: meta?.metadata.modelId }
  },
})
```

Also delete the previous top-level `extractor` variable — it's replaced by the context.

- [ ] **Step 4: Adjust imports**

The new code uses the registry-based extractor. Remove the old:

```typescript
// REMOVE
import {
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from '../../services/pdf-extractor'
```

Replace with:

```typescript
import { createCachedPdfExtractor } from '../../services/ingestion/pdf-extractor'
```

If `src/services/pdf-extractor.ts` is now unused, check for other consumers (`grep -rn "from '.*/services/pdf-extractor'" src test`). If none, delete `src/services/pdf-extractor.ts` in Task 12.

- [ ] **Step 5: Type check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors. Fix any call sites in tests or other entrypoints that still rely on the old extractor shape.

- [ ] **Step 6: Run full test suite**

```bash
bun test
```

Expected: all tests pass. Update any existing project-service tests that stub the old third argument — replace with a minimal `ExtractionContext` fake.

- [ ] **Step 7: Commit**

```bash
git add src/services/project-service.ts src/entrypoints/app/server.tsx test/
git commit -m "feat(variants): route extraction through registry, record provenance per project"
```

---

## Task 12: Remove dead pdf-extractor module (if unused)

**Files:**
- Possibly delete: `src/services/pdf-extractor.ts`

- [ ] **Step 1: Search for references**

```bash
grep -rn "services/pdf-extractor" src test scripts
```

Expected: zero matches after Task 11.

- [ ] **Step 2: Delete if safe**

If zero matches:

```bash
git rm src/services/pdf-extractor.ts
```

Otherwise, leave file and move on.

- [ ] **Step 3: Type check + tests**

```bash
bun run check
```

Expected: pass.

- [ ] **Step 4: Commit (only if file deleted)**

```bash
git commit -m "chore(extraction): drop unused legacy pdf-extractor module"
```

---

## Task 13: Render badge on project overview

**Files:**
- Modify: `src/entrypoints/app/routes/owner/index.tsx`
- Modify: `src/entrypoints/app/routes/owner/components.tsx`

- [ ] **Step 1: Inspect current overview rendering**

Open `src/entrypoints/app/routes/owner/index.tsx` and find the handler that serves a project overview. Identify where `ProjectView` data is rendered (likely `OverviewPage` in `components.tsx`).

Inside the handler, after `projectService.getProject(...)`, fetch provenance:

```typescript
const extractionProvenance = await projectService.getProvenance(
  owner,
  slug,
  'extraction',
  branch ?? 'main',
)
```

Pass `extractionProvenance` and the extraction registry's variant name into the page component.

- [ ] **Step 2: Render badge in the overview component**

In `components.tsx`, near the top of the project spec display, render:

```typescript
import { VariantBadge } from '../../../design-system/components/flex-variant-badge'

// inside the overview JSX, when spec is present and extractionProvenance exists:
{extractionProvenance ? (
  <VariantBadge
    task="extraction"
    variantId={extractionProvenance.variantId}
    variantName={variantNameByExtractionId[extractionProvenance.variantId] ?? extractionProvenance.variantId}
  />
) : null}
```

Caller builds `variantNameByExtractionId` from `extractionRegistry.list()` in `server.tsx` and passes it to the route handler — simplest is to pass the registry itself through `createOwnerRoutes`, resolving the name at render time. Pick whichever conflicts least with existing patterns.

- [ ] **Step 3: Type check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run existing owner tests**

```bash
bun test test/entrypoints
```

Expected: all pass; if any test asserts exact overview markup, update the assertion to allow the badge.

- [ ] **Step 5: Manual smoke**

```bash
bun run dev
```

Open the app, sign in, upload a fixture PDF, confirm the badge appears once extraction completes.

Report result: badge visible or not.

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/routes/owner/
git commit -m "feat(variants): render variant badge on project overview"
```

---

## Task 14: Add I-9 fixture

**Files:**
- Create: `fixtures/uscis-i9/i9.pdf` (downloaded)
- Create: `fixtures/uscis-i9/manifest.json`
- Modify: `fixtures/index.ts`

- [ ] **Step 1: Download the PDF**

```bash
curl -L -o fixtures/uscis-i9/i9.pdf https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf
```

If the URL has changed, search for "USCIS Form I-9 PDF" and substitute the current canonical URL. Verify the file is a valid PDF:

```bash
file fixtures/uscis-i9/i9.pdf
```

Expected output contains "PDF document".

**Human checkpoint:** confirm the downloaded PDF has AcroForm fields (no interactive fields would defeat Story 13 later). `pdftotext fixtures/uscis-i9/i9.pdf - | head -20` should show form text. If the PDF is scanned or flattened, swap in SSA Form SS-5 from https://www.ssa.gov/forms/ss-5.pdf.

- [ ] **Step 2: Write manifest**

```json
{
  "slug": "uscis-i9",
  "name": "USCIS Form I-9 — Employment Eligibility Verification",
  "pdfPath": "fixtures/uscis-i9/i9.pdf",
  "specVersion": "0",
  "reviewed": false,
  "notes": "Downloaded from uscis.gov. Ground truth pending generation via Opus."
}
```

Save to `fixtures/uscis-i9/manifest.json`.

- [ ] **Step 3: Register in fixtures index**

Read `fixtures/index.ts`, add the new fixture to whichever list powers `demoFixtures`, `getFixture`, and `loadAllFixturesForEvaluation`. Follow the pattern the existing `pardon-application` fixture uses.

- [ ] **Step 4: Validate**

```bash
bun run cli evaluate validate
```

Expected: fixture listed; warning about "not reviewed" is fine at this stage.

- [ ] **Step 5: Commit**

```bash
git add fixtures/uscis-i9/ fixtures/index.ts
git commit -m "feat(fixtures): add USCIS I-9 fixture"
```

---

## Task 15: Add W-9 fixture

**Files:**
- Create: `fixtures/irs-w9/w9.pdf` (downloaded)
- Create: `fixtures/irs-w9/manifest.json`
- Modify: `fixtures/index.ts`

Same pattern as Task 14.

- [ ] **Step 1: Download**

```bash
curl -L -o fixtures/irs-w9/w9.pdf https://www.irs.gov/pub/irs-pdf/fw9.pdf
file fixtures/irs-w9/w9.pdf
```

- [ ] **Step 2: Manifest**

```json
{
  "slug": "irs-w9",
  "name": "IRS Form W-9 — Request for Taxpayer Identification",
  "pdfPath": "fixtures/irs-w9/w9.pdf",
  "specVersion": "0",
  "reviewed": false,
  "notes": "Downloaded from irs.gov. Ground truth pending generation via Opus."
}
```

- [ ] **Step 3: Register and validate**

Update `fixtures/index.ts`, then:

```bash
bun run cli evaluate validate
```

- [ ] **Step 4: Commit**

```bash
git add fixtures/irs-w9/ fixtures/index.ts
git commit -m "feat(fixtures): add IRS W-9 fixture"
```

---

## Task 16: Generate and review ground truth for new fixtures

**Human checkpoint:** this task consumes Bedrock Opus calls (cost + time). Confirm with the user before running.

**Files:**
- Create: `fixtures/uscis-i9/ground-truth.json`
- Create: `fixtures/irs-w9/ground-truth.json`

- [ ] **Step 1: Prompt user for approval**

Ask: "Running ground truth generation via Opus for I-9 and W-9. Estimated cost ~$2-4 total, ~5 minutes. Proceed?"

Wait for approval.

- [ ] **Step 2: Generate**

```bash
bun run cli evaluate ground-truth uscis-i9
bun run cli evaluate ground-truth irs-w9
```

Expected: both write `ground-truth.json` and mark manifests with `groundTruthModel: "opus-baseline"`, `reviewed: false`.

- [ ] **Step 3: Review each ground-truth file**

Open each `ground-truth.json`. Spot-check: do the field names look reasonable? Any fields obviously missing that a human would expect? If yes, flag back to the user. If reasonable, set `"reviewed": true` in each manifest.

- [ ] **Step 4: Re-validate**

```bash
bun run cli evaluate validate
```

Expected: no "not reviewed" warnings.

- [ ] **Step 5: Commit**

```bash
git add fixtures/uscis-i9/ground-truth.json fixtures/uscis-i9/manifest.json fixtures/irs-w9/ground-truth.json fixtures/irs-w9/manifest.json
git commit -m "feat(fixtures): add Opus-generated ground truth for I-9 and W-9"
```

---

## Task 17: Re-run extraction evaluation across the expanded fixture set

**Human checkpoint:** this task consumes Bedrock calls across three models. Confirm before running.

**Files:**
- Modify: `catalog/experiments/pdf-field-extraction/opus-baseline.{md,json}`
- Modify: `catalog/experiments/pdf-field-extraction/sonnet.{md,json}`
- Modify: `catalog/experiments/pdf-field-extraction/haiku.{md,json}`

- [ ] **Step 1: Prompt user**

Ask: "Re-running `evaluate compare` against the expanded fixture set for Opus/Sonnet/Haiku. Cost ~$5-10, ~10 minutes. Proceed?"

- [ ] **Step 2: Run**

```bash
bun run cli evaluate compare
```

Expected: markdown and JSON under `catalog/experiments/pdf-field-extraction/` updated with new summary metrics.

- [ ] **Step 3: Commit**

```bash
git add catalog/experiments/pdf-field-extraction/
git commit -m "chore(catalog): refresh extraction variant metrics with expanded fixtures"
```

---

## Task 18: Link catalog pages to the picker

**Files:**
- Modify: `catalog/experiments/pdf-field-extraction/_suite.md`
- Modify: `catalog/experiments/pdf-field-extraction/opus-baseline.md`
- Modify: `catalog/experiments/pdf-field-extraction/sonnet.md`
- Modify: `catalog/experiments/pdf-field-extraction/haiku.md`

- [ ] **Step 1: Add "Available via picker" paragraph to `_suite.md`**

Append after the variants table:

```markdown
## Available via the picker

Each variant listed above is user-selectable per account at
[/settings/variants?task=extraction](/settings/variants?task=extraction). The
selected variant runs on every new extraction; provenance is recorded in the
project repo at `forms/default/provenance.json`.
```

- [ ] **Step 2: Add a one-liner to each variant page**

At the top of each of `opus-baseline.md`, `sonnet.md`, `haiku.md`, below the frontmatter and title, insert:

```markdown
> Selectable in **Settings → Variants → Extraction**.
```

- [ ] **Step 3: Commit**

```bash
git add catalog/experiments/pdf-field-extraction/
git commit -m "docs(catalog): link extraction variant pages to the settings picker"
```

---

## Task 19: End-to-end manual verification

- [ ] **Step 1: Run full check**

```bash
bun run check
```

Expected: lint + type check + tests all pass.

- [ ] **Step 2: Dev server smoke**

```bash
bun run dev
```

- [ ] **Step 3: Walk through the flow**

1. Sign in as a test user.
2. Visit `/settings/variants` — see Extraction section with 3 variants, other sections empty with "No variants yet".
3. Select Haiku, click Save — green flash appears.
4. Upload a fixture PDF at `/new`.
5. Once extraction completes, confirm the project overview shows a badge: "Extracted by Claude Haiku 4.5 · change →".
6. Click "change" — lands on the picker with Extraction section focused.
7. Inspect `data/repos/<slug>/` via a git command:
   ```bash
   git --git-dir=data/repos/<slug>.git show import:forms/default/provenance.json
   ```
   Expect a single extraction entry with `variantId: "haiku"`.
8. Change preference to Opus, re-upload the same fixture (or a different one). Badge reflects Opus, provenance.json has two entries.

- [ ] **Step 4: Report**

If anything in steps 1-8 fails, mark the story blocked with the specific failure for debugging. Otherwise report "Story 10 acceptance criteria met."

---

## Task 20: Open draft PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin story-10/variant-picker
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --draft --base main --title "Story 10: Maya chooses how her form was extracted" --body "$(cat <<'EOF'
## Summary

Trunk of the experiment roadmap. Delivers a user-toggleable variant picker for PDF extraction, plus the reusable infrastructure every subsequent experiment story (11–18) reuses:

- Generic `VariantRegistry` aliases over `StrategyRegistry`
- `variant-preferences` service (per-user, per-task, SQLite-backed)
- `/settings/variants` picker page (only extraction populated; other tasks show placeholders)
- `flex-variant-badge` component with per-task verbs
- `forms/<slug>/provenance.json` convention
- Fixture expansion: USCIS I-9, IRS W-9, with Opus-generated ground truth
- Refreshed extraction-variant metrics across the expanded fixture set

## Changes

- `src/services/variant-preferences/` — new service
- `src/services/strategy-registry.ts` — `VariantRegistry` aliases
- `src/services/forms/filling/registry.ts`, `src/services/mapping/registry.ts` — empty stubs
- `src/services/project-service.ts` — accepts `ExtractionContext`, writes provenance
- `src/entrypoints/app/server.tsx` — wires registries, preferences, settings routes
- `src/entrypoints/app/routes/settings/` — picker route
- `src/design-system/components/flex-variant-badge/` — inline badge
- `fixtures/uscis-i9/`, `fixtures/irs-w9/` — new fixtures + ground truth
- `catalog/experiments/pdf-field-extraction/` — refreshed metrics + picker links

## Test plan

- [x] `bun run check` passes
- [x] Unit tests: preferences gateway, service, provenance helpers, badge component
- [x] Integration test: picker round-trip
- [x] Manual: upload PDF under Haiku, verify badge and provenance.json
- [x] Manual: switch to Opus, re-upload, verify provenance entries accumulate

## Roadmap context

See `notes/experiment-roadmap.md` and `notes/story-10-variant-picker/design.md`.

Blocks: Stories 11, 12, 13, 14, 15, 16, 17, 18.
EOF
)"
```

- [ ] **Step 3: Report PR URL to user**

Capture the PR URL from the command output and report back. Do not mark the PR ready for review automatically.

---

## Self-review

**Spec coverage check:**
- Generic VariantRegistry — Task 1 ✓
- variant-preferences service — Tasks 2, 3, 4 ✓
- Task union — Task 2 ✓
- `/settings/variants` picker — Task 9 ✓
- Badge component — Task 8 ✓
- Badge rendered on spec views — Task 13 ✓
- Provenance file convention — Task 6, 11 ✓
- Extraction call-site wiring — Tasks 10, 11 ✓
- Fixture expansion — Tasks 14, 15 ✓
- Ground truth generation — Task 16 ✓
- Catalog updates — Tasks 17, 18 ✓
- Manual verification — Task 19 ✓
- PR — Task 20 ✓

**Placeholder scan:** one "placeholder" reference is in Task 10 Step 3 ("Hold this step until Task 11") — this is intentional structural sequencing, not a missing instruction. All other steps have concrete commands and code.

**Type consistency:** `ExtractionContext.resolveVariant` returns `{ variantId, modelId }`, consumed in the same shape by the project-service. `VariantBadgeProps` fields match exactly across component and call sites. `ProvenanceFile` type name consistent across provenance helpers, project-service, and tests.

**One follow-up flagged:** Task 13 needs to read current `src/entrypoints/app/routes/owner/components.tsx` to find the exact insertion point for the badge. The plan says so. If during execution the overview component structure doesn't match expectations, the subagent should report back rather than guess.
