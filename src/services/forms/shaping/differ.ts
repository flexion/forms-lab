import type { FormSpec } from '../types'
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
      if (titleChanged) details.push(`renamed to "${page.title}"`)
      if (groupsChanged) details.push('groups changed')
      if (deliveryChanged)
        details.push(`delivery mode → ${page.deliveryMode ?? 'static'}`)
      pages.push({
        id: page.id,
        title: page.title,
        status: 'modified',
        details: details.join(', '),
      })
      changes.push(`Modified page "${page.title}": ${details.join(', ')}`)
    } else if (moved) {
      pages.push({ id: page.id, title: page.title, status: 'moved' })
      changes.push(
        `Moved page "${page.title}" from position ${beforeIndex + 1} to ${afterIndex + 1}`,
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

  return {
    summary: changes.length > 0 ? `${changes.join('. ')}.` : 'No changes.',
    pages,
    hasChanges: changes.length > 0,
  }
}
