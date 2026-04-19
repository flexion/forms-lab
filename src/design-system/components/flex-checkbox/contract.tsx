/** @jsxImportSource hono/jsx */
import type { UswdsContract } from '../../contract/types'

const labelText = 'Option'
const tileLabelText = 'Tile'

function checkboxFixture(
  name: string,
  opts: { id: string; label: string; tile?: boolean },
) {
  return {
    name,
    uswds: (
      <div class="usa-checkbox">
        <input
          class={`usa-checkbox__input${opts.tile ? ' usa-checkbox__input--tile' : ''}`}
          id={opts.id}
          type="checkbox"
          name="test"
          value={opts.id === 'cb1' ? '1' : '2'}
        />
        <label class="usa-checkbox__label" for={opts.id} data-testid="target">
          {opts.label}
        </label>
      </div>
    ).toString(),
    flex: (
      <div class="flex-checkbox" data-variant={opts.tile ? 'tile' : undefined}>
        <input
          class="flex-checkbox__input"
          id={opts.id}
          type="checkbox"
          name="test"
          value={opts.id === 'cb1' ? '1' : '2'}
        />
        <label class="flex-checkbox__label" for={opts.id} data-testid="target">
          {opts.label}
        </label>
      </div>
    ).toString(),
  }
}

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-checkbox',
  reference: 'https://designsystem.digital.gov/components/checkbox/',
  mapping: [
    {
      uswds: 'usa-checkbox',
      flex: '.flex-checkbox',
      notes: 'Base checkbox wrapper',
    },
    {
      uswds: 'usa-checkbox__input',
      flex: '.flex-checkbox__input',
      notes: 'Hidden native checkbox input',
    },
    {
      uswds: 'usa-checkbox__label',
      flex: '.flex-checkbox__label',
      notes: 'Visible label with pseudo-element indicators',
    },
    {
      uswds: 'usa-checkbox__input--tile',
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
    checkboxFixture('default checkbox label matches usa-checkbox__label', {
      id: 'cb1',
      label: labelText,
    }),
    checkboxFixture(
      'tile variant label matches usa-checkbox__input--tile label',
      { id: 'cb2', label: tileLabelText, tile: true },
    ),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Checkbox Test</h1>
    <fieldset>
      <legend>Options</legend>
      <div class="flex-checkbox">
        <input class="flex-checkbox__input" id="cb-a" type="checkbox" name="opts" value="a">
        <label class="flex-checkbox__label" for="cb-a" data-testid="target">Option A</label>
      </div>
      <div class="flex-checkbox">
        <input class="flex-checkbox__input" id="cb-b" type="checkbox" name="opts" value="b" disabled>
        <label class="flex-checkbox__label" for="cb-b">Disabled B</label>
      </div>
      <div class="flex-checkbox" data-variant="tile">
        <input class="flex-checkbox__input" id="cb-c" type="checkbox" name="opts" value="c">
        <label class="flex-checkbox__label" for="cb-c">Tile C</label>
      </div>
    </fieldset>
  </main>`,
  behavior: [
    {
      description: 'Focus ring visible on keyboard focus',
      tested: false,
    },
    {
      description: 'Checked state shows checkmark indicator',
      tested: false,
    },
    {
      description: 'Disabled state prevents interaction',
      tested: false,
    },
    {
      description: 'Indeterminate state shows dash indicator',
      tested: false,
    },
  ],
}
