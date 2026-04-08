import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-pagination',
  reference: 'https://designsystem.digital.gov/components/pagination/',
  mapping: [
    {
      uswds: 'usa-pagination',
      flex: '.flex-pagination',
      notes: 'Pagination nav wrapper',
    },
    {
      uswds: 'usa-pagination__list',
      flex: '.flex-pagination__list',
      notes: 'Pagination list',
    },
    {
      uswds: 'usa-pagination__item',
      flex: '.flex-pagination__item',
      notes: 'Pagination list item',
    },
    {
      uswds: 'usa-pagination__button',
      flex: '.flex-pagination__button',
      notes: 'Page number button/link',
    },
    {
      uswds: 'usa-current (on pagination)',
      flex: '.flex-pagination__button--current',
      notes: 'Current page indicator',
    },
    {
      uswds: 'usa-pagination__overflow',
      flex: '.flex-pagination__overflow',
      notes: 'Ellipsis overflow indicator',
    },
    {
      uswds: 'usa-pagination__previous-page',
      flex: '.flex-pagination__item--previous',
      notes: 'Previous page arrow',
    },
    {
      uswds: 'usa-pagination__next-page',
      flex: '.flex-pagination__item--next',
      notes: 'Next page arrow',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'display',
    'justify-content',
    'list-style-type',
    'color',
  ],
  structuralIgnores: [],
  intentionalDifferences: [
    {
      property: 'text-decoration',
      ours: 'none',
      uswds: 'underline',
      reason:
        'USWDS inherits underline from browser default for <a> tags; we explicitly remove it for page number buttons',
    },
  ],
  fixtures: [
    {
      name: 'pagination nav matches usa-pagination',
      uswds: `<div><nav class="usa-pagination" aria-label="Pagination" data-testid="target"><ul class="usa-pagination__list"><li class="usa-pagination__item"><a href="?page=1" class="usa-pagination__button" aria-label="Page 1">1</a></li><li class="usa-pagination__item"><a href="?page=2" class="usa-pagination__button usa-current" aria-label="Page 2, current page" aria-current="page">2</a></li><li class="usa-pagination__item"><a href="?page=3" class="usa-pagination__button" aria-label="Page 3">3</a></li></ul></nav></div>`,
      flex: `<div><nav class="flex-pagination" aria-label="Pagination" data-testid="target"><ul class="flex-pagination__list"><li class="flex-pagination__item"><a href="?page=1" class="flex-pagination__button" aria-label="Page 1">1</a></li><li class="flex-pagination__item flex-pagination__item--current"><a href="?page=2" class="flex-pagination__button flex-pagination__button--current" aria-label="Page 2, current page" aria-current="page">2</a></li><li class="flex-pagination__item"><a href="?page=3" class="flex-pagination__button" aria-label="Page 3">3</a></li></ul></nav></div>`,
    },
    {
      name: 'page button matches usa-pagination__button',
      uswds: `<nav class="usa-pagination" aria-label="Pagination"><ul class="usa-pagination__list"><li class="usa-pagination__item"><a href="?page=1" class="usa-pagination__button" aria-label="Page 1" data-testid="target">1</a></li></ul></nav>`,
      flex: `<nav class="flex-pagination" aria-label="Pagination"><ul class="flex-pagination__list"><li class="flex-pagination__item"><a href="?page=1" class="flex-pagination__button" aria-label="Page 1" data-testid="target">1</a></li></ul></nav>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Pagination Test</h1>
    <nav class="flex-pagination" aria-label="Pagination">
      <ul class="flex-pagination__list">
        <li class="flex-pagination__item flex-pagination__item--previous">
          <a href="?page=1" class="flex-pagination__link" aria-label="Previous page">Previous</a>
        </li>
        <li class="flex-pagination__item">
          <a href="?page=1" class="flex-pagination__button" aria-label="Page 1">1</a>
        </li>
        <li class="flex-pagination__item flex-pagination__item--current">
          <a href="?page=2" class="flex-pagination__button flex-pagination__button--current" aria-label="Page 2, current page" aria-current="page">2</a>
        </li>
        <li class="flex-pagination__item">
          <a href="?page=3" class="flex-pagination__button" aria-label="Page 3">3</a>
        </li>
        <li class="flex-pagination__item flex-pagination__item--next">
          <a href="?page=3" class="flex-pagination__link" aria-label="Next page">Next</a>
        </li>
      </ul>
    </nav>
  </main>`,
  behavior: [
    {
      description: 'Current page is visually highlighted with dark background',
      tested: false,
    },
    {
      description: 'Overflow ellipsis shown for large page counts',
      tested: false,
    },
    {
      description: 'Previous button hidden on first page',
      tested: false,
    },
    {
      description: 'Next button hidden on last page',
      tested: false,
    },
  ],
}
