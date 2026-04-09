/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

function buttonGroupFixture(
  name: string,
  buttons: Array<{ label: string; variant?: string }>,
  groupVariant?: string,
) {
  return {
    name,
    uswds: (
      <ul
        class={`usa-button-group${groupVariant ? ` usa-button-group--${groupVariant}` : ''}`}
        data-testid="target"
      >
        {buttons.map((b) => (
          <li class="usa-button-group__item">
            <button
              class={`usa-button${b.variant ? ` usa-button--${b.variant}` : ''}`}
            >
              {b.label}
            </button>
          </li>
        ))}
      </ul>
    ).toString(),
    flex: (
      <ul
        class="flex-button-group"
        data-variant={groupVariant}
        data-testid="target"
      >
        {buttons.map((b) => (
          <li class="flex-button-group__item">
            <button type="button" class="flex-button" data-variant={b.variant}>
              {b.label}
            </button>
          </li>
        ))}
      </ul>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-button-group',
  reference: 'https://designsystem.digital.gov/components/button-group/',
  mapping: [
    {
      uswds: 'usa-button-group',
      flex: '.flex-button-group',
      notes: 'Base button group list',
    },
    {
      uswds: 'usa-button-group__item',
      flex: '.flex-button-group__item',
      notes: 'List item wrapper for each button',
    },
    {
      uswds: 'usa-button-group--segmented',
      flex: 'data-variant="segmented"',
      notes: 'Segmented variant with touching buttons',
    },
  ],
  verified: [
    'display',
    'flex-direction',
    'flex-wrap',
    'list-style-type',
    'padding-left',
    'margin-top',
    'margin-bottom',
  ],
  structuralIgnores: ['margin-left', 'margin-right'],
  intentionalDifferences: [],
  fixtures: [
    buttonGroupFixture('default button group matches usa-button-group', [
      { label: 'Primary' },
      { label: 'Secondary', variant: 'outline' },
    ]),
    buttonGroupFixture(
      'segmented button group',
      [{ label: 'First' }, { label: 'Last' }],
      'segmented',
    ),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Button Group Test</h1>
    <ul class="flex-button-group" data-testid="target">
      <li class="flex-button-group__item">
        <button type="button" class="flex-button">Primary</button>
      </li>
      <li class="flex-button-group__item">
        <button type="button" class="flex-button" data-variant="outline">Secondary</button>
      </li>
    </ul>
    <ul class="flex-button-group" data-variant="segmented">
      <li class="flex-button-group__item">
        <button type="button" class="flex-button">First</button>
      </li>
      <li class="flex-button-group__item">
        <button type="button" class="flex-button">Middle</button>
      </li>
      <li class="flex-button-group__item">
        <button type="button" class="flex-button">Last</button>
      </li>
    </ul>
  </main>`,
  behavior: [
    {
      description: 'Buttons are arranged horizontally',
      tested: false,
    },
    {
      description: 'Segmented variant buttons touch with no gap',
      tested: false,
    },
  ],
}
