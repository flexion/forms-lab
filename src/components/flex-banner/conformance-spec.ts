import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-banner',
  reference: 'https://designsystem.digital.gov/components/banner/',
  mapping: [
    {
      uswds: 'usa-banner',
      flex: '.flex-banner',
      notes: 'Outer banner section',
    },
    {
      uswds: 'usa-banner__header',
      flex: '.flex-banner__header',
      notes: 'Banner header with flag and text',
    },
    {
      uswds: 'usa-banner__inner',
      flex: '.flex-banner__inner',
      notes: 'Inner container for header content',
    },
    {
      uswds: 'usa-banner__button',
      flex: '.flex-banner__button',
      notes: 'Expand/collapse button',
    },
    {
      uswds: 'usa-banner__content',
      flex: '.flex-banner__content',
      notes: 'Expandable guidance content',
    },
    {
      uswds: 'usa-banner__guidance',
      flex: '.flex-banner__guidance-gov / .flex-banner__guidance-ssl',
      notes: 'Guidance sections for .gov and HTTPS',
    },
    {
      uswds: 'usa-banner__icon',
      flex: '.flex-banner__icon',
      notes: 'Icon in guidance section',
    },
  ],
  verified: [
    'background-color',
    'color',
    'font-family',
    'font-size',
    'line-height',
  ],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'background-color',
      ours: 'var(--flex-gray-5)',
      uswds: '#f0f0f0',
      reason: 'We use semantic token that resolves to the same value',
    },
  ],
  fixtures: [
    {
      name: 'banner matches usa-banner background',
      uswds: `<section class="usa-banner" aria-label="Official website of the United States government" data-testid="target"><div class="usa-banner__header"><p class="usa-banner__header-text">An official website of the United States government</p></div></section>`,
      flex: `<section class="flex-banner" aria-label="Official website of the United States government" data-testid="target"><div class="flex-banner__header"><div class="flex-banner__inner"><div class="flex-banner__header-text"><p>An official website of the United States government</p></div></div></div></section>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Banner Test</h1>
    <section class="flex-banner" aria-label="Official website of the United States government">
      <div class="flex-banner__header">
        <div class="flex-banner__inner">
          <div class="flex-banner__header-text">
            <p>An official website of the United States government</p>
          </div>
          <button type="button" class="flex-banner__button" aria-expanded="false" aria-controls="banner-test-content">
            <span class="flex-banner__button-text">Here's how you know</span>
          </button>
        </div>
      </div>
      <div class="flex-banner__content" id="banner-test-content" hidden>
        <div class="flex-banner__guidance">
          <div class="flex-banner__guidance-gov">
            <p><strong>Official websites use .gov</strong></p>
          </div>
          <div class="flex-banner__guidance-ssl">
            <p><strong>Secure .gov websites use HTTPS</strong></p>
          </div>
        </div>
      </div>
    </section>
  </main>`,
  behavior: [
    {
      description: 'Button toggles hidden attribute on content panel',
      tested: true,
    },
    {
      description: 'Button toggles aria-expanded between true and false',
      tested: true,
    },
    {
      description:
        'Guidance icons (dot-gov and HTTPS) render as visible images',
      tested: true,
    },
  ],
}
