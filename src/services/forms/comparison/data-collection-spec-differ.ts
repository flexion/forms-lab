import type {
  DataCollectionSpec,
  DataRequirement,
} from '../../data-collection/types'
import type { SpecChange } from './types'

export function diffDataCollectionSpecs(
  base: DataCollectionSpec,
  head: DataCollectionSpec,
): SpecChange[] {
  const changes: SpecChange[] = []
  const baseGroups = new Map(base.groups.map((g) => [g.id, g]))
  const headGroups = new Map(head.groups.map((g) => [g.id, g]))

  // Added / renamed / modified groups
  for (const [id, headGroup] of headGroups) {
    const baseGroup = baseGroups.get(id)
    if (!baseGroup) {
      changes.push({
        category: 'added',
        resource: 'data-collection-spec',
        path: [`group:${id}`],
        description: `New requirement group: "${headGroup.title}"`,
        details: { fieldCount: headGroup.requirements.length },
      })
      continue
    }
    if (baseGroup.title !== headGroup.title) {
      changes.push({
        category: 'renamed',
        resource: 'data-collection-spec',
        path: [`group:${id}`],
        description: `Group renamed from "${baseGroup.title}" to "${headGroup.title}"`,
      })
    }
    changes.push(
      ...diffRequirements(id, baseGroup.requirements, headGroup.requirements),
    )
  }

  // Removed groups
  for (const [id, baseGroup] of baseGroups) {
    if (!headGroups.has(id)) {
      changes.push({
        category: 'removed',
        resource: 'data-collection-spec',
        path: [`group:${id}`],
        description: `Removed requirement group: "${baseGroup.title}"`,
      })
    }
  }

  return changes
}

function diffRequirements(
  groupId: string,
  baseReqs: DataRequirement[],
  headReqs: DataRequirement[],
): SpecChange[] {
  const changes: SpecChange[] = []
  const baseMap = new Map(baseReqs.map((r) => [r.id, r]))
  const headMap = new Map(headReqs.map((r) => [r.id, r]))

  for (const [id, headReq] of headMap) {
    const baseReq = baseMap.get(id)
    if (!baseReq) {
      changes.push({
        category: 'added',
        resource: 'data-collection-spec',
        path: [`group:${groupId}`, `field:${id}`],
        description: `Added field "${headReq.label}" to group`,
      })
      continue
    }
    const modifications: string[] = []
    if (baseReq.required !== headReq.required) {
      modifications.push(
        headReq.required ? 'marked as required' : 'marked as optional',
      )
    }
    if (baseReq.fieldType !== headReq.fieldType) {
      modifications.push(
        `type changed from ${baseReq.fieldType} to ${headReq.fieldType}`,
      )
    }
    if (baseReq.label !== headReq.label) {
      modifications.push(`relabeled "${baseReq.label}" to "${headReq.label}"`)
    }
    if (modifications.length > 0) {
      changes.push({
        category: 'modified',
        resource: 'data-collection-spec',
        path: [`group:${groupId}`, `field:${id}`],
        description: `Field "${headReq.label}": ${modifications.join(', ')}`,
      })
    }
  }

  for (const [id, baseReq] of baseMap) {
    if (!headMap.has(id)) {
      changes.push({
        category: 'removed',
        resource: 'data-collection-spec',
        path: [`group:${groupId}`, `field:${id}`],
        description: `Removed field "${baseReq.label}"`,
      })
    }
  }

  return changes
}
