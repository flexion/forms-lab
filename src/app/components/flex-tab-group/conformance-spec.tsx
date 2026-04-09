/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-tab-group',
  reference: 'https://designsystem.digital.gov/components/tab/',
  mapping: [
    {
      uswds: 'usa-tab',
      flex: '<flex-tab-group> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-tab [role="tablist"]',
      flex: 'flex-tab-group [role="tablist"]',
      notes: 'Tab list wrapper with ARIA role',
    },
    {
      uswds: '[role="tab"]',
      flex: '.flex-tab-group__tab',
      notes: 'Individual tab button',
    },
    {
      uswds: '[role="tabpanel"]',
      flex: '.flex-tab-group__panel',
      notes: 'Tab panel content area',
    },
  ],
  verified: ['font-family', 'cursor'],
  structuralIgnores: [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'display',
    'font-size',
    'font-weight',
    'line-height',
    'outline',
    'position',
  ],
  extraIgnoreAttributes: ['id', 'aria-controls', 'type'],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'selected tab button matches usa-tab selected state',
      uswds: `<div class="usa-tab" data-testid="target">
  <div role="tablist" aria-label="Tab example">
    <button role="tab" aria-selected="true" aria-controls="uswds-panel-1" id="uswds-tab-1">First</button>
    <button role="tab" aria-selected="false" aria-controls="uswds-panel-2" id="uswds-tab-2" tabindex="-1">Second</button>
  </div>
  <div role="tabpanel" id="uswds-panel-1" aria-labelledby="uswds-tab-1">
    <p>First panel content.</p>
  </div>
  <div role="tabpanel" id="uswds-panel-2" aria-labelledby="uswds-tab-2" hidden>
    <p>Second panel content.</p>
  </div>
</div>`,
      flex: `<flex-tab-group data-testid="target">
  <div role="tablist" aria-label="Tab example">
    <button type="button" role="tab" aria-selected="true" aria-controls="flex-panel-1" id="flex-tab-1" class="flex-tab-group__tab">First</button>
    <button type="button" role="tab" aria-selected="false" aria-controls="flex-panel-2" id="flex-tab-2" tabindex="-1" class="flex-tab-group__tab">Second</button>
  </div>
  <div role="tabpanel" id="flex-panel-1" aria-labelledby="flex-tab-1" class="flex-tab-group__panel">
    <p>First panel content.</p>
  </div>
  <div role="tabpanel" id="flex-panel-2" aria-labelledby="flex-tab-2" hidden class="flex-tab-group__panel">
    <p>Second panel content.</p>
  </div>
</flex-tab-group>`,
      uswdsSelector: '[role="tab"][aria-selected="true"]',
      flexSelector: '[role="tab"][aria-selected="true"]',
    },
  ],
  behavior: [
    { description: 'Click switches active panel', tested: true },
    { description: 'Arrow keys navigate between tabs', tested: true },
    { description: 'Home key moves focus to first tab', tested: true },
    { description: 'End key moves focus to last tab', tested: true },
    { description: 'Arrow keys wrap around at edges', tested: true },
    { description: 'Accessibility audit passes', tested: true },
  ],
}
