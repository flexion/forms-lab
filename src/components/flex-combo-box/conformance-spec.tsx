/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const LABEL_TEXT = 'Select a fruit'
const FIELD_NAME = 'fruit'

export const spec: ConformanceSpec = {
  component: 'flex-combo-box',
  reference: 'https://designsystem.digital.gov/components/combo-box/',
  mapping: [
    {
      uswds: 'usa-combo-box',
      flex: '<flex-combo-box> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-combo-box__input',
      flex: '.flex-combo-box__input',
      notes: 'Text input with combobox role',
    },
    {
      uswds: 'usa-combo-box__toggle-list',
      flex: '.flex-combo-box__toggle',
      notes: 'Toggle dropdown button',
    },
    {
      uswds: 'usa-combo-box__clear-input',
      flex: '.flex-combo-box__clear',
      notes: 'Clear selection button',
    },
    {
      uswds: 'usa-combo-box__list',
      flex: '.flex-combo-box__list',
      notes: 'Dropdown listbox',
    },
    {
      uswds: 'usa-combo-box__list-option',
      flex: '.flex-combo-box__option',
      notes: 'Individual option items',
    },
    {
      uswds: 'usa-combo-box__list-option--focused',
      flex: '[data-focused]',
      notes: 'Highlighted option via keyboard navigation',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'background-color',
    'cursor',
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
    'id',
    'type',
    'role',
    'aria-expanded',
    'aria-autocomplete',
    'aria-controls',
    'autocomplete',
    'aria-activedescendant',
    'data-value',
    'tabindex',
    'aria-label',
  ],
  extraIgnoreBoxKeys: ['paddingRight', 'marginTop'],
  intentionalDifferences: [
    {
      property: 'padding-right',
      ours: '4.5rem (space for toggle + clear buttons)',
      uswds: '2.5rem (USWDS uses different button layout)',
      reason:
        'Our layout positions both toggle and clear buttons inside the input area',
    },
  ],
  fixtures: [
    {
      name: 'combo box input matches USWDS combo box input styling',
      uswds: `<div class="usa-combo-box" data-testid="target">
    <label class="usa-label" for="uswds-fruit">${LABEL_TEXT}</label>
    <input class="usa-combo-box__input" id="uswds-fruit" name="${FIELD_NAME}" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" autocomplete="off" data-testid="target">
  </div>`,
      flex: `<flex-combo-box data-testid="target">
    <label class="flex-label" for="fruit">${LABEL_TEXT}</label>
    <div class="flex-combo-box__wrapper">
      <input class="flex-combo-box__input" id="fruit" name="${FIELD_NAME}" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="fruit-list" autocomplete="off" data-testid="target">
      <ul class="flex-combo-box__list" id="fruit-list" role="listbox" hidden>
        <li class="flex-combo-box__option" role="option" data-value="apple" id="fruit-opt-apple">Apple</li>
      </ul>
    </div>
  </flex-combo-box>`,
      uswdsSelector:
        '[data-testid="target"] input, input[data-testid="target"]',
      flexSelector: '[data-testid="target"] input, input[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Combo Box Test</h1>
    <flex-combo-box>
      <label class="flex-label" for="a11y-fruit">Select a fruit</label>
      <div class="flex-combo-box__wrapper">
        <input class="flex-combo-box__input" id="a11y-fruit" name="fruit" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="a11y-list" autocomplete="off">
        <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
        <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
        <ul class="flex-combo-box__list" id="a11y-list" role="listbox" hidden>
          <li class="flex-combo-box__option" role="option" data-value="apple" id="a11y-opt-apple">Apple</li>
          <li class="flex-combo-box__option" role="option" data-value="banana" id="a11y-opt-banana">Banana</li>
        </ul>
      </div>
    </flex-combo-box>
  </main>`,
  behavior: [
    {
      description: 'Click input opens dropdown showing all options',
      tested: true,
    },
    { description: 'Typing filters options case-insensitively', tested: true },
    {
      description: 'Shows "No results found" when filter matches nothing',
      tested: true,
    },
    { description: 'Click option selects it and closes list', tested: true },
    { description: 'Enter key selects highlighted option', tested: true },
    { description: 'ArrowDown opens list if closed', tested: true },
    { description: 'ArrowDown/Up navigate options', tested: true },
    {
      description: 'Escape closes list and restores previous value',
      tested: true,
    },
    { description: 'Tab closes list and keeps selection', tested: true },
    { description: 'Clear button resets input', tested: true },
    { description: 'Outside click closes dropdown', tested: true },
    { description: 'aria-expanded updates on open/close', tested: true },
    {
      description: 'aria-activedescendant updates on keyboard nav',
      tested: true,
    },
    { description: 'aria-selected marks the selected option', tested: true },
    { description: 'Accessibility audit passes', tested: true },
  ],
}
