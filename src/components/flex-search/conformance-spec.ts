import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-search',
  reference: 'https://designsystem.digital.gov/components/search/',
  mapping: [
    {
      uswds: 'usa-search',
      flex: '.flex-search',
      notes: 'Search form wrapper',
    },
    {
      uswds: 'usa-search [type=search]',
      flex: '.flex-search__input',
      notes: 'Search input field',
    },
    {
      uswds: 'usa-search [type=submit]',
      flex: '.flex-search__submit',
      notes: 'Search submit button',
    },
    {
      uswds: 'usa-search--big',
      flex: 'data-size="big"',
      notes: 'Big search variant',
    },
    {
      uswds: 'usa-search--small',
      flex: 'data-size="small"',
      notes: 'Small search variant',
    },
  ],
  verified: ['font-family', 'font-size', 'line-height', 'display', 'height'],
  structuralIgnores: [],
  intentionalDifferences: [],
  extraIgnoreAttributes: ['id', 'for'],
  fixtures: [
    {
      name: 'search form matches usa-search',
      uswds: `<div><form class="usa-search" role="search" data-testid="target"><label class="usa-sr-only" for="search-uswds">Search</label><input class="usa-input" id="search-uswds" type="search" name="search"><button class="usa-button" type="submit"><span class="usa-search__submit-text">Search</span></button></form></div>`,
      flex: `<div><form class="flex-search" role="search" data-testid="target"><label class="flex-search__label" for="search-flex">Search</label><input class="flex-search__input" id="search-flex" type="search" name="search"><button class="flex-search__submit" type="submit"><span class="flex-search__submit-text">Search</span></button></form></div>`,
    },
    {
      name: 'search input matches usa-search input',
      uswds: `<form class="usa-search" role="search"><label class="usa-sr-only" for="search-uswds2">Search</label><input class="usa-input" id="search-uswds2" type="search" name="search" data-testid="target"><button class="usa-button" type="submit">Search</button></form>`,
      flex: `<form class="flex-search" role="search"><label class="flex-search__label" for="search-flex2">Search</label><input class="flex-search__input" id="search-flex2" type="search" name="search" data-testid="target"><button class="flex-search__submit" type="submit">Search</button></form>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Search Test</h1>
    <form class="flex-search" role="search">
      <label class="flex-search__label" for="search-a11y">Search</label>
      <input class="flex-search__input" id="search-a11y" type="search" name="search">
      <button class="flex-search__submit" type="submit">
        <span class="flex-search__submit-text">Search</span>
      </button>
    </form>
  </main>`,
  behavior: [
    {
      description: 'Form submits on button click or enter key',
      tested: false,
    },
    {
      description: 'Magnifier icon visible in submit button via CSS mask-image',
      tested: false,
    },
    {
      description: 'Big size has larger input and button',
      tested: false,
    },
    {
      description: 'Small size has compact input and icon-only button',
      tested: false,
    },
  ],
}
