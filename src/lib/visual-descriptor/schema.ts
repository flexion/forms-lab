/** CSS properties to extract via getComputedStyle. */
export const DEFAULT_PROPERTIES: string[] = [
  // Typography
  'font-family', 'font-size', 'font-weight', 'line-height',
  'color', 'text-transform', 'text-decoration', 'letter-spacing',

  // Visual
  'background-color',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'outline', 'outline-offset',

  // Layout
  'display', 'position',
  'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap',
  'grid-template-columns', 'grid-template-rows',
  'overflow',
]

/** HTML attributes to capture for accessibility and semantic conformance. */
export const TRACKED_ATTRIBUTES: string[] = [
  'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'aria-required', 'aria-invalid', 'aria-live', 'aria-expanded',
  'aria-hidden', 'aria-controls', 'aria-pressed',
  'type', 'for', 'id', 'name', 'required', 'disabled', 'tabindex',
  'autocomplete', 'inputmode', 'data-state', 'data-variant', 'data-size',
]
