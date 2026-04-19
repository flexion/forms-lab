import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-spec-browser',
  variants: [
    {
      name: 'Default',
      description:
        'Two-pane browser showing pages and groups from a minimal spec, all panels expanded, no confidence data.',
    },
    {
      name: 'WithConfidence',
      description:
        'Browser with per-field confidence badges overlaid: high confidence shows nothing, medium shows "Review", low shows "Low confidence".',
    },
  ],
  behavior: [
    {
      description:
        'Sidebar nav links scroll the content pane to the corresponding page or group section',
      tested: false,
    },
    {
      description:
        'Details panels open/close on click; defaultExpanded prop controls initial state',
      tested: false,
    },
    {
      description:
        'blobBasePath turns section headings into external links to the source files',
      tested: false,
    },
  ],
  // No accessibilityFixtureHtml override: the per-variant axe audits assert
  // against the real component output. If those audits surface a11y issues,
  // fix them in index.tsx rather than papering over them with a hand-written
  // fixture that diverges from what the component actually renders.
}
