/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const LABEL_TEXT = 'Rating'
const FIELD_NAME = 'rating'
const DEFAULT_VALUE = '50'

function rangeFixture(
  name: string,
  targetPart: 'input' | 'value',
  suffix: string,
) {
  const uswdsInputId = `uswds-range${suffix}`
  const flexInputId = `flex-range${suffix}`
  const inputTestId = targetPart === 'input' ? ' data-testid="target"' : ''
  const valueTestId = targetPart === 'value' ? ' data-testid="target"' : ''

  return {
    name,
    uswds: `<div>
    <label class="usa-label" for="${uswdsInputId}">${LABEL_TEXT}</label>
    <div class="usa-range__wrapper">
      <input class="usa-range" id="${uswdsInputId}" name="${FIELD_NAME}" type="range" min="0" max="100" value="${DEFAULT_VALUE}" step="1"${inputTestId}>
      <span class="usa-range__value"${valueTestId} aria-live="polite">${DEFAULT_VALUE}</span>
    </div>
  </div>`,
    flex: `<flex-range-slider>
    <label class="flex-label" for="${flexInputId}">${LABEL_TEXT}</label>
    <div class="flex-range-slider__wrapper">
      <input class="flex-range-slider__input" id="${flexInputId}" name="${FIELD_NAME}" type="range" min="0" max="100" value="${DEFAULT_VALUE}" step="1"${inputTestId}>
      <span class="flex-range-slider__value"${valueTestId} aria-live="polite">${DEFAULT_VALUE}</span>
    </div>
  </flex-range-slider>`,
    uswdsSelector: '[data-testid="target"]',
    flexSelector: '[data-testid="target"]',
  }
}

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
    rangeFixture('range slider input matches usa-range', 'input', ''),
    rangeFixture(
      'range slider value display matches usa-range__value',
      'value',
      '2',
    ),
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
