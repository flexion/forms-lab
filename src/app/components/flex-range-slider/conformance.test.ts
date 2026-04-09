import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runVisualConformance } from '../../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../../lib/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance
runVisualConformance(spec)

// --- Custom behavioral tests ---

test.describe('flex-range-slider behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-range-slider'))
  }

  test('initial value is displayed', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-range-slider>
        <label class="flex-label" for="rating">Rating</label>
        <div class="flex-range-slider__wrapper">
          <input class="flex-range-slider__input" id="rating" name="rating" type="range" min="0" max="100" value="50" step="1">
          <span class="flex-range-slider__value" aria-live="polite">50</span>
        </div>
      </flex-range-slider>
    `,
    )

    const valueDisplay = page.locator('.flex-range-slider__value')
    await expect(valueDisplay).toHaveText('50')
  })

  test('value display updates on input change', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-range-slider>
        <label class="flex-label" for="rating">Rating</label>
        <div class="flex-range-slider__wrapper">
          <input class="flex-range-slider__input" id="rating" name="rating" type="range" min="0" max="100" value="50" step="1">
          <span class="flex-range-slider__value" aria-live="polite">50</span>
        </div>
      </flex-range-slider>
    `,
    )

    const input = page.locator('.flex-range-slider__input')
    const valueDisplay = page.locator('.flex-range-slider__value')

    await input.fill('75')
    await expect(valueDisplay).toHaveText('75')
  })

  test('slider works with custom min/max/step', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-range-slider>
        <label class="flex-label" for="temp">Temperature</label>
        <div class="flex-range-slider__wrapper">
          <input class="flex-range-slider__input" id="temp" name="temp" type="range" min="0" max="200" value="100" step="10">
          <span class="flex-range-slider__value" aria-live="polite">100</span>
        </div>
      </flex-range-slider>
    `,
    )

    const input = page.locator('.flex-range-slider__input')
    const valueDisplay = page.locator('.flex-range-slider__value')

    await expect(valueDisplay).toHaveText('100')

    await input.fill('150')
    await expect(valueDisplay).toHaveText('150')
  })
})

test.describe('flex-range-slider accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Range Slider Test</h1>
        <flex-range-slider>
          <label class="flex-label" for="rating">Rating</label>
          <div class="flex-range-slider__wrapper">
            <input class="flex-range-slider__input" id="rating" name="rating" type="range" min="0" max="100" value="50" step="1">
            <span class="flex-range-slider__value" aria-live="polite">50</span>
          </div>
        </flex-range-slider>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Range Slider Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
