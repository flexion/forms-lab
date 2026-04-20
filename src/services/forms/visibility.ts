import type { RequirementGroup } from '../data-collection'
import { evaluateCondition } from './resolver'
import type { FieldEntry, ResolvedForm } from './types'

export function filterVisibleGroups(
  groups: RequirementGroup[],
  fields: Record<string, FieldEntry>,
): RequirementGroup[] {
  return groups
    .filter((g) => evaluateCondition(g.condition, fields))
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) =>
        evaluateCondition(r.condition, fields),
      ),
    }))
}

export function buildReviewPages(
  resolved: ResolvedForm,
  fields: Record<string, FieldEntry>,
): Array<{
  id: string
  title: string
  groups: Array<{
    id: string
    requirements: Array<{ fieldName: string; label: string }>
  }>
}> {
  return resolved.pages
    .filter((rp) => evaluateCondition(rp.page.condition, fields))
    .map((rp) => ({
      id: rp.page.id,
      title: rp.page.title,
      groups: filterVisibleGroups(rp.groups, fields).map((g) => ({
        id: g.id,
        requirements: g.requirements.map((r) => ({
          fieldName: r.fieldName,
          label: r.label,
        })),
      })),
    }))
}
