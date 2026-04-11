/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const proseText = 'The quick brown fox jumps over the lazy dog.'

export const spec: ConformanceSpec = {
  component: 'flex-prose',
  reference: 'https://designsystem.digital.gov/components/prose/',
  mapping: [
    {
      uswds: 'usa-prose',
      flex: '.prose',
      notes: 'Prose container class',
    },
  ],
  verified: ['font-family', 'font-size', 'line-height'],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'font-family',
      ours: 'Source Sans Pro Web (sans-serif)',
      uswds: 'Merriweather Web (serif) for headings',
      reason:
        'We use sans-serif throughout for consistency with our design system',
    },
  ],
  fixtures: [
    {
      name: 'prose container matches usa-prose',
      uswds: (
        <div>
          <div class="usa-prose" data-testid="target">
            <p>{proseText}</p>
          </div>
        </div>
      ).toString(),
      flex: (
        <div>
          <div class="prose" data-testid="target">
            <p>{proseText}</p>
          </div>
        </div>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <div class="prose">
      <h1>Heading Level 1</h1>
      <p>A paragraph of prose text for testing.</p>
      <h2>Heading Level 2</h2>
      <ul>
        <li>List item one</li>
        <li>List item two</li>
      </ul>
      <a href="/example">A link within prose</a>
    </div>
  </main>`,
  behavior: [],
}
