import { expect, test } from '@playwright/test'
import {
  renderFlexFixture,
  renderUswdsFixture,
} from '../../test-helpers/render'

/**
 * Regression test — wrapper `position` must match USWDS so a focused
 * checkbox's outline is not clipped by the next sibling's background.
 *
 * When `.flex-checkbox` was `position: relative`, each wrapper painted in
 * the "positioned descendants" stacking step in document order. The
 * following sibling's background then painted on top of the previous
 * checkbox's focus outline where that outline extended past the fake box.
 * USWDS uses `position: static` on `.usa-checkbox`, which puts the
 * wrapper's background in an earlier paint step so positioned descendants
 * (including the label's ::before outline) always paint on top.
 */

const FLEX_FIXTURE = `
  <fieldset>
    <legend>Options</legend>
    <div class="flex-checkbox">
      <input class="flex-checkbox__input" id="a" type="checkbox" />
      <label class="flex-checkbox__label" for="a">Option 1</label>
    </div>
    <div class="flex-checkbox">
      <input class="flex-checkbox__input" id="b" type="checkbox" />
      <label class="flex-checkbox__label" for="b">Option 2</label>
    </div>
  </fieldset>
`

const USWDS_FIXTURE = `
  <fieldset>
    <legend>Options</legend>
    <div class="usa-checkbox">
      <input class="usa-checkbox__input" id="a" type="checkbox" />
      <label class="usa-checkbox__label" for="a">Option 1</label>
    </div>
    <div class="usa-checkbox">
      <input class="usa-checkbox__input" id="b" type="checkbox" />
      <label class="usa-checkbox__label" for="b">Option 2</label>
    </div>
  </fieldset>
`

test.describe('flex-checkbox focus outline clipping', () => {
  test('wrapper uses same `position` as USWDS so outline is not clipped', async ({
    page,
  }) => {
    await renderUswdsFixture(page, USWDS_FIXTURE)
    const uswdsPosition = await page
      .locator('.usa-checkbox')
      .first()
      .evaluate((el) => getComputedStyle(el).position)

    await renderFlexFixture(page, FLEX_FIXTURE)
    const flexPosition = await page
      .locator('.flex-checkbox')
      .first()
      .evaluate((el) => getComputedStyle(el).position)

    expect(
      flexPosition,
      '.flex-checkbox wrapper `position` must match USWDS so adjacent sibling backgrounds do not paint over the focused checkbox outline.',
    ).toBe(uswdsPosition)
  })
})
