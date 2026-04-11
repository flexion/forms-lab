import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runVisualConformance } from '../../test-helpers/conformance-runner'
import { renderFlexFixture } from '../../test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance
runVisualConformance(spec)

// --- Date range picker HTML fixture ---
const RANGE_HTML = `
  <flex-date-range-picker>
    <div class="flex-date-range-picker__range-start">
      <flex-date-picker>
        <label class="flex-label" for="start">Start date</label>
        <div class="flex-date-picker__wrapper">
          <input class="flex-input flex-date-picker__external-input" id="start" name="start"
            type="text" placeholder="mm/dd/yyyy">
          <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Cal</button>
          <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
            <div class="flex-date-picker__calendar-header">
              <button type="button" class="flex-date-picker__nav flex-date-picker__nav--prev" aria-label="Previous month">Prev</button>
              <button type="button" class="flex-date-picker__month-label" aria-label="Select month"></button>
              <button type="button" class="flex-date-picker__nav flex-date-picker__nav--next" aria-label="Next month">Next</button>
            </div>
            <table class="flex-date-picker__table" role="presentation">
              <thead><tr><th abbr="Sunday">Su</th><th abbr="Monday">Mo</th><th abbr="Tuesday">Tu</th><th abbr="Wednesday">We</th><th abbr="Thursday">Th</th><th abbr="Friday">Fr</th><th abbr="Saturday">Sa</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </flex-date-picker>
    </div>
    <div class="flex-date-range-picker__range-end">
      <flex-date-picker>
        <label class="flex-label" for="end">End date</label>
        <div class="flex-date-picker__wrapper">
          <input class="flex-input flex-date-picker__external-input" id="end" name="end"
            type="text" placeholder="mm/dd/yyyy">
          <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Cal</button>
          <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
            <div class="flex-date-picker__calendar-header">
              <button type="button" class="flex-date-picker__nav flex-date-picker__nav--prev" aria-label="Previous month">Prev</button>
              <button type="button" class="flex-date-picker__month-label" aria-label="Select month"></button>
              <button type="button" class="flex-date-picker__nav flex-date-picker__nav--next" aria-label="Next month">Next</button>
            </div>
            <table class="flex-date-picker__table" role="presentation">
              <thead><tr><th abbr="Sunday">Su</th><th abbr="Monday">Mo</th><th abbr="Tuesday">Tu</th><th abbr="Wednesday">We</th><th abbr="Thursday">Th</th><th abbr="Friday">Fr</th><th abbr="Saturday">Sa</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </flex-date-picker>
    </div>
  </flex-date-range-picker>
`

test.describe('flex-date-range-picker behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(
      () =>
        customElements.get('flex-date-picker') &&
        customElements.get('flex-date-range-picker'),
    )
  }

  test('contains two date picker instances', async ({ page }) => {
    await renderWithJs(page, RANGE_HTML)
    const pickers = page.locator('flex-date-picker')
    await expect(pickers).toHaveCount(2)
  })

  test('selecting start date updates end picker min-date constraint', async ({
    page,
  }) => {
    await renderWithJs(page, RANGE_HTML)

    // Open start picker and select a date
    const startToggle = page.locator(
      '.flex-date-range-picker__range-start .flex-date-picker__button',
    )
    await startToggle.click()

    // Pick the 15th (or whatever in-month day is available)
    const startDay = page.locator(
      '.flex-date-range-picker__range-start .flex-date-picker__day:not(:disabled):not(.flex-date-picker__day--outside)',
    )
    // Click on a day around the middle of the month
    const count = await startDay.count()
    const middleIndex = Math.floor(count / 2)
    await startDay.nth(middleIndex).click()

    // Now open end picker — days before the selected start date should be disabled
    const endToggle = page.locator(
      '.flex-date-range-picker__range-end .flex-date-picker__button',
    )
    await endToggle.click()

    // The end picker should have some disabled days (the ones before the start date)
    const disabledEndDays = page.locator(
      '.flex-date-range-picker__range-end .flex-date-picker__day:disabled:not(.flex-date-picker__day--outside)',
    )
    const disabledCount = await disabledEndDays.count()
    expect(disabledCount).toBeGreaterThan(0)
  })

  test('selecting end date updates start picker max-date constraint', async ({
    page,
  }) => {
    await renderWithJs(page, RANGE_HTML)

    // Open end picker and select a date early in the month
    const endToggle = page.locator(
      '.flex-date-range-picker__range-end .flex-date-picker__button',
    )
    await endToggle.click()

    // Pick an early day (around day 5)
    const endDay = page.locator(
      '.flex-date-range-picker__range-end .flex-date-picker__day:not(:disabled):not(.flex-date-picker__day--outside)',
    )
    // Click on a day near the middle of the month
    const count = await endDay.count()
    const middleIndex = Math.floor(count / 2)
    await endDay.nth(middleIndex).click()

    // Now open start picker — days after the selected end date should be disabled
    const startToggle = page.locator(
      '.flex-date-range-picker__range-start .flex-date-picker__button',
    )
    await startToggle.click()

    // The start picker should have some disabled days (ones after end date)
    const disabledStartDays = page.locator(
      '.flex-date-range-picker__range-start .flex-date-picker__day:disabled:not(.flex-date-picker__day--outside)',
    )
    const disabledCount = await disabledStartDays.count()
    expect(disabledCount).toBeGreaterThan(0)
  })
})

test.describe('flex-date-range-picker accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Date Range Picker Test</h1>
        <flex-date-range-picker>
          <div class="flex-date-range-picker__range-start">
            <flex-date-picker>
              <label class="flex-label" for="a11y-start">Start date</label>
              <div class="flex-date-picker__wrapper">
                <input class="flex-input flex-date-picker__external-input" id="a11y-start" name="start" type="text" placeholder="mm/dd/yyyy">
                <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Toggle</button>
                <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
                  <table class="flex-date-picker__table" role="presentation"><thead><tr><th>Su</th></tr></thead><tbody></tbody></table>
                </div>
              </div>
            </flex-date-picker>
          </div>
          <div class="flex-date-range-picker__range-end">
            <flex-date-picker>
              <label class="flex-label" for="a11y-end">End date</label>
              <div class="flex-date-picker__wrapper">
                <input class="flex-input flex-date-picker__external-input" id="a11y-end" name="end" type="text" placeholder="mm/dd/yyyy">
                <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Toggle</button>
                <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
                  <table class="flex-date-picker__table" role="presentation"><thead><tr><th>Su</th></tr></thead><tbody></tbody></table>
                </div>
              </div>
            </flex-date-picker>
          </div>
        </flex-date-range-picker>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Date Range Picker Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
