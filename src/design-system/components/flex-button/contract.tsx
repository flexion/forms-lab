/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

function buttonFixture(
  name: string,
  label: string,
  opts?: { variant?: string; size?: string; disabled?: boolean },
) {
  return {
    name,
    uswds: (
      <button
        type="button"
        class={[
          'usa-button',
          opts?.variant && `usa-button--${opts.variant}`,
          opts?.size && `usa-button--${opts.size}`,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={opts?.disabled}
        data-testid="target"
      >
        {label}
      </button>
    ).toString(),
    flex: (
      <button
        type="button"
        class="flex-button"
        data-variant={opts?.variant}
        data-size={opts?.size}
        disabled={opts?.disabled}
        data-testid="target"
      >
        {label}
      </button>
    ).toString(),
  }
}

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-button',
  reference: 'https://designsystem.digital.gov/components/button/',
  mapping: [
    {
      uswds: 'usa-button',
      flex: '.flex-button',
      notes: 'Base button class',
    },
    {
      uswds: 'usa-button--outline',
      flex: 'data-variant="outline"',
      notes: 'Outline/ghost variant',
    },
    {
      uswds: 'usa-button--secondary',
      flex: 'data-variant="secondary"',
      notes: 'Secondary (red) variant',
    },
    {
      uswds: 'usa-button--accent-cool',
      flex: 'data-variant="accent-cool"',
      notes: 'Accent cool variant',
    },
    {
      uswds: 'usa-button--accent-warm',
      flex: 'data-variant="accent-warm"',
      notes: 'Accent warm variant',
    },
    {
      uswds: 'usa-button--base',
      flex: 'data-variant="base"',
      notes: 'Base (gray) variant',
    },
    {
      uswds: 'usa-button--inverse',
      flex: 'data-variant="inverse"',
      notes: 'Inverse variant for dark backgrounds',
    },
    {
      uswds: 'usa-button--unstyled',
      flex: 'data-variant="unstyled"',
      notes: 'Link-styled button',
    },
    {
      uswds: 'usa-button--big',
      flex: 'data-size="big"',
      notes: 'Large button size',
    },
  ],
  verified: [
    'background-color',
    'color',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'font-size',
    'font-weight',
    'border-radius',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
  ],
  structuralIgnores: ['display'],
  intentionalDifferences: [
    {
      property: 'display',
      ours: 'inline-flex',
      uswds: 'inline-block',
      reason:
        'We use inline-flex for centering content and icon alignment; USWDS uses inline-block',
    },
  ],
  fixtures: [
    buttonFixture('default button matches usa-button', 'Default'),
    buttonFixture('outline button matches usa-button--outline', 'Outline', {
      variant: 'outline',
    }),
    buttonFixture('disabled button', 'Disabled', { disabled: true }),
    buttonFixture('big button matches usa-button--big', 'Big', { size: 'big' }),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Button Test</h1>
    <button type="button" class="flex-button" data-testid="target">Default</button>
    <button type="button" class="flex-button" data-variant="secondary">Secondary</button>
    <button type="button" class="flex-button" data-variant="outline">Outline</button>
    <button type="button" class="flex-button" data-variant="base">Base</button>
    <button type="button" class="flex-button" data-variant="accent-cool">Accent Cool</button>
    <button type="button" class="flex-button" data-variant="accent-warm">Accent Warm</button>
    <button type="button" class="flex-button" disabled>Disabled</button>
  </main>`,
  behavior: [
    { description: 'Focus ring visible on keyboard focus', tested: false },
    {
      description: 'Disabled state prevents interaction',
      tested: true,
    },
  ],
}
