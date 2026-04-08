import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-button',
  reference: 'https://designsystem.digital.gov/components/button/',
  mapping: [
    {
      uswds: 'usa-button',
      flex: '.flex-button',
      notes: 'Base button class',
    },
    {
      uswds: 'usa-button--outline',
      flex: 'data-variant="outline"',
      notes: 'Outline/ghost variant',
    },
    {
      uswds: 'usa-button--secondary',
      flex: 'data-variant="secondary"',
      notes: 'Secondary (red) variant',
    },
    {
      uswds: 'usa-button--accent-cool',
      flex: 'data-variant="accent-cool"',
      notes: 'Accent cool variant',
    },
    {
      uswds: 'usa-button--accent-warm',
      flex: 'data-variant="accent-warm"',
      notes: 'Accent warm variant',
    },
    {
      uswds: 'usa-button--base',
      flex: 'data-variant="base"',
      notes: 'Base (gray) variant',
    },
    {
      uswds: 'usa-button--inverse',
      flex: 'data-variant="inverse"',
      notes: 'Inverse variant for dark backgrounds',
    },
    {
      uswds: 'usa-button--unstyled',
      flex: 'data-variant="unstyled"',
      notes: 'Link-styled button',
    },
    {
      uswds: 'usa-button--big',
      flex: 'data-size="big"',
      notes: 'Large button size',
    },
  ],
  verified: [
    'background-color',
    'color',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'font-size',
    'font-weight',
    'border-radius',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
  ],
  structuralIgnores: ['display'],
  intentionalDifferences: [
    {
      property: 'display',
      ours: 'inline-flex',
      uswds: 'inline-block',
      reason:
        'We use inline-flex for centering content and icon alignment; USWDS uses inline-block',
    },
  ],
  fixtures: [
    {
      name: 'default button matches usa-button',
      uswds: '<button class="usa-button" data-testid="target">Default</button>',
      flex: '<button class="flex-button" data-testid="target">Default</button>',
    },
    {
      name: 'outline button matches usa-button--outline',
      uswds:
        '<button class="usa-button usa-button--outline" data-testid="target">Outline</button>',
      flex: '<button class="flex-button" data-variant="outline" data-testid="target">Outline</button>',
    },
    {
      name: 'disabled button',
      uswds:
        '<button class="usa-button" disabled data-testid="target">Disabled</button>',
      flex: '<button class="flex-button" disabled data-testid="target">Disabled</button>',
    },
    {
      name: 'big button matches usa-button--big',
      uswds:
        '<button class="usa-button usa-button--big" data-testid="target">Big</button>',
      flex: '<button class="flex-button" data-size="big" data-testid="target">Big</button>',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Button Test</h1>
    <button class="flex-button" data-testid="target">Default</button>
    <button class="flex-button" data-variant="secondary">Secondary</button>
    <button class="flex-button" data-variant="outline">Outline</button>
    <button class="flex-button" data-variant="base">Base</button>
    <button class="flex-button" data-variant="accent-cool">Accent Cool</button>
    <button class="flex-button" data-variant="accent-warm">Accent Warm</button>
    <button class="flex-button" disabled>Disabled</button>
  </main>`,
  behavior: [
    { description: 'Focus ring visible on keyboard focus', tested: false },
    {
      description: 'Disabled state prevents interaction',
      tested: true,
    },
  ],
}
