import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-semantic-diff',
  variants: [
    {
      name: 'NoChanges',
      description:
        'Empty state: no changes between refs; renders the "No changes" empty message.',
    },
    {
      name: 'WithAdditions',
      description:
        'One group with multiple added-category changes, demonstrating the "ADDED" badge.',
    },
    {
      name: 'WithRemovals',
      description:
        'One group with a single removed-category change, demonstrating the "REMOVED" badge.',
    },
    {
      name: 'MixedChanges',
      description:
        'Multiple groups with all change categories (added, modified, removed, renamed) showing the full badge palette.',
    },
  ],
  behavior: [
    {
      description:
        'Changes are grouped by groupKey; each group renders a heading followed by its list of changes',
      tested: false,
    },
    {
      description:
        'Each change item shows the correct category badge label (ADDED, REMOVED, MODIFIED, MOVED, RENAMED)',
      tested: false,
    },
  ],
}
