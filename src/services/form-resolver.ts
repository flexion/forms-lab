import type {
  DataCollectionSpec,
  FieldCondition,
  FieldEntry,
  FormSpec,
  ResolvedForm,
} from '../types/models'

export function evaluateCondition(
  condition: FieldCondition | undefined,
  fields: Record<string, FieldEntry>,
): boolean {
  if (!condition) return true
  const entry = fields[condition.field]
  const fieldValue = entry?.value ?? null
  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'notEquals':
      return fieldValue !== condition.value
    case 'contains':
      return (
        typeof fieldValue === 'string' &&
        fieldValue.includes(String(condition.value))
      )
  }
}

export function resolveFormSpec(
  formSpec: FormSpec,
  dataSpec: DataCollectionSpec,
): ResolvedForm {
  const groupMap = new Map(dataSpec.groups.map((g) => [g.id, g]))
  const pages = formSpec.pages.map((page) => {
    const groups = page.groups.map((groupId) => {
      const group = groupMap.get(groupId)
      if (!group) {
        throw new Error(
          `RequirementGroup "${groupId}" not found in DataCollectionSpec "${dataSpec.id}"`,
        )
      }
      return group
    })
    return { page, groups }
  })
  return { formSpec, dataSpec, pages }
}
