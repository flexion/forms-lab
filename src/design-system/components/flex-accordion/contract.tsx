/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

const FIRST_TITLE = 'First Amendment'
const FIRST_CONTENT = 'Congress shall make no law...'
const SECOND_TITLE = 'Second Amendment'
const SECOND_CONTENT = 'A well regulated Militia...'
const HOVER_TITLE = 'Section'
const HOVER_CONTENT = 'Content.'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-accordion',
  reference: 'https://designsystem.digital.gov/components/accordion/',
  mapping: [
    {
      uswds: 'usa-accordion',
      flex: '<flex-accordion> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-accordion__heading',
      flex: '.flex-accordion__heading',
      notes: 'Section heading wrapper',
    },
    {
      uswds: 'usa-accordion__button',
      flex: '.flex-accordion__button',
      notes: 'Toggle button',
    },
    {
      uswds: 'usa-accordion__content',
      flex: '.flex-accordion__content',
      notes: 'Collapsible panel',
    },
    {
      uswds: 'data-allow-multiple',
      flex: 'data-multiselectable',
      notes: 'Allow multiple panels open simultaneously',
    },
  ],
  verified: [
    'background-color',
    'font-size',
    'font-weight',
    'font-family',
    'line-height',
    'cursor',
  ],
  structuralIgnores: [
    'color',
    'outline',
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
    'align-items',
    'justify-content',
  ],
  extraIgnoreAttributes: ['type', 'aria-controls'],
  extraIgnoreBoxKeys: ['paddingRight', 'paddingLeft'],
  intentionalDifferences: [
    {
      property: 'display',
      ours: 'flex',
      uswds: 'inline-block',
      reason:
        'We use flex for space-between layout with +/- indicator; USWDS uses inline-block with background image',
    },
  ],
  fixtures: [
    {
      name: 'collapsed accordion button matches usa-accordion__button',
      uswds: `<div class="usa-accordion" data-testid="target">
    <h3 class="usa-accordion__heading">
      <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="uswds-panel-1">
        ${FIRST_TITLE}
      </button>
    </h3>
    <div id="uswds-panel-1" class="usa-accordion__content usa-prose" hidden>
      <p>${FIRST_CONTENT}</p>
    </div>
    <h3 class="usa-accordion__heading">
      <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="uswds-panel-2">
        ${SECOND_TITLE}
      </button>
    </h3>
    <div id="uswds-panel-2" class="usa-accordion__content usa-prose" hidden>
      <p>${SECOND_CONTENT}</p>
    </div>
  </div>`,
      flex: `<flex-accordion data-testid="target">
    <div>
      <h3 class="flex-accordion__heading">
        <button class="flex-accordion__button" aria-expanded="false" aria-controls="accordion-panel-1">
          ${FIRST_TITLE}
        </button>
      </h3>
      <div class="flex-accordion__content" id="accordion-panel-1" hidden>
        <p>${FIRST_CONTENT}</p>
      </div>
    </div>
    <div>
      <h3 class="flex-accordion__heading">
        <button class="flex-accordion__button" aria-expanded="false" aria-controls="accordion-panel-2">
          ${SECOND_TITLE}
        </button>
      </h3>
      <div class="flex-accordion__content" id="accordion-panel-2" hidden>
        <p>${SECOND_CONTENT}</p>
      </div>
    </div>
  </flex-accordion>`,
      uswdsSelector: '[data-testid="target"] .usa-accordion__button',
      flexSelector: '[data-testid="target"] .flex-accordion__button',
    },
    {
      name: 'accordion button hover state matches USWDS',
      uswds: `<div class="usa-accordion">
    <h3 class="usa-accordion__heading">
      <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="uswds-hp">${HOVER_TITLE}</button>
    </h3>
    <div id="uswds-hp" class="usa-accordion__content usa-prose" hidden><p>${HOVER_CONTENT}</p></div>
  </div>`,
      flex: `<flex-accordion>
    <div>
      <h3 class="flex-accordion__heading">
        <button type="button" class="flex-accordion__button" aria-expanded="false" aria-controls="flex-hp">${HOVER_TITLE}</button>
      </h3>
      <div class="flex-accordion__content" id="flex-hp" hidden><p>${HOVER_CONTENT}</p></div>
    </div>
  </flex-accordion>`,
      uswdsSelector: '.usa-accordion__button',
      flexSelector: '.flex-accordion__button',
      interaction: {
        action: 'hover',
        uswdsSelector: '.usa-accordion__button',
        flexSelector: '.flex-accordion__button',
      },
    },
  ],
  behavior: [
    { description: 'Click button expands content', tested: true },
    { description: 'Click again collapses content', tested: true },
    {
      description: 'Default mode: opening one closes others',
      tested: true,
    },
    {
      description: 'Multiselectable: multiple can be open',
      tested: true,
    },
    { description: 'Keyboard Enter toggles accordion', tested: true },
    { description: 'Hover state background matches USWDS', tested: true },
    {
      description: 'Accessibility audit passes with mixed states',
      tested: true,
    },
  ],
}
