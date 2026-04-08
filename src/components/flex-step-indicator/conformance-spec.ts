import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-step-indicator',
  reference: 'https://designsystem.digital.gov/components/step-indicator/',
  mapping: [
    {
      uswds: 'usa-step-indicator',
      flex: '.flex-step-indicator',
      notes: 'Base step indicator',
    },
    {
      uswds: 'usa-step-indicator__segments',
      flex: '.flex-step-indicator__segments',
      notes: 'Segments list container',
    },
    {
      uswds: 'usa-step-indicator__segment',
      flex: '.flex-step-indicator__segment',
      notes: 'Individual segment',
    },
    {
      uswds: 'usa-step-indicator__segment--complete',
      flex: 'data-state="complete"',
      notes: 'Completed step segment',
    },
    {
      uswds: 'usa-step-indicator__segment--current',
      flex: 'data-state="current"',
      notes: 'Current step segment',
    },
    {
      uswds: 'usa-step-indicator__segment-label',
      flex: '.flex-step-indicator__segment-label',
      notes: 'Segment text label',
    },
    {
      uswds: 'usa-step-indicator__header',
      flex: '.flex-step-indicator__header',
      notes: 'Header containing heading',
    },
    {
      uswds: 'usa-step-indicator__heading',
      flex: '.flex-step-indicator__heading',
      notes: 'Step heading text',
    },
    {
      uswds: 'usa-step-indicator__current-step',
      flex: '.flex-step-indicator__current-step',
      notes: 'Current step counter badge',
    },
    {
      uswds: 'usa-step-indicator--no-labels',
      flex: 'data-variant="no-labels"',
      notes: 'Hide segment labels',
    },
    {
      uswds: 'usa-step-indicator--counters',
      flex: 'data-variant="counters"',
      notes: 'Show numbered counters on segments',
    },
    {
      uswds: 'usa-step-indicator--counters-sm',
      flex: 'data-variant="small-counters"',
      notes: 'Show small numbered counters',
    },
    {
      uswds: 'usa-step-indicator--center',
      flex: 'data-variant="centered"',
      notes: 'Center-aligned labels',
    },
  ],
  verified: ['background-color', 'font-family'],
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
    'margin-left',
    'margin-right',
  ],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'marginTop',
    'marginBottom',
  ],
  intentionalDifferences: [
    {
      property: 'segment state',
      ours: 'data-state="complete|current"',
      uswds: 'BEM modifier classes (--complete, --current)',
      reason:
        'We use data attributes instead of BEM modifier classes for state, consistent with our design system conventions.',
    },
  ],
  fixtures: [
    {
      name: 'step indicator with default labels matches USWDS layout',
      uswds: `<div class="usa-step-indicator" aria-label="Progress" data-testid="target">
        <ol class="usa-step-indicator__segments">
          <li class="usa-step-indicator__segment usa-step-indicator__segment--complete">
            <span class="usa-step-indicator__segment-label">Step 1</span>
          </li>
          <li class="usa-step-indicator__segment usa-step-indicator__segment--current" aria-current="step">
            <span class="usa-step-indicator__segment-label">Step 2</span>
          </li>
          <li class="usa-step-indicator__segment">
            <span class="usa-step-indicator__segment-label">Step 3</span>
          </li>
        </ol>
        <div class="usa-step-indicator__header">
          <h4 class="usa-step-indicator__heading">
            <span class="usa-step-indicator__current-step">Step 2 of 3</span>
            <span class="usa-step-indicator__heading-text">Step title</span>
          </h4>
        </div>
      </div>`,
      flex: `<div class="flex-step-indicator" aria-label="Progress" data-testid="target">
        <ol class="flex-step-indicator__segments">
          <li class="flex-step-indicator__segment" data-state="complete">
            <span class="flex-step-indicator__segment-label">Step 1</span>
          </li>
          <li class="flex-step-indicator__segment" data-state="current" aria-current="step">
            <span class="flex-step-indicator__segment-label">Step 2</span>
          </li>
          <li class="flex-step-indicator__segment">
            <span class="flex-step-indicator__segment-label">Step 3</span>
          </li>
        </ol>
        <div class="flex-step-indicator__header">
          <h4 class="flex-step-indicator__heading">
            <span class="flex-step-indicator__current-step">Step 2 of 3</span>
            <span class="flex-step-indicator__heading-text">Step title</span>
          </h4>
        </div>
      </div>`,
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Step Indicator Test</h1>
    <div class="flex-step-indicator" aria-label="Progress">
      <ol class="flex-step-indicator__segments">
        <li class="flex-step-indicator__segment" data-state="complete">
          <span class="flex-step-indicator__segment-label">Personal info</span>
        </li>
        <li class="flex-step-indicator__segment" data-state="current" aria-current="step">
          <span class="flex-step-indicator__segment-label">Household</span>
        </li>
        <li class="flex-step-indicator__segment">
          <span class="flex-step-indicator__segment-label">Documents</span>
        </li>
      </ol>
      <div class="flex-step-indicator__header">
        <h4 class="flex-step-indicator__heading">
          <span class="flex-step-indicator__current-step">Step 2 of 3</span>
          <span class="flex-step-indicator__heading-text">Household</span>
        </h4>
      </div>
    </div>
  </main>`,
  behavior: [
    {
      description: 'Complete segments show dark navy bars',
      tested: true,
    },
    {
      description: 'Current segment shows accent blue bar',
      tested: true,
    },
    {
      description: 'Incomplete segments show gray bars',
      tested: true,
    },
    {
      description: 'aria-current="step" on current segment',
      tested: true,
    },
    {
      description: 'Accessibility audit passes',
      tested: true,
    },
  ],
}
