import type {
  DataCollectionSpec,
  RequirementGroup,
} from '../../data-collection/types'
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

function cloneDataSpec(spec: DataCollectionSpec): DataCollectionSpec {
  return {
    ...spec,
    groups: spec.groups.map((g) => ({
      ...g,
      requirements: g.requirements.map((r) => ({ ...r })),
    })),
  }
}

function generateGroupId(): string {
  return `group-new-${crypto.randomUUID().slice(0, 8)}`
}

function findFieldGroupIdx(state: ProjectState, fieldId: string): number {
  return state.dataSpec.groups.findIndex((g) =>
    g.requirements.some((r) => r.id === fieldId),
  )
}

function generateFieldId(): string {
  return `field-new-${crypto.randomUUID().slice(0, 8)}`
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
  formSpec.pages = order.map((id) => {
    const page = byId.get(id)
    if (!page) throw new Error(`Page not found: ${id}`)
    return { ...page, groups: [...page.groups] }
  })
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
      'Page has groups; specify moveGroupsTo to relocate them',
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

function execMoveGroup(
  state: ProjectState,
  command: Extract<Command, { kind: 'moveGroup' }>,
): ExecutorResult {
  const formSpec = cloneFormSpec(state.formSpec)
  const fromPage = formSpec.pages.find((p) =>
    p.groups.includes(command.groupId),
  )
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
      return fail(
        command,
        `Unknown moveFieldsTo group: ${command.moveFieldsTo}`,
      )
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
  )
  if (!field) return fail(command, `Field ${command.fieldId} disappeared`)
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
  const groupIdx = state.dataSpec.groups.findIndex(
    (g) => g.id === command.groupId,
  )
  if (groupIdx < 0) return fail(command, `Unknown groupId: ${command.groupId}`)
  const group = state.dataSpec.groups[groupIdx]
  const currentIds = group.requirements.map((r) => r.id)
  if (
    command.order.length !== currentIds.length ||
    !command.order.every((id) => currentIds.includes(id))
  ) {
    return fail(
      command,
      `order must be a permutation of field ids in group ${command.groupId}`,
    )
  }
  const byId = new Map(group.requirements.map((r) => [r.id, r]))
  const dataSpec = cloneDataSpec(state.dataSpec)
  dataSpec.groups[groupIdx] = {
    ...group,
    requirements: command.order.map((id) => {
      const r = byId.get(id)
      if (!r) throw new Error(`unreachable: ${id}`)
      return { ...r }
    }),
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
      ? {
          ...r,
          label: command.label,
          helpText: command.helpText ?? r.helpText,
        }
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
    const { condition: _condition, ...rest } = r
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
      ? {
          ...r,
          fieldType: command.fieldType,
          choices: command.choices ?? r.choices,
        }
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
  const groupIdx = state.dataSpec.groups.findIndex(
    (g) => g.id === command.groupId,
  )
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
