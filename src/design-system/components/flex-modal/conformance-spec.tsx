/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const MODAL_TITLE = 'Modal title'
const MODAL_BODY = 'Modal body content.'
const CLOSE_LABEL = 'Close this modal'

export const spec: ConformanceSpec = {
  component: 'flex-modal',
  reference: 'https://designsystem.digital.gov/components/modal/',
  mapping: [
    {
      uswds: 'usa-modal-wrapper / usa-modal-overlay',
      flex: '<flex-modal> (custom element) + .flex-modal__overlay',
      notes: 'Modal wrapper and overlay backdrop',
    },
    {
      uswds: 'usa-modal',
      flex: '.flex-modal__content[role="dialog"]',
      notes: 'Dialog content container',
    },
    {
      uswds: 'usa-modal__content',
      flex: '.flex-modal__content',
      notes: 'Content wrapper with column-reverse layout',
    },
    {
      uswds: 'usa-modal__main',
      flex: '.flex-modal__main',
      notes: 'Main content area with heading, body, footer',
    },
    {
      uswds: 'usa-modal__heading',
      flex: '.flex-modal__heading',
      notes: 'Modal heading',
    },
    {
      uswds: 'usa-modal__footer',
      flex: '.flex-modal__footer',
      notes: 'Modal footer with action buttons',
    },
    {
      uswds: 'usa-modal__close',
      flex: '.flex-modal__close[data-close-modal]',
      notes: 'Close button with X icon',
    },
    {
      uswds: 'usa-modal--lg',
      flex: 'flex-modal[data-size="large"]',
      notes: 'Large modal variant with wider max-width',
    },
    {
      uswds: 'data-force-action',
      flex: 'data-forced-action',
      notes: 'Forced action prevents overlay click, escape, hides close button',
    },
  ],
  verified: [
    'display',
    'position',
    'max-width',
    'border-radius',
    'background-color',
  ],
  structuralIgnores: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'display',
    'flex-direction',
    'overflow',
    'padding-left',
    'padding-right',
    'padding-top',
    'padding-bottom',
    'vertical-align',
    'text-align',
  ],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'marginRight',
    'marginLeft',
  ],
  intentionalDifferences: [
    {
      property: 'visibility',
      ours: 'hidden (via hidden attr)',
      uswds: 'controlled via is-hidden/is-visible classes',
      reason:
        'We use the native hidden attribute; USWDS uses JS class toggling with visibility transitions',
    },
  ],
  extraIgnoreAttributes: [
    'id',
    'aria-controls',
    'aria-labelledby',
    'aria-describedby',
    'aria-modal',
    'role',
    'aria-label',
    'aria-hidden',
    'focusable',
    'hidden',
    'data-forced-action',
    'data-close-modal',
    'data-open-modal',
  ],
  fixtures: [
    {
      name: 'modal content matches USWDS modal styling',
      uswds: `<div class="usa-modal-wrapper is-visible">
    <div class="usa-modal-overlay">
      <div class="usa-modal" data-testid="target">
        <div class="usa-modal__content">
          <div class="usa-modal__main">
            <h2 class="usa-modal__heading">${MODAL_TITLE}</h2>
            <div class="usa-prose"><p>${MODAL_BODY}</p></div>
            <div class="usa-modal__footer">
              <button type="button" class="usa-button">Close</button>
            </div>
          </div>
          <button type="button" class="usa-modal__close" aria-label="${CLOSE_LABEL}">
            &times;
          </button>
        </div>
      </div>
    </div>
  </div>`,
      flex: `<flex-modal id="modal-test">
    <div class="flex-modal__overlay"></div>
    <div class="flex-modal__content" role="dialog" aria-modal="true" aria-labelledby="modal-test-h" aria-describedby="modal-test-d" data-testid="target">
      <div class="flex-modal__main">
        <h2 class="flex-modal__heading" id="modal-test-h">${MODAL_TITLE}</h2>
        <div class="flex-modal__body" id="modal-test-d"><p>${MODAL_BODY}</p></div>
        <div class="flex-modal__footer">
          <button type="button" class="flex-button" data-close-modal>Close</button>
        </div>
      </div>
      <button type="button" class="flex-modal__close" aria-label="${CLOSE_LABEL}" data-close-modal>
        &times;
      </button>
    </div>
  </flex-modal>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Modal Test</h1>
    <button type="button" class="flex-button" aria-controls="modal-a11y" data-open-modal>Open modal</button>
    <flex-modal id="modal-a11y">
      <div class="flex-modal__overlay"></div>
      <div class="flex-modal__content" role="dialog" aria-modal="true" aria-labelledby="modal-a11y-heading" aria-describedby="modal-a11y-body">
        <div class="flex-modal__main">
          <h2 class="flex-modal__heading" id="modal-a11y-heading">Modal title</h2>
          <div class="flex-modal__body" id="modal-a11y-body"><p>Modal body content.</p></div>
          <div class="flex-modal__footer">
            <button type="button" class="flex-button" data-close-modal>Close</button>
          </div>
        </div>
        <button type="button" class="flex-modal__close" aria-label="Close this modal" data-close-modal>
          &times;
        </button>
      </div>
    </flex-modal>
  </main>`,
  behavior: [
    {
      description: 'Trigger button opens modal and sets aria-expanded',
      tested: true,
    },
    {
      description: 'Close button closes modal and restores focus to trigger',
      tested: true,
    },
    {
      description: 'Escape key closes modal (unless forced action)',
      tested: true,
    },
    {
      description: 'Overlay click closes modal (unless forced action)',
      tested: true,
    },
    {
      description: 'Focus is trapped within modal using Tab/Shift+Tab',
      tested: true,
    },
    {
      description: 'First focusable element receives focus on open',
      tested: true,
    },
    {
      description: 'Scroll lock applied to body when modal is open',
      tested: true,
    },
    {
      description:
        'Forced action prevents escape, overlay click, and hides close button',
      tested: true,
    },
  ],
}
