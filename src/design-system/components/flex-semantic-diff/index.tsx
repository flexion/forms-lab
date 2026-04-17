import type { FC } from 'hono/jsx'

// The component describes its own input contract so it stays in the
// design-system layer (P2, P4). Callers in the services/entrypoints layer
// map their domain types onto this shape.
export type SemanticDiffCategory =
  | 'added'
  | 'removed'
  | 'modified'
  | 'moved'
  | 'renamed'

export interface SemanticDiffChange {
  category: SemanticDiffCategory
  groupKey: string
  groupLabel: string
  description: string
}

interface Props {
  changes: SemanticDiffChange[]
}

const CATEGORY_LABELS: Record<SemanticDiffCategory, string> = {
  added: 'ADDED',
  removed: 'REMOVED',
  modified: 'MODIFIED',
  moved: 'MOVED',
  renamed: 'RENAMED',
}

export const SemanticDiff: FC<Props> = ({ changes }) => {
  if (changes.length === 0) {
    return (
      <section class="flex-semantic-diff">
        <p class="flex-semantic-diff__empty">No changes between these refs.</p>
      </section>
    )
  }

  const groups = new Map<
    string,
    { label: string; items: SemanticDiffChange[] }
  >()
  for (const change of changes) {
    const existing = groups.get(change.groupKey)
    if (existing) {
      existing.items.push(change)
    } else {
      groups.set(change.groupKey, {
        label: change.groupLabel,
        items: [change],
      })
    }
  }

  return (
    <section class="flex-semantic-diff">
      {[...groups.entries()].map(([key, { label, items }]) => (
        <div class="flex-semantic-diff__group" data-group={key}>
          <h3 class="flex-semantic-diff__heading">{label}</h3>
          <ul class="flex-semantic-diff__list">
            {items.map((change) => (
              <li
                class="flex-semantic-diff__change"
                data-category={change.category}
              >
                <span class="flex-semantic-diff__badge">
                  {CATEGORY_LABELS[change.category]}
                </span>
                <span class="flex-semantic-diff__description">
                  {change.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
