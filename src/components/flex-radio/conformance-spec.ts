import type { ConformanceSpec } from '../conformance-types'

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
    {
      name: 'default radio label matches usa-radio__label',
      uswds:
        '<div class="usa-radio"><input class="usa-radio__input" id="r1" type="radio" name="test" value="1"><label class="usa-radio__label" for="r1" data-testid="target">Option</label></div>',
      flex: '<div class="flex-radio"><input class="flex-radio__input" id="r1" type="radio" name="test" value="1"><label class="flex-radio__label" for="r1" data-testid="target">Option</label></div>',
    },
    {
      name: 'tile variant label matches usa-radio__input--tile label',
      uswds:
        '<div class="usa-radio"><input class="usa-radio__input usa-radio__input--tile" id="r2" type="radio" name="test" value="2"><label class="usa-radio__label" for="r2" data-testid="target">Tile</label></div>',
      flex: '<div class="flex-radio" data-variant="tile"><input class="flex-radio__input" id="r2" type="radio" name="test" value="2"><label class="flex-radio__label" for="r2" data-testid="target">Tile</label></div>',
    },
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
