/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const START_LABEL = 'Start date'

export const spec: ConformanceSpec = {
  component: 'flex-date-range-picker',
  reference: 'https://designsystem.digital.gov/components/date-range-picker/',
  mapping: [
    {
      uswds: 'usa-date-range-picker',
      flex: '<flex-date-range-picker> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-date-range-picker__range-start',
      flex: '.flex-date-range-picker__range-start',
      notes: 'Start date picker container',
    },
    {
      uswds: 'usa-date-range-picker__range-end',
      flex: '.flex-date-range-picker__range-end',
      notes: 'End date picker container',
    },
  ],
  verified: ['display'],
  structuralIgnores: [
    'width',
    'max-width',
    'gap',
    'margin-bottom',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
  ],
  extraIgnoreAttributes: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'date range picker start section matches USWDS styling',
      uswds: `<div class="usa-date-range-picker">
    <div class="usa-date-range-picker__range-start" data-testid="target">
      <div class="usa-date-picker"><label class="usa-label" for="start">${START_LABEL}</label></div>
    </div>
  </div>`,
      flex: `<flex-date-range-picker>
    <div class="flex-date-range-picker__range-start" data-testid="target">
      <flex-date-picker><label class="flex-label" for="start">${START_LABEL}</label></flex-date-picker>
    </div>
  </flex-date-range-picker>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Date Range Picker Test</h1>
    <flex-date-range-picker>
      <div class="flex-date-range-picker__range-start">
        <flex-date-picker>
          <label class="flex-label" for="a11y-start">Start date</label>
          <div class="flex-date-picker__wrapper">
            <input class="flex-input flex-date-picker__external-input" id="a11y-start" name="start" type="text" placeholder="mm/dd/yyyy">
            <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Toggle</button>
            <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
              <table class="flex-date-picker__table" role="presentation"><thead><tr><th>Su</th></tr></thead><tbody></tbody></table>
            </div>
          </div>
        </flex-date-picker>
      </div>
      <div class="flex-date-range-picker__range-end">
        <flex-date-picker>
          <label class="flex-label" for="a11y-end">End date</label>
          <div class="flex-date-picker__wrapper">
            <input class="flex-input flex-date-picker__external-input" id="a11y-end" name="end" type="text" placeholder="mm/dd/yyyy">
            <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Toggle</button>
            <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
              <table class="flex-date-picker__table" role="presentation"><thead><tr><th>Su</th></tr></thead><tbody></tbody></table>
            </div>
          </div>
        </flex-date-picker>
      </div>
    </flex-date-range-picker>
  </main>`,
  behavior: [
    {
      description: 'Contains two date picker instances (start and end)',
      tested: true,
    },
    {
      description:
        'Selecting start date updates end picker min-date constraint',
      tested: true,
    },
    {
      description:
        'Selecting end date updates start picker max-date constraint',
      tested: true,
    },
    { description: 'Accessibility audit passes', tested: true },
  ],
}
