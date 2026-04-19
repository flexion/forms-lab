import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-confidence-badge',
  variants: [
    {
      name: 'HighConfidence',
      description:
        'Confidence at or above the high threshold (0.8): renders nothing, no DOM output.',
    },
    {
      name: 'NeedsReview',
      description:
        'Confidence between the medium threshold (0.5) and high threshold (0.8): shows a "Review" badge.',
    },
    {
      name: 'LowConfidence',
      description:
        'Confidence below the medium threshold (0.5): shows a "Low confidence" badge.',
    },
    {
      name: 'WithFlags',
      description:
        'Low confidence badge with explicit extraction flags surfaced in the tooltip title attribute.',
    },
  ],
  behavior: [
    {
      description:
        'Component renders null (no DOM output) when confidence meets or exceeds the high threshold',
      tested: false,
    },
    {
      description:
        'Tooltip title attribute surfaces extraction flags when provided, otherwise shows the numeric confidence percentage',
      tested: false,
    },
  ],
  // No accessibilityFixtureHtml override: the per-variant axe audits assert
  // against the real component output. If those audits surface a11y issues,
  // fix them in index.tsx rather than papering over them with a hand-written
  // fixture that diverges from what the component actually renders.
}
