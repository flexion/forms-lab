# Command-Based Shaping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current full-spec-rewrite form shaper with a command-based system where the LLM emits domain commands via tool use, a pure executor applies them, and a root coordinator custom element mediates the client-side UX through a typed event protocol.

**Architecture:** Commands are a discriminated union of plain objects. A pure executor applies them to a `ProjectState` bundling FormSpec + DataCollectionSpec. The LLM uses AI SDK tool use to emit command sequences. A single root custom element (`flex-form-editor`) owns client state and coordinates child elements via DOM-bubbled events. One accepted batch = one git commit + one structured log entry.

**Tech Stack:** TypeScript, Hono JSX (server), custom elements (client), AI SDK + Bedrock, Zod, Bun test, existing FormProjectRepo for git persistence.

---

## File Structure

### New files (command system)

```
src/services/forms/shaping/
  commands.ts            — Command discriminated union types + Zod schemas
  executor.ts            — executeCommand + executeBatch pure functions
  humanize.ts            — Render commands as human-readable strings
  projector.ts           — Client-safe executor (same logic, no server deps)
  tools.ts               — AI SDK tool definitions (one per command kind)
  bedrock-shaper.ts      — Tool-use LLM implementation (replaces existing file)
```

### New files (custom elements)

```
src/design-system/components/flex-form-editor/
  index.tsx              — Server-rendered shell JSX
  client.ts              — Root coordinator custom element
  protocol.ts            — Shared event type definitions
  styles.css

src/design-system/components/flex-command-proposal/
  client.ts              — Proposal UI: explanation, command list, accept/refine
  styles.css

src/design-system/components/flex-form-structure/
  client.ts              — Renders current/projected structure from state updates
  styles.css
```

### Modified files

```
src/services/data-collection/types.ts       — Add optional control field
src/services/forms/shaping/registry.ts      — Use new shaper interface
src/services/project-service.ts             — Add command log persistence
src/entrypoints/app/routes/owner/edit/index.tsx — Rewrite routes to return JSON
src/entrypoints/app/routes/owner/edit/components.tsx — Replace EditorPage shell
src/entrypoints/app/public/styles.css       — Add imports for new components
src/design-system/register.ts               — Register new custom elements
```

### Deleted files

```
src/services/forms/shaping/differ.ts                — Commands are the diff
src/services/forms/shaping/prompts/shape-intent.ts  — Replaced by tools
src/services/forms/shaping/prompts/suggest-modes.ts — Not needed in new model
test/forms/shaping/differ.test.ts                   — Replaced by executor tests
test/forms/shaping/bedrock-shaper.test.ts           — Replaced by new shaper tests
src/design-system/components/flex-intent-input/     — Replaced by coordinator
```

---

## Task 1: Add `control` field to DataRequirement

Expose the `control` field to let Maya explicitly pick radio/select for choice fields.

**Files:**
- Modify: `src/services/data-collection/types.ts`

- [ ] **Step 1: Write the failing test**

Create `test/forms/shaping/data-requirement-control.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import type { DataRequirement } from '../../../src/services/data-collection/types'

describe('DataRequirement.control', () => {
  it('accepts radio control for choice fields', () => {
    const req: DataRequirement = {
      id: 'r1',
      fieldName: 'color',
      label: 'Color',
      fieldType: 'choice',
      required: true,
      choices: ['red', 'blue'],
      control: 'radio',
    }
    expect(req.control).toBe('radio')
  })

  it('accepts select control for choice fields', () => {
    const req: DataRequirement = {
      id: 'r2',
      fieldName: 'state',
      label: 'State',
      fieldType: 'choice',
      required: true,
      control: 'select',
    }
    expect(req.control).toBe('select')
  })

  it('treats control as optional', () => {
    const req: DataRequirement = {
      id: 'r3',
      fieldName: 'x',
      label: 'X',
      fieldType: 'text',
      required: false,
    }
    expect(req.control).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/shaping/data-requirement-control.test.ts`
Expected: TypeScript error — `control` does not exist on `DataRequirement`

- [ ] **Step 3: Add the field to the type**

In `src/services/data-collection/types.ts`, update `DataRequirement`:

```typescript
export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  validation?: ValidationRule[]
  condition?: FieldCondition
  sensitivity?: SensitivityLevel
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  control?: 'radio' | 'select' | 'checkbox' | 'toggle'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/forms/shaping/data-requirement-control.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add test/forms/shaping/data-requirement-control.test.ts src/services/data-collection/types.ts
git commit -m "feat(data-collection): add optional control field to DataRequirement"
```

---

## Task 2: Define Command type union and Zod schemas

**Files:**
- Create: `src/services/forms/shaping/commands.ts`
- Create: `test/forms/shaping/commands.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/forms/shaping/commands.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import {
  type Command,
  commandSchema,
  type ProjectState,
} from '../../../src/services/forms/shaping/commands'
import type { DataCollectionSpec } from '../../../src/services/data-collection/types'
import type { FormSpec } from '../../../src/services/forms/types'

describe('Command schemas', () => {
  it('validates reorderPages command', () => {
    const command: Command = { kind: 'reorderPages', order: ['p1', 'p2'] }
    expect(commandSchema.parse(command)).toEqual(command)
  })

  it('validates swapPages command', () => {
    const command: Command = { kind: 'swapPages', a: 'p1', b: 'p2' }
    expect(commandSchema.parse(command)).toEqual(command)
  })

  it('validates addField command', () => {
    const command: Command = {
      kind: 'addField',
      groupId: 'g1',
      label: 'Name',
      fieldType: 'text',
      required: true,
    }
    expect(commandSchema.parse(command)).toEqual(command)
  })

  it('rejects unknown command kinds', () => {
    expect(() => commandSchema.parse({ kind: 'fly', id: 'p1' })).toThrow()
  })

  it('ProjectState bundles both specs', () => {
    const state: ProjectState = {
      formSpec: { id: 'f1', specId: 's1', title: 'T', pages: [] } as FormSpec,
      dataSpec: { id: 's1', title: 'T', description: '', groups: [] } as DataCollectionSpec,
    }
    expect(state.formSpec.id).toBe('f1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/shaping/commands.test.ts`
Expected: FAIL — cannot resolve `commands`

- [ ] **Step 3: Create the commands module**

Create `src/services/forms/shaping/commands.ts`:

```typescript
import { z } from 'zod'
import type {
  DataCollectionSpec,
  FieldCondition,
  FieldType,
  SensitivityLevel,
} from '../../data-collection/types'
import type { DeliveryMode, FormSpec } from '../types'

export interface ProjectState {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
}

const deliveryModeSchema = z.enum(['static', 'conversational', 'hybrid'])
const fieldTypeSchema = z.enum([
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
])
const sensitivitySchema = z.enum(['low', 'medium', 'high', 'pii'])
const controlSchema = z.enum(['radio', 'select', 'checkbox', 'toggle'])
const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

// Page operations
const reorderPagesSchema = z.object({
  kind: z.literal('reorderPages'),
  order: z.array(z.string()).min(1),
})
const swapPagesSchema = z.object({
  kind: z.literal('swapPages'),
  a: z.string(),
  b: z.string(),
})
const movePageSchema = z.object({
  kind: z.literal('movePage'),
  id: z.string(),
  toIndex: z.number().int().min(0),
})
const addPageSchema = z.object({
  kind: z.literal('addPage'),
  afterPageId: z.string().optional(),
  title: z.string(),
  deliveryMode: deliveryModeSchema.optional(),
})
const removePageSchema = z.object({
  kind: z.literal('removePage'),
  id: z.string(),
  moveGroupsTo: z.string().optional(),
})
const renamePageSchema = z.object({
  kind: z.literal('renamePage'),
  id: z.string(),
  title: z.string(),
})
const splitPageSchema = z.object({
  kind: z.literal('splitPage'),
  id: z.string(),
  newTitle: z.string(),
  groupsToMove: z.array(z.string()),
})
const mergePagesSchema = z.object({
  kind: z.literal('mergePages'),
  intoId: z.string(),
  fromId: z.string(),
})
const setDeliveryModeSchema = z.object({
  kind: z.literal('setDeliveryMode'),
  pageId: z.string(),
  mode: deliveryModeSchema,
})

// Group operations
const moveGroupSchema = z.object({
  kind: z.literal('moveGroup'),
  groupId: z.string(),
  toPageId: z.string(),
  atIndex: z.number().int().min(0).optional(),
})
const renameGroupSchema = z.object({
  kind: z.literal('renameGroup'),
  id: z.string(),
  title: z.string(),
})
const addGroupSchema = z.object({
  kind: z.literal('addGroup'),
  pageId: z.string(),
  title: z.string(),
})
const removeGroupSchema = z.object({
  kind: z.literal('removeGroup'),
  id: z.string(),
  moveFieldsTo: z.string().optional(),
})
const splitGroupSchema = z.object({
  kind: z.literal('splitGroup'),
  id: z.string(),
  newTitle: z.string(),
  fieldsToMove: z.array(z.string()),
})
const mergeGroupsSchema = z.object({
  kind: z.literal('mergeGroups'),
  intoId: z.string(),
  fromId: z.string(),
})

// Field operations
const moveFieldSchema = z.object({
  kind: z.literal('moveField'),
  fieldId: z.string(),
  toGroupId: z.string(),
  atIndex: z.number().int().min(0).optional(),
})
const reorderFieldsSchema = z.object({
  kind: z.literal('reorderFields'),
  groupId: z.string(),
  order: z.array(z.string()).min(1),
})
const relabelFieldSchema = z.object({
  kind: z.literal('relabelField'),
  id: z.string(),
  label: z.string(),
  helpText: z.string().optional(),
})
const setRequiredSchema = z.object({
  kind: z.literal('setRequired'),
  id: z.string(),
  required: z.boolean(),
})
const setFieldConditionSchema = z.object({
  kind: z.literal('setFieldCondition'),
  id: z.string(),
  condition: conditionSchema.nullable(),
})
const setFieldSensitivitySchema = z.object({
  kind: z.literal('setFieldSensitivity'),
  id: z.string(),
  level: sensitivitySchema,
})
const changeFieldTypeSchema = z.object({
  kind: z.literal('changeFieldType'),
  id: z.string(),
  fieldType: fieldTypeSchema,
  choices: z.array(z.string()).optional(),
})
const setFieldControlSchema = z.object({
  kind: z.literal('setFieldControl'),
  id: z.string(),
  control: controlSchema,
})
const addFieldSchema = z.object({
  kind: z.literal('addField'),
  groupId: z.string(),
  label: z.string(),
  fieldType: fieldTypeSchema,
  required: z.boolean(),
})
const removeFieldSchema = z.object({
  kind: z.literal('removeField'),
  id: z.string(),
})

export const commandSchema = z.discriminatedUnion('kind', [
  reorderPagesSchema,
  swapPagesSchema,
  movePageSchema,
  addPageSchema,
  removePageSchema,
  renamePageSchema,
  splitPageSchema,
  mergePagesSchema,
  setDeliveryModeSchema,
  moveGroupSchema,
  renameGroupSchema,
  addGroupSchema,
  removeGroupSchema,
  splitGroupSchema,
  mergeGroupsSchema,
  moveFieldSchema,
  reorderFieldsSchema,
  relabelFieldSchema,
  setRequiredSchema,
  setFieldConditionSchema,
  setFieldSensitivitySchema,
  changeFieldTypeSchema,
  setFieldControlSchema,
  addFieldSchema,
  removeFieldSchema,
])

export type Command = z.infer<typeof commandSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/forms/shaping/commands.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/commands.ts test/forms/shaping/commands.test.ts
git commit -m "feat(shaping): define Command type union and Zod schemas"
```

---

## Task 3: Executor — page commands

**Files:**
- Create: `src/services/forms/shaping/executor.ts`
- Create: `test/forms/shaping/executor-pages.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/forms/shaping/executor-pages.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { executeCommand } from '../../../src/services/forms/shaping/executor'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import type { DataCollectionSpec } from '../../../src/services/data-collection/types'
import type { FormSpec } from '../../../src/services/forms/types'

function fixture(): ProjectState {
  const dataSpec: DataCollectionSpec = {
    id: 'ds1',
    title: 'Test',
    description: '',
    groups: [
      { id: 'g1', title: 'G1', requirements: [] },
      { id: 'g2', title: 'G2', requirements: [] },
      { id: 'g3', title: 'G3', requirements: [] },
    ],
  }
  const formSpec: FormSpec = {
    id: 'f1',
    specId: 'ds1',
    title: 'Form',
    pages: [
      { id: 'p1', title: 'Page 1', groups: ['g1'] },
      { id: 'p2', title: 'Page 2', groups: ['g2'] },
      { id: 'p3', title: 'Page 3', groups: ['g3'] },
    ],
  }
  return { formSpec, dataSpec }
}

describe('executor — page commands', () => {
  it('swapPages exchanges two pages in the array', () => {
    const result = executeCommand(fixture(), {
      kind: 'swapPages',
      a: 'p1',
      b: 'p3',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual([
        'p3',
        'p2',
        'p1',
      ])
    }
  })

  it('swapPages rejects unknown page id', () => {
    const result = executeCommand(fixture(), {
      kind: 'swapPages',
      a: 'p1',
      b: 'nope',
    })
    expect(result.ok).toBe(false)
  })

  it('reorderPages applies new order', () => {
    const result = executeCommand(fixture(), {
      kind: 'reorderPages',
      order: ['p3', 'p1', 'p2'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual([
        'p3',
        'p1',
        'p2',
      ])
    }
  })

  it('reorderPages rejects incomplete order', () => {
    const result = executeCommand(fixture(), {
      kind: 'reorderPages',
      order: ['p1', 'p2'],
    })
    expect(result.ok).toBe(false)
  })

  it('movePage shifts a page to new index', () => {
    const result = executeCommand(fixture(), {
      kind: 'movePage',
      id: 'p1',
      toIndex: 2,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual([
        'p2',
        'p3',
        'p1',
      ])
    }
  })

  it('renamePage updates the title', () => {
    const result = executeCommand(fixture(), {
      kind: 'renamePage',
      id: 'p2',
      title: 'New Title',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[1].title).toBe('New Title')
    }
  })

  it('addPage inserts after specified page', () => {
    const result = executeCommand(fixture(), {
      kind: 'addPage',
      afterPageId: 'p1',
      title: 'Interstitial',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.title)).toEqual([
        'Page 1',
        'Interstitial',
        'Page 2',
        'Page 3',
      ])
    }
  })

  it('removePage fails when page has groups with no relocation', () => {
    const result = executeCommand(fixture(), {
      kind: 'removePage',
      id: 'p1',
    })
    expect(result.ok).toBe(false)
  })

  it('removePage succeeds when moveGroupsTo is provided', () => {
    const result = executeCommand(fixture(), {
      kind: 'removePage',
      id: 'p1',
      moveGroupsTo: 'p2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.map((p) => p.id)).toEqual(['p2', 'p3'])
      expect(result.state.formSpec.pages[0].groups).toEqual(['g2', 'g1'])
    }
  })

  it('setDeliveryMode updates page delivery mode', () => {
    const result = executeCommand(fixture(), {
      kind: 'setDeliveryMode',
      pageId: 'p2',
      mode: 'conversational',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[1].deliveryMode).toBe('conversational')
    }
  })

  it('splitPage moves selected groups to new page after original', () => {
    const stateWith2Groups = {
      ...fixture(),
      formSpec: {
        ...fixture().formSpec,
        pages: [
          { id: 'p1', title: 'Page 1', groups: ['g1', 'g2'] },
          { id: 'p2', title: 'Page 2', groups: ['g3'] },
        ],
      },
    }
    const result = executeCommand(stateWith2Groups, {
      kind: 'splitPage',
      id: 'p1',
      newTitle: 'Page 1b',
      groupsToMove: ['g2'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.length).toBe(3)
      expect(result.state.formSpec.pages[0].groups).toEqual(['g1'])
      expect(result.state.formSpec.pages[1].title).toBe('Page 1b')
      expect(result.state.formSpec.pages[1].groups).toEqual(['g2'])
    }
  })

  it('mergePages moves groups from source into destination and removes source', () => {
    const result = executeCommand(fixture(), {
      kind: 'mergePages',
      intoId: 'p1',
      fromId: 'p2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages.length).toBe(2)
      expect(result.state.formSpec.pages[0].groups).toEqual(['g1', 'g2'])
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/shaping/executor-pages.test.ts`
Expected: FAIL — cannot resolve `executor`

- [ ] **Step 3: Implement executor for page commands**

Create `src/services/forms/shaping/executor.ts`:

```typescript
import type { FormPage, FormSpec } from '../types'
import type { Command, ProjectState } from './commands'

export type ExecutorResult =
  | { ok: true; state: ProjectState }
  | { ok: false; error: string; command: Command }

function fail(command: Command, error: string): ExecutorResult {
  return { ok: false, error, command }
}

function ok(state: ProjectState): ExecutorResult {
  return { ok: true, state }
}

function cloneFormSpec(spec: FormSpec): FormSpec {
  return {
    ...spec,
    pages: spec.pages.map((p) => ({ ...p, groups: [...p.groups] })),
  }
}

export function executeCommand(
  state: ProjectState,
  command: Command,
): ExecutorResult {
  switch (command.kind) {
    case 'reorderPages':
      return execReorderPages(state, command)
    case 'swapPages':
      return execSwapPages(state, command)
    case 'movePage':
      return execMovePage(state, command)
    case 'addPage':
      return execAddPage(state, command)
    case 'removePage':
      return execRemovePage(state, command)
    case 'renamePage':
      return execRenamePage(state, command)
    case 'splitPage':
      return execSplitPage(state, command)
    case 'mergePages':
      return execMergePages(state, command)
    case 'setDeliveryMode':
      return execSetDeliveryMode(state, command)
    default:
      return fail(command, `Command kind not yet implemented: ${command.kind}`)
  }
}

function execReorderPages(
  state: ProjectState,
  command: Extract<Command, { kind: 'reorderPages' }>,
): ExecutorResult {
  const { order } = command
  const currentIds = state.formSpec.pages.map((p) => p.id)
  if (
    order.length !== currentIds.length ||
    !order.every((id) => currentIds.includes(id))
  ) {
    return fail(command, 'order must be a permutation of existing page ids')
  }
  const byId = new Map(state.formSpec.pages.map((p) => [p.id, p]))
  const formSpec = cloneFormSpec(state.formSpec)
  formSpec.pages = order.map((id) => ({ ...byId.get(id)!, groups: [...byId.get(id)!.groups] }))
  return ok({ ...state, formSpec })
}

function execSwapPages(
  state: ProjectState,
  command: Extract<Command, { kind: 'swapPages' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const aIdx = formSpec.pages.findIndex((p) => p.id === command.a)
  const bIdx = formSpec.pages.findIndex((p) => p.id === command.b)
  if (aIdx < 0) return fail(command, `Unknown page id: ${command.a}`)
  if (bIdx < 0) return fail(command, `Unknown page id: ${command.b}`)
  ;[formSpec.pages[aIdx], formSpec.pages[bIdx]] = [
    formSpec.pages[bIdx],
    formSpec.pages[aIdx],
  ]
  return ok({ ...state, formSpec })
}

function execMovePage(
  state: ProjectState,
  command: Extract<Command, { kind: 'movePage' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const idx = formSpec.pages.findIndex((p) => p.id === command.id)
  if (idx < 0) return fail(command, `Unknown page id: ${command.id}`)
  if (command.toIndex < 0 || command.toIndex >= formSpec.pages.length) {
    return fail(command, `toIndex out of range: ${command.toIndex}`)
  }
  const [page] = formSpec.pages.splice(idx, 1)
  formSpec.pages.splice(command.toIndex, 0, page)
  return ok({ ...state, formSpec })
}

function execAddPage(
  state: ProjectState,
  command: Extract<Command, { kind: 'addPage' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const newPage: FormPage = {
    id: `page-new-${crypto.randomUUID().slice(0, 8)}`,
    title: command.title,
    groups: [],
    deliveryMode: command.deliveryMode,
  }
  if (command.afterPageId) {
    const idx = formSpec.pages.findIndex((p) => p.id === command.afterPageId)
    if (idx < 0) {
      return fail(command, `Unknown afterPageId: ${command.afterPageId}`)
    }
    formSpec.pages.splice(idx + 1, 0, newPage)
  } else {
    formSpec.pages.push(newPage)
  }
  return ok({ ...state, formSpec })
}

function execRemovePage(
  state: ProjectState,
  command: Extract<Command, { kind: 'removePage' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const idx = formSpec.pages.findIndex((p) => p.id === command.id)
  if (idx < 0) return fail(command, `Unknown page id: ${command.id}`)
  const page = formSpec.pages[idx]
  if (page.groups.length > 0 && !command.moveGroupsTo) {
    return fail(
      command,
      `Page has groups; specify moveGroupsTo to relocate them`,
    )
  }
  if (command.moveGroupsTo && page.groups.length > 0) {
    const destIdx = formSpec.pages.findIndex(
      (p) => p.id === command.moveGroupsTo,
    )
    if (destIdx < 0) {
      return fail(command, `Unknown moveGroupsTo page: ${command.moveGroupsTo}`)
    }
    formSpec.pages[destIdx] = {
      ...formSpec.pages[destIdx],
      groups: [...formSpec.pages[destIdx].groups, ...page.groups],
    }
  }
  formSpec.pages.splice(idx, 1)
  return ok({ ...state, formSpec })
}

function execRenamePage(
  state: ProjectState,
  command: Extract<Command, { kind: 'renamePage' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const idx = formSpec.pages.findIndex((p) => p.id === command.id)
  if (idx < 0) return fail(command, `Unknown page id: ${command.id}`)
  formSpec.pages[idx] = { ...formSpec.pages[idx], title: command.title }
  return ok({ ...state, formSpec })
}

function execSplitPage(
  state: ProjectState,
  command: Extract<Command, { kind: 'splitPage' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const idx = formSpec.pages.findIndex((p) => p.id === command.id)
  if (idx < 0) return fail(command, `Unknown page id: ${command.id}`)
  const source = formSpec.pages[idx]
  for (const gid of command.groupsToMove) {
    if (!source.groups.includes(gid)) {
      return fail(command, `Group ${gid} not found on page ${command.id}`)
    }
  }
  const remaining = source.groups.filter(
    (g) => !command.groupsToMove.includes(g),
  )
  formSpec.pages[idx] = { ...source, groups: remaining }
  const newPage: FormPage = {
    id: `page-new-${crypto.randomUUID().slice(0, 8)}`,
    title: command.newTitle,
    groups: command.groupsToMove,
  }
  formSpec.pages.splice(idx + 1, 0, newPage)
  return ok({ ...state, formSpec })
}

function execMergePages(
  state: ProjectState,
  command: Extract<Command, { kind: 'mergePages' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const intoIdx = formSpec.pages.findIndex((p) => p.id === command.intoId)
  const fromIdx = formSpec.pages.findIndex((p) => p.id === command.fromId)
  if (intoIdx < 0) return fail(command, `Unknown intoId: ${command.intoId}`)
  if (fromIdx < 0) return fail(command, `Unknown fromId: ${command.fromId}`)
  formSpec.pages[intoIdx] = {
    ...formSpec.pages[intoIdx],
    groups: [
      ...formSpec.pages[intoIdx].groups,
      ...formSpec.pages[fromIdx].groups,
    ],
  }
  formSpec.pages.splice(fromIdx, 1)
  return ok({ ...state, formSpec })
}

function execSetDeliveryMode(
  state: ProjectState,
  command: Extract<Command, { kind: 'setDeliveryMode' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const idx = formSpec.pages.findIndex((p) => p.id === command.pageId)
  if (idx < 0) return fail(command, `Unknown pageId: ${command.pageId}`)
  formSpec.pages[idx] = { ...formSpec.pages[idx], deliveryMode: command.mode }
  return ok({ ...state, formSpec })
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/shaping/executor-pages.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/executor.ts test/forms/shaping/executor-pages.test.ts
git commit -m "feat(shaping): implement executor for page commands"
```

---

## Task 4: Executor — group commands

**Files:**
- Modify: `src/services/forms/shaping/executor.ts`
- Create: `test/forms/shaping/executor-groups.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/forms/shaping/executor-groups.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { executeCommand } from '../../../src/services/forms/shaping/executor'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import type { DataCollectionSpec } from '../../../src/services/data-collection/types'
import type { FormSpec } from '../../../src/services/forms/types'

function fixture(): ProjectState {
  const dataSpec: DataCollectionSpec = {
    id: 'ds1',
    title: 'Test',
    description: '',
    groups: [
      { id: 'g1', title: 'Personal Info', requirements: [] },
      { id: 'g2', title: 'Employment', requirements: [] },
      { id: 'g3', title: 'Income', requirements: [] },
    ],
  }
  const formSpec: FormSpec = {
    id: 'f1',
    specId: 'ds1',
    title: 'Form',
    pages: [
      { id: 'p1', title: 'Page 1', groups: ['g1', 'g2'] },
      { id: 'p2', title: 'Page 2', groups: ['g3'] },
    ],
  }
  return { formSpec, dataSpec }
}

describe('executor — group commands', () => {
  it('moveGroup moves a group from one page to another', () => {
    const result = executeCommand(fixture(), {
      kind: 'moveGroup',
      groupId: 'g2',
      toPageId: 'p2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].groups).toEqual(['g1'])
      expect(result.state.formSpec.pages[1].groups).toEqual(['g3', 'g2'])
    }
  })

  it('moveGroup rejects unknown groupId', () => {
    const result = executeCommand(fixture(), {
      kind: 'moveGroup',
      groupId: 'nope',
      toPageId: 'p2',
    })
    expect(result.ok).toBe(false)
  })

  it('renameGroup updates the group title in dataSpec', () => {
    const result = executeCommand(fixture(), {
      kind: 'renameGroup',
      id: 'g2',
      title: 'Work',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const renamed = result.state.dataSpec.groups.find((g) => g.id === 'g2')
      expect(renamed?.title).toBe('Work')
    }
  })

  it('addGroup creates an empty group and references it on the page', () => {
    const result = executeCommand(fixture(), {
      kind: 'addGroup',
      pageId: 'p2',
      title: 'New Section',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const newGroup = result.state.dataSpec.groups.find(
        (g) => g.title === 'New Section',
      )
      expect(newGroup).toBeDefined()
      expect(newGroup?.requirements).toEqual([])
      expect(result.state.formSpec.pages[1].groups).toContain(newGroup!.id)
    }
  })

  it('removeGroup fails if group has fields and no relocation', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f1',
        fieldName: 'x',
        label: 'X',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, { kind: 'removeGroup', id: 'g2' })
    expect(result.ok).toBe(false)
  })

  it('removeGroup succeeds when moveFieldsTo is provided', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f1',
        fieldName: 'x',
        label: 'X',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, {
      kind: 'removeGroup',
      id: 'g2',
      moveFieldsTo: 'g1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g1')?.requirements.length,
      ).toBe(1)
      expect(result.state.dataSpec.groups.find((g) => g.id === 'g2')).toBeUndefined()
    }
  })

  it('splitGroup creates a new group on the same page with selected fields', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f1',
        fieldName: 'a',
        label: 'A',
        fieldType: 'text',
        required: false,
      },
      {
        id: 'f2',
        fieldName: 'b',
        label: 'B',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, {
      kind: 'splitGroup',
      id: 'g2',
      newTitle: 'Extra',
      fieldsToMove: ['f2'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const orig = result.state.dataSpec.groups.find((g) => g.id === 'g2')
      const extra = result.state.dataSpec.groups.find((g) => g.title === 'Extra')
      expect(orig?.requirements.map((r) => r.id)).toEqual(['f1'])
      expect(extra?.requirements.map((r) => r.id)).toEqual(['f2'])
    }
  })

  it('mergeGroups combines fields into one and removes source', () => {
    const state = fixture()
    state.dataSpec.groups[0].requirements = [
      {
        id: 'f1',
        fieldName: 'a',
        label: 'A',
        fieldType: 'text',
        required: false,
      },
    ]
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f2',
        fieldName: 'b',
        label: 'B',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, {
      kind: 'mergeGroups',
      intoId: 'g1',
      fromId: 'g2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const merged = result.state.dataSpec.groups.find((g) => g.id === 'g1')
      expect(merged?.requirements.map((r) => r.id)).toEqual(['f1', 'f2'])
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g2'),
      ).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/shaping/executor-groups.test.ts`
Expected: FAIL — group command kinds not implemented

- [ ] **Step 3: Implement group commands**

In `src/services/forms/shaping/executor.ts`, extend the switch and add helpers:

```typescript
// Add imports at top
import type { DataCollectionSpec, RequirementGroup } from '../../data-collection/types'

// Helper — deep clone dataSpec
function cloneDataSpec(spec: DataCollectionSpec): DataCollectionSpec {
  return {
    ...spec,
    groups: spec.groups.map((g) => ({
      ...g,
      requirements: g.requirements.map((r) => ({ ...r })),
    })),
  }
}

// Generate group id
function generateGroupId(): string {
  return `group-new-${crypto.randomUUID().slice(0, 8)}`
}

// Extend the switch statement in executeCommand:
    case 'moveGroup':
      return execMoveGroup(state, command)
    case 'renameGroup':
      return execRenameGroup(state, command)
    case 'addGroup':
      return execAddGroup(state, command)
    case 'removeGroup':
      return execRemoveGroup(state, command)
    case 'splitGroup':
      return execSplitGroup(state, command)
    case 'mergeGroups':
      return execMergeGroups(state, command)

// Implementations:

function execMoveGroup(
  state: ProjectState,
  command: Extract<Command, { kind: 'moveGroup' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  // Find which page currently contains the group
  const fromPage = formSpec.pages.find((p) => p.groups.includes(command.groupId))
  if (!fromPage) return fail(command, `Unknown groupId: ${command.groupId}`)
  const toPage = formSpec.pages.find((p) => p.id === command.toPageId)
  if (!toPage) return fail(command, `Unknown toPageId: ${command.toPageId}`)
  fromPage.groups = fromPage.groups.filter((g) => g !== command.groupId)
  const atIndex = command.atIndex ?? toPage.groups.length
  toPage.groups.splice(atIndex, 0, command.groupId)
  return ok({ ...state, formSpec })
}

function execRenameGroup(
  state: ProjectState,
  command: Extract<Command, { kind: 'renameGroup' }>,
): ExecutorResult {
  const dataSpec = cloneDataSpec(state.dataSpec)
  const idx = dataSpec.groups.findIndex((g) => g.id === command.id)
  if (idx < 0) return fail(command, `Unknown group id: ${command.id}`)
  dataSpec.groups[idx] = { ...dataSpec.groups[idx], title: command.title }
  return ok({ ...state, dataSpec })
}

function execAddGroup(
  state: ProjectState,
  command: Extract<Command, { kind: 'addGroup' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const pageIdx = formSpec.pages.findIndex((p) => p.id === command.pageId)
  if (pageIdx < 0) return fail(command, `Unknown pageId: ${command.pageId}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  const newGroup: RequirementGroup = {
    id: generateGroupId(),
    title: command.title,
    requirements: [],
  }
  dataSpec.groups.push(newGroup)
  formSpec.pages[pageIdx] = {
    ...formSpec.pages[pageIdx],
    groups: [...formSpec.pages[pageIdx].groups, newGroup.id],
  }
  return ok({ formSpec, dataSpec })
}

function execRemoveGroup(
  state: ProjectState,
  command: Extract<Command, { kind: 'removeGroup' }>,
): ExecutorResult {
  const group = state.dataSpec.groups.find((g) => g.id === command.id)
  if (!group) return fail(command, `Unknown group id: ${command.id}`)

  if (group.requirements.length > 0 && !command.moveFieldsTo) {
    return fail(
      command,
      `Group has fields; specify moveFieldsTo to relocate them`,
    )
  }

  const dataSpec = cloneDataSpec(state.dataSpec)
  if (command.moveFieldsTo && group.requirements.length > 0) {
    const destIdx = dataSpec.groups.findIndex(
      (g) => g.id === command.moveFieldsTo,
    )
    if (destIdx < 0) {
      return fail(command, `Unknown moveFieldsTo group: ${command.moveFieldsTo}`)
    }
    dataSpec.groups[destIdx] = {
      ...dataSpec.groups[destIdx],
      requirements: [
        ...dataSpec.groups[destIdx].requirements,
        ...group.requirements.map((r) => ({ ...r })),
      ],
    }
  }
  dataSpec.groups = dataSpec.groups.filter((g) => g.id !== command.id)

  const formSpec = cloneFormSpec(state.formSpec)
  for (const page of formSpec.pages) {
    page.groups = page.groups.filter((g) => g !== command.id)
  }
  return ok({ formSpec, dataSpec })
}

function execSplitGroup(
  state: ProjectState,
  command: Extract<Command, { kind: 'splitGroup' }>,
): ExecutorResult {
  const sourceIdx = state.dataSpec.groups.findIndex((g) => g.id === command.id)
  if (sourceIdx < 0) return fail(command, `Unknown group id: ${command.id}`)
  const source = state.dataSpec.groups[sourceIdx]
  for (const fid of command.fieldsToMove) {
    if (!source.requirements.find((r) => r.id === fid)) {
      return fail(command, `Field ${fid} not found in group ${command.id}`)
    }
  }

  const dataSpec = cloneDataSpec(state.dataSpec)
  const newGroup: RequirementGroup = {
    id: generateGroupId(),
    title: command.newTitle,
    requirements: source.requirements
      .filter((r) => command.fieldsToMove.includes(r.id))
      .map((r) => ({ ...r })),
  }
  dataSpec.groups[sourceIdx] = {
    ...dataSpec.groups[sourceIdx],
    requirements: dataSpec.groups[sourceIdx].requirements.filter(
      (r) => !command.fieldsToMove.includes(r.id),
    ),
  }
  dataSpec.groups.push(newGroup)

  // Place new group on same page as source group
  const formSpec = cloneFormSpec(state.formSpec)
  const page = formSpec.pages.find((p) => p.groups.includes(command.id))
  if (page) {
    const pos = page.groups.indexOf(command.id)
    page.groups.splice(pos + 1, 0, newGroup.id)
  }
  return ok({ formSpec, dataSpec })
}

function execMergeGroups(
  state: ProjectState,
  command: Extract<Command, { kind: 'mergeGroups' }>,
): ExecutorResult {
  const dataSpec = cloneDataSpec(state.dataSpec)
  const intoIdx = dataSpec.groups.findIndex((g) => g.id === command.intoId)
  const fromIdx = dataSpec.groups.findIndex((g) => g.id === command.fromId)
  if (intoIdx < 0) return fail(command, `Unknown intoId: ${command.intoId}`)
  if (fromIdx < 0) return fail(command, `Unknown fromId: ${command.fromId}`)

  dataSpec.groups[intoIdx] = {
    ...dataSpec.groups[intoIdx],
    requirements: [
      ...dataSpec.groups[intoIdx].requirements,
      ...dataSpec.groups[fromIdx].requirements.map((r) => ({ ...r })),
    ],
  }
  dataSpec.groups.splice(fromIdx, 1)

  const formSpec = cloneFormSpec(state.formSpec)
  for (const page of formSpec.pages) {
    page.groups = page.groups.filter((g) => g !== command.fromId)
  }
  return ok({ formSpec, dataSpec })
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/shaping/executor-groups.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/executor.ts test/forms/shaping/executor-groups.test.ts
git commit -m "feat(shaping): implement executor for group commands"
```

---

## Task 5: Executor — field commands

**Files:**
- Modify: `src/services/forms/shaping/executor.ts`
- Create: `test/forms/shaping/executor-fields.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/forms/shaping/executor-fields.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { executeCommand } from '../../../src/services/forms/shaping/executor'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import type { DataCollectionSpec } from '../../../src/services/data-collection/types'
import type { FormSpec } from '../../../src/services/forms/types'

function fixture(): ProjectState {
  const dataSpec: DataCollectionSpec = {
    id: 'ds1',
    title: 'Test',
    description: '',
    groups: [
      {
        id: 'g1',
        title: 'Personal',
        requirements: [
          {
            id: 'f1',
            fieldName: 'name',
            label: 'Name',
            fieldType: 'text',
            required: true,
          },
          {
            id: 'f2',
            fieldName: 'age',
            label: 'Age',
            fieldType: 'number',
            required: false,
          },
        ],
      },
      {
        id: 'g2',
        title: 'Work',
        requirements: [
          {
            id: 'f3',
            fieldName: 'employer',
            label: 'Employer',
            fieldType: 'text',
            required: false,
          },
        ],
      },
    ],
  }
  const formSpec: FormSpec = {
    id: 'f1',
    specId: 'ds1',
    title: 'Form',
    pages: [{ id: 'p1', title: 'P1', groups: ['g1', 'g2'] }],
  }
  return { formSpec, dataSpec }
}

describe('executor — field commands', () => {
  it('moveField relocates a field to another group', () => {
    const result = executeCommand(fixture(), {
      kind: 'moveField',
      fieldId: 'f2',
      toGroupId: 'g2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g1')!
          .requirements.map((r) => r.id),
      ).toEqual(['f1'])
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g2')!
          .requirements.map((r) => r.id),
      ).toEqual(['f3', 'f2'])
    }
  })

  it('reorderFields reorders within a group', () => {
    const result = executeCommand(fixture(), {
      kind: 'reorderFields',
      groupId: 'g1',
      order: ['f2', 'f1'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[0].requirements.map((r) => r.id),
      ).toEqual(['f2', 'f1'])
    }
  })

  it('relabelField updates label and optional helpText', () => {
    const result = executeCommand(fixture(), {
      kind: 'relabelField',
      id: 'f1',
      label: 'Full name',
      helpText: 'First and last',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const f1 = result.state.dataSpec.groups[0].requirements[0]
      expect(f1.label).toBe('Full name')
      expect(f1.helpText).toBe('First and last')
    }
  })

  it('setRequired toggles the required flag', () => {
    const result = executeCommand(fixture(), {
      kind: 'setRequired',
      id: 'f2',
      required: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.dataSpec.groups[0].requirements[1].required).toBe(
        true,
      )
    }
  })

  it('setFieldCondition applies a condition', () => {
    const result = executeCommand(fixture(), {
      kind: 'setFieldCondition',
      id: 'f3',
      condition: { field: 'f1', operator: 'equals', value: 'Alice' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[1].requirements[0].condition?.field,
      ).toBe('f1')
    }
  })

  it('setFieldCondition clears a condition when null', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements[0].condition = {
      field: 'f1',
      operator: 'equals',
      value: 'Alice',
    }
    const result = executeCommand(state, {
      kind: 'setFieldCondition',
      id: 'f3',
      condition: null,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[1].requirements[0].condition,
      ).toBeUndefined()
    }
  })

  it('setFieldSensitivity updates sensitivity level', () => {
    const result = executeCommand(fixture(), {
      kind: 'setFieldSensitivity',
      id: 'f1',
      level: 'pii',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.dataSpec.groups[0].requirements[0].sensitivity).toBe(
        'pii',
      )
    }
  })

  it('changeFieldType updates fieldType and choices', () => {
    const result = executeCommand(fixture(), {
      kind: 'changeFieldType',
      id: 'f2',
      fieldType: 'choice',
      choices: ['low', 'medium', 'high'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const f = result.state.dataSpec.groups[0].requirements[1]
      expect(f.fieldType).toBe('choice')
      expect(f.choices).toEqual(['low', 'medium', 'high'])
    }
  })

  it('setFieldControl sets the control preference', () => {
    const result = executeCommand(fixture(), {
      kind: 'setFieldControl',
      id: 'f1',
      control: 'radio',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.dataSpec.groups[0].requirements[0].control).toBe(
        'radio',
      )
    }
  })

  it('addField creates a new field in the specified group', () => {
    const result = executeCommand(fixture(), {
      kind: 'addField',
      groupId: 'g2',
      label: 'Start date',
      fieldType: 'date',
      required: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const g2 = result.state.dataSpec.groups.find((g) => g.id === 'g2')!
      expect(g2.requirements.length).toBe(2)
      const added = g2.requirements.find((r) => r.label === 'Start date')
      expect(added?.fieldType).toBe('date')
      expect(added?.required).toBe(true)
    }
  })

  it('removeField deletes a field from its group', () => {
    const result = executeCommand(fixture(), {
      kind: 'removeField',
      id: 'f2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[0].requirements.map((r) => r.id),
      ).toEqual(['f1'])
    }
  })

  it('removeField rejects unknown field id', () => {
    const result = executeCommand(fixture(), {
      kind: 'removeField',
      id: 'nope',
    })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `bun test test/forms/shaping/executor-fields.test.ts`
Expected: FAIL — field command kinds not implemented

- [ ] **Step 3: Implement field commands**

In `src/services/forms/shaping/executor.ts`, extend the switch and add helpers:

```typescript
// Extend switch:
    case 'moveField':
      return execMoveField(state, command)
    case 'reorderFields':
      return execReorderFields(state, command)
    case 'relabelField':
      return execRelabelField(state, command)
    case 'setRequired':
      return execSetRequired(state, command)
    case 'setFieldCondition':
      return execSetFieldCondition(state, command)
    case 'setFieldSensitivity':
      return execSetFieldSensitivity(state, command)
    case 'changeFieldType':
      return execChangeFieldType(state, command)
    case 'setFieldControl':
      return execSetFieldControl(state, command)
    case 'addField':
      return execAddField(state, command)
    case 'removeField':
      return execRemoveField(state, command)

// Helpers:

function findFieldGroupIdx(
  state: ProjectState,
  fieldId: string,
): number {
  return state.dataSpec.groups.findIndex((g) =>
    g.requirements.some((r) => r.id === fieldId),
  )
}

function generateFieldId(): string {
  return `field-new-${crypto.randomUUID().slice(0, 8)}`
}

// Command handlers:

function execMoveField(
  state: ProjectState,
  command: Extract<Command, { kind: 'moveField' }>,
): ExecutorResult {
  const fromIdx = findFieldGroupIdx(state, command.fieldId)
  if (fromIdx < 0) return fail(command, `Unknown fieldId: ${command.fieldId}`)
  const toIdx = state.dataSpec.groups.findIndex(
    (g) => g.id === command.toGroupId,
  )
  if (toIdx < 0) return fail(command, `Unknown toGroupId: ${command.toGroupId}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  const field = dataSpec.groups[fromIdx].requirements.find(
    (r) => r.id === command.fieldId,
  )!
  dataSpec.groups[fromIdx] = {
    ...dataSpec.groups[fromIdx],
    requirements: dataSpec.groups[fromIdx].requirements.filter(
      (r) => r.id !== command.fieldId,
    ),
  }
  const atIndex = command.atIndex ?? dataSpec.groups[toIdx].requirements.length
  const updated = [...dataSpec.groups[toIdx].requirements]
  updated.splice(atIndex, 0, { ...field })
  dataSpec.groups[toIdx] = { ...dataSpec.groups[toIdx], requirements: updated }
  return ok({ ...state, dataSpec })
}

function execReorderFields(
  state: ProjectState,
  command: Extract<Command, { kind: 'reorderFields' }>,
): ExecutorResult {
  const groupIdx = state.dataSpec.groups.findIndex((g) => g.id === command.groupId)
  if (groupIdx < 0) return fail(command, `Unknown groupId: ${command.groupId}`)
  const group = state.dataSpec.groups[groupIdx]
  const currentIds = group.requirements.map((r) => r.id)
  if (
    command.order.length !== currentIds.length ||
    !command.order.every((id) => currentIds.includes(id))
  ) {
    return fail(command, `order must be a permutation of field ids in group ${command.groupId}`)
  }
  const byId = new Map(group.requirements.map((r) => [r.id, r]))
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx] = {
    ...group,
    requirements: command.order.map((id) => ({ ...byId.get(id)! })),
  }
  return ok({ ...state, dataSpec })
}

function execRelabelField(
  state: ProjectState,
  command: Extract<Command, { kind: 'relabelField' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx].requirements = dataSpec.groups[
    groupIdx
  ].requirements.map((r) =>
    r.id === command.id
      ? { ...r, label: command.label, helpText: command.helpText ?? r.helpText }
      : r,
  )
  return ok({ ...state, dataSpec })
}

function execSetRequired(
  state: ProjectState,
  command: Extract<Command, { kind: 'setRequired' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx].requirements = dataSpec.groups[
    groupIdx
  ].requirements.map((r) =>
    r.id === command.id ? { ...r, required: command.required } : r,
  )
  return ok({ ...state, dataSpec })
}

function execSetFieldCondition(
  state: ProjectState,
  command: Extract<Command, { kind: 'setFieldCondition' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx].requirements = dataSpec.groups[
    groupIdx
  ].requirements.map((r) => {
    if (r.id !== command.id) return r
    const { condition: _, ...rest } = r
    return command.condition ? { ...rest, condition: command.condition } : rest
  })
  return ok({ ...state, dataSpec })
}

function execSetFieldSensitivity(
  state: ProjectState,
  command: Extract<Command, { kind: 'setFieldSensitivity' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx].requirements = dataSpec.groups[
    groupIdx
  ].requirements.map((r) =>
    r.id === command.id ? { ...r, sensitivity: command.level } : r,
  )
  return ok({ ...state, dataSpec })
}

function execChangeFieldType(
  state: ProjectState,
  command: Extract<Command, { kind: 'changeFieldType' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx].requirements = dataSpec.groups[
    groupIdx
  ].requirements.map((r) =>
    r.id === command.id
      ? { ...r, fieldType: command.fieldType, choices: command.choices ?? r.choices }
      : r,
  )
  return ok({ ...state, dataSpec })
}

function execSetFieldControl(
  state: ProjectState,
  command: Extract<Command, { kind: 'setFieldControl' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx].requirements = dataSpec.groups[
    groupIdx
  ].requirements.map((r) =>
    r.id === command.id ? { ...r, control: command.control } : r,
  )
  return ok({ ...state, dataSpec })
}

function execAddField(
  state: ProjectState,
  command: Extract<Command, { kind: 'addField' }>,
): ExecutorResult {
  const groupIdx = state.dataSpec.groups.findIndex((g) => g.id === command.groupId)
  if (groupIdx < 0) return fail(command, `Unknown groupId: ${command.groupId}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  const newField = {
    id: generateFieldId(),
    fieldName: command.label.toLowerCase().replace(/\s+/g, '_').slice(0, 40),
    label: command.label,
    fieldType: command.fieldType,
    required: command.required,
  }
  dataSpec.groups[groupIdx] = {
    ...dataSpec.groups[groupIdx],
    requirements: [...dataSpec.groups[groupIdx].requirements, newField],
  }
  return ok({ ...state, dataSpec })
}

function execRemoveField(
  state: ProjectState,
  command: Extract<Command, { kind: 'removeField' }>,
): ExecutorResult {
  const groupIdx = findFieldGroupIdx(state, command.id)
  if (groupIdx < 0) return fail(command, `Unknown field id: ${command.id}`)
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx] = {
    ...dataSpec.groups[groupIdx],
    requirements: dataSpec.groups[groupIdx].requirements.filter(
      (r) => r.id !== command.id,
    ),
  }
  return ok({ ...state, dataSpec })
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/shaping/executor-fields.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/executor.ts test/forms/shaping/executor-fields.test.ts
git commit -m "feat(shaping): implement executor for field commands"
```

---

## Task 6: executeBatch with atomic rollback

**Files:**
- Modify: `src/services/forms/shaping/executor.ts`
- Create: `test/forms/shaping/executor-batch.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/forms/shaping/executor-batch.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { executeBatch } from '../../../src/services/forms/shaping/executor'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'Test',
      description: '',
      groups: [
        { id: 'g1', title: 'G1', requirements: [] },
        { id: 'g2', title: 'G2', requirements: [] },
      ],
    },
    formSpec: {
      id: 'f1',
      specId: 'ds1',
      title: 'Form',
      pages: [
        { id: 'p1', title: 'P1', groups: ['g1'] },
        { id: 'p2', title: 'P2', groups: ['g2'] },
      ],
    },
  }
}

describe('executeBatch', () => {
  it('applies commands sequentially when all succeed', () => {
    const result = executeBatch(fixture(), [
      { kind: 'swapPages', a: 'p1', b: 'p2' },
      { kind: 'renamePage', id: 'p1', title: 'New name' },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].id).toBe('p2')
      expect(result.state.formSpec.pages[1].id).toBe('p1')
      expect(result.state.formSpec.pages[1].title).toBe('New name')
    }
  })

  it('rolls back entirely when any command fails', () => {
    const initial = fixture()
    const result = executeBatch(initial, [
      { kind: 'swapPages', a: 'p1', b: 'p2' },
      { kind: 'swapPages', a: 'nope', b: 'p1' },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failedAt).toBe(1)
    }
  })

  it('returns ok with empty batch', () => {
    const result = executeBatch(fixture(), [])
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `bun test test/forms/shaping/executor-batch.test.ts`
Expected: FAIL — `executeBatch` not exported

- [ ] **Step 3: Implement executeBatch**

Append to `src/services/forms/shaping/executor.ts`:

```typescript
export type BatchResult =
  | { ok: true; state: ProjectState }
  | { ok: false; error: string; failedAt: number; command: Command }

export function executeBatch(
  state: ProjectState,
  commands: Command[],
): BatchResult {
  let current = state
  for (let i = 0; i < commands.length; i++) {
    const result = executeCommand(current, commands[i])
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        failedAt: i,
        command: commands[i],
      }
    }
    current = result.state
  }
  return { ok: true, state: current }
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/shaping/executor-batch.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/executor.ts test/forms/shaping/executor-batch.test.ts
git commit -m "feat(shaping): implement executeBatch with atomic rollback"
```

---

## Task 7: Humanize commands

**Files:**
- Create: `src/services/forms/shaping/humanize.ts`
- Create: `test/forms/shaping/humanize.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/forms/shaping/humanize.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { humanize } from '../../../src/services/forms/shaping/humanize'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'Test',
      description: '',
      groups: [
        {
          id: 'g1',
          title: 'Personal',
          requirements: [
            {
              id: 'f1',
              fieldName: 'name',
              label: 'Name',
              fieldType: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    formSpec: {
      id: 'f1',
      specId: 'ds1',
      title: 'Form',
      pages: [
        { id: 'p1', title: 'Personal Info', groups: ['g1'] },
        { id: 'p2', title: 'Work', groups: [] },
      ],
    },
  }
}

describe('humanize', () => {
  it('swapPages references both page titles', () => {
    const text = humanize(
      { kind: 'swapPages', a: 'p1', b: 'p2' },
      fixture(),
    )
    expect(text).toContain('Personal Info')
    expect(text).toContain('Work')
  })

  it('setDeliveryMode uses the page title and mode', () => {
    const text = humanize(
      { kind: 'setDeliveryMode', pageId: 'p1', mode: 'conversational' },
      fixture(),
    )
    expect(text).toContain('Personal Info')
    expect(text).toContain('conversational')
  })

  it('relabelField uses the old label', () => {
    const text = humanize(
      { kind: 'relabelField', id: 'f1', label: 'Full name' },
      fixture(),
    )
    expect(text).toContain('Name')
    expect(text).toContain('Full name')
  })

  it('produces a non-empty string for every command kind', () => {
    const state = fixture()
    const samples = [
      { kind: 'reorderPages', order: ['p2', 'p1'] },
      { kind: 'movePage', id: 'p1', toIndex: 1 },
      { kind: 'addPage', title: 'New page' },
      { kind: 'removePage', id: 'p2' },
      { kind: 'renamePage', id: 'p1', title: 'Renamed' },
      { kind: 'splitPage', id: 'p1', newTitle: 'Half', groupsToMove: [] },
      { kind: 'mergePages', intoId: 'p1', fromId: 'p2' },
      { kind: 'moveGroup', groupId: 'g1', toPageId: 'p2' },
      { kind: 'renameGroup', id: 'g1', title: 'People' },
      { kind: 'addGroup', pageId: 'p1', title: 'Extra' },
      { kind: 'removeGroup', id: 'g1' },
      { kind: 'splitGroup', id: 'g1', newTitle: 'Part', fieldsToMove: [] },
      { kind: 'mergeGroups', intoId: 'g1', fromId: 'g1' },
      { kind: 'moveField', fieldId: 'f1', toGroupId: 'g1' },
      { kind: 'reorderFields', groupId: 'g1', order: ['f1'] },
      { kind: 'setRequired', id: 'f1', required: false },
      {
        kind: 'setFieldCondition',
        id: 'f1',
        condition: { field: 'f1', operator: 'equals' as const, value: 'x' },
      },
      { kind: 'setFieldSensitivity', id: 'f1', level: 'pii' as const },
      { kind: 'changeFieldType', id: 'f1', fieldType: 'email' as const },
      { kind: 'setFieldControl', id: 'f1', control: 'radio' as const },
      {
        kind: 'addField',
        groupId: 'g1',
        label: 'New',
        fieldType: 'text' as const,
        required: false,
      },
      { kind: 'removeField', id: 'f1' },
    ]
    for (const cmd of samples) {
      expect(humanize(cmd as never, state)).not.toBe('')
    }
  })
})
```

- [ ] **Step 2: Run tests**

Run: `bun test test/forms/shaping/humanize.test.ts`
Expected: FAIL — cannot resolve `humanize`

- [ ] **Step 3: Implement humanize**

Create `src/services/forms/shaping/humanize.ts`:

```typescript
import type { Command, ProjectState } from './commands'

function pageTitle(state: ProjectState, id: string): string {
  return state.formSpec.pages.find((p) => p.id === id)?.title ?? id
}

function groupTitle(state: ProjectState, id: string): string {
  return state.dataSpec.groups.find((g) => g.id === id)?.title ?? id
}

function fieldLabel(state: ProjectState, id: string): string {
  for (const g of state.dataSpec.groups) {
    const f = g.requirements.find((r) => r.id === id)
    if (f) return f.label
  }
  return id
}

export function humanize(command: Command, state: ProjectState): string {
  switch (command.kind) {
    case 'reorderPages':
      return `Reorder pages: ${command.order.map((id) => `"${pageTitle(state, id)}"`).join(', ')}`
    case 'swapPages':
      return `Swap pages "${pageTitle(state, command.a)}" and "${pageTitle(state, command.b)}"`
    case 'movePage':
      return `Move page "${pageTitle(state, command.id)}" to position ${command.toIndex + 1}`
    case 'addPage':
      return `Add page "${command.title}"${command.afterPageId ? ` after "${pageTitle(state, command.afterPageId)}"` : ''}`
    case 'removePage':
      return `Remove page "${pageTitle(state, command.id)}"`
    case 'renamePage':
      return `Rename page "${pageTitle(state, command.id)}" to "${command.title}"`
    case 'splitPage':
      return `Split page "${pageTitle(state, command.id)}" — move ${command.groupsToMove.length} group(s) to new page "${command.newTitle}"`
    case 'mergePages':
      return `Merge "${pageTitle(state, command.fromId)}" into "${pageTitle(state, command.intoId)}"`
    case 'setDeliveryMode':
      return `Set "${pageTitle(state, command.pageId)}" delivery mode to ${command.mode}`
    case 'moveGroup':
      return `Move group "${groupTitle(state, command.groupId)}" to page "${pageTitle(state, command.toPageId)}"`
    case 'renameGroup':
      return `Rename group "${groupTitle(state, command.id)}" to "${command.title}"`
    case 'addGroup':
      return `Add group "${command.title}" to page "${pageTitle(state, command.pageId)}"`
    case 'removeGroup':
      return `Remove group "${groupTitle(state, command.id)}"`
    case 'splitGroup':
      return `Split group "${groupTitle(state, command.id)}" — move ${command.fieldsToMove.length} field(s) to new group "${command.newTitle}"`
    case 'mergeGroups':
      return `Merge group "${groupTitle(state, command.fromId)}" into "${groupTitle(state, command.intoId)}"`
    case 'moveField':
      return `Move field "${fieldLabel(state, command.fieldId)}" to group "${groupTitle(state, command.toGroupId)}"`
    case 'reorderFields':
      return `Reorder fields in group "${groupTitle(state, command.groupId)}"`
    case 'relabelField':
      return `Relabel field "${fieldLabel(state, command.id)}" to "${command.label}"`
    case 'setRequired':
      return `Mark field "${fieldLabel(state, command.id)}" ${command.required ? 'required' : 'optional'}`
    case 'setFieldCondition':
      return command.condition
        ? `Set condition on field "${fieldLabel(state, command.id)}"`
        : `Clear condition on field "${fieldLabel(state, command.id)}"`
    case 'setFieldSensitivity':
      return `Set sensitivity of field "${fieldLabel(state, command.id)}" to ${command.level}`
    case 'changeFieldType':
      return `Change type of field "${fieldLabel(state, command.id)}" to ${command.fieldType}`
    case 'setFieldControl':
      return `Set control of field "${fieldLabel(state, command.id)}" to ${command.control}`
    case 'addField':
      return `Add ${command.fieldType} field "${command.label}" to group "${groupTitle(state, command.groupId)}"`
    case 'removeField':
      return `Remove field "${fieldLabel(state, command.id)}"`
  }
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/shaping/humanize.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/humanize.ts test/forms/shaping/humanize.test.ts
git commit -m "feat(shaping): humanize commands as natural-language strings"
```

---

## Task 8: Client-safe projector

The projector is structurally identical to the executor but must not import any server-only modules. For Story 4 v2, it re-exports the executor directly, since the executor has no server dependencies. We keep the separate module name as a stable API boundary — if server-only logic is added to executor later, projector can be swapped for an optimistic approximation.

**Files:**
- Create: `src/services/forms/shaping/projector.ts`
- Create: `test/forms/shaping/projector.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/forms/shaping/projector.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { project } from '../../../src/services/forms/shaping/projector'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'

describe('project', () => {
  it('applies a batch like the executor', () => {
    const state: ProjectState = {
      dataSpec: {
        id: 'ds1',
        title: 'T',
        description: '',
        groups: [
          { id: 'g1', title: 'G1', requirements: [] },
          { id: 'g2', title: 'G2', requirements: [] },
        ],
      },
      formSpec: {
        id: 'f1',
        specId: 'ds1',
        title: 'F',
        pages: [
          { id: 'p1', title: 'A', groups: ['g1'] },
          { id: 'p2', title: 'B', groups: ['g2'] },
        ],
      },
    }
    const result = project(state, [{ kind: 'swapPages', a: 'p1', b: 'p2' }])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].id).toBe('p2')
    }
  })
})
```

- [ ] **Step 2: Run test**

Run: `bun test test/forms/shaping/projector.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement projector**

Create `src/services/forms/shaping/projector.ts`:

```typescript
import type { Command, ProjectState } from './commands'
import { executeBatch, type BatchResult } from './executor'

export function project(
  state: ProjectState,
  commands: Command[],
): BatchResult {
  return executeBatch(state, commands)
}
```

- [ ] **Step 4: Run test**

Run: `bun test test/forms/shaping/projector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/projector.ts test/forms/shaping/projector.test.ts
git commit -m "feat(shaping): add client-safe projector wrapping executor"
```

---

## Task 9: AI SDK tool definitions for commands

**Files:**
- Create: `src/services/forms/shaping/tools.ts`
- Create: `test/forms/shaping/tools.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/forms/shaping/tools.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { commandTools } from '../../../src/services/forms/shaping/tools'

describe('commandTools', () => {
  it('exposes a tool for every command kind', () => {
    const keys = Object.keys(commandTools)
    expect(keys).toContain('swapPages')
    expect(keys).toContain('addField')
    expect(keys).toContain('setDeliveryMode')
    expect(keys.length).toBeGreaterThanOrEqual(25)
  })

  it('each tool has a description and a parameters schema', () => {
    for (const [name, tool] of Object.entries(commandTools)) {
      expect(typeof tool.description).toBe('string')
      expect(tool.description.length).toBeGreaterThan(0)
      expect(tool.inputSchema).toBeDefined()
    }
  })
})
```

- [ ] **Step 2: Run test**

Run: `bun test test/forms/shaping/tools.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the tools module**

Create `src/services/forms/shaping/tools.ts`:

```typescript
import { tool } from 'ai'
import { z } from 'zod'

const deliveryMode = z.enum(['static', 'conversational', 'hybrid'])
const fieldType = z.enum([
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
])
const sensitivity = z.enum(['low', 'medium', 'high', 'pii'])
const control = z.enum(['radio', 'select', 'checkbox', 'toggle'])
const condition = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const commandTools = {
  reorderPages: tool({
    description: 'Reorder all pages into a new sequence. Provide a permutation of all existing page ids.',
    inputSchema: z.object({ order: z.array(z.string()).min(1) }),
  }),
  swapPages: tool({
    description: 'Swap the positions of two pages in the form. Use this for simple exchanges like "swap pages 2 and 3".',
    inputSchema: z.object({ a: z.string(), b: z.string() }),
  }),
  movePage: tool({
    description: 'Move a single page to a specific index in the pages array (0-based).',
    inputSchema: z.object({ id: z.string(), toIndex: z.number().int().min(0) }),
  }),
  addPage: tool({
    description: 'Add a new empty page. Optionally specify afterPageId to insert in place.',
    inputSchema: z.object({
      afterPageId: z.string().optional(),
      title: z.string(),
      deliveryMode: deliveryMode.optional(),
    }),
  }),
  removePage: tool({
    description: 'Remove a page. If the page has groups, specify moveGroupsTo so they are relocated.',
    inputSchema: z.object({
      id: z.string(),
      moveGroupsTo: z.string().optional(),
    }),
  }),
  renamePage: tool({
    description: 'Change the title of an existing page.',
    inputSchema: z.object({ id: z.string(), title: z.string() }),
  }),
  splitPage: tool({
    description: 'Split a page by moving some of its groups to a new page that appears right after the original.',
    inputSchema: z.object({
      id: z.string(),
      newTitle: z.string(),
      groupsToMove: z.array(z.string()),
    }),
  }),
  mergePages: tool({
    description: 'Merge the groups of one page into another. The source page is removed.',
    inputSchema: z.object({ intoId: z.string(), fromId: z.string() }),
  }),
  setDeliveryMode: tool({
    description: 'Set how a page is delivered to users: static (traditional form), conversational (guided step-by-step), or hybrid.',
    inputSchema: z.object({ pageId: z.string(), mode: deliveryMode }),
  }),
  moveGroup: tool({
    description: 'Move a requirement group from its current page to a different page.',
    inputSchema: z.object({
      groupId: z.string(),
      toPageId: z.string(),
      atIndex: z.number().int().min(0).optional(),
    }),
  }),
  renameGroup: tool({
    description: 'Change the title of a requirement group.',
    inputSchema: z.object({ id: z.string(), title: z.string() }),
  }),
  addGroup: tool({
    description: 'Add a new empty group to a page.',
    inputSchema: z.object({ pageId: z.string(), title: z.string() }),
  }),
  removeGroup: tool({
    description: 'Remove a group. If it has fields, specify moveFieldsTo to relocate them.',
    inputSchema: z.object({
      id: z.string(),
      moveFieldsTo: z.string().optional(),
    }),
  }),
  splitGroup: tool({
    description: 'Split a group by moving some of its fields to a new group on the same page.',
    inputSchema: z.object({
      id: z.string(),
      newTitle: z.string(),
      fieldsToMove: z.array(z.string()),
    }),
  }),
  mergeGroups: tool({
    description: 'Merge the fields of one group into another. The source group is removed.',
    inputSchema: z.object({ intoId: z.string(), fromId: z.string() }),
  }),
  moveField: tool({
    description: 'Move a field from its current group to a different group.',
    inputSchema: z.object({
      fieldId: z.string(),
      toGroupId: z.string(),
      atIndex: z.number().int().min(0).optional(),
    }),
  }),
  reorderFields: tool({
    description: 'Reorder fields within a group. Provide a permutation of the group\'s field ids.',
    inputSchema: z.object({
      groupId: z.string(),
      order: z.array(z.string()).min(1),
    }),
  }),
  relabelField: tool({
    description: 'Change a field\'s label (the question wording shown to users) and optionally its help text.',
    inputSchema: z.object({
      id: z.string(),
      label: z.string(),
      helpText: z.string().optional(),
    }),
  }),
  setRequired: tool({
    description: 'Mark a field as required or optional.',
    inputSchema: z.object({ id: z.string(), required: z.boolean() }),
  }),
  setFieldCondition: tool({
    description: 'Set or clear a condition that controls when a field is shown. Pass null to clear.',
    inputSchema: z.object({
      id: z.string(),
      condition: condition.nullable(),
    }),
  }),
  setFieldSensitivity: tool({
    description: 'Classify a field\'s privacy sensitivity: low, medium, high, or pii.',
    inputSchema: z.object({ id: z.string(), level: sensitivity }),
  }),
  changeFieldType: tool({
    description: 'Change a field\'s type (e.g., text to date). For choice fields, include the choices array.',
    inputSchema: z.object({
      id: z.string(),
      fieldType: fieldType,
      choices: z.array(z.string()).optional(),
    }),
  }),
  setFieldControl: tool({
    description: 'Set the input control for a field: radio or select for choice fields, checkbox or toggle for boolean.',
    inputSchema: z.object({ id: z.string(), control: control }),
  }),
  addField: tool({
    description: 'Add a new field to a group.',
    inputSchema: z.object({
      groupId: z.string(),
      label: z.string(),
      fieldType: fieldType,
      required: z.boolean(),
    }),
  }),
  removeField: tool({
    description: 'Remove a field from its group.',
    inputSchema: z.object({ id: z.string() }),
  }),
}
```

- [ ] **Step 4: Run test**

Run: `bun test test/forms/shaping/tools.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/forms/shaping/tools.ts test/forms/shaping/tools.test.ts
git commit -m "feat(shaping): define AI SDK tools for each command kind"
```

---

## Task 10: Replace bedrock-shaper with tool-use implementation

**Files:**
- Modify: `src/services/forms/shaping/bedrock-shaper.ts` (rewrite)
- Modify: `src/services/forms/shaping/types.ts` — update `FormShaper` interface
- Delete: `src/services/forms/shaping/prompts/shape-intent.ts`
- Delete: `src/services/forms/shaping/prompts/suggest-modes.ts`
- Delete: `test/forms/shaping/bedrock-shaper.test.ts` (old version)
- Delete: `test/forms/shaping/suggest-modes.test.ts`
- Create: `test/forms/shaping/bedrock-shaper.test.ts` (new version)

- [ ] **Step 1: Update the FormShaper interface**

In `src/services/forms/shaping/types.ts`, replace:

```typescript
import type { DataCollectionSpec } from '../../data-collection/types'
import type { FormSpec } from '../types'
import type { Command, ProjectState } from './commands'

export interface FormShaper {
  shape(request: ShapingRequest): Promise<ShapingResult>
}

export interface ShapingRequest {
  intent: string
  state: ProjectState
  previousAttempt?: { commands: Command[]; feedback: string }
}

export interface ShapingResult {
  commands: Command[]
  explanation: string
}
```

(Delete the old `FormShaper`, `ShapingRequest`, `ShapingResult`, `PageDiff`,
`FormSpecDiff` types in the same file — they're no longer referenced.)

- [ ] **Step 2: Write the failing test**

Delete the old test files first:

```bash
rm test/forms/shaping/bedrock-shaper.test.ts
rm test/forms/shaping/suggest-modes.test.ts
```

Create new `test/forms/shaping/bedrock-shaper.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { validateCommands } from '../../../src/services/forms/shaping/bedrock-shaper'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'T',
      description: '',
      groups: [{ id: 'g1', title: 'G1', requirements: [] }],
    },
    formSpec: {
      id: 'f1',
      specId: 'ds1',
      title: 'F',
      pages: [{ id: 'p1', title: 'P', groups: ['g1'] }],
    },
  }
}

describe('validateCommands', () => {
  it('returns ok for a valid executable batch', () => {
    const result = validateCommands(
      [
        { kind: 'renamePage', id: 'p1', title: 'New' },
        { kind: 'renameGroup', id: 'g1', title: 'New G' },
      ],
      fixture(),
    )
    expect(result.ok).toBe(true)
  })

  it('returns error when batch references unknown ids', () => {
    const result = validateCommands(
      [{ kind: 'renamePage', id: 'nope', title: 'x' }],
      fixture(),
    )
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify failure**

Run: `bun test test/forms/shaping/bedrock-shaper.test.ts`
Expected: FAIL — `validateCommands` not exported

- [ ] **Step 4: Rewrite bedrock-shaper**

Replace `src/services/forms/shaping/bedrock-shaper.ts`:

```typescript
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { Command, ProjectState } from './commands'
import { executeBatch } from './executor'
import { commandTools } from './tools'
import type { FormShaper, ShapingRequest, ShapingResult } from './types'

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: string; failedAt: number; command: Command }

export function validateCommands(
  commands: Command[],
  state: ProjectState,
): ValidateResult {
  const result = executeBatch(state, commands)
  if (result.ok) return { ok: true }
  return {
    ok: false,
    error: result.error,
    failedAt: result.failedAt,
    command: result.command,
  }
}

function buildPrompt(request: ShapingRequest): string {
  const previous = request.previousAttempt
    ? `\n\n## Previous attempt\nYou previously produced these commands:\n${JSON.stringify(request.previousAttempt.commands, null, 2)}\n\nThe user said: "${request.previousAttempt.feedback}"\n`
    : ''

  return `You are a form design assistant. A form creator wants to modify the structure of their form. Call the appropriate tools to express the edits as a sequence of commands.

## Current FormSpec
${JSON.stringify(request.state.formSpec, null, 2)}

## Current DataCollectionSpec groups and fields
${JSON.stringify(
  request.state.dataSpec.groups.map((g) => ({
    id: g.id,
    title: g.title,
    fields: g.requirements.map((r) => ({ id: r.id, label: r.label, type: r.fieldType })),
  })),
  null,
  2,
)}

## The form creator's request
"${request.intent}"
${previous}

## Guidance
- Call tools that match the creator's intent. The tools correspond to domain operations like swapPages, moveGroup, addField, etc.
- Preserve page/group/field identity: use real ids from the specs above. Invent new ids only for commands that create new entities.
- When reordering, only change position — don't rewrite content.
- After calling tools, respond with a single short sentence summarizing what you did. This sentence will be shown to the user.`
}

export interface BedrockShaperOptions {
  model?: string
}

export function createBedrockFormShaper(
  options?: BedrockShaperOptions,
): FormShaper {
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async shape(request: ShapingRequest): Promise<ShapingResult> {
      const model = options?.model ?? DEFAULT_MODEL
      const response = await generateText({
        model: bedrock(model),
        maxOutputTokens: 4096,
        tools: commandTools,
        messages: [{ role: 'user', content: buildPrompt(request) }],
      })

      const commands: Command[] = []
      for (const call of response.toolCalls ?? []) {
        commands.push({ kind: call.toolName, ...(call.input as object) } as Command)
      }

      const validation = validateCommands(commands, request.state)
      if (!validation.ok) {
        throw new Error(
          `LLM produced invalid command sequence: ${validation.error} (command ${validation.failedAt})`,
        )
      }

      const explanation = (response.text ?? '').trim() || 'Applied requested changes.'

      return { commands, explanation }
    },
  }
}
```

- [ ] **Step 5: Delete old prompts**

```bash
rm src/services/forms/shaping/prompts/shape-intent.ts
rm src/services/forms/shaping/prompts/suggest-modes.ts
rmdir src/services/forms/shaping/prompts
```

- [ ] **Step 6: Run tests**

Run: `bun test test/forms/shaping/bedrock-shaper.test.ts`
Expected: PASS

- [ ] **Step 7: Run full type check**

Run: `bun run --no-warnings tsc --noEmit`
Expected: Likely errors in `registry.ts`, `differ.ts`, and route files that reference old types. These will be fixed in Task 11 and later.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(shaping): rewrite bedrock-shaper to emit commands via tool use"
```

---

## Task 11: Delete differ and update registry

**Files:**
- Delete: `src/services/forms/shaping/differ.ts`
- Delete: `test/forms/shaping/differ.test.ts`
- Modify: `src/services/forms/shaping/registry.ts`
- Modify: `test/forms/shaping/registry.test.ts`

- [ ] **Step 1: Delete the differ**

```bash
rm src/services/forms/shaping/differ.ts
rm test/forms/shaping/differ.test.ts
```

- [ ] **Step 2: Registry should still compile**

`src/services/forms/shaping/registry.ts` references `FormShaper` from `./types` and `createBedrockFormShaper` from `./bedrock-shaper`. These still exist. Verify:

Run: `bun test test/forms/shaping/registry.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(shaping): remove differ, commands are the diff"
```

---

## Task 12: ProjectService executeCommands with command log persistence

**Files:**
- Modify: `src/services/project-service.ts`
- Create: `test/forms/shaping/project-service-commands.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/forms/shaping/project-service-commands.test.ts`:

```typescript
import { mkdirSync, rmSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { SessionUser } from '../../../src/services/auth/session'
import { createFormProjectRepo } from '../../../src/services/form-project-repo'
import { createProjectService } from '../../../src/services/project-service'
import { createProjectStore } from '../../../src/services/storage'
import { testDataSpec, testFormSpec } from '../fixtures'

const TEST_DIR = 'test-data/shaping-commands'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = {
  login: 'testuser',
  name: 'Test User',
  avatarUrl: '',
}

const dummyExtractor = {
  async extract() {
    return { spec: testDataSpec, formSpec: testFormSpec, confidence: [] }
  },
}

describe('ProjectService.executeCommands', () => {
  let service: ReturnType<typeof createProjectService>
  let slug: string

  beforeAll(async () => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(REPOS_PATH, { recursive: true })
    const store = createProjectStore(DB_PATH)
    const repo = createFormProjectRepo(REPOS_PATH)
    service = createProjectService(store, repo, dummyExtractor)
    const project = await service.createProject('test', Buffer.from('fake'), testUser)
    slug = project.slug
    await new Promise((resolve) => setTimeout(resolve, 500))
  })

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('executes a command batch and commits to git', async () => {
    const result = await service.executeCommands(
      testUser.login,
      slug,
      [{ kind: 'renamePage', id: 'page-1', title: 'Renamed' }],
      'Rename first page',
      'manual',
      testUser,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].title).toBe('Renamed')
    }
  })

  it('appends to the shaping log', async () => {
    await service.executeCommands(
      testUser.login,
      slug,
      [{ kind: 'renamePage', id: 'page-2', title: 'Second' }],
      'Rename second page',
      'manual',
      testUser,
    )
    const log = await service.getShapingLog(testUser.login, slug)
    expect(log.length).toBeGreaterThanOrEqual(2)
    expect(log[log.length - 1].explanation).toBe('Rename second page')
  })

  it('rejects invalid command batches without committing', async () => {
    const before = await service.getFormSpecHistory(testUser.login, slug)
    const result = await service.executeCommands(
      testUser.login,
      slug,
      [{ kind: 'renamePage', id: 'nope', title: 'x' }],
      'Bad',
      'manual',
      testUser,
    )
    expect(result.ok).toBe(false)
    const after = await service.getFormSpecHistory(testUser.login, slug)
    expect(after.length).toBe(before.length)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test test/forms/shaping/project-service-commands.test.ts`
Expected: FAIL — methods don't exist

- [ ] **Step 3: Extend ProjectService**

In `src/services/project-service.ts`:

Add imports at top:

```typescript
import type { Command } from './forms/shaping/commands'
import { executeBatch } from './forms/shaping/executor'
```

Add to `ProjectService` interface:

```typescript
  executeCommands(
    owner: string,
    slug: string,
    commands: Command[],
    explanation: string,
    source: 'llm' | 'manual',
    user: SessionUser,
  ): Promise<
    | {
        ok: true
        state: { formSpec: FormSpec; dataSpec: DataCollectionSpec }
        sha: string
      }
    | { ok: false; error: string; failedAt: number; command: Command }
  >
  getShapingLog(owner: string, slug: string): Promise<ShapingLogEntry[]>
```

Define `ShapingLogEntry` in the same file near the top:

```typescript
export interface ShapingLogEntry {
  timestamp: string
  authorCommit: string
  source: 'llm' | 'manual'
  commands: Command[]
  explanation: string
}
```

(Move `import type { DataCollectionSpec }` if it's not already imported.)

Implement inside `createProjectService`:

```typescript
    async executeCommands(
      owner: string,
      slug: string,
      commands: Command[],
      explanation: string,
      source: 'llm' | 'manual',
      user: SessionUser,
    ) {
      requireAuth(user)
      const project = resolveProject(owner, slug)
      requireOwner(project, user)

      // Load current state from git
      const [formBuf, specBuf, logBuf] = await Promise.all([
        repo.readFile(slug, 'main', 'forms/default/form.json'),
        repo.readFile(slug, 'main', 'forms/default/spec.json'),
        repo.readFile(slug, 'main', 'forms/default/shaping-log.json'),
      ])
      if (!formBuf || !specBuf) {
        throw new BadRequestError('Project has no FormSpec to edit yet')
      }
      const currentFormSpec = JSON.parse(formBuf.toString()) as FormSpec
      const currentDataSpec = JSON.parse(specBuf.toString()) as DataCollectionSpec
      const log: ShapingLogEntry[] = logBuf
        ? (JSON.parse(logBuf.toString()) as ShapingLogEntry[])
        : []

      const batchResult = executeBatch(
        { formSpec: currentFormSpec, dataSpec: currentDataSpec },
        commands,
      )
      if (!batchResult.ok) {
        return {
          ok: false as const,
          error: batchResult.error,
          failedAt: batchResult.failedAt,
          command: batchResult.command,
        }
      }

      const timestamp = new Date().toISOString()
      const newEntry: ShapingLogEntry = {
        timestamp,
        authorCommit: '',
        source,
        commands,
        explanation,
      }
      const nextLog = [...log, newEntry]

      const sha = await repo.commit(
        slug,
        [
          {
            path: 'forms/default/form.json',
            content: Buffer.from(
              JSON.stringify(batchResult.state.formSpec, null, 2),
            ),
          },
          {
            path: 'forms/default/spec.json',
            content: Buffer.from(
              JSON.stringify(batchResult.state.dataSpec, null, 2),
            ),
          },
          {
            path: 'forms/default/shaping-log.json',
            content: Buffer.from(JSON.stringify(nextLog, null, 2)),
          },
        ],
        `Apply shaping: ${explanation}`,
        user.login,
      )

      newEntry.authorCommit = sha

      return {
        ok: true as const,
        state: batchResult.state,
        sha,
      }
    },

    async getShapingLog(owner: string, slug: string): Promise<ShapingLogEntry[]> {
      resolveProject(owner, slug)
      const buf = await repo.readFile(slug, 'main', 'forms/default/shaping-log.json')
      if (!buf) return []
      return JSON.parse(buf.toString()) as ShapingLogEntry[]
    },
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/shaping/project-service-commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shaping): add executeCommands and shaping log to ProjectService"
```

---

## Task 13: Rewrite edit routes to return JSON

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/index.tsx`

- [ ] **Step 1: Replace the route handlers**

Replace the body of `src/entrypoints/app/routes/owner/edit/index.tsx` with:

```typescript
import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Layout } from '../../../../../design-system/components/flex-layout'
import { AppError, UnauthenticatedError } from '../../../../../services/errors'
import type { Command, ProjectState } from '../../../../../services/forms/shaping/commands'
import { commandSchema } from '../../../../../services/forms/shaping/commands'
import type { FormShaper } from '../../../../../services/forms/shaping/types'
import type { ProjectService } from '../../../../../services/project-service'
import type { StrategyRegistry } from '../../../../../services/strategy-registry'
import { resolveUrl } from '../../../../../shared/base-path'
import { ErrorPage } from '../components'
import { EditorPage, PreviewPage } from './components'

export function createEditRoutes(
  service: ProjectService,
  shapingRegistry: StrategyRegistry<FormShaper>,
): Hono {
  const app = new Hono()

  // GET /:owner/:slug/edit — render editor shell
  app.get('/:owner/:slug/edit', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const view = await service.getProject(owner, slug, user)
      if (!view.isOwner) {
        return c.html(
          <Layout user={user}>
            <ErrorPage statusCode={403} message="Only the project owner can edit the form." />
          </Layout>,
          403,
        )
      }
      const log = await service.getShapingLog(owner, slug)
      return c.html(
        <Layout user={user} title={`Edit ${view.project.name}`}>
          <EditorPage view={view} owner={owner} user={user} log={log} />
        </Layout>,
      )
    } catch (err) {
      return handleError(c, err)
    }
  })

  // POST /:owner/:slug/edit/intent — LLM shapes intent, returns commands
  app.post('/:owner/:slug/edit/intent', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as {
        intent: string
        previousAttempt?: { commands: Command[]; feedback: string }
      }
      const view = await service.getProject(owner, slug, user)
      if (!view.isOwner || !view.formSpec || !view.spec) {
        return c.json({ error: 'not allowed' }, 403)
      }

      const state: ProjectState = {
        formSpec: view.formSpec as unknown as ProjectState['formSpec'],
        dataSpec: view.spec as unknown as ProjectState['dataSpec'],
      }

      const shaper = shapingRegistry.getDefault()
      const result = await shaper.shape({
        intent: body.intent,
        state,
        previousAttempt: body.previousAttempt,
      })

      return c.json({ commands: result.commands, explanation: result.explanation })
    } catch (err) {
      console.error('[edit/intent]', err)
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // POST /:owner/:slug/edit/accept — execute a command batch and commit
  app.post('/:owner/:slug/edit/accept', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as {
        commands: unknown[]
        explanation: string
        source: 'llm' | 'manual'
      }
      const commands = body.commands.map((c) => commandSchema.parse(c))
      const result = await service.executeCommands(
        owner,
        slug,
        commands,
        body.explanation,
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

  // POST /:owner/:slug/edit/execute — execute a single command (manual ops)
  app.post('/:owner/:slug/edit/execute', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.json()) as { command: unknown; explanation: string }
      const command = commandSchema.parse(body.command)
      const result = await service.executeCommands(
        owner,
        slug,
        [command],
        body.explanation,
        'manual',
        user,
      )
      if (!result.ok) {
        return c.json({ error: result.error }, 400)
      }
      return c.json({ state: result.state, sha: result.sha })
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : String(err) },
        500,
      )
    }
  })

  // POST /:owner/:slug/edit/undo — revert to previous commit
  app.post('/:owner/:slug/edit/undo', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const user = c.get('user')
    try {
      if (!user) throw new UnauthenticatedError()
      const body = (await c.req.parseBody()) as { targetSha?: string }
      if (!body.targetSha) {
        return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
      }
      await service.undoFormSpec(owner, slug, body.targetSha, user)
      return c.redirect(resolveUrl(`/${owner}/${slug}/edit`))
    } catch (err) {
      return handleError(c, err)
    }
  })

  // GET /:owner/:slug/preview — render a page as Carlos would see it
  app.get('/:owner/:slug/preview', async (c) => {
    const owner = c.req.param('owner')
    const slug = c.req.param('slug')
    const pageIndex = Number(c.req.query('page') ?? 0)
    try {
      const view = await service.getProject(owner, slug, c.get('user'))
      if (!view.formSpec || !view.spec) {
        return c.html(<p>No form spec available.</p>)
      }
      return c.html(<PreviewPage view={view} pageIndex={pageIndex} />)
    } catch (err) {
      return handleError(c, err)
    }
  })

  return app
}

function handleError(c: Context, err: unknown) {
  if (err instanceof UnauthenticatedError) {
    return c.redirect(
      resolveUrl(`/auth/signin?returnTo=${encodeURIComponent(c.req.path)}`),
    )
  }
  if (err instanceof AppError) {
    return c.html(
      <Layout user={c.get('user')}>
        <ErrorPage statusCode={err.statusCode} message={err.message} />
      </Layout>,
      err.statusCode as ContentfulStatusCode,
    )
  }
  throw err
}
```

- [ ] **Step 2: Run type check**

Run: `bun run --no-warnings tsc --noEmit`

You'll likely see errors in `components.tsx` because `EditorPage` and `PreviewPage` signatures don't match the new callsites. Task 14 will fix that.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(shaping): rewrite edit routes to return JSON for command flow"
```

---

## Task 14: Simplify EditorPage to a shell for the coordinator

**Files:**
- Modify: `src/entrypoints/app/routes/owner/edit/components.tsx`

- [ ] **Step 1: Rewrite the EditorPage component**

Replace the entire file with:

```typescript
import type { FC } from 'hono/jsx'
import type { SessionUser } from '../../../../../services/auth/session'
import type { ShapingLogEntry } from '../../../../../services/project-service'
import type { ProjectView } from '../../../../../services/project-service'
import { resolveUrl } from '../../../../../shared/base-path'

export const EditorPage: FC<{
  view: ProjectView
  owner: string
  user: SessionUser
  log: ShapingLogEntry[]
}> = ({ view, owner, user: _user, log }) => {
  const { project, formSpec, spec } = view
  const editBase = `/${owner}/${project.slug}/edit`
  if (!formSpec || !spec) {
    return (
      <div class="l-stack">
        <div class="flex-alert" data-variant="info" role="status">
          <div class="flex-alert__body">
            <p class="flex-alert__text">
              No form specification available. The form must be extracted before editing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const initialState = JSON.stringify({ formSpec, dataSpec: spec })

  return (
    <div class="form-editor l-stack">
      <div class="l-cluster justify-between">
        <h1>
          <a href={resolveUrl(`/${owner}`)} class="text-muted">
            {owner}
          </a>{' '}
          / <a href={resolveUrl(`/${owner}/${project.slug}`)}>{project.name}</a>{' '}
          / Edit
        </h1>
      </div>

      <flex-form-editor
        data-owner={owner}
        data-slug={project.slug}
        data-edit-base={resolveUrl(editBase)}
        data-preview-base={resolveUrl(`/${owner}/${project.slug}/preview`)}
      >
        <script
          type="application/json"
          data-initial-state
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON payload for bootstrap
          dangerouslySetInnerHTML={{ __html: initialState }}
        />
        <script
          type="application/json"
          data-shaping-log
          dangerouslySetInnerHTML={{ __html: JSON.stringify(log) }}
        />

        <div class="editor-layout">
          <div class="editor-panel editor-panel--main">
            <flex-command-proposal />
            <flex-form-structure />
          </div>
          <div class="editor-panel editor-panel--preview">
            <h2>Preview</h2>
            <iframe
              class="editor-preview-frame"
              src={resolveUrl(`/${owner}/${project.slug}/preview?page=0`)}
              title="Form preview"
            />
          </div>
        </div>
      </flex-form-editor>
    </div>
  )
}

export const PreviewPage: FC<{ view: ProjectView; pageIndex: number }> = ({
  view,
  pageIndex,
}) => {
  if (!view.formSpec || !view.spec) return <p>No form.</p>
  const page = view.formSpec.pages[pageIndex]
  if (!page) return <p>Page not found.</p>
  const groupMap = new Map(view.spec.groups.map((g) => [g.id, g]))
  return (
    <div class="editor-preview">
      <h2>{page.title}</h2>
      {page.groups.map((gid) => {
        const group = groupMap.get(gid)
        if (!group) return null
        return (
          <section class="editor-preview__group">
            <h3>{group.title}</h3>
            <ul>
              {group.requirements.map((r) => (
                <li>
                  {r.label} <em class="text-muted">({r.fieldType})</em>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

Run: `bun run --no-warnings tsc --noEmit`

Should pass or show only errors in client-element files that don't exist yet.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(shaping): slim EditorPage to shell for coordinator"
```

---

## Task 15: Create the flex-form-editor coordinator custom element

**Files:**
- Create: `src/design-system/components/flex-form-editor/protocol.ts`
- Create: `src/design-system/components/flex-form-editor/client.ts`
- Create: `src/design-system/components/flex-form-editor/styles.css`

- [ ] **Step 1: Define the event protocol**

Create `src/design-system/components/flex-form-editor/protocol.ts`:

```typescript
import type { Command } from '../../../services/forms/shaping/commands'
import type { DataCollectionSpec } from '../../../services/data-collection/types'
import type { FormSpec } from '../../../services/forms/types'

export interface ProjectStateClient {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
}

export interface ShapingLogEntryClient {
  timestamp: string
  authorCommit: string
  source: 'llm' | 'manual'
  commands: Command[]
  explanation: string
}

export type FormEditorEvent =
  | { type: 'formeditor:select'; detail: { kind: 'page' | 'group' | 'field'; id: string } }
  | { type: 'formeditor:proposal-received'; detail: { commands: Command[]; explanation: string } }
  | { type: 'formeditor:proposal-accept'; detail: Record<string, never> }
  | { type: 'formeditor:proposal-reject'; detail: Record<string, never> }
  | { type: 'formeditor:proposal-refine'; detail: { feedback: string } }
  | { type: 'formeditor:spec-updated'; detail: { state: ProjectStateClient } }
  | { type: 'formeditor:command-failed'; detail: { error: string; command: Command | null } }
  | { type: 'formeditor:manual-command'; detail: { command: Command; explanation: string } }
  | { type: 'formeditor:intent-submitted'; detail: { intent: string } }

export function dispatchEditorEvent(
  target: EventTarget,
  event: FormEditorEvent,
): void {
  target.dispatchEvent(
    new CustomEvent(event.type, {
      detail: event.detail,
      bubbles: true,
      composed: true,
    }),
  )
}
```

- [ ] **Step 2: Write the coordinator**

Create `src/design-system/components/flex-form-editor/client.ts`:

```typescript
import type { Command } from '../../../services/forms/shaping/commands'
import type {
  FormEditorEvent,
  ProjectStateClient,
  ShapingLogEntryClient,
} from './protocol'

interface ProposalState {
  commands: Command[]
  explanation: string
  originalIntent: string
}

class FlexFormEditor extends HTMLElement {
  private state: ProjectStateClient | null = null
  private log: ShapingLogEntryClient[] = []
  private proposal: ProposalState | null = null
  private selection: {
    kind: 'page' | 'group' | 'field'
    id: string
  } | null = null

  connectedCallback() {
    this.hydrateState()
    this.bindEvents()
    this.broadcastSpec()
  }

  private hydrateState() {
    const stateScript = this.querySelector('script[data-initial-state]')
    if (stateScript?.textContent) {
      this.state = JSON.parse(stateScript.textContent) as ProjectStateClient
    }
    const logScript = this.querySelector('script[data-shaping-log]')
    if (logScript?.textContent) {
      this.log = JSON.parse(logScript.textContent) as ShapingLogEntryClient[]
    }
  }

  private bindEvents() {
    this.addEventListener('formeditor:intent-submitted' as keyof HTMLElementEventMap, (e) =>
      this.handleIntent((e as CustomEvent).detail),
    )
    this.addEventListener('formeditor:proposal-accept' as keyof HTMLElementEventMap, () =>
      this.handleAccept(),
    )
    this.addEventListener('formeditor:proposal-reject' as keyof HTMLElementEventMap, () =>
      this.handleReject(),
    )
    this.addEventListener('formeditor:proposal-refine' as keyof HTMLElementEventMap, (e) =>
      this.handleRefine((e as CustomEvent).detail),
    )
    this.addEventListener('formeditor:manual-command' as keyof HTMLElementEventMap, (e) =>
      this.handleManual((e as CustomEvent).detail),
    )
    this.addEventListener('formeditor:select' as keyof HTMLElementEventMap, (e) =>
      this.handleSelect((e as CustomEvent).detail),
    )
  }

  private editBase(): string {
    return this.dataset.editBase ?? ''
  }

  private async handleIntent(detail: { intent: string }) {
    if (!this.state) return
    try {
      const response = await fetch(`${this.editBase()}/intent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: detail.intent,
          previousAttempt: undefined,
        }),
      })
      if (!response.ok) {
        const body = await response.json()
        this.dispatchOwn({
          type: 'formeditor:command-failed',
          detail: { error: body.error ?? 'request failed', command: null },
        })
        return
      }
      const body = (await response.json()) as { commands: Command[]; explanation: string }
      this.proposal = {
        commands: body.commands,
        explanation: body.explanation,
        originalIntent: detail.intent,
      }
      this.dispatchOwn({
        type: 'formeditor:proposal-received',
        detail: { commands: body.commands, explanation: body.explanation },
      })
    } catch (err) {
      this.dispatchOwn({
        type: 'formeditor:command-failed',
        detail: {
          error: err instanceof Error ? err.message : String(err),
          command: null,
        },
      })
    }
  }

  private async handleRefine(detail: { feedback: string }) {
    if (!this.state || !this.proposal) return
    try {
      const response = await fetch(`${this.editBase()}/intent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: this.proposal.originalIntent,
          previousAttempt: {
            commands: this.proposal.commands,
            feedback: detail.feedback,
          },
        }),
      })
      if (!response.ok) return
      const body = (await response.json()) as { commands: Command[]; explanation: string }
      this.proposal = {
        commands: body.commands,
        explanation: body.explanation,
        originalIntent: this.proposal.originalIntent,
      }
      this.dispatchOwn({
        type: 'formeditor:proposal-received',
        detail: { commands: body.commands, explanation: body.explanation },
      })
    } catch {
      /* swallow; refine failures leave previous proposal visible */
    }
  }

  private handleReject() {
    this.proposal = null
    this.dispatchOwn({
      type: 'formeditor:proposal-received',
      detail: { commands: [], explanation: '' },
    })
  }

  private async handleAccept() {
    if (!this.proposal) return
    const response = await fetch(`${this.editBase()}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: this.proposal.commands,
        explanation: this.proposal.explanation,
        source: 'llm',
      }),
    })
    if (!response.ok) {
      const body = await response.json()
      this.dispatchOwn({
        type: 'formeditor:command-failed',
        detail: { error: body.error ?? 'accept failed', command: null },
      })
      return
    }
    const body = (await response.json()) as { state: ProjectStateClient }
    this.state = body.state
    this.proposal = null
    this.broadcastSpec()
    this.dispatchOwn({
      type: 'formeditor:proposal-received',
      detail: { commands: [], explanation: '' },
    })
  }

  private async handleManual(detail: { command: Command; explanation: string }) {
    const response = await fetch(`${this.editBase()}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        command: detail.command,
        explanation: detail.explanation,
      }),
    })
    if (!response.ok) {
      const body = await response.json()
      this.dispatchOwn({
        type: 'formeditor:command-failed',
        detail: { error: body.error ?? 'manual command failed', command: detail.command },
      })
      return
    }
    const body = (await response.json()) as { state: ProjectStateClient }
    this.state = body.state
    this.broadcastSpec()
  }

  private handleSelect(detail: { kind: 'page' | 'group' | 'field'; id: string }) {
    this.selection = detail
  }

  private broadcastSpec() {
    if (!this.state) return
    this.dispatchOwn({
      type: 'formeditor:spec-updated',
      detail: { state: this.state },
    })
  }

  private dispatchOwn(event: FormEditorEvent) {
    this.dispatchEvent(
      new CustomEvent(event.type, {
        detail: event.detail,
        bubbles: false,
      }),
    )
  }
}

if (!customElements.get('flex-form-editor')) {
  customElements.define('flex-form-editor', FlexFormEditor)
}
```

- [ ] **Step 3: Create styles**

Create `src/design-system/components/flex-form-editor/styles.css`:

```css
flex-form-editor {
  display: block;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--flex-space-3);
}

@media (max-width: 64em) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

.editor-panel {
  display: flex;
  flex-direction: column;
  gap: var(--flex-space-2);
}

.editor-preview-frame {
  width: 100%;
  min-height: 60vh;
  border: 1px solid var(--flex-color-border);
}

.editor-preview {
  padding: var(--flex-space-2);
}

.editor-preview__group {
  margin-block-end: var(--flex-space-2);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/design-system/components/flex-form-editor/
git commit -m "feat(shaping): add flex-form-editor coordinator custom element"
```

---

## Task 16: Create flex-command-proposal child element

**Files:**
- Create: `src/design-system/components/flex-command-proposal/client.ts`
- Create: `src/design-system/components/flex-command-proposal/styles.css`

- [ ] **Step 1: Create the element**

Create `src/design-system/components/flex-command-proposal/client.ts`:

```typescript
import type { Command } from '../../../services/forms/shaping/commands'
import { humanize } from '../../../services/forms/shaping/humanize'
import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexCommandProposal extends HTMLElement {
  private state: ProjectStateClient | null = null
  private proposal: { commands: Command[]; explanation: string } = {
    commands: [],
    explanation: '',
  }

  connectedCallback() {
    this.render()
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:spec-updated' as keyof HTMLElementEventMap, (e) => {
        this.state = (e as CustomEvent).detail.state
        this.render()
      })
      root.addEventListener(
        'formeditor:proposal-received' as keyof HTMLElementEventMap,
        (e) => {
          this.proposal = (e as CustomEvent).detail
          this.render()
        },
      )
      root.addEventListener(
        'formeditor:command-failed' as keyof HTMLElementEventMap,
        (e) => {
          const detail = (e as CustomEvent).detail
          this.renderError(detail.error)
        },
      )
    }
  }

  private render() {
    const hasProposal = this.proposal.commands.length > 0
    this.innerHTML = `
      <section class="command-proposal">
        <h2>Reshape with AI</h2>
        <form class="command-proposal__intent-form">
          <label class="flex-label" for="intent-input">Describe how you want to change the form</label>
          <textarea id="intent-input" name="intent" class="flex-textarea" rows="3"
            placeholder="e.g., Add an eligibility screener before the employment section"></textarea>
          <button type="submit" class="flex-button">Suggest changes</button>
        </form>
        ${hasProposal ? this.renderProposal() : ''}
      </section>
    `
    this.bindHandlers()
  }

  private renderProposal(): string {
    const list = this.proposal.commands
      .map((c) => {
        const text = this.state ? humanize(c, this.state) : c.kind
        return `<li>${escapeHtml(text)}</li>`
      })
      .join('')
    return `
      <div class="command-proposal__preview">
        <p class="command-proposal__explanation">${escapeHtml(this.proposal.explanation)}</p>
        <ol class="command-proposal__list">${list}</ol>
        <form class="command-proposal__refine-form">
          <label class="flex-label" for="refine-input">Not quite? Refine it:</label>
          <input type="text" id="refine-input" name="feedback" class="flex-text-input" />
          <div class="l-cluster">
            <button type="button" class="flex-button" data-action="accept">Accept</button>
            <button type="button" class="flex-button" data-variant="outline" data-action="reject">Reject</button>
            <button type="submit" class="flex-button" data-variant="outline">Refine</button>
          </div>
        </form>
      </div>
    `
  }

  private renderError(msg: string) {
    const existing = this.querySelector('.command-proposal__error')
    if (existing) existing.remove()
    const div = document.createElement('div')
    div.className = 'command-proposal__error flex-alert'
    div.setAttribute('data-variant', 'error')
    div.innerHTML = `<div class="flex-alert__body"><p class="flex-alert__text">${escapeHtml(msg)}</p></div>`
    this.querySelector('.command-proposal')?.appendChild(div)
  }

  private bindHandlers() {
    const intentForm = this.querySelector<HTMLFormElement>('.command-proposal__intent-form')
    if (intentForm) {
      intentForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const data = new FormData(intentForm)
        const intent = String(data.get('intent') ?? '').trim()
        if (!intent) return
        this.dispatchEvent(
          new CustomEvent('formeditor:intent-submitted', {
            detail: { intent },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
    const refineForm = this.querySelector<HTMLFormElement>('.command-proposal__refine-form')
    if (refineForm) {
      refineForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const data = new FormData(refineForm)
        const feedback = String(data.get('feedback') ?? '').trim()
        if (!feedback) return
        this.dispatchEvent(
          new CustomEvent('formeditor:proposal-refine', {
            detail: { feedback },
            bubbles: true,
            composed: true,
          }),
        )
      })
      refineForm.querySelector('[data-action="accept"]')?.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('formeditor:proposal-accept', {
            detail: {},
            bubbles: true,
            composed: true,
          }),
        )
      })
      refineForm.querySelector('[data-action="reject"]')?.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('formeditor:proposal-reject', {
            detail: {},
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

if (!customElements.get('flex-command-proposal')) {
  customElements.define('flex-command-proposal', FlexCommandProposal)
}
```

- [ ] **Step 2: Create styles**

Create `src/design-system/components/flex-command-proposal/styles.css`:

```css
flex-command-proposal {
  display: block;
}

.command-proposal {
  border: 1px solid var(--flex-color-border);
  padding: var(--flex-space-2);
  border-radius: var(--flex-radius-md, 0.25rem);
}

.command-proposal__intent-form textarea {
  width: 100%;
}

.command-proposal__preview {
  margin-block-start: var(--flex-space-2);
  padding-block-start: var(--flex-space-2);
  border-block-start: 1px solid var(--flex-color-border);
}

.command-proposal__explanation {
  font-weight: 700;
}

.command-proposal__list {
  margin-block: var(--flex-space-1);
  padding-inline-start: var(--flex-space-3);
}

.command-proposal__refine-form input {
  width: 100%;
  margin-block-end: var(--flex-space-1);
}

.command-proposal__error {
  margin-block-start: var(--flex-space-2);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components/flex-command-proposal/
git commit -m "feat(shaping): add flex-command-proposal child element"
```

---

## Task 17: Create flex-form-structure child element

**Files:**
- Create: `src/design-system/components/flex-form-structure/client.ts`
- Create: `src/design-system/components/flex-form-structure/styles.css`

- [ ] **Step 1: Create the element**

Create `src/design-system/components/flex-form-structure/client.ts`:

```typescript
import type { ProjectStateClient } from '../flex-form-editor/protocol'

class FlexFormStructure extends HTMLElement {
  private state: ProjectStateClient | null = null

  connectedCallback() {
    const root = this.closest('flex-form-editor')
    if (root) {
      root.addEventListener('formeditor:spec-updated' as keyof HTMLElementEventMap, (e) => {
        this.state = (e as CustomEvent).detail.state
        this.render()
      })
    }
    this.render()
  }

  private render() {
    if (!this.state) {
      this.innerHTML = ''
      return
    }
    const pageHtml = this.state.formSpec.pages
      .map((page, i) => {
        const groupCount = page.groups.length
        return `
          <li class="form-structure__page" data-page-id="${page.id}">
            <div class="form-structure__page-header">
              <span class="form-structure__page-title">${i + 1}. ${escape(page.title)}</span>
              <span class="form-structure__group-count">${groupCount} group${groupCount === 1 ? '' : 's'}</span>
            </div>
            <select class="flex-select form-structure__delivery" data-page-id="${page.id}">
              <option value="static" ${page.deliveryMode !== 'conversational' && page.deliveryMode !== 'hybrid' ? 'selected' : ''}>Static</option>
              <option value="conversational" ${page.deliveryMode === 'conversational' ? 'selected' : ''}>Conversational</option>
              <option value="hybrid" ${page.deliveryMode === 'hybrid' ? 'selected' : ''}>Hybrid</option>
            </select>
            <div class="form-structure__reorder">
              ${i > 0 ? `<button type="button" data-action="up" data-page-id="${page.id}" aria-label="Move up">↑</button>` : ''}
              ${i < this.state!.formSpec.pages.length - 1 ? `<button type="button" data-action="down" data-page-id="${page.id}" aria-label="Move down">↓</button>` : ''}
            </div>
          </li>
        `
      })
      .join('')
    this.innerHTML = `
      <section class="form-structure">
        <h2>Structure</h2>
        <ol class="form-structure__page-list">${pageHtml}</ol>
      </section>
    `
    this.bindHandlers()
  }

  private bindHandlers() {
    for (const select of this.querySelectorAll<HTMLSelectElement>('.form-structure__delivery')) {
      select.addEventListener('change', () => {
        const pageId = select.dataset.pageId!
        this.dispatchEvent(
          new CustomEvent('formeditor:manual-command', {
            detail: {
              command: {
                kind: 'setDeliveryMode',
                pageId,
                mode: select.value,
              },
              explanation: `Set delivery mode to ${select.value}`,
            },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
    for (const btn of this.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      btn.addEventListener('click', () => {
        const pageId = btn.dataset.pageId!
        const direction = btn.dataset.action as 'up' | 'down'
        if (!this.state) return
        const idx = this.state.formSpec.pages.findIndex((p) => p.id === pageId)
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (target < 0 || target >= this.state.formSpec.pages.length) return
        const otherId = this.state.formSpec.pages[target].id
        this.dispatchEvent(
          new CustomEvent('formeditor:manual-command', {
            detail: {
              command: { kind: 'swapPages', a: pageId, b: otherId },
              explanation: `Move page ${direction}`,
            },
            bubbles: true,
            composed: true,
          }),
        )
      })
    }
  }
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

if (!customElements.get('flex-form-structure')) {
  customElements.define('flex-form-structure', FlexFormStructure)
}
```

- [ ] **Step 2: Create styles**

Create `src/design-system/components/flex-form-structure/styles.css`:

```css
flex-form-structure {
  display: block;
}

.form-structure__page-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--flex-space-1);
}

.form-structure__page {
  border: 1px solid var(--flex-color-border);
  padding: var(--flex-space-2);
  border-radius: var(--flex-radius-md, 0.25rem);
}

.form-structure__page-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-block-end: var(--flex-space-1);
}

.form-structure__page-title {
  font-weight: 700;
}

.form-structure__group-count {
  font-size: var(--flex-text-sm);
  color: var(--flex-color-text-subtle);
}

.form-structure__reorder {
  display: flex;
  gap: var(--flex-space-1);
  margin-block-start: var(--flex-space-1);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components/flex-form-structure/
git commit -m "feat(shaping): add flex-form-structure child element"
```

---

## Task 18: Register new elements and CSS, remove old intent-input

**Files:**
- Modify: `src/design-system/register.ts`
- Modify: `src/entrypoints/app/public/styles.css`
- Delete: `src/design-system/components/flex-intent-input/` (directory)

- [ ] **Step 1: Delete old intent-input directory**

```bash
rm -r src/design-system/components/flex-intent-input
```

- [ ] **Step 2: Update register.ts**

Open `src/design-system/register.ts`. Remove any `flex-intent-input` import. Add:

```typescript
import './components/flex-form-editor/client'
import './components/flex-command-proposal/client'
import './components/flex-form-structure/client'
```

- [ ] **Step 3: Update CSS imports**

In `src/entrypoints/app/public/styles.css`, remove any `@import` referencing `flex-intent-input`. Add:

```css
@import url('../../../design-system/components/flex-form-editor/styles.css') layer(block);
@import url('../../../design-system/components/flex-command-proposal/styles.css') layer(block);
@import url('../../../design-system/components/flex-form-structure/styles.css') layer(block);
```

(Adjust the path prefix to match how other components are imported — check neighboring lines.)

Also remove the import for the old editor styles if they referenced flex-intent-input.

- [ ] **Step 4: Run check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(shaping): register new editor elements, remove flex-intent-input"
```

---

## Task 19: End-to-end smoke test

**Files:**
- None — exercise the running app

- [ ] **Step 1: Build CSS**

```bash
bun run build:css
```

- [ ] **Step 2: Start the dev server on a free port**

```bash
PORT=3456 bun run src/entrypoints/app/main.ts
```

(In a separate terminal.)

- [ ] **Step 3: Hit the edit page**

Navigate to `http://localhost:3456/<owner>/<slug>/edit` for an existing project (create one via /new if needed). Verify:

- The editor renders with intent form, structure view, and preview iframe
- Selecting a delivery mode on a page triggers a POST and the structure refreshes
- Typing an intent submits, and a proposal appears (requires valid Bedrock credentials)
- Accepting the proposal updates the structure

- [ ] **Step 4: Run full check**

Run: `bun run check`
Expected: PASS

- [ ] **Step 5: Commit any fixes discovered during manual testing**

```bash
git add -A
git commit -m "fix(shaping): end-to-end polish after manual testing"
```

---

## Task 20: Update docs and changelog

**Files:**
- Modify: `catalog/architecture/threat-model.md`

- [ ] **Step 1: Add changelog entry**

In `catalog/architecture/threat-model.md`, under "Change log", append:

```markdown
| 2026-04-15 | Story 4 v2 | Replaced full-spec rewrite with command-based shaping. LLM now uses tool-use mode to emit validated domain commands. Each command is individually executable and auditable. |
```

Also update the "Story 4" section (added previously) to describe tool-use validation replacing free-form JSON as a threat mitigation for LLM output integrity.

- [ ] **Step 2: Commit**

```bash
git add catalog/architecture/threat-model.md
git commit -m "docs(threat-model): note command-based shaping shift"
```
