/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const unorderedItems = (
  <>
    <li>Milk</li>
    <li>Eggs</li>
    <li>Bread</li>
  </>
)

const orderedItems = (
  <>
    <li>First</li>
    <li>Second</li>
    <li>Third</li>
  </>
)

function unorderedListFixture(name: string, variant?: string) {
  return {
    name,
    uswds: (
      <ul
        class={`usa-list${variant ? ` usa-list--${variant}` : ''}`}
        data-testid="target"
      >
        {unorderedItems}
      </ul>
    ).toString(),
    flex: (
      <ul class="flex-list" data-variant={variant} data-testid="target">
        {unorderedItems}
      </ul>
    ).toString(),
  }
}

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
    unorderedListFixture('unordered list matches usa-list'),
    {
      name: 'ordered list matches usa-list',
      uswds: (
        <ol class="usa-list" data-testid="target">
          {orderedItems}
        </ol>
      ).toString(),
      flex: (
        <ol class="flex-list" data-testid="target">
          {orderedItems}
        </ol>
      ).toString(),
    },
    unorderedListFixture(
      'unstyled list matches usa-list--unstyled',
      'unstyled',
    ),
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
