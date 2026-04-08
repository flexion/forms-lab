import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-breadcrumb',
  reference: 'https://designsystem.digital.gov/components/breadcrumb/',
  mapping: [
    {
      uswds: 'usa-breadcrumb',
      flex: '.flex-breadcrumb',
      notes: 'Breadcrumb nav wrapper',
    },
    {
      uswds: 'usa-breadcrumb__list',
      flex: '.flex-breadcrumb__list',
      notes: 'Ordered list of breadcrumb items',
    },
    {
      uswds: 'usa-breadcrumb__list-item',
      flex: '.flex-breadcrumb__list-item',
      notes: 'Individual breadcrumb item',
    },
    {
      uswds: 'usa-breadcrumb__link',
      flex: '.flex-breadcrumb__link',
      notes: 'Breadcrumb link',
    },
    {
      uswds: 'usa-breadcrumb--wrap',
      flex: 'data-variant="wrap"',
      notes: 'Wrap variant — items wrap instead of truncating',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'padding-top',
    'padding-bottom',
    'list-style-type',
    'display',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'breadcrumb nav matches usa-breadcrumb',
      uswds: `<div><nav class="usa-breadcrumb" aria-label="Breadcrumbs" data-testid="target"><ol class="usa-breadcrumb__list"><li class="usa-breadcrumb__list-item"><a class="usa-breadcrumb__link" href="/">Home</a></li><li class="usa-breadcrumb__list-item"><a class="usa-breadcrumb__link" href="/catalog">Catalog</a></li><li class="usa-breadcrumb__list-item" aria-current="page"><span>Current Page</span></li></ol></nav></div>`,
      flex: `<div><nav class="flex-breadcrumb" aria-label="Breadcrumbs" data-testid="target"><ol class="flex-breadcrumb__list"><li class="flex-breadcrumb__list-item"><a class="flex-breadcrumb__link" href="/">Home</a></li><li class="flex-breadcrumb__list-item"><a class="flex-breadcrumb__link" href="/catalog">Catalog</a></li><li class="flex-breadcrumb__list-item" aria-current="page"><span>Current Page</span></li></ol></nav></div>`,
    },
    {
      name: 'breadcrumb link matches usa-breadcrumb__link',
      uswds: `<nav class="usa-breadcrumb" aria-label="Breadcrumbs"><ol class="usa-breadcrumb__list"><li class="usa-breadcrumb__list-item"><a class="usa-breadcrumb__link" href="/" data-testid="target">Home</a></li><li class="usa-breadcrumb__list-item" aria-current="page"><span>Current</span></li></ol></nav>`,
      flex: `<nav class="flex-breadcrumb" aria-label="Breadcrumbs"><ol class="flex-breadcrumb__list"><li class="flex-breadcrumb__list-item"><a class="flex-breadcrumb__link" href="/" data-testid="target">Home</a></li><li class="flex-breadcrumb__list-item" aria-current="page"><span>Current</span></li></ol></nav>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Breadcrumb Test</h1>
    <nav class="flex-breadcrumb" aria-label="Breadcrumbs">
      <ol class="flex-breadcrumb__list">
        <li class="flex-breadcrumb__list-item">
          <a class="flex-breadcrumb__link" href="/">Home</a>
        </li>
        <li class="flex-breadcrumb__list-item">
          <a class="flex-breadcrumb__link" href="/catalog">Catalog</a>
        </li>
        <li class="flex-breadcrumb__list-item" aria-current="page">
          <span>Current Page</span>
        </li>
      </ol>
    </nav>
  </main>`,
  behavior: [
    {
      description: 'Separator icon appears between items via CSS ::after',
      tested: false,
    },
    {
      description: 'Wrap variant allows items to wrap to next line',
      tested: false,
    },
    {
      description: 'Last item is plain text with aria-current="page"',
      tested: false,
    },
  ],
}
