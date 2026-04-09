/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

function linkFixture(
  name: string,
  text: string,
  href: string,
  variant?: string,
) {
  return {
    name,
    uswds: (
      <div>
        <a
          class={`usa-link${variant ? ` usa-link--${variant}` : ''}`}
          href={href}
          data-testid="target"
        >
          {text}
        </a>
      </div>
    ).toString(),
    flex: (
      <div>
        <a
          class={`flex-link${variant ? ` flex-link--${variant}` : ''}`}
          href={href}
          data-testid="target"
        >
          {text}
        </a>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-link',
  reference: 'https://designsystem.digital.gov/components/link/',
  mapping: [
    {
      uswds: 'usa-link',
      flex: '.flex-link',
      notes: 'Base link class',
    },
    {
      uswds: 'usa-link--external',
      flex: '.flex-link--external',
      notes: 'External link with icon',
    },
  ],
  verified: ['color', 'text-decoration-line'],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    linkFixture('default link matches usa-link', 'An example link', '/example'),
    linkFixture(
      'external link matches usa-link--external',
      'An external link',
      'https://example.com',
      'external',
    ),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Link Test</h1>
    <p><a class="flex-link" href="/example" data-testid="target">An example link</a></p>
    <p><a class="flex-link flex-link--external" href="https://example.com">An external link</a></p>
  </main>`,
  behavior: [
    { description: 'Focus ring visible on keyboard focus', tested: false },
    { description: 'Visited state changes color', tested: false },
  ],
}
