/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../../conformance/types'

function inputGroupFixture(
  name: string,
  opts: {
    inputId: string
    inputName: string
    addonText: string
    position: 'prefix' | 'suffix'
  },
) {
  const uswdsInput = (
    <input
      class="usa-input"
      id={opts.inputId}
      name={opts.inputName}
      type="text"
    />
  )
  const flexInput = (
    <input
      class="flex-input"
      id={opts.inputId}
      name={opts.inputName}
      type="text"
    />
  )

  const uswdsAddon = (
    <div class={`usa-input-${opts.position}`} aria-hidden="true">
      {opts.addonText}
    </div>
  )
  const flexAddon = (
    <div class={`flex-input-group__${opts.position}`} aria-hidden="true">
      {opts.addonText}
    </div>
  )

  return {
    name,
    uswds: (
      <div>
        <div class="usa-input-group" data-testid="target">
          {opts.position === 'prefix' ? uswdsAddon : uswdsInput}
          {opts.position === 'prefix' ? uswdsInput : uswdsAddon}
        </div>
      </div>
    ).toString(),
    flex: (
      <div>
        <div class="flex-input-group" data-testid="target">
          {opts.position === 'prefix' ? flexAddon : flexInput}
          {opts.position === 'prefix' ? flexInput : flexAddon}
        </div>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-input-prefix-suffix',
  reference: 'https://designsystem.digital.gov/components/input-prefix-suffix/',
  mapping: [
    {
      uswds: 'usa-input-group',
      flex: '.flex-input-group',
      notes: 'Input group wrapper',
    },
    {
      uswds: 'usa-input-prefix',
      flex: '.flex-input-group__prefix',
      notes: 'Prefix add-on',
    },
    {
      uswds: 'usa-input-suffix',
      flex: '.flex-input-group__suffix',
      notes: 'Suffix add-on',
    },
  ],
  verified: [
    'display',
    'align-items',
    'border-style',
    'border-width',
    'border-color',
    'height',
    'max-width',
    'font-family',
    'font-size',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    inputGroupFixture('input group with prefix matches usa-input-group', {
      inputId: 'amount',
      inputName: 'amount',
      addonText: '$',
      position: 'prefix',
    }),
    inputGroupFixture('input group with suffix matches usa-input-group', {
      inputId: 'weight',
      inputName: 'weight',
      addonText: 'lbs',
      position: 'suffix',
    }),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Input Prefix/Suffix Test</h1>
    <label class="flex-label" for="amount">Amount</label>
    <div class="flex-input-group">
      <div class="flex-input-group__prefix" aria-hidden="true">$</div>
      <input class="flex-input" id="amount" name="amount" type="text">
    </div>
    <label class="flex-label" for="weight">Weight</label>
    <div class="flex-input-group">
      <input class="flex-input" id="weight" name="weight" type="text">
      <div class="flex-input-group__suffix" aria-hidden="true">lbs</div>
    </div>
  </main>`,
  behavior: [],
}
