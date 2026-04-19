import { type CriteriaSet, type Criterion, criteriaSetSchema } from './types'

export function emptyCriteriaSet(): CriteriaSet {
  return { criteria: [], approvedAt: null, approvedBy: null }
}

export interface CriteriaEdits {
  approve: string[]
  reject: string[]
  add: Array<{ text: string; source: string }>
  edit: Array<{ id: string; text: string; source: string }>
}

let nextId = 0
function generateCriterionId(): string {
  return `criterion-${Date.now()}-${++nextId}`
}

export function mergeCriteriaEdits(
  set: CriteriaSet,
  edits: CriteriaEdits,
): CriteriaSet {
  const criteria = set.criteria.map((c): Criterion => {
    if (edits.approve.includes(c.id)) return { ...c, status: 'approved' }
    if (edits.reject.includes(c.id)) return { ...c, status: 'rejected' }
    const edited = edits.edit.find((e) => e.id === c.id)
    if (edited) return { ...c, text: edited.text, source: edited.source }
    return c
  })

  for (const added of edits.add) {
    criteria.push({
      id: generateCriterionId(),
      text: added.text,
      source: added.source,
      status: 'added',
    })
  }

  return { ...set, criteria }
}

export function approveCriteriaSet(
  set: CriteriaSet,
  username: string,
): CriteriaSet {
  return {
    criteria: set.criteria.map((c) =>
      c.status === 'pending' ? { ...c, status: 'approved' } : c,
    ),
    approvedAt: new Date().toISOString(),
    approvedBy: username,
  }
}

export function serializeCriteriaSet(set: CriteriaSet): string {
  return JSON.stringify(set, null, 2)
}

export function parseCriteriaSet(json: string): CriteriaSet {
  return criteriaSetSchema.parse(JSON.parse(json))
}
