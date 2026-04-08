import type { ConformanceSpec } from '../conformance-types'

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
    {
      name: 'default link matches usa-link',
      uswds:
        '<div><a class="usa-link" href="/example" data-testid="target">An example link</a></div>',
      flex: '<div><a class="flex-link" href="/example" data-testid="target">An example link</a></div>',
    },
    {
      name: 'external link matches usa-link--external',
      uswds:
        '<div><a class="usa-link usa-link--external" href="https://example.com" data-testid="target">An external link</a></div>',
      flex: '<div><a class="flex-link flex-link--external" href="https://example.com" data-testid="target">An external link</a></div>',
    },
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
