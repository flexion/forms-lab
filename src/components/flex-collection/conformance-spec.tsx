/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const headingText = 'Heading'
const descriptionText = 'Description text'

function collectionItem(prefix: string, opts?: { targetOn?: string }) {
  const headingAttrs: Record<string, string> = {
    class: `${prefix}-collection__heading`,
  }
  const itemAttrs: Record<string, string> = {
    class: `${prefix}-collection__item`,
  }
  if (opts?.targetOn === 'heading') headingAttrs['data-testid'] = 'target'
  if (opts?.targetOn === 'item') itemAttrs['data-testid'] = 'target'

  return (
    <li {...itemAttrs}>
      <div class={`${prefix}-collection__body`}>
        <h3 {...headingAttrs}>
          <a href="/example">{headingText}</a>
        </h3>
        {opts?.targetOn !== 'heading' && (
          <p class={`${prefix}-collection__description`}>
            {opts?.targetOn === 'item' ? 'Description' : descriptionText}
          </p>
        )}
      </div>
    </li>
  )
}

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
      uswds: (
        <div>
          <ul class="usa-collection" data-testid="target">
            {collectionItem('usa')}
          </ul>
        </div>
      ).toString(),
      flex: (
        <div>
          <ul class="flex-collection" data-testid="target">
            {collectionItem('flex')}
          </ul>
        </div>
      ).toString(),
    },
    {
      name: 'collection item matches usa-collection__item',
      uswds: (
        <ul class="usa-collection">
          {collectionItem('usa', { targetOn: 'item' })}
        </ul>
      ).toString(),
      flex: (
        <ul class="flex-collection">
          {collectionItem('flex', { targetOn: 'item' })}
        </ul>
      ).toString(),
    },
    {
      name: 'collection heading matches usa-collection__heading',
      uswds: (
        <ul class="usa-collection">
          {collectionItem('usa', { targetOn: 'heading' })}
        </ul>
      ).toString(),
      flex: (
        <ul class="flex-collection">
          {collectionItem('flex', { targetOn: 'heading' })}
        </ul>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Collection Test</h1>
    <ul class="flex-collection">
      <li class="flex-collection__item">
        <div class="flex-collection__body">
          <h3 class="flex-collection__heading"><a href="/example">First Item</a></h3>
          <p class="flex-collection__description">Description of the first item.</p>
        </div>
      </li>
      <li class="flex-collection__item">
        <div class="flex-collection__body">
          <h3 class="flex-collection__heading"><a href="/example">Second Item</a></h3>
          <p class="flex-collection__description">Description of the second item.</p>
        </div>
      </li>
    </ul>
  </main>`,
  behavior: [],
}
