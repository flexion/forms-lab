/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

function tagFixture(name: string, size?: string) {
  const text = 'New'
  return {
    name,
    uswds: (
      <div>
        <span
          class={`usa-tag${size ? ` usa-tag--${size}` : ''}`}
          data-testid="target"
        >
          {text}
        </span>
      </div>
    ).toString(),
    flex: (
      <div>
        <span class="flex-tag" data-size={size} data-testid="target">
          {text}
        </span>
      </div>
    ).toString(),
  }
}

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
    tagFixture('default tag matches usa-tag'),
    tagFixture('big tag matches usa-tag--big', 'big'),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Tag Test</h1>
    <span class="flex-tag" data-testid="target">New</span>
    <span class="flex-tag" data-size="big">Big Tag</span>
  </main>`,
  behavior: [],
}
