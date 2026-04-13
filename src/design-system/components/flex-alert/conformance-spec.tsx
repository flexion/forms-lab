/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const VARIANT_HEADINGS: Record<string, string> = {
  info: 'Informative status',
  error: 'Error status',
  success: 'Success status',
  warning: 'Warning status',
}

function alertFixture(variant: string) {
  const heading = VARIANT_HEADINGS[variant]
  return {
    name: `${variant} alert background and border match USWDS`,
    uswds: (
      <div
        class={`usa-alert usa-alert--${variant}`}
        role="alert"
        data-testid="target"
      >
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">{heading}</h4>
          <p class="usa-alert__text">
            Lorem ipsum dolor sit amet,{' '}
            <a href="/example" class="usa-link">
              consectetur adipiscing
            </a>{' '}
            elit, sed do eiusmod.
          </p>
        </div>
      </div>
    ).toString(),
    flex: (
      <div
        class="flex-alert"
        data-variant={variant}
        role="alert"
        data-testid="target"
      >
        <h4 class="flex-alert__heading">{heading}</h4>
        <p class="flex-alert__text">
          Lorem ipsum dolor sit amet,{' '}
          <a href="/example">consectetur adipiscing</a> elit, sed do eiusmod.
        </p>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-alert',
  reference: 'https://designsystem.digital.gov/components/alert/',
  mapping: [
    {
      uswds: 'usa-alert',
      flex: '.flex-alert',
      notes: 'Base alert class',
    },
    {
      uswds: 'usa-alert--info',
      flex: 'data-variant="info"',
      notes: 'Informational alert',
    },
    {
      uswds: 'usa-alert--error',
      flex: 'data-variant="error"',
      notes: 'Error alert',
    },
    {
      uswds: 'usa-alert--success',
      flex: 'data-variant="success"',
      notes: 'Success alert',
    },
    {
      uswds: 'usa-alert--warning',
      flex: 'data-variant="warning"',
      notes: 'Warning alert',
    },
    {
      uswds: 'usa-alert--emergency',
      flex: 'data-variant="emergency"',
      notes: 'Emergency alert (dark background)',
    },
    {
      uswds: 'usa-alert--slim',
      flex: 'data-slim',
      notes: 'Slim variant (no icon)',
    },
    {
      uswds: 'usa-alert--no-icon',
      flex: 'data-no-icon',
      notes: 'No icon variant',
    },
    {
      uswds: 'usa-alert__heading',
      flex: '.flex-alert__heading',
      notes: 'Alert heading',
    },
    {
      uswds: 'usa-alert__text',
      flex: '.flex-alert__text',
      notes: 'Alert body text',
    },
    {
      uswds: 'usa-alert__body',
      flex: '(none \u2014 flatter structure)',
      notes: 'We omit the body wrapper; content is direct children',
    },
  ],
  verified: ['background-color', 'border-left-color', 'border-left-width'],
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
  ],

  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ],
  intentionalDifferences: [
    {
      property: 'padding',
      ours: 'varies (icon via ::before)',
      uswds: 'varies (icon via background image)',
      reason:
        'Our alert uses CSS ::before for icons; USWDS uses background images on __body. Padding differs to accommodate.',
    },
  ],
  fixtures: [
    alertFixture('info'),
    alertFixture('error'),
    alertFixture('success'),
    alertFixture('warning'),
  ],
  behavior: [
    {
      description: 'Icon color matches ink for standard variants',
      tested: true,
    },
    {
      description: 'Emergency icon is white (inverted for dark background)',
      tested: true,
    },
    {
      description: 'Emergency has dark background with white text and links',
      tested: true,
    },
    { description: 'Slim variant hides icon', tested: true },
    { description: 'No-icon variant hides icon', tested: true },
    {
      description: 'Accessibility audit passes for all variants',
      tested: true,
    },
  ],
}
