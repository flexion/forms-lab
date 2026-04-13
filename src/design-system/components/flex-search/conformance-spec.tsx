/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

const labelText = 'Search'
const submitText = 'Search'

function searchFormFixture(
  name: string,
  opts: { uswdsId: string; flexId: string; targetOn: 'form' | 'input' },
) {
  const uswdsFormAttrs: Record<string, string> = {
    class: 'usa-search',
    role: 'search',
  }
  const flexFormAttrs: Record<string, string> = {
    class: 'flex-search',
    role: 'search',
  }

  if (opts.targetOn === 'form') {
    uswdsFormAttrs['data-testid'] = 'target'
    flexFormAttrs['data-testid'] = 'target'
  }

  const uswdsInputAttrs: Record<string, string> = {
    class: 'usa-input',
    id: opts.uswdsId,
    type: 'search',
    name: 'search',
  }
  const flexInputAttrs: Record<string, string> = {
    class: 'flex-search__input',
    id: opts.flexId,
    type: 'search',
    name: 'search',
  }

  if (opts.targetOn === 'input') {
    uswdsInputAttrs['data-testid'] = 'target'
    flexInputAttrs['data-testid'] = 'target'
  }

  const uswdsForm = (
    <form {...uswdsFormAttrs}>
      <label class="usa-sr-only" for={opts.uswdsId}>
        {labelText}
      </label>
      <input {...uswdsInputAttrs} />
      <button class="usa-button" type="submit">
        {opts.targetOn === 'form' ? (
          <span class="usa-search__submit-text">{submitText}</span>
        ) : (
          submitText
        )}
      </button>
    </form>
  )

  const flexForm = (
    <form {...flexFormAttrs}>
      <label class="flex-search__label" for={opts.flexId}>
        {labelText}
      </label>
      <input {...flexInputAttrs} />
      <button class="flex-search__submit" type="submit">
        {opts.targetOn === 'form' ? (
          <span class="flex-search__submit-text">{submitText}</span>
        ) : (
          submitText
        )}
      </button>
    </form>
  )

  return {
    name,
    uswds: (opts.targetOn === 'form' ? (
      <div>{uswdsForm}</div>
    ) : (
      uswdsForm
    )).toString(),
    flex: (opts.targetOn === 'form' ? (
      <div>{flexForm}</div>
    ) : (
      flexForm
    )).toString(),
  }
}

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
    searchFormFixture('search form matches usa-search', {
      uswdsId: 'search-uswds',
      flexId: 'search-flex',
      targetOn: 'form',
    }),
    searchFormFixture('search input matches usa-search input', {
      uswdsId: 'search-uswds2',
      flexId: 'search-flex2',
      targetOn: 'input',
    }),
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
