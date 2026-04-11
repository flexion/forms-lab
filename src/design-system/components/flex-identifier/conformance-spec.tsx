/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const domainText = 'agency.gov'
const disclaimerText = 'An official website of the Agency'
const aboutLinkText = 'About'

export const spec: ConformanceSpec = {
  component: 'flex-identifier',
  reference: 'https://designsystem.digital.gov/components/identifier/',
  mapping: [
    {
      uswds: 'usa-identifier',
      flex: '.flex-identifier',
      notes: 'Outer identifier wrapper',
    },
    {
      uswds: 'usa-identifier__section',
      flex: '.flex-identifier__section',
      notes: 'Section divider',
    },
    {
      uswds: 'usa-identifier__section--masthead',
      flex: '.flex-identifier__section--masthead',
      notes: 'Masthead section with logo and identity',
    },
    {
      uswds: 'usa-identifier__container',
      flex: '.flex-identifier__container',
      notes: 'Max-width container',
    },
    {
      uswds: 'usa-identifier__logos',
      flex: '.flex-identifier__logos',
      notes: 'Logo container',
    },
    {
      uswds: 'usa-identifier__logo',
      flex: '.flex-identifier__logo',
      notes: 'Individual logo link',
    },
    {
      uswds: 'usa-identifier__identity',
      flex: '.flex-identifier__identity',
      notes: 'Identity text (domain + disclaimer)',
    },
    {
      uswds: 'usa-identifier__identity-domain',
      flex: '.flex-identifier__identity-domain',
      notes: 'Domain text',
    },
    {
      uswds: 'usa-identifier__identity-disclaimer',
      flex: '.flex-identifier__identity-disclaimer',
      notes: 'Disclaimer text',
    },
    {
      uswds: 'usa-identifier__required-links-list',
      flex: '.flex-identifier__required-links-list',
      notes: 'Required links list',
    },
    {
      uswds: 'usa-identifier__required-link',
      flex: '.flex-identifier__required-link',
      notes: 'Individual required link',
    },
    {
      uswds: 'usa-identifier__section--usagov',
      flex: '.flex-identifier__section--usagov',
      notes: 'USA.gov section',
    },
  ],
  verified: [
    'background-color',
    'color',
    'font-family',
    'font-size',
    'line-height',
    'padding-bottom',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'identifier matches usa-identifier background and text color',
      uswds: (
        <div class="usa-identifier" data-testid="target">
          <section
            class="usa-identifier__section usa-identifier__section--masthead"
            aria-label="Agency identifier"
          >
            <div class="usa-identifier__container">
              <div class="usa-identifier__identity">
                <p class="usa-identifier__identity-domain">{domainText}</p>
                <p class="usa-identifier__identity-disclaimer">
                  {disclaimerText}
                </p>
              </div>
            </div>
          </section>
        </div>
      ).toString(),
      flex: (
        <div class="flex-identifier" data-testid="target">
          <section
            class="flex-identifier__section flex-identifier__section--masthead"
            aria-label="Agency identifier"
          >
            <div class="flex-identifier__container">
              <div class="flex-identifier__identity">
                <p class="flex-identifier__identity-domain">{domainText}</p>
                <p class="flex-identifier__identity-disclaimer">
                  {disclaimerText}
                </p>
              </div>
            </div>
          </section>
        </div>
      ).toString(),
    },
    {
      name: 'identifier required links list matches usa-identifier',
      uswds: (
        <div class="usa-identifier">
          <nav class="usa-identifier__section" aria-label="Important links">
            <div class="usa-identifier__container">
              <ul
                class="usa-identifier__required-links-list"
                data-testid="target"
              >
                <li class="usa-identifier__required-links-item">
                  <a
                    href="/example"
                    class="usa-identifier__required-link usa-link"
                  >
                    {aboutLinkText}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      ).toString(),
      flex: (
        <div class="flex-identifier">
          <nav class="flex-identifier__section" aria-label="Important links">
            <div class="flex-identifier__container">
              <ul
                class="flex-identifier__required-links-list"
                data-testid="target"
              >
                <li class="flex-identifier__required-links-list-item">
                  <a href="/example" class="flex-identifier__required-link">
                    {aboutLinkText}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Identifier Test</h1>
  </main>
  <div class="flex-identifier">
    <section class="flex-identifier__section flex-identifier__section--masthead" aria-label="Agency identifier">
      <div class="flex-identifier__container">
        <div class="flex-identifier__identity">
          <p class="flex-identifier__identity-domain">agency.gov</p>
          <p class="flex-identifier__identity-disclaimer">
            An official website of the <a href="/">Agency Name</a>
          </p>
        </div>
      </div>
    </section>
    <nav class="flex-identifier__section" aria-label="Important links">
      <div class="flex-identifier__container">
        <ul class="flex-identifier__required-links-list">
          <li class="flex-identifier__required-links-list-item">
            <a href="/example" class="flex-identifier__required-link">About</a>
          </li>
          <li class="flex-identifier__required-links-list-item">
            <a href="/example" class="flex-identifier__required-link">Accessibility</a>
          </li>
        </ul>
      </div>
    </nav>
    <section class="flex-identifier__section flex-identifier__section--usagov" aria-label="U.S. government information and services">
      <div class="flex-identifier__container">
        <p class="flex-identifier__usagov-description">
          Looking for U.S. government information and services?
          <a href="https://www.usa.gov/">Visit USA.gov</a>
        </p>
      </div>
    </section>
  </div>`,
  behavior: [],
}
