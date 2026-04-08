import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-character-count',
  reference: 'https://designsystem.digital.gov/components/character-count/',
  mapping: [
    {
      uswds: 'usa-character-count',
      flex: '<flex-character-count> (custom element)',
      notes: 'Container element with data-maxlength attribute',
    },
    {
      uswds: 'usa-character-count__status',
      flex: '.flex-character-count__message',
      notes: 'Remaining/over-limit message element',
    },
    {
      uswds: 'usa-character-count__status--invalid',
      flex: '[data-state="error"]',
      notes: 'Over-limit error state',
    },
  ],
  verified: ['font-size', 'font-weight', 'display', 'padding-top'],
  structuralIgnores: [
    'color',
    'font-family',
    'line-height',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline',
  ],
  intentionalDifferences: [
    {
      property: 'color',
      ours: 'var(--flex-color-error)',
      uswds: '#b50909',
      reason:
        'We use our error design token (red-warm-vivid-50) for consistency; USWDS uses a hardcoded red-vivid-60',
    },
  ],
  extraIgnoreAttributes: [
    'id',
    'data-maxlength',
    'maxlength',
    'aria-describedby',
  ],
  fixtures: [
    {
      name: 'character count message matches usa-character-count__status',
      uswds: `<div class="usa-character-count">
    <label class="usa-label" for="uswds-message">Message</label>
    <textarea class="usa-textarea usa-character-count__field" id="uswds-message" name="message" maxlength="100"></textarea>
    <span class="usa-character-count__status" data-testid="target" aria-live="polite">100 characters allowed</span>
  </div>`,
      flex: `<flex-character-count data-maxlength="100">
    <label class="flex-label" for="flex-message">Message</label>
    <textarea class="flex-textarea" id="flex-message" name="message" maxlength="100"></textarea>
    <span class="flex-character-count__message" data-testid="target" aria-live="polite">100 characters allowed</span>
  </flex-character-count>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
    {
      name: 'over-limit error state matches usa-character-count__status--invalid',
      uswds: `<div class="usa-character-count">
    <label class="usa-label" for="uswds-msg2">Message</label>
    <textarea class="usa-textarea usa-character-count__field" id="uswds-msg2" name="message" maxlength="100"></textarea>
    <span class="usa-character-count__status usa-character-count__status--invalid" data-testid="target" aria-live="polite">5 characters over limit</span>
  </div>`,
      flex: `<flex-character-count data-maxlength="100">
    <label class="flex-label" for="flex-msg2">Message</label>
    <textarea class="flex-textarea" id="flex-msg2" name="message" maxlength="100"></textarea>
    <span class="flex-character-count__message" data-state="error" data-testid="target" aria-live="polite">5 characters over limit</span>
  </flex-character-count>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  behavior: [
    {
      description: 'Initial message shows total characters allowed',
      tested: true,
    },
    {
      description: 'Typing updates remaining count',
      tested: true,
    },
    {
      description: 'Over-limit shows error state with count over',
      tested: true,
    },
  ],
}
