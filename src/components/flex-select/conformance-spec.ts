import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-select',
  reference: 'https://designsystem.digital.gov/components/select/',
  mapping: [
    {
      uswds: 'usa-select',
      flex: '.flex-select',
      notes: 'Base select class',
    },
    {
      uswds: 'usa-select (multiple)',
      flex: '.flex-select[multiple]',
      notes: 'Multiple select variant without chevron',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'background-color',
    'border-radius',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  structuralIgnores: [
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'background-image',
    'background-position',
    'background-size',
  ],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'default select matches usa-select',
      uswds:
        '<select class="usa-select" data-testid="target"><option value="">- Select -</option><option value="1">Option 1</option></select>',
      flex: '<select class="flex-select" data-testid="target"><option value="">- Select -</option><option value="1">Option 1</option></select>',
    },
    {
      name: 'multiple select',
      uswds:
        '<select class="usa-select" multiple data-testid="target"><option value="1">Option 1</option><option value="2">Option 2</option></select>',
      flex: '<select class="flex-select" multiple data-testid="target"><option value="1">Option 1</option><option value="2">Option 2</option></select>',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Select Test</h1>
    <label class="flex-label" for="sel-default">Choose an option</label>
    <select class="flex-select" id="sel-default" data-testid="target">
      <option value="">- Select -</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </select>
    <label class="flex-label" for="sel-disabled">Disabled select</label>
    <select class="flex-select" id="sel-disabled" disabled>
      <option value="">- Select -</option>
    </select>
  </main>`,
  behavior: [
    {
      description: 'Focus ring visible on keyboard focus',
      tested: false,
    },
    {
      description: 'Custom chevron visible in default mode',
      tested: false,
    },
    {
      description: 'No chevron in multiple mode',
      tested: false,
    },
    {
      description: 'Disabled state prevents interaction',
      tested: false,
    },
  ],
}
