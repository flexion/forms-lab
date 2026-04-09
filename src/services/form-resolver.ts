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
