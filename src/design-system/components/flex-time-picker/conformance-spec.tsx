/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const LABEL_TEXT = 'Time'

export const spec: ConformanceSpec = {
  component: 'flex-time-picker',
  reference: 'https://designsystem.digital.gov/components/time-picker/',
  mapping: [
    {
      uswds: 'usa-time-picker',
      flex: '<flex-time-picker> (custom element)',
      notes: 'Container element with time-specific attributes',
    },
    {
      uswds: 'usa-combo-box (inner)',
      flex: '<flex-combo-box> (inner custom element)',
      notes: 'Reuses combo box for typeahead/selection behavior',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'background-color',
  ],
  structuralIgnores: [
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
    'outline',
    'display',
    'width',
    'height',
    'max-width',
  ],
  extraIgnoreAttributes: [
    'data-min-time',
    'data-max-time',
    'data-step',
    'id',
    'role',
    'aria-expanded',
    'aria-autocomplete',
    'aria-controls',
    'autocomplete',
    'type',
  ],
  extraIgnoreBoxKeys: ['paddingRight', 'marginTop'],
  intentionalDifferences: [
    {
      property: 'padding-right',
      ours: '4.5rem (space for toggle + clear buttons)',
      uswds: '2.5rem (USWDS uses different button layout)',
      reason: 'Inherits from flex-combo-box layout',
    },
  ],
  fixtures: [
    {
      name: 'time picker input matches USWDS combo box input styling',
      uswds: `<div class="usa-time-picker">
    <label class="usa-label" for="uswds-time">${LABEL_TEXT}</label>
    <div class="usa-combo-box">
      <input class="usa-combo-box__input" id="uswds-time" type="text" data-testid="target">
    </div>
  </div>`,
      flex: `<flex-time-picker>
    <label class="flex-label" for="time">${LABEL_TEXT}</label>
    <flex-combo-box>
      <div class="flex-combo-box__wrapper">
        <input class="flex-combo-box__input" id="time" type="text" role="combobox" aria-expanded="false" data-testid="target">
      </div>
    </flex-combo-box>
  </flex-time-picker>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Time Picker Test</h1>
    <flex-time-picker data-min-time="09:00" data-max-time="17:00" data-step="30">
      <label class="flex-label" for="a11y-time">Appointment time</label>
      <flex-combo-box>
        <div class="flex-combo-box__wrapper">
          <input class="flex-combo-box__input" id="a11y-time" name="time" type="text"
            role="combobox" aria-expanded="false" aria-autocomplete="list"
            aria-controls="a11y-time-list" autocomplete="off">
          <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
          <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
          <ul class="flex-combo-box__list" id="a11y-time-list" role="listbox" hidden>
            <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="09:00" id="a11y-time-opt-0900">9:00 am</li>
            <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="09:30" id="a11y-time-opt-0930">9:30 am</li>
          </ul>
        </div>
      </flex-combo-box>
    </flex-time-picker>
  </main>`,
  behavior: [
    { description: 'Generates time options from min/max/step', tested: true },
    {
      description: 'Time options display in 12-hour format with am/pm',
      tested: true,
    },
    {
      description: 'Reuses combo box for filtering and selection',
      tested: true,
    },
    { description: 'Default step is 30 minutes', tested: true },
    {
      description: 'Custom step interval generates correct options',
      tested: true,
    },
    { description: 'Accessibility audit passes', tested: true },
  ],
}
