import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-input-prefix-suffix',
  reference: 'https://designsystem.digital.gov/components/input-prefix-suffix/',
  mapping: [
    {
      uswds: 'usa-input-group',
      flex: '.flex-input-group',
      notes: 'Input group wrapper',
    },
    {
      uswds: 'usa-input-prefix',
      flex: '.flex-input-group__prefix',
      notes: 'Prefix add-on',
    },
    {
      uswds: 'usa-input-suffix',
      flex: '.flex-input-group__suffix',
      notes: 'Suffix add-on',
    },
  ],
  verified: [
    'display',
    'align-items',
    'border-style',
    'border-width',
    'border-color',
    'height',
    'max-width',
    'font-family',
    'font-size',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'input group with prefix matches usa-input-group',
      uswds: `<div><div class="usa-input-group" data-testid="target">
        <div class="usa-input-prefix" aria-hidden="true">$</div>
        <input class="usa-input" id="amount" name="amount" type="text">
      </div></div>`,
      flex: `<div><div class="flex-input-group" data-testid="target">
        <div class="flex-input-group__prefix" aria-hidden="true">$</div>
        <input class="flex-input" id="amount" name="amount" type="text">
      </div></div>`,
    },
    {
      name: 'input group with suffix matches usa-input-group',
      uswds: `<div><div class="usa-input-group" data-testid="target">
        <input class="usa-input" id="weight" name="weight" type="text">
        <div class="usa-input-suffix" aria-hidden="true">lbs</div>
      </div></div>`,
      flex: `<div><div class="flex-input-group" data-testid="target">
        <input class="flex-input" id="weight" name="weight" type="text">
        <div class="flex-input-group__suffix" aria-hidden="true">lbs</div>
      </div></div>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Input Prefix/Suffix Test</h1>
    <label class="flex-label" for="amount">Amount</label>
    <div class="flex-input-group">
      <div class="flex-input-group__prefix" aria-hidden="true">$</div>
      <input class="flex-input" id="amount" name="amount" type="text">
    </div>
    <label class="flex-label" for="weight">Weight</label>
    <div class="flex-input-group">
      <input class="flex-input" id="weight" name="weight" type="text">
      <div class="flex-input-group__suffix" aria-hidden="true">lbs</div>
    </div>
  </main>`,
  behavior: [],
}
