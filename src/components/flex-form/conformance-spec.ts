import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-form',
  reference: 'https://designsystem.digital.gov/components/form/',
  mapping: [
    {
      uswds: 'usa-form',
      flex: '.flex-form',
      notes: 'Base form class with max-width constraint',
    },
    {
      uswds: 'usa-form--large',
      flex: 'data-size="large"',
      notes: 'Wider form variant (30rem)',
    },
  ],
  verified: ['max-width', 'font-family', 'font-size', 'line-height'],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'default form matches usa-form',
      uswds:
        '<div><form class="usa-form" data-testid="target"><label class="usa-label" for="input-1">Name</label><input class="usa-input" id="input-1" name="input-1" type="text"></form></div>',
      flex: '<div><form class="flex-form" data-testid="target"><label class="flex-label" for="input-1">Name</label><input class="flex-input" id="input-1" name="input-1" type="text"></form></div>',
    },
    {
      name: 'large form matches usa-form--large',
      uswds:
        '<div><form class="usa-form usa-form--large" data-testid="target"><label class="usa-label" for="input-1">Name</label><input class="usa-input" id="input-1" name="input-1" type="text"></form></div>',
      flex: '<div><form class="flex-form" data-size="large" data-testid="target"><label class="flex-label" for="input-1">Name</label><input class="flex-input" id="input-1" name="input-1" type="text"></form></div>',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Form Test</h1>
    <form class="flex-form">
      <label class="flex-label" for="name">Name</label>
      <input class="flex-input" id="name" name="name" type="text">
    </form>
  </main>`,
  behavior: [],
}
