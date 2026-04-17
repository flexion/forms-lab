# Direct edit UI for form shaping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct-manipulation UI for the 25 shaping commands alongside the existing chat assistant; both share one staged-buffer/Save mental model.

**Architecture:** Replace the read-only preview iframe with new web components (`flex-editable-page`, `flex-editable-field`, `flex-editable-group`, `flex-staged-changes`). The editor (`flex-form-editor`) holds an in-memory `Command[]` buffer; every UI affordance dispatches `formeditor:stage-command` to append to it. The editor reuses the existing pure `executeBatch` to project state for rendering. A new `POST /:owner/:slug/edit/save` is the single commit path; the chat assistant's Accept button stages instead of committing.

**Tech Stack:** Bun runtime, Hono server, native web components (no framework), TypeScript strict, Bun's test runner, Biome lint/format.

**Spec:** `notes/2026-04-16-direct-edit-ui-design.md` — read this first for context on decisions.

**Branch:** `story-4/direct-edit-ui` (worktree at `.worktrees/story-4-direct-edit-ui`).

---

## Phase 1 — Save endpoint and editor buffer foundation

Goal: a working save path with no UI changes yet. Buffer-aware editor; existing structure-sidebar manual edits go through the buffer; chat path still works because `/edit/accept` is left in place for now (removed in Phase 6).

### Task 1: Add `currentSha` to ProjectView

**Files:**
- Modify: `src/services/project-service.ts` (search for `interface ProjectView` near top)
- Modify: `src/services/project-service.ts` (search for `getProject` implementation)
- Test: `test/forms/shaping/project-service.test.ts`

- [ ] **Step 1: Write the failing test**

Append this case at the bottom of the existing `describe('ProjectService.getProject', ...)` block in `test/forms/shaping/project-service.test.ts`:

```typescript
it('returns the current sha for the project', async () => {
  const view = await service.getProject('test', slug, testUser)
  expect(view.currentSha).toMatch(/^[0-9a-f]{40}$/)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/forms/shaping/project-service.test.ts -t "current sha"
```

Expected: FAIL with `expect(received).toMatch(expected)` because `currentSha` is undefined.

- [ ] **Step 3: Add `currentSha: string` to `ProjectView` and populate it in `getProject`**

In `src/services/project-service.ts`, add `currentSha: string` to the `ProjectView` interface. In the `getProject` implementation, after resolving the form/spec, call `repo.headSha(slug, 'main')` (add this method to the repo if missing — see `form-project-repo.ts`) and include it in the returned view.

If `repo.headSha` doesn't exist, add it to `src/services/form-project-repo.ts`:

```typescript
async headSha(slug: string, ref: string): Promise<string> {
  const result = await git.resolveRef({ fs, dir: join(this.root, slug), ref })
  return result
}
```

(`git` is the isomorphic-git import already at the top of the file.)

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/forms/shaping/project-service.test.ts -t "current sha"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/project-service.ts src/services/form-project-repo.ts test/forms/shaping/project-service.test.ts
git commit -m "feat(project-service): expose current git sha on ProjectView"
```

---

### Task 2: Add `POST /:owner/:slug/edit/save` route

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`
- Test: `test/forms/shaping/save-route.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `test/forms/shaping/save-route.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { Hono } from 'hono'
import type { SessionUser } from '../../../src/services/auth/session'
import { createFormProjectRepo } from '../../../src/services/form-project-repo'
import { createProjectService } from '../../../src/services/project-service'
import { createStrategyRegistry } from '../../../src/services/strategy-registry'
import { createProjectStore } from '../../../src/services/storage'
import { createEditRoutes } from '../../../src/entrypoints/app/routes/owner/edit'
import { testDataSpec, testFormSpec } from '../fixtures'

const TEST_DIR = 'test-data/save-route'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = { login: 'testuser', name: 'Test', avatarUrl: '' }

const dummyExtractor = {
  async extract() {
    return { spec: testDataSpec, formSpec: testFormSpec, confidence: [] }
  },
}

describe('POST /:owner/:slug/edit/save', () => {
  let app: Hono
  let service: ReturnType<typeof createProjectService>
  let slug: string

  beforeAll(async () => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(REPOS_PATH, { recursive: true })
    const store = createProjectStore(DB_PATH)
    const repo = createFormProjectRepo(REPOS_PATH)
    // biome-ignore lint/suspicious/noExplicitAny: dummy extractor
    service = createProjectService(store, repo, dummyExtractor as any)
    const project = await service.createProject(
      'test',
      Buffer.from('fake'),
      testUser,
    )
    slug = project.slug
    await new Promise((r) => setTimeout(r, 500))

    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', testUser)
      await next()
    })
    app.route(
      '/',
      createEditRoutes(service, createStrategyRegistry({ default: null as any })),
    )
  })

  afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

  it('commits a batch and returns new sha', async () => {
    const view = await service.getProject('test', slug, testUser)
    const firstPageId = view.formSpec!.pages[0].id

    const res = await app.request(`/test/${slug}/edit/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [{ kind: 'renamePage', id: firstPageId, title: 'New' }],
        parentSha: view.currentSha,
        source: 'manual',
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { sha: string; state: unknown }
    expect(body.sha).toMatch(/^[0-9a-f]{40}$/)
    expect(body.sha).not.toBe(view.currentSha)
  })

  it('rejects stale parentSha with 409', async () => {
    const res = await app.request(`/test/${slug}/edit/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [],
        parentSha: '0'.repeat(40),
        source: 'manual',
      }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: string; currentSha: string }
    expect(body.error).toBe('stale')
    expect(body.currentSha).toMatch(/^[0-9a-f]{40}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/forms/shaping/save-route.test.ts
```

Expected: FAIL — route doesn't exist; 404 responses.

- [ ] **Step 3: Add the route**

In `src/entrypoints/app/routes/owner/edit/index.tsx`, add this handler before the `return app` line:

```typescript
// POST /:owner/:slug/edit/save — commit a staged batch
app.post('/:owner/:slug/edit/save', async (c) => {
  const owner = c.req.param('owner')
  const slug = c.req.param('slug')
  const user = c.get('user')
  try {
    if (!user) throw new UnauthenticatedError()
    const body = (await c.req.json()) as {
      commands: unknown[]
      parentSha: string
      summary?: string
      source: 'manual' | 'llm'
    }
    const view = await service.getProject(owner, slug, user)
    if (view.currentSha !== body.parentSha) {
      return c.json({ error: 'stale', currentSha: view.currentSha }, 409)
    }
    const commands = body.commands.map((cmd) => commandSchema.parse(cmd))
    const explanation = composeExplanation(
      commands,
      body.summary,
      view.formSpec as unknown as ProjectState['formSpec'],
      view.spec as unknown as ProjectState['dataSpec'],
    )
    const result = await service.executeCommands(
      owner,
      slug,
      commands,
      explanation,
      body.source,
      user,
    )
    if (!result.ok) {
      return c.json(
        { error: result.error, failedAt: result.failedAt, command: result.command },
        400,
      )
    }
    return c.json({ state: result.state, sha: result.sha })
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    )
  }
})
```

Add to the imports at the top of the file:

```typescript
import { humanize } from '../../../../../services/forms/shaping/humanize'
import { executeBatch } from '../../../../../services/forms/shaping/executor'
```

Add this helper at the bottom of the file:

```typescript
function composeExplanation(
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

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/forms/shaping/save-route.test.ts
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/index.tsx test/forms/shaping/save-route.test.ts
git commit -m "feat(edit): add /edit/save endpoint with parentSha guard and composed humanize explanation"
```

---

### Task 3: Extend editor protocol with staging events

**Files:**
- Modify: `src/design-system/components/flex-form-editor/protocol.ts`

- [ ] **Step 1: Add new event variants**

In `src/design-system/components/flex-form-editor/protocol.ts`, extend the `FormEditorEvent` union with three new variants. Replace the existing union with:

```typescript
export type FormEditorEvent =
  | {
      type: 'formeditor:select'
      detail: { kind: 'page' | 'group' | 'field'; id: string }
    }
  | {
      type: 'formeditor:proposal-received'
      detail: { commands: Command[]; explanation: string }
    }
  | { type: 'formeditor:proposal-accept'; detail: Record<string, never> }
  | { type: 'formeditor:proposal-reject'; detail: Record<string, never> }
  | { type: 'formeditor:proposal-refine'; detail: { feedback: string } }
  | {
      type: 'formeditor:spec-updated'
      detail: { state: ProjectStateClient }
    }
  | {
      type: 'formeditor:state-projected'
      detail: { state: ProjectStateClient; bufferLength: number }
    }
  | {
      type: 'formeditor:command-failed'
      detail: { error: string; command: Command | null }
    }
  | {
      type: 'formeditor:manual-command'
      detail: { command: Command; explanation: string }
    }
  | {
      type: 'formeditor:stage-command'
      detail: { command: Command; explanation: string }
    }
  | {
      type: 'formeditor:stage-batch'
      detail: { commands: Command[]; summary: string; source: 'llm' }
    }
  | {
      type: 'formeditor:intent-submitted'
      detail: { intent: string }
    }
```

- [ ] **Step 2: Type-check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components/flex-form-editor/protocol.ts
git commit -m "feat(editor): add stage-command, stage-batch, state-projected events to protocol"
```

---

### Task 4: Hold staged buffer in flex-form-editor

**Files:**
- Modify: `src/design-system/components/flex-form-editor/client.ts`
- Test: `test/design-system/components/flex-form-editor.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `test/design-system/components/flex-form-editor.test.ts`:

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!('window' in globalThis)) {
  GlobalRegistrator.register()
}

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import '../../../src/design-system/components/flex-form-editor/client'

const SAMPLE_STATE = {
  formSpec: {
    id: 'f1',
    specId: 'd1',
    title: 'Test',
    pages: [{ id: 'p1', title: 'Page 1', groups: ['g1'] }],
  },
  dataSpec: {
    id: 'd1',
    title: 'T',
    description: '',
    groups: [
      {
        id: 'g1',
        title: 'Group 1',
        requirements: [
          { id: 'f1', label: 'First name', fieldType: 'text', required: false },
        ],
      },
    ],
  },
}

function mountEditor() {
  document.body.innerHTML = ''
  const el = document.createElement('flex-form-editor')
  el.dataset.editBase = '/test/edit'
  el.dataset.previewBase = '/test/preview'
  el.dataset.currentSha = 'a'.repeat(40)
  el.innerHTML = `
    <script type="application/json" data-initial-state>${JSON.stringify(SAMPLE_STATE)}</script>
    <script type="application/json" data-shaping-log>[]</script>
  `
  document.body.appendChild(el)
  return el
}

describe('flex-form-editor staged buffer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('appends a stage-command event into the buffer and projects state', async () => {
    const el = mountEditor()
    let projected: { state: typeof SAMPLE_STATE; bufferLength: number } | null = null
    el.addEventListener('formeditor:state-projected', (e) => {
      projected = (e as CustomEvent).detail
    })
    el.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: {
          command: { kind: 'renamePage', id: 'p1', title: 'Renamed' },
          explanation: 'Rename page',
        },
        bubbles: true,
        composed: true,
      }),
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(projected).not.toBeNull()
    expect(projected!.bufferLength).toBe(1)
    expect(projected!.state.formSpec.pages[0].title).toBe('Renamed')
  })

  it('discard clears the buffer and reprojects to canonical state', async () => {
    const el = mountEditor()
    el.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: {
          command: { kind: 'renamePage', id: 'p1', title: 'Renamed' },
          explanation: 'Rename',
        },
      }),
    )
    let lastProjected: { state: typeof SAMPLE_STATE; bufferLength: number } | null =
      null
    el.addEventListener('formeditor:state-projected', (e) => {
      lastProjected = (e as CustomEvent).detail
    })
    ;(el as any).discardStaged()
    await new Promise((r) => setTimeout(r, 0))
    expect(lastProjected!.bufferLength).toBe(0)
    expect(lastProjected!.state.formSpec.pages[0].title).toBe('Page 1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-form-editor.test.ts
```

Expected: FAIL — `formeditor:state-projected` not emitted, `discardStaged` undefined.

- [ ] **Step 3: Implement the buffer in `client.ts`**

In `src/design-system/components/flex-form-editor/client.ts`:

1. Add imports at the top:
   ```typescript
   import { executeBatch } from '../../../services/forms/shaping/executor'
   ```
2. Add private fields inside the class declaration, near `private state`:
   ```typescript
   private canonicalState: ProjectStateClient | null = null
   private buffer: Command[] = []
   ```
3. Modify `hydrateState()` to populate both `state` and `canonicalState`:
   ```typescript
   private hydrateState() {
     const stateScript = this.querySelector('script[data-initial-state]')
     if (stateScript?.textContent) {
       this.canonicalState = JSON.parse(stateScript.textContent) as ProjectStateClient
       this.state = this.canonicalState
     }
   }
   ```
4. Add a stage-command listener inside `bindEvents()`:
   ```typescript
   this.addEventListener('formeditor:stage-command', (e) => {
     const detail = (e as CustomEvent).detail as {
       command: Command
       explanation: string
     }
     this.appendToBuffer([detail.command])
   })
   this.addEventListener('formeditor:stage-batch', (e) => {
     const detail = (e as CustomEvent).detail as {
       commands: Command[]
       summary: string
     }
     this.appendToBuffer(detail.commands)
   })
   ```
5. Add the methods:
   ```typescript
   private appendToBuffer(commands: Command[]) {
     if (!this.canonicalState) return
     const candidate = [...this.buffer, ...commands]
     const result = executeBatch(this.canonicalState, candidate)
     if (!result.ok) {
       this.dispatchEvent(
         new CustomEvent('formeditor:command-failed', {
           detail: { error: result.error, command: result.command },
           bubbles: true,
           composed: true,
         }),
       )
       return
     }
     this.buffer = candidate
     this.state = result.state
     this.dispatchProjected()
   }

   private dispatchProjected() {
     if (!this.state) return
     this.dispatchEvent(
       new CustomEvent('formeditor:state-projected', {
         detail: { state: this.state, bufferLength: this.buffer.length },
         bubbles: false,
       }),
     )
   }

   discardStaged(): void {
     this.buffer = []
     if (this.canonicalState) this.state = this.canonicalState
     this.dispatchProjected()
   }
   ```
6. After `hydrateState()` runs in `connectedCallback()`, add `queueMicrotask(() => this.dispatchProjected())` (alongside the existing `broadcastSpec()` call — keep both for backward compat).

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-form-editor.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-form-editor/client.ts test/design-system/components/flex-form-editor.test.ts
git commit -m "feat(editor): hold staged command buffer; project state via executeBatch"
```

---

### Task 5: Save handler in flex-form-editor

**Files:**
- Modify: `src/design-system/components/flex-form-editor/client.ts`
- Modify: `test/design-system/components/flex-form-editor.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `test/design-system/components/flex-form-editor.test.ts`:

```typescript
describe('flex-form-editor save', () => {
  it('POSTs buffer to /edit/save and clears the buffer on success', async () => {
    const el = mountEditor()
    let posted: { url: string; body: any } | null = null
    const newSha = 'b'.repeat(40)
    const newState = {
      ...SAMPLE_STATE,
      formSpec: {
        ...SAMPLE_STATE.formSpec,
        pages: [{ id: 'p1', title: 'Renamed', groups: ['g1'] }],
      },
    }
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      posted = { url, body: JSON.parse(init!.body as string) }
      return new Response(JSON.stringify({ state: newState, sha: newSha }), {
        status: 200,
      })
    }) as any

    el.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: {
          command: { kind: 'renamePage', id: 'p1', title: 'Renamed' },
          explanation: 'Rename',
        },
      }),
    )
    await (el as any).saveStaged()

    expect(posted!.url).toBe('/test/edit/save')
    expect(posted!.body.commands).toHaveLength(1)
    expect(posted!.body.parentSha).toBe('a'.repeat(40))
    expect(posted!.body.source).toBe('manual')
    expect(el.dataset.currentSha).toBe(newSha)
    expect((el as any).bufferLength).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-form-editor.test.ts -t "POSTs buffer"
```

Expected: FAIL — `saveStaged` undefined.

- [ ] **Step 3: Implement save**

Add to `flex-form-editor/client.ts`:

```typescript
get bufferLength(): number {
  return this.buffer.length
}

async saveStaged(): Promise<void> {
  if (this.buffer.length === 0 || !this.canonicalState) return
  const source: 'manual' | 'llm' =
    this.lastBatchWasChat && this.buffer.length === this.lastBatchSize
      ? 'llm'
      : 'manual'
  const summary = source === 'llm' ? this.lastBatchSummary : undefined
  const parentSha = this.dataset.currentSha ?? ''
  try {
    const response = await fetch(`${this.editBase()}/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: this.buffer,
        parentSha,
        summary,
        source,
      }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      this.dispatchEvent(
        new CustomEvent('formeditor:command-failed', {
          detail: { error: body.error ?? 'Save failed', command: body.command ?? null },
          bubbles: true,
          composed: true,
        }),
      )
      return
    }
    const body = (await response.json()) as { state: ProjectStateClient; sha: string }
    this.canonicalState = body.state
    this.state = body.state
    this.buffer = []
    this.lastBatchWasChat = false
    this.lastBatchSize = 0
    this.lastBatchSummary = ''
    this.dataset.currentSha = body.sha
    this.dispatchProjected()
  } catch (err) {
    this.dispatchEvent(
      new CustomEvent('formeditor:command-failed', {
        detail: {
          error: err instanceof Error ? err.message : String(err),
          command: null,
        },
        bubbles: true,
        composed: true,
      }),
    )
  }
}
```

Add the supporting fields near `private buffer`:

```typescript
private lastBatchWasChat = false
private lastBatchSize = 0
private lastBatchSummary = ''
```

Update the `formeditor:stage-batch` handler from Task 4 to set them:

```typescript
this.addEventListener('formeditor:stage-batch', (e) => {
  const detail = (e as CustomEvent).detail as {
    commands: Command[]
    summary: string
  }
  this.appendToBuffer(detail.commands)
  this.lastBatchWasChat = true
  this.lastBatchSize = detail.commands.length
  this.lastBatchSummary = detail.summary
})
```

And in the `formeditor:stage-command` handler, reset:

```typescript
this.addEventListener('formeditor:stage-command', (e) => {
  const detail = (e as CustomEvent).detail as {
    command: Command
    explanation: string
  }
  this.appendToBuffer([detail.command])
  this.lastBatchWasChat = false
  this.lastBatchSize = 0
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-form-editor.test.ts -t "POSTs buffer"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-form-editor/client.ts test/design-system/components/flex-form-editor.test.ts
git commit -m "feat(editor): saveStaged posts buffer to /edit/save and updates canonical state"
```

---

### Task 6: Pass `currentSha` from server-rendered shell

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`

- [ ] **Step 1: Update `EditorPage` to pass `data-current-sha`**

In `src/entrypoints/app/routes/owner/edit/components.tsx`, change the `<flex-form-editor ...>` opening tag in `EditorPage`:

```tsx
<flex-form-editor
  data-owner={owner}
  data-slug={project.slug}
  data-edit-base={resolveUrl(editBase)}
  data-preview-base={resolveUrl(`/${owner}/${project.slug}/preview`)}
  data-current-sha={view.currentSha}
>
```

- [ ] **Step 2: Type-check**

```bash
bun run --no-warnings tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/components.tsx
git commit -m "feat(editor): plumb currentSha into the editor shell for save staleness checks"
```

---

### Task 7: Switch flex-form-structure to dispatch stage-command

**Files:**
- Modify: `src/design-system/components/flex-form-structure/client.ts`

- [ ] **Step 1: Replace `formeditor:manual-command` emissions with `formeditor:stage-command`**

In `src/design-system/components/flex-form-structure/client.ts`, find the two `new CustomEvent('formeditor:manual-command', ...)` dispatches and rename the event type to `'formeditor:stage-command'`. Detail shape is identical so no other changes needed.

Add a listener for `formeditor:state-projected` so the structure panel renders from the projected state, not just the canonical one. Replace the existing `formeditor:spec-updated` listener block in `connectedCallback` with:

```typescript
const root = this.closest('flex-form-editor')
if (root) {
  root.addEventListener('formeditor:state-projected', (e) => {
    this.state = (e as CustomEvent).detail.state
    this.render()
  })
}
```

- [ ] **Step 2: Run the existing test suite**

```bash
bun test test/design-system/components/flex-form-editor.test.ts
```

Expected: PASS — buffer behavior unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components/flex-form-structure/client.ts
git commit -m "feat(structure): emit stage-command and render from state-projected"
```

---

## Phase 2 — flex-staged-changes popover

### Task 8: Create flex-staged-changes component

**Files:**
- Create: `src/design-system/components/flex-staged-changes/client.ts`
- Create: `src/design-system/components/flex-staged-changes/styles.css`
- Modify: `src/design-system/register.ts`
- Test: `test/design-system/components/flex-staged-changes.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `test/design-system/components/flex-staged-changes.test.ts`:

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { beforeEach, describe, expect, it } from 'bun:test'
import '../../../src/design-system/components/flex-staged-changes/client'

describe('flex-staged-changes', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders humanized lines for buffered commands', () => {
    const el = document.createElement('flex-staged-changes') as any
    document.body.appendChild(el)
    el.update(
      [
        { kind: 'renamePage', id: 'p1', title: 'New' },
        { kind: 'setRequired', id: 'f1', required: true },
      ],
      {
        formSpec: {
          id: 'f',
          specId: 'd',
          title: 't',
          pages: [{ id: 'p1', title: 'Old', groups: [] }],
        },
        dataSpec: {
          id: 'd',
          title: 't',
          description: '',
          groups: [
            {
              id: 'g1',
              title: 'G',
              requirements: [{ id: 'f1', label: 'Email', fieldType: 'text', required: false }],
            },
          ],
        },
      },
    )
    const items = el.querySelectorAll('.staged-changes__item')
    expect(items.length).toBe(2)
    expect(items[0].textContent).toContain('Rename page')
    expect(items[1].textContent).toContain('Email')
  })

  it('emits staged-changes:remove when remove button clicked', () => {
    const el = document.createElement('flex-staged-changes') as any
    document.body.appendChild(el)
    el.update(
      [{ kind: 'renamePage', id: 'p1', title: 'New' }],
      {
        formSpec: {
          id: 'f',
          specId: 'd',
          title: 't',
          pages: [{ id: 'p1', title: 'Old', groups: [] }],
        },
        dataSpec: { id: 'd', title: 't', description: '', groups: [] },
      },
    )
    let removedIndex = -1
    el.addEventListener('staged-changes:remove', (e: any) => {
      removedIndex = e.detail.index
    })
    el.querySelector('.staged-changes__remove').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(removedIndex).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-staged-changes.test.ts
```

Expected: FAIL — component not defined.

- [ ] **Step 3: Implement**

Create `src/design-system/components/flex-staged-changes/styles.css`:

```css
@layer block {
  flex-staged-changes {
    display: block;
  }
  .staged-changes {
    background: var(--flex-color-surface);
    border: 1px solid var(--flex-color-border);
    border-radius: var(--flex-radius-md);
    padding: var(--flex-space-sm);
    max-width: 22rem;
  }
  .staged-changes__title {
    font-size: var(--flex-text-sm);
    font-weight: 600;
    margin-block-end: var(--flex-space-xs);
  }
  .staged-changes__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--flex-space-2xs);
  }
  .staged-changes__item {
    display: flex;
    align-items: flex-start;
    gap: var(--flex-space-xs);
    font-size: var(--flex-text-xs);
    line-height: 1.4;
  }
  .staged-changes__remove {
    background: transparent;
    border: 0;
    cursor: pointer;
    color: var(--flex-color-muted);
    padding: 0;
    font-size: var(--flex-text-xs);
  }
  .staged-changes__remove:hover {
    color: var(--flex-color-error);
  }
  .staged-changes__empty {
    color: var(--flex-color-muted);
    font-size: var(--flex-text-xs);
  }
}
```

Create `src/design-system/components/flex-staged-changes/client.ts`:

```typescript
import type { Command, ProjectState } from '../../../services/forms/shaping/commands'
import { executeBatch } from '../../../services/forms/shaping/executor'
import { humanize } from '../../../services/forms/shaping/humanize'

class FlexStagedChanges extends HTMLElement {
  private commands: Command[] = []
  private baseState: ProjectState | null = null

  update(commands: Command[], baseState: ProjectState): void {
    this.commands = commands
    this.baseState = baseState
    this.render()
  }

  private render(): void {
    if (this.commands.length === 0 || !this.baseState) {
      this.innerHTML = `
        <div class="staged-changes">
          <div class="staged-changes__title">No pending changes</div>
          <p class="staged-changes__empty">Edits and accepted assistant suggestions will appear here.</p>
        </div>
      `
      return
    }
    let state = this.baseState
    const lines: string[] = []
    for (const cmd of this.commands) {
      lines.push(humanize(cmd, state))
      const next = executeBatch(state, [cmd])
      if (next.ok) state = next.state
    }
    const items = lines
      .map(
        (text, i) =>
          `<li class="staged-changes__item">
             <span>${escapeHtml(text)}</span>
             <button type="button" class="staged-changes__remove" data-index="${i}" aria-label="Remove">&times;</button>
           </li>`,
      )
      .join('')
    this.innerHTML = `
      <div class="staged-changes">
        <div class="staged-changes__title">Pending changes (${this.commands.length})</div>
        <ol class="staged-changes__list">${items}</ol>
      </div>
    `
    for (const btn of this.querySelectorAll<HTMLButtonElement>('.staged-changes__remove')) {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index)
        this.dispatchEvent(
          new CustomEvent('staged-changes:remove', {
            detail: { index },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-staged-changes')) {
  customElements.define('flex-staged-changes', FlexStagedChanges)
}
```

In `src/design-system/register.ts`, add:

```typescript
import './components/flex-staged-changes/client'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-staged-changes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-staged-changes test/design-system/components/flex-staged-changes.test.ts src/design-system/register.ts
git commit -m "feat(staged-changes): popover component lists pending commands with remove"
```

---

### Task 9: Wire Save/Discard UI into the editor breadcrumb

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`
- Modify: `src/entrypoints/app/routes/owner/edit/styles.css`
- Modify: `src/design-system/components/flex-form-editor/client.ts`
- Modify: `src/design-system/components/flex-form-editor/styles.css`

- [ ] **Step 1: Add Save/Discard markup to the breadcrumb**

In `src/entrypoints/app/routes/owner/edit/components.tsx`, replace the `<div class="editor-breadcrumb">` block in `EditorPage` with:

```tsx
<div class="editor-breadcrumb">
  <h1>
    <a href={resolveUrl(`/${owner}`)}>{owner}</a>
    {' / '}
    <a href={resolveUrl(`/${owner}/${project.slug}`)}>{project.name}</a>
    {' / '}
    <strong>Edit</strong>
  </h1>
  <div class="editor-breadcrumb__actions">
    <div class="editor-breadcrumb__staged">
      <button
        type="button"
        class="flex-button"
        data-variant="ghost"
        data-action="toggle-staged"
        hidden
      >
        <span data-staged-count>0</span> pending
      </button>
      <flex-staged-changes hidden />
    </div>
    <button
      type="button"
      class="flex-button"
      data-variant="outline"
      data-action="discard-staged"
      hidden
    >
      Discard
    </button>
    <button
      type="button"
      class="flex-button"
      data-action="save-staged"
      hidden
    >
      Save
    </button>
    <button
      type="button"
      class="flex-button editor-breadcrumb__open-assistant"
      data-variant="outline"
      data-action="open-assistant"
    >
      Assistant
    </button>
  </div>
</div>
```

In `src/entrypoints/app/routes/owner/edit/styles.css`, append:

```css
@layer block {
  .editor-breadcrumb__actions {
    display: flex;
    align-items: center;
    gap: var(--flex-space-xs);
  }
  .editor-breadcrumb__staged {
    position: relative;
  }
  .editor-breadcrumb__staged flex-staged-changes {
    position: absolute;
    inset-block-start: calc(100% + var(--flex-space-2xs));
    inset-inline-end: 0;
    z-index: 10;
    box-shadow: var(--flex-shadow-md);
  }
}
```

- [ ] **Step 2: Wire handlers in flex-form-editor**

In `src/design-system/components/flex-form-editor/client.ts`, extend the existing `addEventListener('click', ...)` block in `bindEvents()`:

```typescript
this.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  const action = target.closest<HTMLElement>('[data-proposal-action]')
  if (action) {
    const actionType = action.dataset.proposalAction
    if (actionType === 'accept') this.handleAccept()
    if (actionType === 'reject') this.handleReject()
    return
  }
  const editorAction = target.closest<HTMLElement>('[data-action]')
  if (editorAction) {
    const a = editorAction.dataset.action
    if (a === 'open-assistant') this.assistant?.toggle()
    if (a === 'save-staged') this.saveStaged()
    if (a === 'discard-staged') this.discardStaged()
    if (a === 'toggle-staged') this.toggleStagedPopover()
  }
})
```

Add a method:

```typescript
private toggleStagedPopover() {
  const popover = this.querySelector<HTMLElement>('flex-staged-changes')
  if (!popover) return
  popover.hidden = !popover.hidden
}
```

Replace the existing `dispatchProjected` method (introduced in Task 4) with this version that also refreshes the breadcrumb UI:

```typescript
private dispatchProjected() {
  if (!this.state) return
  this.dispatchEvent(
    new CustomEvent('formeditor:state-projected', {
      detail: { state: this.state, bufferLength: this.buffer.length },
      bubbles: false,
    }),
  )
  this.refreshStagedUi()
}

private refreshStagedUi() {
  const has = this.buffer.length > 0
  for (const action of ['save-staged', 'discard-staged', 'toggle-staged']) {
    const btn = this.querySelector<HTMLElement>(`[data-action="${action}"]`)
    if (btn) btn.hidden = !has
  }
  const count = this.querySelector<HTMLElement>('[data-staged-count]')
  if (count) count.textContent = String(this.buffer.length)
  const popover = this.querySelector('flex-staged-changes') as
    | (HTMLElement & {
        update: (cmds: Command[], state: ProjectStateClient) => void
      })
    | null
  if (popover && this.canonicalState) {
    popover.update(this.buffer, this.canonicalState as unknown as any)
    if (!has) popover.hidden = true
  }
}
```

Add a remove-from-buffer handler:

```typescript
this.addEventListener('staged-changes:remove', (e) => {
  const idx = (e as CustomEvent).detail.index as number
  this.removeFromBuffer(idx)
})
```

```typescript
private removeFromBuffer(index: number) {
  if (!this.canonicalState) return
  const next = this.buffer.filter((_, i) => i !== index)
  const result = executeBatch(this.canonicalState, next)
  if (!result.ok) {
    // Removing a command exposed an invalidity in remaining ones.
    // Drop everything at and after the failure to keep state consistent.
    this.buffer = next.slice(0, result.failedAt)
  } else {
    this.buffer = next
  }
  const proj = executeBatch(this.canonicalState, this.buffer)
  if (proj.ok) this.state = proj.state
  this.lastBatchWasChat = false
  this.dispatchProjected()
}
```

- [ ] **Step 3: Run tests**

```bash
bun test test/design-system/components/flex-form-editor.test.ts
```

Expected: PASS — buffer/save behavior unchanged, new UI doesn't break existing tests.

- [ ] **Step 4: Build CSS so visual smoke works**

```bash
bun run build:css
```

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/components.tsx src/entrypoints/app/routes/owner/edit/styles.css src/design-system/components/flex-form-editor/client.ts
git commit -m "feat(editor): Save/Discard breadcrumb actions and staged-changes popover"
```

---

## Phase 3 — flex-editable-page replaces the iframe

### Task 10: Scaffold flex-editable-page rendering current page inline

**Files:**
- Create: `src/design-system/components/flex-editable-page/client.ts`
- Create: `src/design-system/components/flex-editable-page/styles.css`
- Modify: `src/design-system/register.ts`
- Test: `test/design-system/components/flex-editable-page.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
// test/design-system/components/flex-editable-page.test.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { beforeEach, describe, expect, it } from 'bun:test'
import '../../../src/design-system/components/flex-editable-page/client'

const STATE = {
  formSpec: {
    id: 'f',
    specId: 'd',
    title: 't',
    pages: [
      { id: 'p1', title: 'Page A', groups: ['g1'] },
      { id: 'p2', title: 'Page B', groups: [] },
    ],
  },
  dataSpec: {
    id: 'd',
    title: 't',
    description: '',
    groups: [
      {
        id: 'g1',
        title: 'Group',
        requirements: [{ id: 'f1', label: 'Name', fieldType: 'text', required: false }],
      },
    ],
  },
}

describe('flex-editable-page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders page tabs and a header for the selected page', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    const tabs = el.querySelectorAll('.editable-page__tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(el.querySelector('.editable-page__title')!.textContent).toContain('Page A')
  })

  it('emits select event on tab click', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let detail: any = null
    el.addEventListener('formeditor:select', (e: any) => {
      detail = e.detail
    })
    el.querySelectorAll('.editable-page__tab')[1].dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(detail).toEqual({ kind: 'page', id: 'p2' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-editable-page.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement scaffold**

Create `src/design-system/components/flex-editable-page/styles.css`:

```css
@layer block {
  flex-editable-page {
    display: block;
  }
  .editable-page__tabs {
    display: flex;
    gap: var(--flex-space-2xs);
    border-block-end: 1px solid var(--flex-color-border);
    margin-block-end: var(--flex-space-md);
  }
  .editable-page__tab {
    background: transparent;
    border: 0;
    border-block-end: 2px solid transparent;
    padding: var(--flex-space-xs) var(--flex-space-sm);
    cursor: pointer;
    font-size: var(--flex-text-sm);
  }
  .editable-page__tab[aria-selected='true'] {
    border-block-end-color: var(--flex-color-accent);
    font-weight: 600;
  }
  .editable-page__header {
    display: flex;
    align-items: baseline;
    gap: var(--flex-space-sm);
    margin-block-end: var(--flex-space-md);
  }
  .editable-page__title {
    font-size: var(--flex-text-lg);
    font-weight: 600;
    margin: 0;
  }
}
```

Create `src/design-system/components/flex-editable-page/client.ts`:

```typescript
import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexEditablePage extends HTMLElement {
  private state: ProjectStateClient | null = null
  private pageIndex = 0

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:state-projected', (e) => {
        const next = (e as CustomEvent).detail.state as ProjectStateClient
        this.state = next
        if (this.pageIndex >= next.formSpec.pages.length) this.pageIndex = 0
        this.render()
      })
    }
  }

  update(state: ProjectStateClient, pageIndex: number): void {
    this.state = state
    this.pageIndex = pageIndex
    this.render()
  }

  private render() {
    if (!this.state) {
      this.innerHTML = ''
      return
    }
    const pages = this.state.formSpec.pages
    if (pages.length === 0) {
      this.innerHTML = '<p>No pages yet.</p>'
      return
    }
    if (this.pageIndex >= pages.length) this.pageIndex = pages.length - 1
    const current = pages[this.pageIndex]
    const tabs = pages
      .map(
        (p, i) =>
          `<button type="button" role="tab" aria-selected="${i === this.pageIndex}" data-page-id="${p.id}" data-page-index="${i}" class="editable-page__tab">${i + 1}. ${escapeHtml(p.title)}</button>`,
      )
      .join('')
    this.innerHTML = `
      <div class="editable-page">
        <div class="editable-page__tabs" role="tablist">${tabs}</div>
        <header class="editable-page__header">
          <h2 class="editable-page__title">${escapeHtml(current.title)}</h2>
        </header>
        <div class="editable-page__body" data-page-id="${current.id}"></div>
      </div>
    `
    for (const tab of this.querySelectorAll<HTMLButtonElement>('.editable-page__tab')) {
      tab.addEventListener('click', () => {
        const id = tab.dataset.pageId
        const idx = Number(tab.dataset.pageIndex)
        if (id === undefined) return
        this.pageIndex = idx
        this.dispatchEvent(
          new CustomEvent('formeditor:select', {
            detail: { kind: 'page', id },
            bubbles: true,
            composed: true,
          }),
        )
        this.render()
      })
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-page')) {
  customElements.define('flex-editable-page', FlexEditablePage)
}
```

Add to `src/design-system/register.ts`:

```typescript
import './components/flex-editable-page/client'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-editable-page.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-editable-page test/design-system/components/flex-editable-page.test.ts src/design-system/register.ts
git commit -m "feat(editable-page): scaffold component with page tabs and header"
```

---

### Task 11: Page-level toolbar actions

**Files:**
- Modify: `src/design-system/components/flex-editable-page/client.ts`
- Modify: `test/design-system/components/flex-editable-page.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the test file:

```typescript
describe('flex-editable-page page actions', () => {
  it('emits stage-command renamePage when title is edited', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    const titleInput = el.querySelector('.editable-page__title-input') as HTMLInputElement
    titleInput.value = 'Renamed'
    titleInput.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'renamePage', id: 'p1', title: 'Renamed' })
  })

  it('emits stage-command addPage when +Page is clicked', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="add-page"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command.kind).toBe('addPage')
    expect(staged.command.title).toMatch(/New page/)
  })

  it('emits removePage stage-command on delete', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="remove-page"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'removePage', id: 'p1' })
  })

  it('emits setDeliveryMode on select change', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    const select = el.querySelector('.editable-page__delivery') as HTMLSelectElement
    select.value = 'conversational'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({
      kind: 'setDeliveryMode',
      pageId: 'p1',
      mode: 'conversational',
    })
  })

  it('emits swapPages when up/down arrows clicked', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="page-down"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'swapPages', a: 'p1', b: 'p2' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test test/design-system/components/flex-editable-page.test.ts
```

Expected: 5 FAIL — header markup doesn't include the controls yet.

- [ ] **Step 3: Add toolbar to the render method**

In `flex-editable-page/client.ts`, replace the `<header>...</header>` block in `render` with:

```typescript
const canMoveDown = this.pageIndex < pages.length - 1
const canMoveUp = this.pageIndex > 0
const nextPageId = canMoveDown ? pages[this.pageIndex + 1].id : null
const prevPageId = canMoveUp ? pages[this.pageIndex - 1].id : null
const deliveryMode = current.deliveryMode ?? 'static'
```

Then in the template:

```typescript
<header class="editable-page__header">
  <input
    type="text"
    class="editable-page__title-input flex-input"
    value="${escapeHtml(current.title)}"
    aria-label="Page title"
  />
  <select class="editable-page__delivery flex-select" aria-label="Delivery mode">
    <option value="static" ${deliveryMode === 'static' ? 'selected' : ''}>Static</option>
    <option value="conversational" ${deliveryMode === 'conversational' ? 'selected' : ''}>Conversational</option>
    <option value="hybrid" ${deliveryMode === 'hybrid' ? 'selected' : ''}>Hybrid</option>
  </select>
  <div class="editable-page__page-actions">
    ${canMoveUp ? `<button type="button" class="flex-button" data-variant="ghost" data-action="page-up" aria-label="Move page up">&uarr;</button>` : ''}
    ${canMoveDown ? `<button type="button" class="flex-button" data-variant="ghost" data-action="page-down" aria-label="Move page down">&darr;</button>` : ''}
    <button type="button" class="flex-button" data-variant="ghost" data-action="add-page">+ Page</button>
    <button type="button" class="flex-button" data-variant="ghost" data-action="remove-page" aria-label="Remove page">&times;</button>
  </div>
</header>
```

Then bind handlers in `render()` after `this.innerHTML = ...`:

```typescript
const dispatch = (command: any, explanation: string) => {
  this.dispatchEvent(
    new CustomEvent('formeditor:stage-command', {
      detail: { command, explanation },
      bubbles: true,
      composed: true,
    }),
  )
}

const titleInput = this.querySelector<HTMLInputElement>('.editable-page__title-input')
titleInput?.addEventListener('change', () => {
  if (titleInput.value === current.title) return
  dispatch(
    { kind: 'renamePage', id: current.id, title: titleInput.value },
    `Rename page to "${titleInput.value}"`,
  )
})

const deliverySelect = this.querySelector<HTMLSelectElement>('.editable-page__delivery')
deliverySelect?.addEventListener('change', () => {
  dispatch(
    { kind: 'setDeliveryMode', pageId: current.id, mode: deliverySelect.value as any },
    `Set delivery mode to ${deliverySelect.value}`,
  )
})

const addBtn = this.querySelector('[data-action="add-page"]')
addBtn?.addEventListener('click', () =>
  dispatch(
    { kind: 'addPage', afterPageId: current.id, title: 'New page' },
    'Add page',
  ),
)

const removeBtn = this.querySelector('[data-action="remove-page"]')
removeBtn?.addEventListener('click', () =>
  dispatch({ kind: 'removePage', id: current.id }, `Remove page "${current.title}"`),
)

const upBtn = this.querySelector('[data-action="page-up"]')
upBtn?.addEventListener('click', () => {
  if (prevPageId)
    dispatch({ kind: 'swapPages', a: current.id, b: prevPageId }, 'Move page up')
})

const downBtn = this.querySelector('[data-action="page-down"]')
downBtn?.addEventListener('click', () => {
  if (nextPageId)
    dispatch({ kind: 'swapPages', a: current.id, b: nextPageId }, 'Move page down')
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test test/design-system/components/flex-editable-page.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-editable-page/client.ts test/design-system/components/flex-editable-page.test.ts
git commit -m "feat(editable-page): rename, add/remove, delivery mode, and reorder controls"
```

---

### Task 12: Replace the iframe with flex-editable-page in the route

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`
- Modify: `src/entrypoints/app/routes/owner/edit/editor-layout.css` (or `styles.css` — find where `.editor-preview-frame` is styled)

- [ ] **Step 1: Replace the `<div class="editor-preview">...iframe...</div>` block in `EditorPage`**

```tsx
<div class="editor-preview">
  <flex-editable-page />
</div>
```

- [ ] **Step 2: Remove `.editor-preview-frame` styling** (search for it; delete the block).

- [ ] **Step 3: Smoke check**

Visit the editor in a dev server:

```bash
bun run dev
```

Then open `/<owner>/<slug>/edit` for a project that already has a form. You should see page tabs at the top, the page title input, and the toolbar buttons. Page selection should still update the structure sidebar's highlight (it listens to `formeditor:select`).

If the page renders but stage events aren't producing visible state changes, check that `flex-form-editor` is forwarding `formeditor:state-projected` to children — `flex-editable-page` listens on `formeditor:state-projected` from the closest `flex-form-editor` ancestor.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/components.tsx src/entrypoints/app/routes/owner/edit/editor-layout.css src/entrypoints/app/routes/owner/edit/styles.css
git commit -m "feat(editor): replace preview iframe with flex-editable-page"
```

---

## Phase 4 — flex-editable-group

### Task 13: Create flex-editable-group with rename, +field, delete

**Files:**
- Create: `src/design-system/components/flex-editable-group/client.ts`
- Create: `src/design-system/components/flex-editable-group/styles.css`
- Modify: `src/design-system/register.ts`
- Test: `test/design-system/components/flex-editable-group.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { beforeEach, describe, expect, it } from 'bun:test'
import '../../../src/design-system/components/flex-editable-group/client'

const GROUP = {
  id: 'g1',
  title: 'Personal',
  requirements: [
    { id: 'f1', label: 'First name', fieldType: 'text', required: false },
  ],
}

describe('flex-editable-group', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the group title and a +field button', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    expect(el.querySelector('.editable-group__title-input')!.getAttribute('value')).toBe('Personal')
    expect(el.querySelector('[data-action="add-field"]')).not.toBeNull()
  })

  it('emits renameGroup on title change', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    const input = el.querySelector('.editable-group__title-input') as HTMLInputElement
    input.value = 'Identity'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'renameGroup', id: 'g1', title: 'Identity' })
  })

  it('emits addField on +field click', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="add-field"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command.kind).toBe('addField')
    expect(staged.command.groupId).toBe('g1')
  })

  it('emits removeGroup on delete', () => {
    const el = document.createElement('flex-editable-group') as any
    document.body.appendChild(el)
    el.update(GROUP)
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="remove-group"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'removeGroup', id: 'g1' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-editable-group.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/design-system/components/flex-editable-group/styles.css`:

```css
@layer block {
  flex-editable-group {
    display: block;
    border: 1px solid var(--flex-color-border);
    border-radius: var(--flex-radius-md);
    padding: var(--flex-space-sm);
    margin-block-end: var(--flex-space-md);
  }
  .editable-group__header {
    display: flex;
    align-items: center;
    gap: var(--flex-space-xs);
    margin-block-end: var(--flex-space-sm);
  }
  .editable-group__title-input {
    flex: 1;
    font-weight: 600;
  }
  .editable-group__fields {
    display: flex;
    flex-direction: column;
    gap: var(--flex-space-xs);
  }
}
```

Create `src/design-system/components/flex-editable-group/client.ts`:

```typescript
import type { Command } from '../../../services/forms/shaping/commands'
import type { RequirementGroup } from '../../../services/data-collection/types'

class FlexEditableGroup extends HTMLElement {
  private group: RequirementGroup | null = null

  update(group: RequirementGroup): void {
    this.group = group
    this.render()
  }

  private render() {
    if (!this.group) {
      this.innerHTML = ''
      return
    }
    const g = this.group
    const fields = g.requirements
      .map((req) =>
        `<flex-editable-field data-field-id="${req.id}" data-group-id="${g.id}"></flex-editable-field>`,
      )
      .join('')
    this.innerHTML = `
      <header class="editable-group__header">
        <input type="text" class="editable-group__title-input flex-input" value="${escapeHtml(g.title)}" aria-label="Group title" />
        <button type="button" class="flex-button" data-variant="ghost" data-action="add-field">+ Field</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="remove-group" aria-label="Remove group">&times;</button>
      </header>
      <div class="editable-group__fields">${fields}</div>
    `
    const dispatch = (command: Command, explanation: string) => {
      this.dispatchEvent(
        new CustomEvent('formeditor:stage-command', {
          detail: { command, explanation },
          bubbles: true,
          composed: true,
        }),
      )
    }
    const titleInput = this.querySelector<HTMLInputElement>('.editable-group__title-input')
    titleInput?.addEventListener('change', () => {
      if (titleInput.value === g.title) return
      dispatch(
        { kind: 'renameGroup', id: g.id, title: titleInput.value },
        `Rename group to "${titleInput.value}"`,
      )
    })
    this.querySelector('[data-action="add-field"]')?.addEventListener('click', () =>
      dispatch(
        { kind: 'addField', groupId: g.id, label: 'New field', fieldType: 'text', required: false },
        `Add field to "${g.title}"`,
      ),
    )
    this.querySelector('[data-action="remove-group"]')?.addEventListener('click', () =>
      dispatch({ kind: 'removeGroup', id: g.id }, `Remove group "${g.title}"`),
    )
    // Hand off to flex-editable-field children
    for (const child of this.querySelectorAll<any>('flex-editable-field')) {
      const fieldId = child.dataset.fieldId
      const field = g.requirements.find((r) => r.id === fieldId)
      if (field && typeof child.update === 'function') {
        child.update(field, g.id)
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-group')) {
  customElements.define('flex-editable-group', FlexEditableGroup)
}
```

In `src/design-system/register.ts`:

```typescript
import './components/flex-editable-group/client'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-editable-group.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-editable-group test/design-system/components/flex-editable-group.test.ts src/design-system/register.ts
git commit -m "feat(editable-group): rename, add field, delete group controls"
```

---

### Task 14: Wire groups into flex-editable-page rendering

**Files:**
- Modify: `src/design-system/components/flex-editable-page/client.ts`
- Modify: `test/design-system/components/flex-editable-page.test.ts`

- [ ] **Step 1: Write the failing test**

Append:

```typescript
describe('flex-editable-page renders groups', () => {
  it('renders one flex-editable-group per group on the page', () => {
    const el = document.createElement('flex-editable-page') as any
    document.body.appendChild(el)
    el.update(STATE, 0)
    const groups = el.querySelectorAll('flex-editable-group')
    expect(groups.length).toBe(1)
    expect(groups[0].dataset.groupId).toBe('g1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-editable-page.test.ts -t "renders one flex-editable-group"
```

Expected: FAIL.

- [ ] **Step 3: Add group rendering to flex-editable-page**

In `flex-editable-page/client.ts`, in the `render()` method, replace the `<div class="editable-page__body" data-page-id="${current.id}"></div>` line with:

```typescript
const groupMap = new Map(this.state.dataSpec.groups.map((g) => [g.id, g]))
const groupsHtml = current.groups
  .map((gid) => {
    const g = groupMap.get(gid)
    return g
      ? `<flex-editable-group data-group-id="${g.id}"></flex-editable-group>`
      : ''
  })
  .join('')
```

Replace the body div with:

```typescript
<div class="editable-page__body" data-page-id="${current.id}">
  ${groupsHtml}
  <button type="button" class="flex-button" data-variant="ghost" data-action="add-group">+ Group</button>
</div>
```

After binding the existing handlers, add:

```typescript
this.querySelector('[data-action="add-group"]')?.addEventListener('click', () =>
  dispatch(
    { kind: 'addGroup', pageId: current.id, title: 'New group' },
    'Add group',
  ),
)
for (const child of this.querySelectorAll<any>('flex-editable-group')) {
  const id = child.dataset.groupId
  const g = groupMap.get(id)
  if (g && typeof child.update === 'function') child.update(g)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-editable-page.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-editable-page/client.ts test/design-system/components/flex-editable-page.test.ts
git commit -m "feat(editable-page): render groups via flex-editable-group; +group action"
```

---

## Phase 5 — flex-editable-field

### Task 15: Create flex-editable-field with chips

**Files:**
- Create: `src/design-system/components/flex-editable-field/client.ts`
- Create: `src/design-system/components/flex-editable-field/styles.css`
- Modify: `src/design-system/register.ts`
- Test: `test/design-system/components/flex-editable-field.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator'
if (!('window' in globalThis)) GlobalRegistrator.register()

import { beforeEach, describe, expect, it } from 'bun:test'
import '../../../src/design-system/components/flex-editable-field/client'

const FIELD = {
  id: 'f1',
  label: 'Email',
  fieldType: 'email',
  required: false,
} as any

describe('flex-editable-field chips', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders label, type, required, delete chips', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    expect(el.querySelector('.editable-field__label-input')!.getAttribute('value')).toBe('Email')
    expect(el.querySelector('.editable-field__type')).not.toBeNull()
    expect(el.querySelector('[data-action="toggle-required"]')).not.toBeNull()
    expect(el.querySelector('[data-action="remove-field"]')).not.toBeNull()
  })

  it('emits relabelField on label change after debounce', async () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    const input = el.querySelector('.editable-field__label-input') as HTMLInputElement
    input.value = 'Email address'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 450))
    expect(staged.command).toEqual({
      kind: 'relabelField',
      id: 'f1',
      label: 'Email address',
    })
  })

  it('emits setRequired on toggle', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="toggle-required"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'setRequired', id: 'f1', required: true })
  })

  it('emits removeField on delete', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    el.querySelector('[data-action="remove-field"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(staged.command).toEqual({ kind: 'removeField', id: 'f1' })
  })

  it('emits changeFieldType on type select', () => {
    const el = document.createElement('flex-editable-field') as any
    document.body.appendChild(el)
    el.update(FIELD, 'g1')
    let staged: any = null
    el.addEventListener('formeditor:stage-command', (e: any) => {
      staged = e.detail
    })
    const sel = el.querySelector('.editable-field__type') as HTMLSelectElement
    sel.value = 'phone'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    expect(staged.command).toEqual({ kind: 'changeFieldType', id: 'f1', fieldType: 'phone' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-editable-field.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/design-system/components/flex-editable-field/styles.css`:

```css
@layer block {
  flex-editable-field {
    display: block;
    border: 1px solid var(--flex-color-border-subtle);
    border-radius: var(--flex-radius-sm);
    padding: var(--flex-space-xs);
  }
  .editable-field__row {
    display: flex;
    align-items: center;
    gap: var(--flex-space-2xs);
    flex-wrap: wrap;
  }
  .editable-field__label-input {
    flex: 1;
    min-width: 12rem;
  }
  .editable-field__type {
    min-width: 7rem;
  }
  .editable-field__chip[aria-pressed='true'] {
    background: var(--flex-color-accent-subtle);
    border-color: var(--flex-color-accent);
  }
  .editable-field__more {
    margin-block-start: var(--flex-space-xs);
    padding: var(--flex-space-xs);
    background: var(--flex-color-surface-subtle);
    border-radius: var(--flex-radius-sm);
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--flex-space-xs) var(--flex-space-sm);
    align-items: center;
  }
  .editable-field__more[hidden] {
    display: none;
  }
}
```

Create `src/design-system/components/flex-editable-field/client.ts`:

```typescript
import type { Command } from '../../../services/forms/shaping/commands'
import type { FormFieldRequirement } from '../../../services/data-collection/types'

const FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'url',
  'number',
  'currency',
  'date',
  'boolean',
  'choice',
  'longText',
] as const

const SENSITIVITIES = ['low', 'medium', 'high', 'pii'] as const
const CONTROLS = ['radio', 'select', 'checkbox', 'toggle'] as const

class FlexEditableField extends HTMLElement {
  private field: FormFieldRequirement | null = null
  private groupId = ''
  private moreOpen = false
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  update(field: FormFieldRequirement, groupId: string): void {
    this.field = field
    this.groupId = groupId
    this.render()
  }

  private dispatch(command: Command, explanation: string) {
    this.dispatchEvent(
      new CustomEvent('formeditor:stage-command', {
        detail: { command, explanation },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private render() {
    const f = this.field
    if (!f) return
    const required = f.required === true
    const typeOptions = FIELD_TYPES.map(
      (t) => `<option value="${t}" ${t === f.fieldType ? 'selected' : ''}>${t}</option>`,
    ).join('')
    this.innerHTML = `
      <div class="editable-field__row">
        <input type="text" class="editable-field__label-input flex-input" value="${escapeHtml(f.label)}" aria-label="Field label" />
        <select class="editable-field__type flex-select" aria-label="Field type">${typeOptions}</select>
        <button type="button" class="flex-button editable-field__chip" data-variant="ghost" data-action="toggle-required" aria-pressed="${required}">${required ? 'Required' : 'Optional'}</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="toggle-more" aria-expanded="${this.moreOpen}">&hellip;more</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="remove-field" aria-label="Remove field">&times;</button>
      </div>
      <div class="editable-field__more" ${this.moreOpen ? '' : 'hidden'} data-more>
        ${this.renderMore(f)}
      </div>
    `
    this.bind()
  }

  private renderMore(f: FormFieldRequirement): string {
    const sensitivity = (f as any).sensitivity ?? 'low'
    const control = (f as any).control ?? ''
    return `
      <label>Sensitivity</label>
      <select class="editable-field__sensitivity flex-select">
        ${SENSITIVITIES.map((s) => `<option value="${s}" ${s === sensitivity ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <label>Control</label>
      <select class="editable-field__control flex-select">
        <option value="">(default)</option>
        ${CONTROLS.map((c) => `<option value="${c}" ${c === control ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <label>Move to group</label>
      <input type="text" class="editable-field__move-target flex-input" placeholder="group id..." />
      <label>Condition</label>
      <div class="editable-field__condition">
        <input type="text" class="editable-field__cond-field flex-input" placeholder="field id" />
        <select class="editable-field__cond-op flex-select">
          <option value="equals">equals</option>
          <option value="notEquals">not equals</option>
          <option value="contains">contains</option>
        </select>
        <input type="text" class="editable-field__cond-value flex-input" placeholder="value" />
        <button type="button" class="flex-button" data-variant="ghost" data-action="condition-set">Set</button>
        <button type="button" class="flex-button" data-variant="ghost" data-action="condition-clear">Clear</button>
      </div>
    `
  }

  private bind() {
    const labelInput = this.querySelector<HTMLInputElement>('.editable-field__label-input')
    labelInput?.addEventListener('input', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        if (!this.field) return
        if (labelInput.value === this.field.label) return
        this.dispatch(
          { kind: 'relabelField', id: this.field.id, label: labelInput.value },
          `Relabel "${this.field.label}" to "${labelInput.value}"`,
        )
      }, 400)
    })

    const typeSel = this.querySelector<HTMLSelectElement>('.editable-field__type')
    typeSel?.addEventListener('change', () => {
      if (!this.field) return
      this.dispatch(
        {
          kind: 'changeFieldType',
          id: this.field.id,
          fieldType: typeSel.value as any,
        },
        `Change "${this.field.label}" type to ${typeSel.value}`,
      )
    })

    this.querySelector('[data-action="toggle-required"]')?.addEventListener('click', () => {
      if (!this.field) return
      const next = !(this.field.required === true)
      this.dispatch(
        { kind: 'setRequired', id: this.field.id, required: next },
        `Mark "${this.field.label}" ${next ? 'required' : 'optional'}`,
      )
    })

    this.querySelector('[data-action="remove-field"]')?.addEventListener('click', () => {
      if (!this.field) return
      this.dispatch(
        { kind: 'removeField', id: this.field.id },
        `Remove "${this.field.label}"`,
      )
    })

    this.querySelector('[data-action="toggle-more"]')?.addEventListener('click', () => {
      this.moreOpen = !this.moreOpen
      const more = this.querySelector<HTMLElement>('[data-more]')
      if (more) more.hidden = !this.moreOpen
      const btn = this.querySelector('[data-action="toggle-more"]')
      btn?.setAttribute('aria-expanded', String(this.moreOpen))
    })

    const sensSel = this.querySelector<HTMLSelectElement>('.editable-field__sensitivity')
    sensSel?.addEventListener('change', () => {
      if (!this.field) return
      this.dispatch(
        { kind: 'setFieldSensitivity', id: this.field.id, level: sensSel.value as any },
        `Set "${this.field.label}" sensitivity to ${sensSel.value}`,
      )
    })

    const ctrlSel = this.querySelector<HTMLSelectElement>('.editable-field__control')
    ctrlSel?.addEventListener('change', () => {
      if (!this.field || !ctrlSel.value) return
      this.dispatch(
        { kind: 'setFieldControl', id: this.field.id, control: ctrlSel.value as any },
        `Set "${this.field.label}" control to ${ctrlSel.value}`,
      )
    })

    const moveInput = this.querySelector<HTMLInputElement>('.editable-field__move-target')
    moveInput?.addEventListener('change', () => {
      if (!this.field || !moveInput.value) return
      this.dispatch(
        { kind: 'moveField', fieldId: this.field.id, toGroupId: moveInput.value },
        `Move "${this.field.label}" to ${moveInput.value}`,
      )
      moveInput.value = ''
    })

    this.querySelector('[data-action="condition-clear"]')?.addEventListener('click', () => {
      if (!this.field) return
      this.dispatch(
        { kind: 'setFieldCondition', id: this.field.id, condition: null },
        `Clear condition on "${this.field.label}"`,
      )
    })

    this.querySelector('[data-action="condition-set"]')?.addEventListener('click', () => {
      if (!this.field) return
      const fieldRef = this.querySelector<HTMLInputElement>('.editable-field__cond-field')
      const opSel = this.querySelector<HTMLSelectElement>('.editable-field__cond-op')
      const valInput = this.querySelector<HTMLInputElement>('.editable-field__cond-value')
      if (!fieldRef?.value || !opSel || !valInput?.value) return
      this.dispatch(
        {
          kind: 'setFieldCondition',
          id: this.field.id,
          condition: {
            field: fieldRef.value,
            operator: opSel.value as any,
            value: valInput.value,
          },
        },
        `Show "${this.field.label}" when ${fieldRef.value} ${opSel.value} ${valInput.value}`,
      )
    })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

if (!customElements.get('flex-editable-field')) {
  customElements.define('flex-editable-field', FlexEditableField)
}
```

In `src/design-system/register.ts`:

```typescript
import './components/flex-editable-field/client'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-editable-field.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-editable-field test/design-system/components/flex-editable-field.test.ts src/design-system/register.ts
git commit -m "feat(editable-field): chips + …more expander for the 11 field operations"
```

---

## Phase 6 — Chat unified into the buffer

### Task 16: Refactor handleAccept to dispatch stage-batch

**Files:**
- Modify: `src/design-system/components/flex-form-editor/client.ts`
- Modify: `test/design-system/components/flex-form-editor.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the editor test file:

```typescript
describe('flex-form-editor chat unification', () => {
  it('handleAccept stages the proposed batch instead of POSTing /accept', async () => {
    const el = mountEditor() as any
    let posted = false
    globalThis.fetch = (async () => {
      posted = true
      return new Response('{}', { status: 200 })
    }) as any

    el.proposal = {
      commands: [{ kind: 'renamePage', id: 'p1', title: 'Renamed' }],
      explanation: 'Rename for clarity',
      originalIntent: 'rename it',
    }
    let projected: { state: any; bufferLength: number } | null = null
    el.addEventListener('formeditor:state-projected', (e: any) => {
      projected = e.detail
    })
    el.handleAccept()
    await new Promise((r) => setTimeout(r, 0))

    expect(posted).toBe(false)
    expect(projected!.bufferLength).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test test/design-system/components/flex-form-editor.test.ts -t "handleAccept stages"
```

Expected: FAIL — current `handleAccept` calls fetch.

- [ ] **Step 3: Refactor `handleAccept` in `flex-form-editor/client.ts`**

Replace the existing `handleAccept` method body with:

```typescript
private handleAccept() {
  if (!this.proposal) return
  const proposal = this.proposal
  this.proposal = null
  this.dispatchEvent(
    new CustomEvent('formeditor:stage-batch', {
      detail: {
        commands: proposal.commands,
        summary: proposal.explanation,
        source: 'llm',
      },
      bubbles: true,
      composed: true,
    }),
  )
  this.assistant?.addMessage('system', `Staged: ${proposal.explanation}`)
}
```

Also expose `handleAccept` as a regular method (drop the `private` modifier so the test can call it, or wrap with a public alias `acceptProposal()`):

```typescript
acceptProposal() {
  this.handleAccept()
}
```

Update the test to call `el.acceptProposal()` instead of `el.handleAccept()`.

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test test/design-system/components/flex-form-editor.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-form-editor/client.ts test/design-system/components/flex-form-editor.test.ts
git commit -m "feat(editor): chat Accept stages into shared buffer instead of committing directly"
```

---

### Task 17: Remove `/edit/accept` and `/edit/execute`

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`
- Modify: `src/design-system/components/flex-form-editor/client.ts` (remove `handleManual`, which posted to `/execute`)

- [ ] **Step 1: Delete the route handlers and the manual handler**

In `src/entrypoints/app/routes/owner/edit/index.tsx`, remove the `app.post('/:owner/:slug/edit/accept', ...)` and `app.post('/:owner/:slug/edit/execute', ...)` blocks entirely.

In `src/design-system/components/flex-form-editor/client.ts`:
- Remove the `handleManual` method.
- Remove the `this.addEventListener('formeditor:manual-command', ...)` listener inside `bindEvents` (the structure component now dispatches `formeditor:stage-command` per Task 7).

- [ ] **Step 2: Run the full test suite**

```bash
bun test
```

Expected: all tests pass. If any test references `/edit/accept`, `/edit/execute`, or `formeditor:manual-command`, update it to use `/edit/save` and `formeditor:stage-command`.

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/app/routes/owner/edit/index.tsx src/design-system/components/flex-form-editor/client.ts
git commit -m "refactor(editor): remove /edit/accept and /edit/execute now that all commits go through /edit/save"
```

---

## Phase 7 — Integration test and final polish

### Task 18: End-to-end edit flow integration test

**Files:**
- Create: `test/forms/edit-flow.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { Hono } from 'hono'
import type { SessionUser } from '../../src/services/auth/session'
import { createEditRoutes } from '../../src/entrypoints/app/routes/owner/edit'
import { createFormProjectRepo } from '../../src/services/form-project-repo'
import { createProjectService } from '../../src/services/project-service'
import { createStrategyRegistry } from '../../src/services/strategy-registry'
import { createProjectStore } from '../../src/services/storage'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_DIR = 'test-data/edit-flow'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = { login: 'maya', name: 'Maya', avatarUrl: '' }
const dummyExtractor = {
  async extract() {
    return { spec: testDataSpec, formSpec: testFormSpec, confidence: [] }
  },
}

describe('edit flow: mixed inline + chat batch produces one commit', () => {
  let app: Hono
  let service: ReturnType<typeof createProjectService>
  let slug: string

  beforeAll(async () => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(REPOS_PATH, { recursive: true })
    const store = createProjectStore(DB_PATH)
    const repo = createFormProjectRepo(REPOS_PATH)
    // biome-ignore lint/suspicious/noExplicitAny: dummy extractor
    service = createProjectService(store, repo, dummyExtractor as any)
    const project = await service.createProject(
      'maya',
      Buffer.from('fake'),
      testUser,
    )
    slug = project.slug
    await new Promise((r) => setTimeout(r, 500))
    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', testUser)
      await next()
    })
    app.route(
      '/',
      createEditRoutes(service, createStrategyRegistry({ default: null as any })),
    )
  })

  afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

  it('saves a buffer of mixed-source commands as one commit', async () => {
    const view = await service.getProject('maya', slug, testUser)
    const firstPageId = view.formSpec!.pages[0].id

    const res = await app.request(`/maya/${slug}/edit/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { kind: 'renamePage', id: firstPageId, title: 'Edited inline' },
          { kind: 'setDeliveryMode', pageId: firstPageId, mode: 'conversational' },
        ],
        parentSha: view.currentSha,
        source: 'manual',
      }),
    })
    expect(res.status).toBe(200)

    const log = await service.getShapingLog('maya', slug)
    const last = log[0]
    expect(last.commands).toHaveLength(2)
    expect(last.explanation).toContain('Rename page')
    expect(last.explanation).toContain('delivery mode')
  })
})
```

- [ ] **Step 2: Run test**

```bash
bun test test/forms/edit-flow.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add test/forms/edit-flow.test.ts
git commit -m "test(edit-flow): integration coverage for the mixed-source save batch"
```

---

### Task 19: Final check, format, and visual smoke

**Files:** none changed; this is a verification checkpoint.

- [ ] **Step 1: Format and lint**

```bash
bunx @biomejs/biome check --write .
```

- [ ] **Step 2: Run the full check**

```bash
bun run build:css && bun run check
```

Expected: PASS — lint, type check, all 600+ tests.

- [ ] **Step 3: Visual smoke**

Start dev server:

```bash
bun run dev
```

Walk through the demo path on a project that has a FormSpec:

1. Open `/<owner>/<slug>/edit`.
2. Verify page tabs appear, the page title is editable, and groups render with their fields as `flex-editable-field` rows.
3. Rename a field inline → after 400ms, "(1) pending" appears in the breadcrumb, "Save" and "Discard" become visible.
4. Open the assistant, ask for a change, click Accept → buffer count grows by the number of LLM commands, popover lists both inline and chat commands.
5. Click Save → server returns new sha, buffer clears, breadcrumb hides Save/Discard. The shaping log on the right (or in the assistant) shows one entry containing all the changes.
6. Refresh the page → state matches what was just saved.
7. Repeat steps 3 and click Discard → buffer clears, page reverts visually.

If any step fails, file a follow-up task; do not patch ad hoc.

- [ ] **Step 4: Commit any formatter-only changes**

```bash
git status
# if there are unstaged formatter changes:
git add .
git commit -m "chore: biome format pass"
```

- [ ] **Step 5: Done**

The branch is ready for `/finish-story`.

---

## Notes for the implementing engineer

- **Architecture rule:** new code is in `src/design-system/components/` and `src/services/forms/shaping/`. Both layers may import from `services/data-collection`, `services/forms`, and `shared`. Do not import `entrypoints/*` from anywhere; do not import design-system from services. `test/architecture/dependency-rule.test.ts` will fail noisily if you do.
- **Naming:** new event types use the `formeditor:` prefix; new commands match the existing kind strings exactly.
- **No CSS regressions:** stylesheets must use `--flex-*` tokens. `bun run lint:css` (stylelint) catches violations.
- **Test discipline:** write the test first; run it; see it fail; then implement. Phase 1 is the most important to get right — it is the foundation everything else relies on.
- **Commit cadence:** one commit per task. Resist the urge to combine.
