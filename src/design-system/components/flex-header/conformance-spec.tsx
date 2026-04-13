/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const SITE_NAME = 'Forms Lab'
const NAV_LINK_TEXT = 'Catalog'
const NAV_LINK_HREF = '/catalog'

function uswdsHeaderHtml(navLinkClass: string) {
  return `<header class="usa-header usa-header--basic">
        <div class="usa-nav-container">
          <div class="usa-navbar">
            <div class="usa-logo"><a class="usa-logo__text" href="/">${SITE_NAME}</a></div>
          </div>
          <nav class="usa-nav" aria-label="Primary navigation">
            <ul class="usa-nav__primary usa-accordion">
              <li class="usa-nav__primary-item"><a class="${navLinkClass}" href="${NAV_LINK_HREF}" data-testid="target"><span>${NAV_LINK_TEXT}</span></a></li>
            </ul>
          </nav>
        </div>
      </header>`
}

function flexHeaderHtml(navLinkClass: string, ariaCurrent?: string) {
  const ariaAttr = ariaCurrent ? ` aria-current="${ariaCurrent}"` : ''
  return `<flex-header class="flex-header">
        <div class="flex-header__inner">
          <div class="flex-header__logo">
            <a href="/" class="flex-header__logo-link"><span class="flex-header__logo-text">${SITE_NAME}</span></a>
          </div>
          <button type="button" class="flex-header__menu-btn" aria-expanded="false" aria-controls="header-nav">Menu</button>
          <nav class="flex-header__nav" id="header-nav" aria-label="Primary navigation">
            <button type="button" class="flex-header__close-btn" aria-controls="header-nav">Close</button>
            <ul class="flex-header__nav-list">
              <li class="flex-header__nav-item"><a href="${NAV_LINK_HREF}" class="${navLinkClass}"${ariaAttr} data-testid="target">${NAV_LINK_TEXT}</a></li>
            </ul>
          </nav>
        </div>
      </flex-header>`
}

export const spec: ConformanceSpec = {
  component: 'flex-header',
  reference: 'https://designsystem.digital.gov/components/header/',
  mapping: [
    {
      uswds: 'usa-header',
      flex: '.flex-header',
      notes: 'Outer header element',
    },
    {
      uswds: 'usa-header--basic',
      flex: '.flex-header (default)',
      notes: 'Basic variant is the default',
    },
    {
      uswds: 'usa-navbar',
      flex: '.flex-header__inner',
      notes: 'Inner container with logo and nav',
    },
    {
      uswds: 'usa-logo',
      flex: '.flex-header__logo',
      notes: 'Logo container',
    },
    {
      uswds: 'usa-menu-btn',
      flex: '.flex-header__menu-btn',
      notes: 'Mobile menu hamburger button',
    },
    {
      uswds: 'usa-nav',
      flex: '.flex-header__nav',
      notes: 'Primary navigation container',
    },
    {
      uswds: 'usa-nav__close',
      flex: '.flex-header__close-btn',
      notes: 'Mobile nav close button',
    },
    {
      uswds: 'usa-nav__primary',
      flex: '.flex-header__nav-list',
      notes: 'Primary nav link list',
    },
    {
      uswds: 'usa-nav__primary-item',
      flex: '.flex-header__nav-item',
      notes: 'Individual nav item',
    },
    {
      uswds: 'usa-nav__link / usa-current',
      flex: '.flex-header__nav-link / .flex-header__nav-link--current',
      notes: 'Nav link and current page indicator',
    },
    {
      uswds: 'usa-overlay',
      flex: '.flex-header__overlay',
      notes: 'Mobile nav background overlay',
    },
    {
      uswds: 'usa-accordion__button (as disclosure trigger)',
      flex: '.flex-header__user-trigger',
      notes:
        'Profile dropdown trigger — USWDS uses accordion button semantics for submenus; ours uses a menu-button disclosure for account actions',
    },
    {
      uswds: 'usa-nav__submenu',
      flex: '.flex-header__user-panel',
      notes:
        'Disclosure panel containing user identity, theme preference, and sign out',
    },
  ],
  verified: [
    'background-color',
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-decoration',
    'padding',
    'border-bottom',
  ],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'max-width',
      ours: '960px',
      uswds: '64rem (1024px)',
      reason: 'We use 960px max-width to align with banner and content areas',
    },
  ],
  fixtures: [
    {
      name: 'header nav link matches usa-nav__primary-item link',
      uswds: uswdsHeaderHtml('usa-nav__link'),
      flex: flexHeaderHtml('flex-header__nav-link'),
    },
    {
      name: 'current nav link has accent indicator',
      uswds: uswdsHeaderHtml('usa-nav__link usa-current'),
      flex: flexHeaderHtml(
        'flex-header__nav-link flex-header__nav-link--current',
        'page',
      ),
    },
    {
      name: 'nav link hover state shows accent indicator',
      uswds: uswdsHeaderHtml('usa-nav__link'),
      flex: flexHeaderHtml('flex-header__nav-link'),
      interaction: {
        action: 'hover',
        uswdsSelector: '[data-testid="target"]',
        flexSelector: '[data-testid="target"]',
      },
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Header Test</h1>
    <flex-header class="flex-header">
      <div class="flex-header__inner">
        <div class="flex-header__logo">
          <a href="/" class="flex-header__logo-link">
            <span class="flex-header__logo-text">Forms Lab</span>
          </a>
        </div>
        <button type="button" class="flex-header__menu-btn" aria-expanded="false" aria-controls="header-nav">Menu</button>
        <nav class="flex-header__nav" id="header-nav" aria-label="Primary navigation">
          <button type="button" class="flex-header__close-btn" aria-controls="header-nav">Close</button>
          <ul class="flex-header__nav-list">
            <li class="flex-header__nav-item">
              <a href="/catalog" class="flex-header__nav-link flex-header__nav-link--current" aria-current="page">Catalog</a>
            </li>
            <li class="flex-header__nav-item">
              <a href="/catalog/design-system" class="flex-header__nav-link">Design System</a>
            </li>
          </ul>
        </nav>
      </div>
    </flex-header>
  </main>`,
  behavior: [
    {
      description:
        'Menu button click opens mobile nav overlay with aria-expanded="true"',
      tested: true,
    },
    {
      description:
        'Close button click hides nav, restores scroll, returns focus to menu button',
      tested: true,
    },
    {
      description: 'Escape key closes nav if open',
      tested: true,
    },
    {
      description: 'Overlay click closes nav',
      tested: true,
    },
    {
      description:
        'Resize across breakpoint while nav is open resets mobile nav state',
      tested: true,
    },
    {
      description:
        'User-menu trigger click toggles aria-expanded and the panel hidden attribute',
      tested: true,
    },
    {
      description:
        'Escape key closes the user menu and returns focus to the trigger',
      tested: true,
    },
    {
      description:
        'Outside click closes the user menu without stealing focus',
      tested: true,
    },
    {
      description:
        'Crossing to the mobile breakpoint force-closes the user menu disclosure',
      tested: true,
    },
  ],
}
