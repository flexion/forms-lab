import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-process-list',
  reference: 'https://designsystem.digital.gov/components/process-list/',
  mapping: [
    {
      uswds: 'usa-process-list',
      flex: '.flex-process-list',
      notes: 'Base process list (ordered list)',
    },
    {
      uswds: 'usa-process-list__item',
      flex: '.flex-process-list__item',
      notes: 'Process list item',
    },
    {
      uswds: 'usa-process-list__heading',
      flex: '.flex-process-list__heading',
      notes: 'Step heading',
    },
  ],
  verified: ['font-family', 'font-size', 'color'],
  structuralIgnores: [
    'display',
    'position',
    'outline',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin-top',
    'margin-bottom',
    'list-style-type',
  ],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ],
  intentionalDifferences: [
    {
      property: 'border-left-color',
      ours: 'var(--flex-blue-10) (#d9e8f6)',
      uswds: '#d9e8f6',
      reason: 'Same color expressed via design token rather than hex literal.',
    },
  ],
  fixtures: [
    {
      name: 'process list structure and typography match USWDS',
      uswds: `<ol class="usa-process-list" data-testid="target">
        <li class="usa-process-list__item">
          <h4 class="usa-process-list__heading">Step heading</h4>
          <p>Step description and instructions.</p>
        </li>
        <li class="usa-process-list__item">
          <h4 class="usa-process-list__heading">Another step</h4>
          <p>More description.</p>
        </li>
      </ol>`,
      flex: `<ol class="flex-process-list" data-testid="target">
        <li class="flex-process-list__item">
          <h4 class="flex-process-list__heading">Step heading</h4>
          <p>Step description and instructions.</p>
        </li>
        <li class="flex-process-list__item">
          <h4 class="flex-process-list__heading">Another step</h4>
          <p>More description.</p>
        </li>
      </ol>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Process List Test</h1>
    <ol class="flex-process-list">
      <li class="flex-process-list__item">
        <h4 class="flex-process-list__heading">Start a process</h4>
        <p>Decide on the type of process and gather information.</p>
      </li>
      <li class="flex-process-list__item">
        <h4 class="flex-process-list__heading">Complete the process</h4>
        <p>Review your submission and wait for confirmation.</p>
      </li>
    </ol>
  </main>`,
  behavior: [
    {
      description: 'Numbers rendered via CSS counter-increment',
      tested: true,
    },
    {
      description: 'Vertical line connects numbered circles',
      tested: true,
    },
    {
      description: 'Accessibility audit passes',
      tested: true,
    },
  ],
}
