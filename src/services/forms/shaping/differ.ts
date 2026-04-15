import type { FormPage, FormSpec } from '../types'
import type { FormSpecDiff, PageDiff } from './types'

export function diffFormSpecs(before: FormSpec, after: FormSpec): FormSpecDiff {
  const beforeIds = new Map(before.pages.map((p, i) => [p.id, i]))
  const afterIds = new Map(after.pages.map((p, i) => [p.id, i]))

  const pages: PageDiff[] = []
  const changes: string[] = []

  for (const page of after.pages) {
    const beforeIndex = beforeIds.get(page.id)
    if (beforeIndex === undefined) {
      pages.push({ id: page.id, title: page.title, status: 'added' })
      changes.push(`Added page "${page.title}"`)
      continue
    }

    const beforePage = before.pages[beforeIndex]
    const afterIndex = afterIds.get(page.id)
    if (afterIndex === undefined) continue // Should never happen

    const groupsChanged =
      JSON.stringify(beforePage.groups) !== JSON.stringify(page.groups)
    const titleChanged = beforePage.title !== page.title
    const deliveryChanged = beforePage.deliveryMode !== page.deliveryMode
    const moved = beforeIndex !== afterIndex

    if (groupsChanged || titleChanged || deliveryChanged) {
      const details: string[] = []
      if (titleChanged)
        details.push(`title "${beforePage.title}" → "${page.title}"`)
      if (groupsChanged) {
        details.push(
          `groups [${beforePage.groups.join(', ')}] → [${page.groups.join(', ')}]`,
        )
      }
      if (deliveryChanged) {
        details.push(
          `delivery ${beforePage.deliveryMode ?? 'static'} → ${page.deliveryMode ?? 'static'}`,
        )
      }
      pages.push({
        id: page.id,
        title: page.title,
        status: 'modified',
        details: details.join('; '),
      })
      changes.push(`Modified "${beforePage.title}" (${details.join('; ')})`)
    } else if (moved) {
      pages.push({ id: page.id, title: page.title, status: 'moved' })
      changes.push(
        `Moved "${page.title}" from position ${beforeIndex + 1} to ${afterIndex + 1}`,
      )
    } else {
      pages.push({ id: page.id, title: page.title, status: 'unchanged' })
    }
  }

  for (const page of before.pages) {
    if (!afterIds.has(page.id)) {
      pages.push({ id: page.id, title: page.title, status: 'removed' })
      changes.push(`Removed page "${page.title}"`)
    }
  }

  // Detect content swaps: two 'modified' pages whose before/after pages are
  // exactly each other's content. Rewrite those as a single swap message.
  const swappedIds = detectContentSwaps(before, after)
  if (swappedIds.length > 0) {
    for (const [idA, idB] of swappedIds) {
      const pageA = before.pages.find((p) => p.id === idA)
      const pageB = before.pages.find((p) => p.id === idB)
      if (!pageA || !pageB) continue
      // Replace the two modified entries with a single swap message
      const aIdx = pages.findIndex((p) => p.id === idA)
      const bIdx = pages.findIndex((p) => p.id === idB)
      if (aIdx >= 0) {
        pages[aIdx] = {
          id: idA,
          title: pageA.title,
          status: 'modified',
          details: `swapped with "${pageB.title}"`,
        }
      }
      if (bIdx >= 0) {
        pages[bIdx] = {
          id: idB,
          title: pageB.title,
          status: 'modified',
          details: `swapped with "${pageA.title}"`,
        }
      }
    }
  }

  return {
    summary: changes.length > 0 ? `${changes.join('. ')}.` : 'No changes.',
    pages,
    hasChanges: changes.length > 0,
  }
}

function pageContentEquals(a: FormPage, b: FormPage): boolean {
  return (
    a.title === b.title &&
    JSON.stringify(a.groups) === JSON.stringify(b.groups) &&
    (a.deliveryMode ?? 'static') === (b.deliveryMode ?? 'static')
  )
}

function detectContentSwaps(
  before: FormSpec,
  after: FormSpec,
): Array<[string, string]> {
  const swaps: Array<[string, string]> = []
  const afterById = new Map(after.pages.map((p) => [p.id, p]))
  const seen = new Set<string>()

  for (const a of before.pages) {
    if (seen.has(a.id)) continue
    const aAfter = afterById.get(a.id)
    if (!aAfter || pageContentEquals(a, aAfter)) continue
    // Find another page whose before-content matches aAfter's content
    for (const b of before.pages) {
      if (b.id === a.id || seen.has(b.id)) continue
      const bAfter = afterById.get(b.id)
      if (!bAfter) continue
      if (pageContentEquals(a, bAfter) && pageContentEquals(b, aAfter)) {
        swaps.push([a.id, b.id])
        seen.add(a.id)
        seen.add(b.id)
        break
      }
    }
  }
  return swaps
}
