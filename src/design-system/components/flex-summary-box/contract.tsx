/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

const headingText = 'Key information'
const keyPoints = (
  <ul>
    <li>First key point</li>
    <li>Second key point</li>
  </ul>
)

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-summary-box',
  reference: 'https://designsystem.digital.gov/components/summary-box/',
  mapping: [
    {
      uswds: 'usa-summary-box',
      flex: '.flex-summary-box',
      notes: 'Base summary box class',
    },
    {
      uswds: 'usa-summary-box__heading',
      flex: '.flex-summary-box__heading',
      notes: 'Summary box heading',
    },
    {
      uswds: 'usa-summary-box__text',
      flex: '.flex-summary-box__text',
      notes: 'Summary box text container',
    },
    {
      uswds: 'usa-summary-box__body',
      flex: '.flex-summary-box__body',
      notes: 'Summary box body wrapper',
    },
  ],
  verified: [
    'background-color',
    'border-color',
    'border-radius',
    'font-family',
    'font-size',
  ],
  structuralIgnores: [
    'display',
    'position',
    'outline',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin-top',
  ],
  extraIgnoreBoxKeys: [
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'marginTop',
  ],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'summary box background and border match USWDS',
      uswds: (
        <div
          class="usa-summary-box"
          role="region"
          aria-labelledby="summary-heading"
          data-testid="target"
        >
          <div class="usa-summary-box__body">
            <h3 class="usa-summary-box__heading" id="summary-heading">
              {headingText}
            </h3>
            <div class="usa-summary-box__text">
              <ul class="usa-list">
                <li>First key point</li>
                <li>Second key point</li>
              </ul>
            </div>
          </div>
        </div>
      ).toString(),
      flex: (
        <div
          class="flex-summary-box"
          role="region"
          aria-labelledby="summary-heading"
          data-testid="target"
        >
          <div class="flex-summary-box__body">
            <h3 class="flex-summary-box__heading" id="summary-heading">
              {headingText}
            </h3>
            <div class="flex-summary-box__text">{keyPoints}</div>
          </div>
        </div>
      ).toString(),
    },
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Summary Box Test</h1>
    <div class="flex-summary-box" role="region" aria-labelledby="sb-heading">
      <div class="flex-summary-box__body">
        <h3 class="flex-summary-box__heading" id="sb-heading">Key information</h3>
        <div class="flex-summary-box__text">
          <ul>
            <li>First key point with <a href="/example">a link</a></li>
            <li>Second key point</li>
          </ul>
        </div>
      </div>
    </div>
  </main>`,
  behavior: [
    {
      description: 'Has info-lighter background with cyan border',
      tested: true,
    },
    {
      description: 'Region role with aria-labelledby for heading',
      tested: true,
    },
    {
      description: 'Accessibility audit passes',
      tested: true,
    },
  ],
}
