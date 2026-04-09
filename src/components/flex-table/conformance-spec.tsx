/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const tableHeaders = (
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Value</th>
    </tr>
  </thead>
)

const twoRowBody = (
  <tbody>
    <tr>
      <td>Alpha</td>
      <td>1</td>
    </tr>
    <tr>
      <td>Beta</td>
      <td>2</td>
    </tr>
  </tbody>
)

const oneRowBody = (
  <tbody>
    <tr>
      <td>Alpha</td>
      <td>1</td>
    </tr>
  </tbody>
)

const singleColHeaders = (
  <thead>
    <tr>
      <th scope="col">Name</th>
    </tr>
  </thead>
)

const singleColBody = (
  <tbody>
    <tr>
      <td data-testid="target">Alpha</td>
    </tr>
  </tbody>
)

function tableFixture(
  name: string,
  opts: {
    uswdsClass: string
    flexClass: string
    flexAttrs?: Record<string, string | boolean>
    headers: unknown
    body: unknown
    targetOnTable?: boolean
    thTarget?: boolean
    wrapper?: boolean
  },
) {
  const uswdsAttrs: Record<string, string> = { class: opts.uswdsClass }
  const flexAttrs: Record<string, string> = { class: opts.flexClass }
  if (opts.flexAttrs) Object.assign(flexAttrs, opts.flexAttrs)
  if (opts.targetOnTable) {
    uswdsAttrs['data-testid'] = 'target'
    flexAttrs['data-testid'] = 'target'
  }

  const uswdsTable = (
    <table {...uswdsAttrs}>
      {opts.headers}
      {opts.body}
    </table>
  )
  const flexTable = (
    <table {...flexAttrs}>
      {opts.headers}
      {opts.body}
    </table>
  )

  return {
    name,
    uswds: opts.wrapper
      ? (<div>{uswdsTable}</div>).toString()
      : uswdsTable.toString(),
    flex: opts.wrapper
      ? (<div>{flexTable}</div>).toString()
      : flexTable.toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-table',
  reference: 'https://designsystem.digital.gov/components/table/',
  mapping: [
    {
      uswds: 'usa-table',
      flex: '.flex-table',
      notes: 'Base table class',
    },
    {
      uswds: 'usa-table--borderless',
      flex: 'data-variant="borderless"',
      notes: 'Borderless variant',
    },
    {
      uswds: 'usa-table--striped',
      flex: 'data-striped',
      notes: 'Alternating row backgrounds',
    },
    {
      uswds: 'usa-table--compact',
      flex: 'data-compact',
      notes: 'Reduced cell padding',
    },
    {
      uswds: 'usa-table-container--scrollable',
      flex: '.flex-table__container[data-scrollable]',
      notes: 'Scrollable table wrapper',
    },
    {
      uswds: 'usa-table--stacked',
      flex: 'data-stacked',
      notes: 'Responsive stacking on mobile',
    },
    {
      uswds: 'usa-table--stacked-header',
      flex: 'data-stacked-header',
      notes: 'Stacked with header column visible',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'border-collapse',
    'color',
    'text-align',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'background-color',
  ],
  structuralIgnores: ['margin-top', 'margin-bottom'],
  intentionalDifferences: [
    {
      property: 'border-color',
      ours: 'var(--flex-color-text)',
      uswds: '#1b1b1b',
      reason: 'We use semantic token that resolves to same value in light mode',
    },
  ],
  fixtures: [
    tableFixture('default table matches usa-table', {
      uswdsClass: 'usa-table',
      flexClass: 'flex-table',
      headers: tableHeaders,
      body: twoRowBody,
      targetOnTable: true,
      wrapper: true,
    }),
    {
      name: 'table th matches usa-table th',
      uswds: (
        <table class="usa-table">
          <thead>
            <tr>
              <th scope="col" data-testid="target">
                Name
              </th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          {oneRowBody}
        </table>
      ).toString(),
      flex: (
        <table class="flex-table">
          <thead>
            <tr>
              <th scope="col" data-testid="target">
                Name
              </th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          {oneRowBody}
        </table>
      ).toString(),
    },
    tableFixture('table td matches usa-table td', {
      uswdsClass: 'usa-table',
      flexClass: 'flex-table',
      headers: singleColHeaders,
      body: singleColBody,
    }),
    tableFixture('compact table td matches usa-table--compact td', {
      uswdsClass: 'usa-table usa-table--compact',
      flexClass: 'flex-table',
      flexAttrs: { 'data-compact': true },
      headers: singleColHeaders,
      body: singleColBody,
    }),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Table Test</h1>
    <table class="flex-table">
      <caption>Sample data table</caption>
      <thead>
        <tr><th scope="col">Name</th><th scope="col">Value</th><th scope="col">Status</th></tr>
      </thead>
      <tbody>
        <tr><td>Alpha</td><td>1</td><td>Active</td></tr>
        <tr><td>Beta</td><td>2</td><td>Inactive</td></tr>
      </tbody>
    </table>
  </main>`,
  behavior: [],
}
