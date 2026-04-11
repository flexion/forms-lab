/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const TRIGGER_TEXT = 'Trigger'
const TOOLTIP_TEXT = 'Tooltip text'

export const spec: ConformanceSpec = {
  component: 'flex-tooltip',
  reference: 'https://designsystem.digital.gov/components/tooltip/',
  mapping: [
    {
      uswds: 'usa-tooltip',
      flex: '<flex-tooltip> (custom element)',
      notes: 'Container element with relative positioning',
    },
    {
      uswds: 'usa-tooltip__trigger',
      flex: '.flex-tooltip__trigger',
      notes: 'Element that triggers the tooltip on hover/focus',
    },
    {
      uswds: 'usa-tooltip__body',
      flex: '.flex-tooltip__body[role="tooltip"]',
      notes: 'Tooltip content with dark background and white text',
    },
    {
      uswds: 'usa-tooltip__body--top/bottom/left/right',
      flex: 'data-position="top/bottom/left/right"',
      notes: 'Position variants via data attribute instead of modifier class',
    },
  ],
  verified: [
    'display',
    'position',
    'background-color',
    'color',
    'border-radius',
    'font-size',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  structuralIgnores: ['font-family', 'line-height'],
  intentionalDifferences: [
    {
      property: 'visibility',
      ours: 'hidden (display: none when not visible)',
      uswds: 'controlled via is-set/is-visible classes',
      reason:
        'We use data-visible attribute toggling; USWDS uses JS class toggling',
    },
  ],
  extraIgnoreAttributes: [
    'id',
    'aria-describedby',
    'role',
    'data-visible',
    'data-position',
    'data-position-actual',
  ],
  fixtures: [
    {
      name: 'tooltip body matches USWDS tooltip styling',
      uswds: `<span class="usa-tooltip">
    <button type="button" class="usa-button usa-tooltip__trigger">${TRIGGER_TEXT}</button>
    <span class="usa-tooltip__body usa-tooltip__body--top is-set is-visible" data-testid="target" role="tooltip">
      ${TOOLTIP_TEXT}
    </span>
  </span>`,
      flex: `<flex-tooltip data-position="top">
    <button type="button" class="flex-tooltip__trigger">${TRIGGER_TEXT}</button>
    <span class="flex-tooltip__body" data-testid="target" data-visible data-position-actual="top" role="tooltip">
      ${TOOLTIP_TEXT}
    </span>
  </flex-tooltip>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Tooltip Test</h1>
    <flex-tooltip data-position="top">
      <button type="button" class="flex-tooltip__trigger" aria-describedby="tip-a11y">
        Hover for info
      </button>
      <span class="flex-tooltip__body" id="tip-a11y" role="tooltip">
        Helpful tooltip text
      </span>
    </flex-tooltip>
  </main>`,
  behavior: [
    {
      description:
        'Tooltip shows on hover (mouseenter) and hides on mouseleave',
      tested: true,
    },
    {
      description: 'Tooltip shows on focus and hides on blur',
      tested: true,
    },
    {
      description:
        'Tooltip is positioned relative to trigger based on data-position',
      tested: true,
    },
    {
      description: 'Tooltip flips position when it would overflow viewport',
      tested: true,
    },
  ],
}
