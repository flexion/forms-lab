import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-collection',
  reference: 'https://designsystem.digital.gov/components/collection/',
  mapping: [
    {
      uswds: 'usa-collection',
      flex: '.flex-collection',
      notes: 'Collection list wrapper',
    },
    {
      uswds: 'usa-collection__item',
      flex: '.flex-collection__item',
      notes: 'Individual collection item',
    },
    {
      uswds: 'usa-collection__body',
      flex: '.flex-collection__body',
      notes: 'Item body content area',
    },
    {
      uswds: 'usa-collection__heading',
      flex: '.flex-collection__heading',
      notes: 'Item heading',
    },
    {
      uswds: 'usa-collection__description',
      flex: '.flex-collection__description',
      notes: 'Item description text',
    },
    {
      uswds: 'usa-collection__meta',
      flex: '.flex-collection__meta',
      notes: 'Item metadata list',
    },
    {
      uswds: 'usa-collection__meta-item',
      flex: '.flex-collection__meta-item',
      notes: 'Individual meta item',
    },
    {
      uswds: 'usa-collection__img',
      flex: '.flex-collection__img',
      notes: 'Item thumbnail image',
    },
    {
      uswds: 'usa-collection--condensed',
      flex: 'data-variant="condensed"',
      notes: 'Condensed spacing variant',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'padding-left',
    'margin-top',
    'margin-bottom',
    'border-top-width',
    'border-top-style',
    'display',
    'padding-top',
  ],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'border-top-color',
      ours: 'var(--flex-color-border)',
      uswds: 'currentColor',
      reason:
        'We use our semantic border token; USWDS inherits from color cascade',
    },
  ],
  fixtures: [
    {
      name: 'collection list matches usa-collection',
      uswds: `<div><ul class="usa-collection" data-testid="target"><li class="usa-collection__item"><div class="usa-collection__body"><h3 class="usa-collection__heading"><a href="#">Heading</a></h3><p class="usa-collection__description">Description text</p></div></li></ul></div>`,
      flex: `<div><ul class="flex-collection" data-testid="target"><li class="flex-collection__item"><div class="flex-collection__body"><h3 class="flex-collection__heading"><a href="#">Heading</a></h3><p class="flex-collection__description">Description text</p></div></li></ul></div>`,
    },
    {
      name: 'collection item matches usa-collection__item',
      uswds: `<ul class="usa-collection"><li class="usa-collection__item" data-testid="target"><div class="usa-collection__body"><h3 class="usa-collection__heading"><a href="#">Heading</a></h3><p class="usa-collection__description">Description</p></div></li></ul>`,
      flex: `<ul class="flex-collection"><li class="flex-collection__item" data-testid="target"><div class="flex-collection__body"><h3 class="flex-collection__heading"><a href="#">Heading</a></h3><p class="flex-collection__description">Description</p></div></li></ul>`,
    },
    {
      name: 'collection heading matches usa-collection__heading',
      uswds: `<ul class="usa-collection"><li class="usa-collection__item"><div class="usa-collection__body"><h3 class="usa-collection__heading" data-testid="target"><a href="#">Heading</a></h3></div></li></ul>`,
      flex: `<ul class="flex-collection"><li class="flex-collection__item"><div class="flex-collection__body"><h3 class="flex-collection__heading" data-testid="target"><a href="#">Heading</a></h3></div></li></ul>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Collection Test</h1>
    <ul class="flex-collection">
      <li class="flex-collection__item">
        <div class="flex-collection__body">
          <h3 class="flex-collection__heading"><a href="#">First Item</a></h3>
          <p class="flex-collection__description">Description of the first item.</p>
        </div>
      </li>
      <li class="flex-collection__item">
        <div class="flex-collection__body">
          <h3 class="flex-collection__heading"><a href="#">Second Item</a></h3>
          <p class="flex-collection__description">Description of the second item.</p>
        </div>
      </li>
    </ul>
  </main>`,
  behavior: [],
}
