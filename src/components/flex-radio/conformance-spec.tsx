/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const labelText = 'Option'
const tileLabelText = 'Tile'

function radioFixture(
  name: string,
  opts: { id: string; label: string; tile?: boolean },
) {
  return {
    name,
    uswds: (
      <div class="usa-radio">
        <input
          class={`usa-radio__input${opts.tile ? ' usa-radio__input--tile' : ''}`}
          id={opts.id}
          type="radio"
          name="test"
          value={opts.id === 'r1' ? '1' : '2'}
        />
        <label class="usa-radio__label" for={opts.id} data-testid="target">
          {opts.label}
        </label>
      </div>
    ).toString(),
    flex: (
      <div class="flex-radio" data-variant={opts.tile ? 'tile' : undefined}>
        <input
          class="flex-radio__input"
          id={opts.id}
          type="radio"
          name="test"
          value={opts.id === 'r1' ? '1' : '2'}
        />
        <label class="flex-radio__label" for={opts.id} data-testid="target">
          {opts.label}
        </label>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-radio',
  reference: 'https://designsystem.digital.gov/components/radio-buttons/',
  mapping: [
    {
      uswds: 'usa-radio',
      flex: '.flex-radio',
      notes: 'Base radio wrapper',
    },
    {
      uswds: 'usa-radio__input',
      flex: '.flex-radio__input',
      notes: 'Hidden native radio input',
    },
    {
      uswds: 'usa-radio__label',
      flex: '.flex-radio__label',
      notes: 'Visible label with pseudo-element indicators',
    },
    {
      uswds: 'usa-radio__input--tile',
      flex: 'data-variant="tile"',
      notes: 'Tile variant with bordered card appearance',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'cursor',
    'font-weight',
    'padding-left',
    'position',
    'display',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    radioFixture('default radio label matches usa-radio__label', {
      id: 'r1',
      label: labelText,
    }),
    radioFixture('tile variant label matches usa-radio__input--tile label', {
      id: 'r2',
      label: tileLabelText,
      tile: true,
    }),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Radio Test</h1>
    <fieldset>
      <legend>Choices</legend>
      <div class="flex-radio">
        <input class="flex-radio__input" id="r-a" type="radio" name="choices" value="a">
        <label class="flex-radio__label" for="r-a" data-testid="target">Choice A</label>
      </div>
      <div class="flex-radio">
        <input class="flex-radio__input" id="r-b" type="radio" name="choices" value="b" disabled>
        <label class="flex-radio__label" for="r-b">Disabled B</label>
      </div>
      <div class="flex-radio" data-variant="tile">
        <input class="flex-radio__input" id="r-c" type="radio" name="choices-tile" value="c">
        <label class="flex-radio__label" for="r-c">Tile C</label>
      </div>
    </fieldset>
  </main>`,
  behavior: [
    {
      description: 'Focus ring visible on keyboard focus',
      tested: false,
    },
    {
      description: 'Checked state shows filled circle indicator',
      tested: false,
    },
    {
      description: 'Disabled state prevents interaction',
      tested: false,
    },
  ],
}
