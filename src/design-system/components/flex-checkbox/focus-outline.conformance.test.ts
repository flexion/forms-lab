import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  renderFlexFixture,
  renderUswdsFixture,
} from '../../test-helpers/render'

/**
 * Regression tests — two bugs that caused the native checkbox to render
 * outside the USWDS-style fake box:
 *
 * 1. Wrapper `position: relative` caused the next sibling's background
 *    to paint on top of the focused checkbox's outline.
 *
 * 2. `inset-inline-start: -999em` on the hidden input was emitted by the
 *    CSS bundler as lang-conditional `:-webkit-any()` rules that modern
 *    browsers reject, leaving the input visible at its static position
 *    on top of the fake box. The source now uses physical `left`/`right`,
 *    matching USWDS's sr-only pattern.
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

test.describe('flex-checkbox native-input hiding and focus outline', () => {
  test('wrapper `position` matches USWDS so outline is not clipped', async ({
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

  test('built CSS emits unconditional `left: -999em` on hidden input', async () => {
    // The bundler rewrites `inset-inline-start` into lang-conditional
    // `:-webkit-any()` / `:-moz-any()` rules. In the deployed build the
    // modern `:is()` fallback is dropped, leaving no rule that sets `left`
    // at all — the input paints at its static position on top of the fake
    // box. Source CSS must use physical `left`/`right` so no transform is
    // needed and the rule lands in the main declaration block unchanged.
    const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf-8')
    const match = css.match(/\.flex-checkbox__input\s*\{([^{}]*)\}/)
    expect(
      match,
      'dist/styles.css must contain a top-level `.flex-checkbox__input { ... }` rule. Build the CSS before running tests.',
    ).not.toBeNull()
    const body = match![1]
    expect(
      body,
      `The main .flex-checkbox__input rule must include \`left: -999em\` so the native input is pushed off-screen. If it only has \`position: absolute\`, the source probably uses \`inset-inline-start\` which the bundler rewrites into lang-conditional rules that may not survive. Got body: ${body}`,
    ).toMatch(/left\s*:\s*-999em/)
  })
})
