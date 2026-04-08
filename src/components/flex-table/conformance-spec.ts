import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-table',
  reference: 'https://designsystem.digital.gov/components/table/',
  mapping: [
    {
      uswds: 'usa-table',
      flex: '.flex-table',
      notes: 'Base table class',
    },
    {
      uswds: 'usa-table--borderless',
      flex: 'data-variant="borderless"',
      notes: 'Borderless variant',
    },
    {
      uswds: 'usa-table--striped',
      flex: 'data-striped',
      notes: 'Alternating row backgrounds',
    },
    {
      uswds: 'usa-table--compact',
      flex: 'data-compact',
      notes: 'Reduced cell padding',
    },
    {
      uswds: 'usa-table-container--scrollable',
      flex: '.flex-table__container[data-scrollable]',
      notes: 'Scrollable table wrapper',
    },
    {
      uswds: 'usa-table--stacked',
      flex: 'data-stacked',
      notes: 'Responsive stacking on mobile',
    },
    {
      uswds: 'usa-table--stacked-header',
      flex: 'data-stacked-header',
      notes: 'Stacked with header column visible',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'border-collapse',
    'color',
    'text-align',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'background-color',
  ],
  structuralIgnores: ['margin-top', 'margin-bottom'],
  intentionalDifferences: [
    {
      property: 'border-color',
      ours: 'var(--flex-color-text)',
      uswds: '#1b1b1b',
      reason: 'We use semantic token that resolves to same value in light mode',
    },
  ],
  fixtures: [
    {
      name: 'default table matches usa-table',
      uswds: `<div><table class="usa-table" data-testid="target"><thead><tr><th scope="col">Name</th><th scope="col">Value</th></tr></thead><tbody><tr><td>Alpha</td><td>1</td></tr><tr><td>Beta</td><td>2</td></tr></tbody></table></div>`,
      flex: `<div><table class="flex-table" data-testid="target"><thead><tr><th scope="col">Name</th><th scope="col">Value</th></tr></thead><tbody><tr><td>Alpha</td><td>1</td></tr><tr><td>Beta</td><td>2</td></tr></tbody></table></div>`,
    },
    {
      name: 'table th matches usa-table th',
      uswds: `<table class="usa-table"><thead><tr><th scope="col" data-testid="target">Name</th><th scope="col">Value</th></tr></thead><tbody><tr><td>Alpha</td><td>1</td></tr></tbody></table>`,
      flex: `<table class="flex-table"><thead><tr><th scope="col" data-testid="target">Name</th><th scope="col">Value</th></tr></thead><tbody><tr><td>Alpha</td><td>1</td></tr></tbody></table>`,
    },
    {
      name: 'table td matches usa-table td',
      uswds: `<table class="usa-table"><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td data-testid="target">Alpha</td></tr></tbody></table>`,
      flex: `<table class="flex-table"><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td data-testid="target">Alpha</td></tr></tbody></table>`,
    },
    {
      name: 'compact table td matches usa-table--compact td',
      uswds: `<table class="usa-table usa-table--compact"><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td data-testid="target">Alpha</td></tr></tbody></table>`,
      flex: `<table class="flex-table" data-compact><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td data-testid="target">Alpha</td></tr></tbody></table>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Table Test</h1>
    <table class="flex-table">
      <caption>Sample data table</caption>
      <thead>
        <tr><th scope="col">Name</th><th scope="col">Value</th><th scope="col">Status</th></tr>
      </thead>
      <tbody>
        <tr><td>Alpha</td><td>1</td><td>Active</td></tr>
        <tr><td>Beta</td><td>2</td><td>Inactive</td></tr>
      </tbody>
    </table>
  </main>`,
  behavior: [],
}
