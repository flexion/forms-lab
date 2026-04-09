/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const NAV_HEADING = 'On this page'
const SECTION_1 = 'Section 1'
const SECTION_2 = 'Section 2'

export const spec: ConformanceSpec = {
  component: 'flex-in-page-nav',
  reference: 'https://designsystem.digital.gov/components/in-page-navigation/',
  mapping: [
    {
      uswds: 'usa-in-page-nav',
      flex: '<flex-in-page-nav> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: 'usa-in-page-nav__nav',
      flex: '.flex-in-page-nav__nav',
      notes: 'Sticky nav container with border-left',
    },
    {
      uswds: 'usa-in-page-nav__heading',
      flex: '.flex-in-page-nav__heading',
      notes: '"On this page" heading',
    },
    {
      uswds: 'usa-in-page-nav__list',
      flex: '.flex-in-page-nav__list',
      notes: 'TOC link list',
    },
    {
      uswds: 'usa-current',
      flex: '.flex-in-page-nav__link--current / [aria-current="true"]',
      notes: 'Active section highlight',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'text-decoration',
    'font-weight',
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
    'position',
    'display',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'outline',
  ],
  extraIgnoreAttributes: ['aria-current', 'aria-label'],
  extraIgnoreBoxKeys: ['marginLeft'],
  intentionalDifferences: [
    {
      property: 'border-left',
      ours: '3px solid transparent / accent (on links)',
      uswds: 'applied via ::after pseudo-element on .usa-current',
      reason:
        'We use border-left directly on links for the active indicator; USWDS uses a ::after pseudo-element with border-radius',
    },
  ],
  fixtures: [
    {
      name: 'in-page-nav link matches USWDS link styling',
      uswds: `<nav class="usa-in-page-nav__nav" aria-label="${NAV_HEADING}">
    <h4 class="usa-in-page-nav__heading">${NAV_HEADING}</h4>
    <ul class="usa-in-page-nav__list">
      <li class="usa-in-page-nav__list__item">
        <a href="#section-1" class="usa-in-page-nav__link" data-testid="target">${SECTION_1}</a>
      </li>
      <li class="usa-in-page-nav__list__item">
        <a href="#section-2" class="usa-in-page-nav__link">${SECTION_2}</a>
      </li>
    </ul>
  </nav>`,
      flex: `<flex-in-page-nav>
    <nav class="flex-in-page-nav__nav" aria-label="${NAV_HEADING}">
      <h4 class="flex-in-page-nav__heading">${NAV_HEADING}</h4>
      <ul class="flex-in-page-nav__list">
        <li class="flex-in-page-nav__item">
          <a href="#section-1" class="flex-in-page-nav__link" data-testid="target">${SECTION_1}</a>
        </li>
        <li class="flex-in-page-nav__item">
          <a href="#section-2" class="flex-in-page-nav__link">${SECTION_2}</a>
        </li>
      </ul>
    </nav>
  </flex-in-page-nav>`,
      uswdsSelector: '[data-testid="target"]',
      flexSelector: '[data-testid="target"]',
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>In-Page Nav Test</h1>
    <flex-in-page-nav>
      <nav class="flex-in-page-nav__nav" aria-label="On this page">
        <h4 class="flex-in-page-nav__heading">On this page</h4>
        <ul class="flex-in-page-nav__list">
          <li class="flex-in-page-nav__item">
            <a href="#overview" class="flex-in-page-nav__link">Overview</a>
          </li>
          <li class="flex-in-page-nav__item">
            <a href="#details" class="flex-in-page-nav__link">Details</a>
          </li>
        </ul>
      </nav>
    </flex-in-page-nav>
    <h2 id="overview">Overview</h2>
    <p>Overview content.</p>
    <h2 id="details">Details</h2>
    <p>Details content.</p>
  </main>`,
  behavior: [
    {
      description: 'Scans page for headings and builds TOC',
      tested: true,
    },
    {
      description: 'Generates IDs for headings without them',
      tested: true,
    },
    {
      description:
        'Scroll spy highlights current section via IntersectionObserver',
      tested: true,
    },
    {
      description: 'Clicking TOC link smooth scrolls to section',
      tested: true,
    },
    {
      description: 'Configurable heading levels via data-heading-levels',
      tested: true,
    },
    {
      description: 'Accessibility audit passes',
      tested: true,
    },
  ],
}
