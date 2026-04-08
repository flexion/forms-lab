import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-list',
  reference: 'https://designsystem.digital.gov/components/list/',
  mapping: [
    {
      uswds: 'usa-list',
      flex: '.flex-list',
      notes: 'Base list class',
    },
    {
      uswds: 'usa-list--unstyled',
      flex: 'data-variant="unstyled"',
      notes: 'Unstyled list without bullets or padding',
    },
  ],
  verified: [
    'margin-top',
    'margin-bottom',
    'padding-left',
    'line-height',
    'list-style-type',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'unordered list matches usa-list',
      uswds:
        '<ul class="usa-list" data-testid="target"><li>Milk</li><li>Eggs</li><li>Bread</li></ul>',
      flex: '<ul class="flex-list" data-testid="target"><li>Milk</li><li>Eggs</li><li>Bread</li></ul>',
    },
    {
      name: 'ordered list matches usa-list',
      uswds:
        '<ol class="usa-list" data-testid="target"><li>First</li><li>Second</li><li>Third</li></ol>',
      flex: '<ol class="flex-list" data-testid="target"><li>First</li><li>Second</li><li>Third</li></ol>',
    },
    {
      name: 'unstyled list matches usa-list--unstyled',
      uswds:
        '<ul class="usa-list usa-list--unstyled" data-testid="target"><li>Milk</li><li>Eggs</li><li>Bread</li></ul>',
      flex: '<ul class="flex-list" data-variant="unstyled" data-testid="target"><li>Milk</li><li>Eggs</li><li>Bread</li></ul>',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>List Test</h1>
    <ul class="flex-list" data-testid="target">
      <li>Milk</li>
      <li>Eggs</li>
      <li>Bread</li>
    </ul>
    <ol class="flex-list">
      <li>First</li>
      <li>Second</li>
      <li>Third</li>
    </ol>
    <ul class="flex-list" data-variant="unstyled">
      <li>Unstyled item</li>
    </ul>
  </main>`,
  behavior: [],
}
