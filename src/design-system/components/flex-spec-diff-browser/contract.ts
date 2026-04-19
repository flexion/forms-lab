import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-spec-diff-browser',
  variants: [
    {
      name: 'NoChanges',
      description:
        'Identical base and head specs: overview shows "These refs are identical"; all panels render from the head spec.',
    },
    {
      name: 'WithAdditions',
      description:
        'Head spec has a new field relative to base: overview shows the addition count; changed panel opens automatically.',
    },
    {
      name: 'InitialImport',
      description:
        'Null base specs (first-time import): revealMode defaults to "all" and every panel starts open.',
    },
  ],
  behavior: [
    {
      description:
        'Overview strip counts changes by category and provides jump-links to changed pages',
      tested: false,
    },
    {
      description:
        'Panels with changes open automatically when revealMode is "changed"; unchanged panels collapse',
      tested: false,
    },
    {
      description:
        'Removed items from the base spec are spliced back into their original positions with a "Removed" badge',
      tested: false,
    },
  ],
}
