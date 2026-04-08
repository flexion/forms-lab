import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-range-slider',
  reference: 'https://designsystem.digital.gov/components/range-slider/',
  mapping: [
    {
      uswds: 'usa-range',
      flex: '.flex-range-slider__input',
      notes: 'The range input element',
    },
    {
      uswds: 'usa-range__wrapper',
      flex: '.flex-range-slider__wrapper',
      notes: 'Flex wrapper for input + value display',
    },
    {
      uswds: 'usa-range__value',
      flex: '.flex-range-slider__value',
      notes: 'Current value display',
    },
  ],
  verified: ['height', 'width', 'font-size', 'display'],
  structuralIgnores: [
    'appearance',
    '-webkit-appearance',
    'border',
    'padding-left',
    'padding-right',
    'background-color',
    'background',
    'color',
    'font-family',
    'line-height',
    'margin-top',
    'max-width',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline',
  ],
  intentionalDifferences: [],
  extraIgnoreAttributes: [
    'id',
    'type',
    'min',
    'max',
    'value',
    'step',
    'aria-describedby',
  ],
  extraIgnoreBoxKeys: ['paddingTop', 'paddingBottom'],
  fixtures: [
    {
      name: 'range slider input matches usa-range',
      uswds: `<div>
    <label class="usa-label" for="uswds-range">Rating</label>
    <div class="usa-range__wrapper">
      <input class="usa-range" id="uswds-range" name="rating" type="range" min="0" max="100" value="50" step="1" data-testid="target">
      <span class="usa-range__value" aria-live="polite">50</span>
    </div>
  </div>`,
      flex: `<flex-range-slider>
    <label class="flex-label" for="flex-range">Rating</label>
    <div class="flex-range-slider__wrapper">
      <input class="flex-range-slider__input" id="flex-range" name="rating" type="range" min="0" max="100" value="50" step="1" data-testid="target">
      <span class="flex-range-slider__value" aria-live="polite">50</span>
    </div>
  </flex-range-slider>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
    {
      name: 'range slider value display matches usa-range__value',
      uswds: `<div>
    <label class="usa-label" for="uswds-range2">Rating</label>
    <div class="usa-range__wrapper">
      <input class="usa-range" id="uswds-range2" name="rating" type="range" min="0" max="100" value="50" step="1">
      <span class="usa-range__value" data-testid="target" aria-live="polite">50</span>
    </div>
  </div>`,
      flex: `<flex-range-slider>
    <label class="flex-label" for="flex-range2">Rating</label>
    <div class="flex-range-slider__wrapper">
      <input class="flex-range-slider__input" id="flex-range2" name="rating" type="range" min="0" max="100" value="50" step="1">
      <span class="flex-range-slider__value" data-testid="target" aria-live="polite">50</span>
    </div>
  </flex-range-slider>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  behavior: [
    {
      description: 'Initial value is displayed next to the slider',
      tested: true,
    },
    {
      description: 'Value display updates on input change',
      tested: true,
    },
  ],
}
