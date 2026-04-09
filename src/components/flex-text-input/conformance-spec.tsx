/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

function inputFixture(name: string, state?: string) {
  return {
    name,
    uswds: (
      <input
        class={`usa-input${state ? ` usa-input--${state}` : ''}`}
        data-testid="target"
      />
    ).toString(),
    flex: (
      <input class="flex-input" data-state={state} data-testid="target" />
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-text-input',
  reference: 'https://designsystem.digital.gov/components/text-input/',
  mapping: [
    {
      uswds: 'usa-input',
      flex: '.flex-input',
      notes: 'Base text input class',
    },
    {
      uswds: 'usa-input--error',
      flex: 'data-state="error"',
      notes: 'Error state with thicker red border',
    },
    {
      uswds: 'usa-input--success',
      flex: 'data-state="success"',
      notes: 'Success state with thicker green border',
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
    'display',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ],
  intentionalDifferences: [],
  fixtures: [
    inputFixture('default input matches usa-input'),
    inputFixture('error state matches usa-input--error', 'error'),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Text Input Test</h1>
    <label class="flex-label" for="test-input">Name</label>
    <input class="flex-input" id="test-input" data-testid="target" />
    <label class="flex-label" for="test-error">Email</label>
    <input class="flex-input" id="test-error" data-state="error" aria-describedby="err-msg" />
    <span class="flex-error-message" id="err-msg" role="alert">Error</span>
    <label class="flex-label" for="test-disabled">Disabled</label>
    <input class="flex-input" id="test-disabled" disabled />
  </main>`,
  behavior: [
    { description: 'Focus ring visible on keyboard focus', tested: false },
    { description: 'Disabled state grays out input', tested: false },
  ],
}
