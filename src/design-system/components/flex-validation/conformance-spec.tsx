/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const uncheckedText = 'Use at least one uppercase letter'
const checkedText = 'Use at least one number'

export const spec: ConformanceSpec = {
  component: 'flex-validation',
  reference: 'https://designsystem.digital.gov/components/validation/',
  mapping: [
    {
      uswds: 'usa-checklist',
      flex: '.flex-checklist',
      notes: 'Validation checklist pattern',
    },
    {
      uswds: 'usa-checklist__item',
      flex: '.flex-checklist__item',
      notes: 'Checklist item',
    },
    {
      uswds: 'usa-checklist__item--checked',
      flex: 'data-state="checked"',
      notes: 'Checked state for checklist item',
    },
  ],
  verified: ['font-family', 'font-size', 'line-height', 'color'],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'text-indent',
      ours: '-2.5rem',
      uswds: '-2.5rem',
      reason:
        'Checklist uses text-indent for hanging indent — visual rendering matches',
    },
  ],
  fixtures: [
    {
      name: 'checklist matches usa-checklist',
      uswds: (
        <div>
          <ul class="usa-checklist" data-testid="target">
            <li class="usa-checklist__item">{uncheckedText}</li>
            <li class="usa-checklist__item usa-checklist__item--checked">
              {checkedText}
            </li>
          </ul>
        </div>
      ).toString(),
      flex: (
        <div>
          <ul class="flex-checklist" data-testid="target">
            <li class="flex-checklist__item">{uncheckedText}</li>
            <li class="flex-checklist__item" data-state="checked">
              {checkedText}
            </li>
          </ul>
        </div>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Validation Test</h1>
    <div class="flex-validation" data-state="error">
      <span class="flex-validation__message">This field is required.</span>
    </div>
    <div class="flex-validation-summary" role="alert">
      <h3 class="flex-validation-summary__heading">Your form has errors</h3>
      <ul class="flex-validation-summary__list">
        <li><a href="#field-1">Error in field 1</a></li>
      </ul>
    </div>
    <ul class="flex-checklist">
      <li class="flex-checklist__item">Unchecked item</li>
      <li class="flex-checklist__item" data-state="checked">Checked item</li>
    </ul>
  </main>`,
  behavior: [],
}
