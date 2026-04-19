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
  accessibilityFixtureHtml: `<main>
    <h1>Confidence Badge Test</h1>
    <table>
      <caption>Field confidence examples</caption>
      <thead><tr><th scope="col">Field</th><th scope="col">Status</th></tr></thead>
      <tbody>
        <tr><td>First name</td><td></td></tr>
        <tr><td>Date of birth</td><td><span class="flex-confidence-badge" data-level="medium" title="Confidence: 65%">Review</span></td></tr>
        <tr><td>Signature block</td><td><span class="flex-confidence-badge" data-level="low" title="Confidence: 30%">Low confidence</span></td></tr>
      </tbody>
    </table>
  </main>`,
}
