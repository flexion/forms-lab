import type { Command, ProjectState } from './commands'
import { executeBatch } from './executor'

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

export function composeExplanation(
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
