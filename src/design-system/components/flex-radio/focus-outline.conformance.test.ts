import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  renderFlexFixture,
  renderUswdsFixture,
} from '../../test-helpers/render'

/**
 * Regression tests — see the flex-checkbox focus-outline test for the full
 * explanation. Same bug pattern for radios.
 */

const FLEX_FIXTURE = `
  <fieldset>
    <legend>Options</legend>
    <div class="flex-radio">
      <input class="flex-radio__input" id="a" type="radio" name="g" />
      <label class="flex-radio__label" for="a">Option 1</label>
    </div>
    <div class="flex-radio">
      <input class="flex-radio__input" id="b" type="radio" name="g" />
      <label class="flex-radio__label" for="b">Option 2</label>
    </div>
  </fieldset>
`

const USWDS_FIXTURE = `
  <fieldset>
    <legend>Options</legend>
    <div class="usa-radio">
      <input class="usa-radio__input" id="a" type="radio" name="g" />
      <label class="usa-radio__label" for="a">Option 1</label>
    </div>
    <div class="usa-radio">
      <input class="usa-radio__input" id="b" type="radio" name="g" />
      <label class="usa-radio__label" for="b">Option 2</label>
    </div>
  </fieldset>
`

test.describe('flex-radio native-input hiding and focus outline', () => {
  test('wrapper `position` matches USWDS so outline is not clipped', async ({
    page,
  }) => {
    await renderUswdsFixture(page, USWDS_FIXTURE)
    const uswdsPosition = await page
      .locator('.usa-radio')
      .first()
      .evaluate((el) => getComputedStyle(el).position)

    await renderFlexFixture(page, FLEX_FIXTURE)
    const flexPosition = await page
      .locator('.flex-radio')
      .first()
      .evaluate((el) => getComputedStyle(el).position)

    expect(
      flexPosition,
      '.flex-radio wrapper `position` must match USWDS so adjacent sibling backgrounds do not paint over the focused radio outline.',
    ).toBe(uswdsPosition)
  })

  test('built CSS emits unconditional `left: -999em` on hidden input', async () => {
    const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf-8')
    const match = css.match(/\.flex-radio__input\s*\{([^{}]*)\}/)
    expect(
      match,
      'dist/styles.css must contain a top-level `.flex-radio__input { ... }` rule. Build the CSS before running tests.',
    ).not.toBeNull()
    const body = match![1]
    expect(
      body,
      `The main .flex-radio__input rule must include \`left: -999em\` so the native input is pushed off-screen. Got body: ${body}`,
    ).toMatch(/left\s*:\s*-999em/)
  })
})
