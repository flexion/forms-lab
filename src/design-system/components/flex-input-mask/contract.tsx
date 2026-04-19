/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

const LABEL_TEXT = 'Phone number'
const MASK_PATTERN = '(___) ___-____'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-input-mask',
  reference: 'https://designsystem.digital.gov/components/input-mask/',
  mapping: [
    {
      uswds: 'usa-input-masking',
      flex: '<flex-input-mask> (custom element)',
      notes: 'Container element with data-mask attribute',
    },
    {
      uswds: 'usa-masked',
      flex: '.flex-input-mask__input',
      notes: 'Input element with transparent background',
    },
    {
      uswds: 'usa-input-masking__content (overlay)',
      flex: '.flex-input-mask__overlay',
      notes: 'Overlay showing remaining mask characters',
    },
  ],
  verified: ['background-color', 'font-size', 'font-family'],
  structuralIgnores: [
    'color',
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
    'display',
    'z-index',
    'height',
    'width',
    'max-width',
    'pointer-events',
    'white-space',
    'align-items',
    'top',
    'left',
  ],
  extraIgnoreAttributes: [
    'id',
    'name',
    'inputmode',
    'placeholder',
    'aria-hidden',
    'type',
    'for',
    'data-mask',
  ],
  intentionalDifferences: [
    {
      property: 'background-color',
      ours: 'transparent',
      uswds: 'transparent',
      reason:
        'Both use transparent background on the input so the overlay shows through',
    },
    {
      property: 'position',
      ours: 'relative',
      uswds: 'static',
      reason:
        'We use position: relative + z-index to stack the input above the overlay span; USWDS uses a different overlay approach',
    },
  ],
  fixtures: [
    {
      name: 'input mask wrapper matches USWDS input-masking layout',
      uswds: `<div data-testid="target">
    <label class="usa-label" for="uswds-phone">${LABEL_TEXT}</label>
    <input class="usa-input usa-masked" id="uswds-phone" name="phone" type="text" inputmode="numeric" placeholder="${MASK_PATTERN}">
  </div>`,
      flex: `<flex-input-mask data-mask="${MASK_PATTERN}">
    <label class="flex-label" for="flex-phone">${LABEL_TEXT}</label>
    <div class="flex-input-mask__wrapper" data-testid="target">
      <input class="flex-input flex-input-mask__input" id="flex-phone" name="phone" type="text" inputmode="numeric" placeholder="${MASK_PATTERN}">
      <span class="flex-input-mask__overlay" aria-hidden="true">${MASK_PATTERN}</span>
    </div>
  </flex-input-mask>`,
      uswdsSelector: '[data-testid="target"] input',
      flexSelector: '[data-testid="target"] input',
    },
  ],
  behavior: [
    {
      description: 'Typing digits formats according to phone mask',
      tested: true,
    },
    {
      description: 'Typing digits formats according to SSN mask',
      tested: true,
    },
    {
      description: 'Overlay updates to show remaining mask characters',
      tested: true,
    },
    {
      description: 'Non-digit keys are rejected for numeric masks',
      tested: true,
    },
    {
      description: 'Pasting a value formats correctly',
      tested: true,
    },
    {
      description: 'Accessibility audit passes',
      tested: true,
    },
  ],
}
