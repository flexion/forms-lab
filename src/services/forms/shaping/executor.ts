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
      return fail(
        command,
        `Command kind not yet implemented: ${(command as Command).kind}`,
      )
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
