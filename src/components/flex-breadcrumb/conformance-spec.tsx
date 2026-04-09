/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

type BreadcrumbItem = { label: string; href?: string; current?: boolean }

function breadcrumbItems(items: BreadcrumbItem[], prefix: string) {
  return items.map((item) =>
    item.current ? (
      <li class={`${prefix}-breadcrumb__list-item`} aria-current="page">
        <span>{item.label}</span>
      </li>
    ) : (
      <li class={`${prefix}-breadcrumb__list-item`}>
        <a class={`${prefix}-breadcrumb__link`} href={item.href}>
          {item.label}
        </a>
      </li>
    ),
  )
}

const navItems: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Catalog', href: '/catalog' },
  { label: 'Current Page', current: true },
]

const linkItems: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Current', current: true },
]

export const spec: ConformanceSpec = {
  component: 'flex-breadcrumb',
  reference: 'https://designsystem.digital.gov/components/breadcrumb/',
  mapping: [
    {
      uswds: 'usa-breadcrumb',
      flex: '.flex-breadcrumb',
      notes: 'Breadcrumb nav wrapper',
    },
    {
      uswds: 'usa-breadcrumb__list',
      flex: '.flex-breadcrumb__list',
      notes: 'Ordered list of breadcrumb items',
    },
    {
      uswds: 'usa-breadcrumb__list-item',
      flex: '.flex-breadcrumb__list-item',
      notes: 'Individual breadcrumb item',
    },
    {
      uswds: 'usa-breadcrumb__link',
      flex: '.flex-breadcrumb__link',
      notes: 'Breadcrumb link',
    },
    {
      uswds: 'usa-breadcrumb--wrap',
      flex: 'data-variant="wrap"',
      notes: 'Wrap variant — items wrap instead of truncating',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'padding-top',
    'padding-bottom',
    'list-style-type',
    'display',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'breadcrumb nav matches usa-breadcrumb',
      uswds: (
        <div>
          <nav
            class="usa-breadcrumb"
            aria-label="Breadcrumbs"
            data-testid="target"
          >
            <ol class="usa-breadcrumb__list">
              {breadcrumbItems(navItems, 'usa')}
            </ol>
          </nav>
        </div>
      ).toString(),
      flex: (
        <div>
          <nav
            class="flex-breadcrumb"
            aria-label="Breadcrumbs"
            data-testid="target"
          >
            <ol class="flex-breadcrumb__list">
              {breadcrumbItems(navItems, 'flex')}
            </ol>
          </nav>
        </div>
      ).toString(),
    },
    {
      name: 'breadcrumb link matches usa-breadcrumb__link',
      uswds: (
        <nav class="usa-breadcrumb" aria-label="Breadcrumbs">
          <ol class="usa-breadcrumb__list">
            <li class="usa-breadcrumb__list-item">
              <a
                class="usa-breadcrumb__link"
                href="/"
                data-testid="target"
              >
                Home
              </a>
            </li>
            <li class="usa-breadcrumb__list-item" aria-current="page">
              <span>Current</span>
            </li>
          </ol>
        </nav>
      ).toString(),
      flex: (
        <nav class="flex-breadcrumb" aria-label="Breadcrumbs">
          <ol class="flex-breadcrumb__list">
            <li class="flex-breadcrumb__list-item">
              <a
                class="flex-breadcrumb__link"
                href="/"
                data-testid="target"
              >
                Home
              </a>
            </li>
            <li class="flex-breadcrumb__list-item" aria-current="page">
              <span>Current</span>
            </li>
          </ol>
        </nav>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Breadcrumb Test</h1>
    <nav class="flex-breadcrumb" aria-label="Breadcrumbs">
      <ol class="flex-breadcrumb__list">
        <li class="flex-breadcrumb__list-item">
          <a class="flex-breadcrumb__link" href="/">Home</a>
        </li>
        <li class="flex-breadcrumb__list-item">
          <a class="flex-breadcrumb__link" href="/catalog">Catalog</a>
        </li>
        <li class="flex-breadcrumb__list-item" aria-current="page">
          <span>Current Page</span>
        </li>
      </ol>
    </nav>
  </main>`,
  behavior: [
    {
      description: 'Separator icon appears between items via CSS ::after',
      tested: false,
    },
    {
      description: 'Wrap variant allows items to wrap to next line',
      tested: false,
    },
    {
      description: 'Last item is plain text with aria-current="page"',
      tested: false,
    },
  ],
}
