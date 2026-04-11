import { evaluateCondition } from './resolver'
import type { FieldEntry, ResolvedForm } from './types'

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

export function countVisiblePages(
  resolved: ResolvedForm,
  fields: Record<string, FieldEntry>,
): number {
  return resolved.pages.filter((p) =>
    evaluateCondition(p.page.condition, fields),
  ).length
}

export function visiblePageNumber(
  resolved: ResolvedForm,
  pageIndex: number,
  fields: Record<string, FieldEntry>,
): number {
  let count = 0
  for (let i = 0; i <= pageIndex; i++) {
    if (evaluateCondition(resolved.pages[i].page.condition, fields)) {
      count++
    }
  }
  return count
}
