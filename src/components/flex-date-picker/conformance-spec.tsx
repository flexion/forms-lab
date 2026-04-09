/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const LABEL_TEXT = 'Date'
const FIELD_NAME = 'date'

export const spec: ConformanceSpec = {
  component: 'flex-date-picker',
  reference: 'https://designsystem.digital.gov/components/date-picker/',
  mapping: [
    {
      uswds: 'usa-date-picker',
      flex: '<flex-date-picker> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-date-picker__external-input',
      flex: '.flex-date-picker__external-input',
      notes: 'Text input for date entry (mm/dd/yyyy)',
    },
    {
      uswds: 'usa-date-picker__button',
      flex: '.flex-date-picker__button',
      notes: 'Calendar toggle button',
    },
    {
      uswds: 'usa-date-picker__calendar',
      flex: '.flex-date-picker__calendar',
      notes: 'Calendar popup container',
    },
    {
      uswds: 'usa-date-picker__calendar__previous-month',
      flex: '.flex-date-picker__nav--prev',
      notes: 'Previous month navigation button',
    },
    {
      uswds: 'usa-date-picker__calendar__next-month',
      flex: '.flex-date-picker__nav--next',
      notes: 'Next month navigation button',
    },
    {
      uswds: 'usa-date-picker__calendar__month-selection',
      flex: '.flex-date-picker__month-label',
      notes: 'Month/year label that opens month selection',
    },
    {
      uswds: 'usa-date-picker__calendar__date',
      flex: '.flex-date-picker__day',
      notes: 'Individual day button in calendar grid',
    },
    {
      uswds: 'usa-date-picker__calendar__date--selected',
      flex: '.flex-date-picker__day--selected',
      notes: 'Selected date styling',
    },
    {
      uswds: 'usa-date-picker__calendar__date--today',
      flex: '.flex-date-picker__day--today',
      notes: 'Today date styling',
    },
  ],
  verified: ['font-family', 'font-size', 'color', 'background-color', 'cursor'],
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
    'position',
    'z-index',
  ],
  extraIgnoreAttributes: [
    'id',
    'type',
    'role',
    'aria-label',
    'placeholder',
    'data-date',
    'data-min-date',
    'data-max-date',
    'data-default-value',
    'tabindex',
  ],
  extraIgnoreBoxKeys: ['paddingRight', 'marginTop'],
  intentionalDifferences: [
    {
      property: 'background-color',
      ours: 'var(--flex-gray-5) (#f0f0f0) \u2014 calendar background',
      uswds: '#f0f0f0 \u2014 same color, different token',
      reason: 'Using design token for theming support',
    },
  ],
  fixtures: [
    {
      name: 'date picker input matches USWDS date picker input styling',
      uswds: `<div class="usa-date-picker" data-testid="target">
    <label class="usa-label" for="uswds-date">${LABEL_TEXT}</label>
    <div class="usa-date-picker__wrapper" style="display: flex">
      <input class="usa-input usa-date-picker__external-input" id="uswds-date" name="${FIELD_NAME}" type="text" data-testid="target">
    </div>
  </div>`,
      flex: `<flex-date-picker data-testid="target">
    <label class="flex-label" for="date">${LABEL_TEXT}</label>
    <div class="flex-date-picker__wrapper">
      <input class="flex-input flex-date-picker__external-input" id="date" name="${FIELD_NAME}" type="text" placeholder="mm/dd/yyyy" data-testid="target">
    </div>
  </flex-date-picker>`,
      uswdsSelector:
        '[data-testid="target"] input, input[data-testid="target"]',
      flexSelector: '[data-testid="target"] input, input[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Date Picker Test</h1>
    <flex-date-picker>
      <label class="flex-label" for="a11y-date">Date</label>
      <div class="flex-date-picker__wrapper">
        <input class="flex-input flex-date-picker__external-input" id="a11y-date" name="date" type="text" placeholder="mm/dd/yyyy">
        <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Toggle</button>
        <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
          <div class="flex-date-picker__calendar-header">
            <button type="button" class="flex-date-picker__nav flex-date-picker__nav--prev" aria-label="Previous month">Prev</button>
            <button type="button" class="flex-date-picker__month-label" aria-label="Select month">April 2026</button>
            <button type="button" class="flex-date-picker__nav flex-date-picker__nav--next" aria-label="Next month">Next</button>
          </div>
          <table class="flex-date-picker__table" role="presentation">
            <thead><tr><th abbr="Sunday">Su</th><th abbr="Monday">Mo</th><th abbr="Tuesday">Tu</th><th abbr="Wednesday">We</th><th abbr="Thursday">Th</th><th abbr="Friday">Fr</th><th abbr="Saturday">Sa</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </flex-date-picker>
  </main>`,
  behavior: [
    { description: 'Click toggle button opens calendar popup', tested: true },
    { description: 'Click toggle button again closes calendar', tested: true },
    {
      description: 'Calendar renders correct days for the month',
      tested: true,
    },
    {
      description: 'Previous/Next month buttons navigate months',
      tested: true,
    },
    { description: 'Click day selects date and closes calendar', tested: true },
    {
      description: 'Selected date appears in input as mm/dd/yyyy',
      tested: true,
    },
    {
      description: 'ArrowLeft/Right moves focus by day',
      tested: true,
    },
    { description: 'ArrowUp/Down moves focus by week', tested: true },
    { description: 'Home/End moves to first/last day of week', tested: true },
    { description: 'PageUp/PageDown moves by month', tested: true },
    { description: 'Enter selects focused date', tested: true },
    { description: 'Escape closes calendar', tested: true },
    { description: 'Outside click closes calendar', tested: true },
    {
      description: 'Min/max date constraints disable out-of-range days',
      tested: true,
    },
    {
      description: 'Month label click toggles month selection view',
      tested: true,
    },
    { description: 'Today is visually highlighted', tested: true },
    { description: 'Selected date has accent background', tested: true },
    {
      description: 'Calendar opens with focus on selected or today date',
      tested: true,
    },
    { description: 'Accessibility audit passes', tested: true },
  ],
}
