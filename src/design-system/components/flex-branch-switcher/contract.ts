import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-branch-switcher',
  variants: [
    {
      name: 'Default',
      description:
        'Switcher trigger showing the main branch with a "published" badge; dropdown panel is hidden.',
    },
    {
      name: 'OnFeatureBranch',
      description:
        'Switcher trigger showing a feature branch with an "ahead" count; multiple branches in the list.',
    },
  ],
  behavior: [
    {
      description:
        'Clicking the trigger button opens the dropdown panel by toggling aria-expanded and removing the hidden attribute',
      tested: false,
    },
    {
      description:
        'Filtering the search input narrows the branch list to matching entries',
      tested: false,
    },
    {
      description:
        'Submitting the create-branch form with a valid name navigates to the new branch',
      tested: false,
    },
  ],
  // No accessibilityFixtureHtml override: the per-variant axe audits assert
  // against the real component output. If those audits surface a11y issues,
  // fix them in index.tsx rather than papering over them with a hand-written
  // fixture that diverges from what the component actually renders.
}
