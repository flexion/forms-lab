import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-tag',
  reference: 'https://designsystem.digital.gov/components/tag/',
  mapping: [
    {
      uswds: 'usa-tag',
      flex: '.flex-tag',
      notes: 'Base tag class',
    },
    {
      uswds: 'usa-tag--big',
      flex: 'data-size="big"',
      notes: 'Large tag size',
    },
  ],
  verified: [
    'background-color',
    'color',
    'font-size',
    'font-family',
    'text-transform',
    'border-radius',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'default tag matches usa-tag',
      uswds: '<div><span class="usa-tag" data-testid="target">New</span></div>',
      flex: '<div><span class="flex-tag" data-testid="target">New</span></div>',
    },
    {
      name: 'big tag matches usa-tag--big',
      uswds:
        '<div><span class="usa-tag usa-tag--big" data-testid="target">New</span></div>',
      flex: '<div><span class="flex-tag" data-size="big" data-testid="target">New</span></div>',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Tag Test</h1>
    <span class="flex-tag" data-testid="target">New</span>
    <span class="flex-tag" data-size="big">Big Tag</span>
  </main>`,
  behavior: [],
}
