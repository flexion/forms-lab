import { expect, test } from '@playwright/test'
import {
  renderFlexFixture,
  renderUswdsFixture,
} from '../../test-helpers/render'

/**
 * Regression test — see the flex-checkbox focus-outline test for the full
 * explanation. Same bug pattern: wrapper `position: relative` caused the
 * next sibling's background to paint over the focused radio's outline.
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

test.describe('flex-radio focus outline clipping', () => {
  test('wrapper uses same `position` as USWDS so outline is not clipped', async ({
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
})
