/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const primaryLinkText = 'Primary link'
const agencyName = 'Agency Name'

export const spec: ConformanceSpec = {
  component: 'flex-footer',
  reference: 'https://designsystem.digital.gov/components/footer/',
  mapping: [
    {
      uswds: 'usa-footer',
      flex: '.flex-footer',
      notes: 'Outer footer element',
    },
    {
      uswds: 'usa-footer--slim',
      flex: 'data-variant="slim" (or no data-variant)',
      notes: 'Slim footer variant (default)',
    },
    {
      uswds: 'usa-footer--medium',
      flex: 'data-variant="medium"',
      notes: 'Medium footer variant',
    },
    {
      uswds: 'usa-footer--big',
      flex: 'data-variant="big"',
      notes: 'Big footer variant',
    },
    {
      uswds: 'usa-footer__return-to-top',
      flex: '.flex-footer__return-to-top',
      notes: 'Return to top link area',
    },
    {
      uswds: 'usa-footer__primary-section',
      flex: '.flex-footer__primary',
      notes: 'Primary section background',
    },
    {
      uswds: 'usa-footer__secondary-section',
      flex: '.flex-footer__secondary',
      notes: 'Secondary section with logo and contact',
    },
    {
      uswds: 'usa-footer__logo',
      flex: '.flex-footer__logo',
      notes: 'Logo area in secondary section',
    },
    {
      uswds: 'usa-footer__contact-info',
      flex: '.flex-footer__contact-info',
      notes: 'Contact info area',
    },
    {
      uswds: 'usa-footer__primary-link',
      flex: '.flex-footer__primary-link',
      notes: 'Primary navigation link',
    },
    {
      uswds: 'usa-footer__nav',
      flex: '.flex-footer__nav',
      notes: 'Navigation wrapper',
    },
  ],
  verified: [
    'background-color',
    'color',
    'font-family',
    'font-size',
    'line-height',
    'padding-top',
    'padding-bottom',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'footer primary section matches usa-footer__primary-section',
      uswds: (
        <footer class="usa-footer usa-footer--slim">
          <div class="usa-footer__primary-section" data-testid="target">
            <div class="usa-footer__primary-container">
              <a class="usa-footer__primary-link" href="#">
                {primaryLinkText}
              </a>
            </div>
          </div>
        </footer>
      ).toString(),
      flex: (
        <footer class="flex-footer">
          <div class="flex-footer__primary" data-testid="target">
            <div class="flex-footer__primary-container">
              <a class="flex-footer__primary-link" href="#">
                {primaryLinkText}
              </a>
            </div>
          </div>
        </footer>
      ).toString(),
    },
    {
      name: 'footer secondary section matches usa-footer__secondary-section',
      uswds: (
        <footer class="usa-footer usa-footer--slim">
          <div class="usa-footer__secondary-section" data-testid="target">
            <div class="grid-container">
              <p>{agencyName}</p>
            </div>
          </div>
        </footer>
      ).toString(),
      flex: (
        <footer class="flex-footer">
          <div class="flex-footer__secondary" data-testid="target">
            <div class="flex-footer__secondary-container">
              <p>{agencyName}</p>
            </div>
          </div>
        </footer>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Footer Test</h1>
    <p>Page content</p>
  </main>
  <footer class="flex-footer">
    <div class="flex-footer__return-to-top">
      <a href="#">Return to top</a>
    </div>
    <div class="flex-footer__primary">
      <nav class="flex-footer__nav" aria-label="Footer navigation">
        <ul>
          <li><a class="flex-footer__primary-link" href="#">Link</a></li>
        </ul>
      </nav>
    </div>
    <div class="flex-footer__secondary">
      <div class="flex-footer__secondary-container">
        <div class="flex-footer__logo">
          <p class="flex-footer__logo-heading">Agency Name</p>
        </div>
        <div class="flex-footer__contact-info">
          <a href="tel:+15555555555">(555) 555-5555</a>
        </div>
      </div>
    </div>
  </footer>`,
  behavior: [],
}
