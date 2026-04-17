// Compares structural attributes only: page identity, title, delivery mode,
// group assignments, and position. Condition changes are not compared in this slice.
import type { FormPage, FormSpec } from '../types'
import type { SpecChange } from './types'

export function diffFormSpecs(base: FormSpec, head: FormSpec): SpecChange[] {
  const changes: SpecChange[] = []
  const basePages = new Map(base.pages.map((p) => [p.id, p]))
  const headPages = new Map(head.pages.map((p) => [p.id, p]))

  // Added / renamed / modified pages
  for (const [id, headPage] of headPages) {
    const basePage = basePages.get(id)
    if (!basePage) {
      const headIdx = head.pages.findIndex((p) => p.id === id)
      changes.push({
        category: 'added',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `New page: "${headPage.title}" (position ${headIdx + 1})`,
        details: {
          deliveryMode: headPage.deliveryMode,
          groupCount: headPage.groups.length,
        },
      })
      continue
    }
    if (basePage.title !== headPage.title) {
      changes.push({
        category: 'renamed',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Page renamed from "${basePage.title}" to "${headPage.title}"`,
      })
    }
    if (basePage.deliveryMode !== headPage.deliveryMode) {
      changes.push({
        category: 'modified',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Page "${headPage.title}" delivery mode: ${basePage.deliveryMode} to ${headPage.deliveryMode}`,
      })
    }
    changes.push(...diffPageGroups(id, headPage.title, basePage, headPage))
  }

  // Removed pages
  for (const [id, basePage] of basePages) {
    if (!headPages.has(id)) {
      changes.push({
        category: 'removed',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Removed page: "${basePage.title}"`,
      })
    }
  }

  // Moved pages: only emit if a page exists in both and its position changed
  for (const [id, headPage] of headPages) {
    if (!basePages.has(id)) continue
    const baseIdx = base.pages.findIndex((p) => p.id === id)
    const headIdx = head.pages.findIndex((p) => p.id === id)
    if (baseIdx !== headIdx) {
      changes.push({
        category: 'moved',
        resource: 'form-spec',
        path: [`page:${id}`],
        description: `Page "${headPage.title}" moved from position ${baseIdx + 1} to ${headIdx + 1}`,
      })
    }
  }

  return changes
}

function diffPageGroups(
  pageId: string,
  pageTitle: string,
  basePage: FormPage,
  headPage: FormPage,
): SpecChange[] {
  const changes: SpecChange[] = []
  const baseSet = new Set(basePage.groups)
  const headSet = new Set(headPage.groups)
  for (const g of headSet) {
    if (!baseSet.has(g)) {
      changes.push({
        category: 'added',
        resource: 'form-spec',
        path: [`page:${pageId}`, `group:${g}`],
        description: `Added group "${g}" to page "${pageTitle}"`,
      })
    }
  }
  for (const g of baseSet) {
    if (!headSet.has(g)) {
      changes.push({
        category: 'removed',
        resource: 'form-spec',
        path: [`page:${pageId}`, `group:${g}`],
        description: `Removed group "${g}" from page "${pageTitle}"`,
      })
    }
  }
  return changes
}
