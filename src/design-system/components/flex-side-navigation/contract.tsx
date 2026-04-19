/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-side-navigation',
  reference: 'https://designsystem.digital.gov/components/side-navigation/',
  mapping: [
    {
      uswds: 'usa-sidenav',
      flex: '.flex-sidenav',
      notes: 'Side navigation list wrapper',
    },
    {
      uswds: 'usa-sidenav__item (implicit via li)',
      flex: '.flex-sidenav__item',
      notes: 'Navigation list item',
    },
    {
      uswds: 'usa-sidenav a',
      flex: '.flex-sidenav__link',
      notes: 'Navigation link',
    },
    {
      uswds: 'usa-current',
      flex: '.flex-sidenav__link--current',
      notes: 'Current page indicator',
    },
    {
      uswds: 'usa-sidenav__sublist',
      flex: '.flex-sidenav__sublist',
      notes: 'Nested navigation sublist',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'list-style-type',
    'padding-left',
    'border-bottom-width',
    'border-bottom-style',
    'display',
    'text-decoration-line',
  ],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'border-color',
      ours: 'var(--flex-color-border)',
      uswds: '#dfe1e2',
      reason: 'We use our semantic border token',
    },
  ],
  fixtures: [
    {
      name: 'sidenav list matches usa-sidenav',
      uswds: (
        <nav aria-label="Side navigation">
          <ul class="usa-sidenav" data-testid="target">
            <li class="usa-sidenav__item">
              <a href="/page1" class="usa-current">
                Current Page
              </a>
            </li>
            <li class="usa-sidenav__item">
              <a href="/page2">Another Page</a>
            </li>
          </ul>
        </nav>
      ).toString(),
      flex: (
        <nav aria-label="Side navigation">
          <ul class="flex-sidenav" data-testid="target">
            <li class="flex-sidenav__item">
              <a
                href="/page1"
                class="flex-sidenav__link flex-sidenav__link--current"
                aria-current="page"
              >
                Current Page
              </a>
            </li>
            <li class="flex-sidenav__item">
              <a href="/page2" class="flex-sidenav__link">
                Another Page
              </a>
            </li>
          </ul>
        </nav>
      ).toString(),
    },
    {
      name: 'sidenav link matches usa-sidenav link',
      uswds: (
        <nav aria-label="Side navigation">
          <ul class="usa-sidenav">
            <li class="usa-sidenav__item">
              <a href="/page1" data-testid="target">
                Page 1
              </a>
            </li>
          </ul>
        </nav>
      ).toString(),
      flex: (
        <nav aria-label="Side navigation">
          <ul class="flex-sidenav">
            <li class="flex-sidenav__item">
              <a href="/page1" class="flex-sidenav__link" data-testid="target">
                Page 1
              </a>
            </li>
          </ul>
        </nav>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Side Navigation Test</h1>
    <nav aria-label="Side navigation">
      <ul class="flex-sidenav">
        <li class="flex-sidenav__item">
          <a href="/page1" class="flex-sidenav__link flex-sidenav__link--current" aria-current="page">Current Page</a>
        </li>
        <li class="flex-sidenav__item">
          <a href="/page2" class="flex-sidenav__link">Another Page</a>
          <ul class="flex-sidenav__sublist">
            <li class="flex-sidenav__item">
              <a href="/page2/sub" class="flex-sidenav__link">Subpage</a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </main>`,
  behavior: [
    {
      description: 'Current page has left border accent indicator',
      tested: false,
    },
    {
      description: 'Hover state changes background and text color',
      tested: false,
    },
    {
      description: 'Nested sublists increase indentation',
      tested: false,
    },
  ],
}
