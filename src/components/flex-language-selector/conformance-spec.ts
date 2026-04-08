import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-language-selector',
  reference: 'https://designsystem.digital.gov/components/language-selector/',
  mapping: [
    {
      uswds: 'usa-language-container',
      flex: '<flex-language-selector> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-button (language trigger)',
      flex: '.flex-language-selector__button',
      notes: 'Button to toggle language menu',
    },
    {
      uswds: 'usa-language__submenu',
      flex: '.flex-language-selector__menu',
      notes: 'Dropdown menu with language options',
    },
    {
      uswds: 'usa-language__submenu-item a',
      flex: '.flex-language-selector__link',
      notes: 'Individual language link',
    },
    {
      uswds: 'usa-language (two-language)',
      flex: 'flex-language-selector[data-variant="two"]',
      notes: 'Two-language variant (simple link, no dropdown)',
    },
  ],
  verified: ['display', 'font-size', 'position'],
  structuralIgnores: [
    'font-family',
    'line-height',
    'color',
    'padding-left',
    'padding-right',
    'padding-top',
    'padding-bottom',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline',
  ],
  intentionalDifferences: [
    {
      property: 'color',
      ours: 'var(--flex-blue-vivid-60)',
      uswds: '#005ea2',
      reason:
        'We use a semantic token for primary link color; USWDS uses the exact primary value',
    },
    {
      property: 'font-size',
      ours: '0.87rem',
      uswds: '16px (default)',
      reason:
        'Two-language variant uses compact sizing matching USWDS --small variant',
    },
    {
      property: 'font-weight',
      ours: '700',
      uswds: '400',
      reason:
        'Two-language variant uses bold to emphasize the language toggle link',
    },
    {
      property: 'text-decoration',
      ours: 'none',
      uswds: 'underline',
      reason:
        'We remove underline for cleaner appearance; underline appears on hover',
    },
    {
      property: 'display',
      ours: 'block',
      uswds: 'inline',
      reason:
        'Block display gives consistent click target sizing within the flex container',
    },
  ],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ],
  extraIgnoreAttributes: ['id', 'aria-controls', 'lang', 'href'],
  fixtures: [
    {
      name: 'two-language link matches USWDS language link styling',
      uswds: `<div class="usa-language-container">
    <ul class="usa-language__primary">
      <li class="usa-language__primary-item">
        <a href="/es" lang="es" class="usa-language__link" data-testid="target">Espa\u00f1ol</a>
      </li>
    </ul>
  </div>`,
      flex: `<flex-language-selector data-variant="two">
    <a href="/es" class="flex-language-selector__link" lang="es" data-testid="target">Espa\u00f1ol</a>
  </flex-language-selector>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Language Selector Test</h1>
    <nav aria-label="Language selection">
      <flex-language-selector>
        <button type="button" class="flex-language-selector__button" aria-expanded="false" aria-controls="lang-test-menu">
          Languages
        </button>
        <ul class="flex-language-selector__menu" id="lang-test-menu" hidden>
          <li><a href="/es" class="flex-language-selector__link" lang="es">Espa\u00f1ol</a></li>
          <li><a href="/fr" class="flex-language-selector__link" lang="fr">Fran\u00e7ais</a></li>
        </ul>
      </flex-language-selector>
    </nav>
  </main>`,
  behavior: [
    {
      description: 'Button click toggles menu visibility and aria-expanded',
      tested: true,
    },
    {
      description: 'Outside click closes menu',
      tested: true,
    },
    {
      description: 'Escape key closes menu and returns focus to button',
      tested: true,
    },
    {
      description: 'Two-language variant renders as simple link (no JS)',
      tested: true,
    },
  ],
}
