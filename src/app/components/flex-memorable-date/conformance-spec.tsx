/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const MONTH_LABEL = 'Month'
const DAY_LABEL = 'Day'
const YEAR_LABEL = 'Year'

export const spec: ConformanceSpec = {
  component: 'flex-memorable-date',
  reference: 'https://designsystem.digital.gov/components/memorable-date/',
  mapping: [
    {
      uswds: 'usa-memorable-date',
      flex: '<flex-memorable-date> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-fieldset',
      flex: '.flex-fieldset',
      notes: 'Fieldset wrapper',
    },
    {
      uswds: 'usa-legend',
      flex: '.flex-legend',
      notes: 'Legend text',
    },
    {
      uswds: 'usa-form-group--month',
      flex: '.flex-memorable-date__field--month',
      notes: 'Month field wrapper',
    },
    {
      uswds: 'usa-form-group--day',
      flex: '.flex-memorable-date__field--day',
      notes: 'Day field wrapper',
    },
    {
      uswds: 'usa-form-group--year',
      flex: '.flex-memorable-date__field--year',
      notes: 'Year field wrapper',
    },
  ],
  verified: ['display', 'flex-wrap', 'font-weight', 'font-size'],
  structuralIgnores: [
    'color',
    'font-family',
    'line-height',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
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
    'outline',
  ],
  extraIgnoreAttributes: [
    'id',
    'name',
    'maxlength',
    'pattern',
    'inputmode',
    'type',
    'for',
  ],
  extraIgnoreBoxKeys: ['paddingRight', 'paddingLeft', 'marginRight'],
  intentionalDifferences: [
    {
      property: 'width',
      ours: 'fit-content',
      uswds: 'fit-content',
      reason:
        'Both use fit-content for field wrappers; input widths match USWDS (3rem month/day, 4.5rem year)',
    },
  ],
  fixtures: [
    {
      name: 'memorable date fields layout matches usa-memorable-date',
      uswds: `<div class="usa-memorable-date" data-testid="target">
    <div class="usa-form-group usa-form-group--month">
      <label class="usa-label" for="uswds-month">${MONTH_LABEL}</label>
      <input class="usa-input" id="uswds-month" name="month" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
    </div>
    <div class="usa-form-group usa-form-group--day">
      <label class="usa-label" for="uswds-day">${DAY_LABEL}</label>
      <input class="usa-input" id="uswds-day" name="day" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
    </div>
    <div class="usa-form-group usa-form-group--year">
      <label class="usa-label" for="uswds-year">${YEAR_LABEL}</label>
      <input class="usa-input" id="uswds-year" name="year" type="text" maxlength="4" pattern="[0-9]*" inputmode="numeric">
    </div>
  </div>`,
      flex: `<flex-memorable-date>
    <fieldset class="flex-fieldset">
      <legend class="flex-legend">Date of birth</legend>
      <div class="flex-memorable-date__fields" data-testid="target">
        <div class="flex-memorable-date__field flex-memorable-date__field--month">
          <label class="flex-label" for="flex-month">${MONTH_LABEL}</label>
          <input class="flex-input" id="flex-month" name="month" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
        </div>
        <div class="flex-memorable-date__field flex-memorable-date__field--day">
          <label class="flex-label" for="flex-day">${DAY_LABEL}</label>
          <input class="flex-input" id="flex-day" name="day" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
        </div>
        <div class="flex-memorable-date__field flex-memorable-date__field--year">
          <label class="flex-label" for="flex-year">${YEAR_LABEL}</label>
          <input class="flex-input" id="flex-year" name="year" type="text" maxlength="4" pattern="[0-9]*" inputmode="numeric">
        </div>
      </div>
    </fieldset>
  </flex-memorable-date>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  behavior: [
    {
      description: 'Auto-advance from month to day after 2 digits',
      tested: true,
    },
    {
      description: 'Auto-advance from day to year after 2 digits',
      tested: true,
    },
    {
      description: 'Invalid month (0, 13) shows error on blur',
      tested: true,
    },
    {
      description: 'Invalid day (0, 32) shows error on blur',
      tested: true,
    },
    {
      description: 'Year with fewer than 4 digits shows error on blur',
      tested: true,
    },
    {
      description: 'Valid values clear error state',
      tested: true,
    },
    {
      description: 'Accessibility audit passes',
      tested: true,
    },
  ],
}
