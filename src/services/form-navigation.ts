import type { FieldEntry, ResolvedForm } from '../types/models'
import { evaluateCondition } from './form-resolver'

export function findNextPage(
  resolved: ResolvedForm,
  currentIndex: number,
  fields: Record<string, FieldEntry>,
): number | null {
  for (let i = currentIndex + 1; i < resolved.pages.length; i++) {
    if (evaluateCondition(resolved.pages[i].page.condition, fields)) {
      return i
    }
  }
  return null
}

export function findPrevPage(
  resolved: ResolvedForm,
  currentIndex: number,
  fields: Record<string, FieldEntry>,
): number | null {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (evaluateCondition(resolved.pages[i].page.condition, fields)) {
      return i
    }
  }
  return null
}
