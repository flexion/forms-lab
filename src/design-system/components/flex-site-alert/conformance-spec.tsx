/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const bodyText = 'Lorem ipsum dolor sit amet.'

function siteAlertFixture(name: string, variant: string, heading: string) {
  return {
    name,
    uswds: (
      <div
        class={`usa-site-alert usa-site-alert--${variant}`}
        aria-label="Site alert"
      >
        <div class="usa-alert">
          <div class="usa-alert__body" data-testid="target">
            <h3 class="usa-alert__heading">{heading}</h3>
            <p class="usa-alert__text">{bodyText}</p>
          </div>
        </div>
      </div>
    ).toString(),
    flex: (
      <div
        class="flex-site-alert"
        data-variant={variant}
        aria-label="Site alert"
      >
        <div class="flex-site-alert__body" data-testid="target">
          <h3 class="flex-site-alert__heading">{heading}</h3>
          <p class="flex-site-alert__text">{bodyText}</p>
        </div>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-site-alert',
  reference: 'https://designsystem.digital.gov/components/site-alert/',
  mapping: [
    {
      uswds: 'usa-site-alert',
      flex: '.flex-site-alert',
      notes: 'Base site alert wrapper (section)',
    },
    {
      uswds: 'usa-site-alert--info',
      flex: 'data-variant="info"',
      notes: 'Informational site alert',
    },
    {
      uswds: 'usa-site-alert--emergency',
      flex: 'data-variant="emergency"',
      notes: 'Emergency site alert (dark background)',
    },
    {
      uswds: 'usa-alert__body',
      flex: '.flex-site-alert__body',
      notes: 'Alert body container',
    },
    {
      uswds: 'usa-alert__heading',
      flex: '.flex-site-alert__heading',
      notes: 'Alert heading',
    },
    {
      uswds: 'usa-alert__text',
      flex: '.flex-site-alert__text',
      notes: 'Alert body text',
    },
    {
      uswds: 'usa-alert--slim (within site alert)',
      flex: 'data-slim',
      notes: 'Slim variant (no icon)',
    },
    {
      uswds: 'usa-alert--no-icon (within site alert)',
      flex: 'data-no-icon',
      notes: 'No icon variant',
    },
  ],
  verified: ['font-family', 'font-size', 'color'],
  structuralIgnores: [
    'display',
    'position',
    'outline',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-width',
    'background-color',
    'flex-direction',
    'justify-content',
  ],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ],
  intentionalDifferences: [
    {
      property: 'structure',
      ours: 'Flat: section > div.body > heading + text',
      uswds:
        'Nested: section.site-alert > div.alert > div.alert__body > heading + text',
      reason:
        'We use a flatter structure with dedicated site-alert BEM classes rather than nesting usa-alert inside usa-site-alert. Background-color and border go on the outer element rather than the inner body.',
    },
  ],
  fixtures: [
    siteAlertFixture(
      'info site alert body matches USWDS',
      'info',
      'Informative status',
    ),
    siteAlertFixture(
      'emergency site alert body matches USWDS',
      'emergency',
      'Emergency status',
    ),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Site Alert Test</h1>
    <section class="flex-site-alert" data-variant="info" aria-label="Informative site alert">
      <div class="flex-site-alert__body">
        <h3 class="flex-site-alert__heading">Informative status</h3>
        <p class="flex-site-alert__text">Alert body with <a href="/example">a link</a>.</p>
      </div>
    </section>
    <section class="flex-site-alert" data-variant="emergency" aria-label="Emergency site alert">
      <div class="flex-site-alert__body">
        <h3 class="flex-site-alert__heading">Emergency status</h3>
        <p class="flex-site-alert__text">Alert body.</p>
      </div>
    </section>
  </main>`,
  behavior: [
    {
      description: 'Info variant has light cyan background with info border',
      tested: true,
    },
    {
      description: 'Emergency variant has dark background with white text',
      tested: true,
    },
    {
      description: 'Accessibility audit passes for all variants',
      tested: true,
    },
  ],
}
