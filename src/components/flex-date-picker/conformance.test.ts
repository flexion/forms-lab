import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runVisualConformance } from '../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../lib/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance
runVisualConformance(spec)

// --- Date picker HTML fixture for behavioral tests ---
const DATE_PICKER_HTML = `
  <flex-date-picker data-min-date="2020-01-01" data-max-date="2030-12-31">
    <label class="flex-label" for="date">Date</label>
    <div class="flex-date-picker__wrapper">
      <input class="flex-input flex-date-picker__external-input" id="date" name="date"
        type="text" placeholder="mm/dd/yyyy">
      <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">
        <span>Cal</span>
      </button>
      <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
        <div class="flex-date-picker__calendar-header">
          <button type="button" class="flex-date-picker__nav flex-date-picker__nav--prev" aria-label="Previous month">Prev</button>
          <button type="button" class="flex-date-picker__month-label" aria-label="Select month"></button>
          <button type="button" class="flex-date-picker__nav flex-date-picker__nav--next" aria-label="Next month">Next</button>
        </div>
        <table class="flex-date-picker__table" role="presentation">
          <thead>
            <tr>
              <th abbr="Sunday">Su</th><th abbr="Monday">Mo</th>
              <th abbr="Tuesday">Tu</th><th abbr="Wednesday">We</th>
              <th abbr="Thursday">Th</th><th abbr="Friday">Fr</th>
              <th abbr="Saturday">Sa</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </flex-date-picker>
`

/** Parse yyyy-mm-dd as local date (not UTC) to avoid timezone day-shift issues. */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

test.describe('flex-date-picker behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-date-picker'))
  }

  test('click toggle button opens calendar popup', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const calendar = page.locator('.flex-date-picker__calendar')
    const toggleBtn = page.locator('.flex-date-picker__button')

    await expect(calendar).toBeHidden()
    await toggleBtn.click()
    await expect(calendar).toBeVisible()
  })

  test('click toggle button again closes calendar', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const calendar = page.locator('.flex-date-picker__calendar')
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()
    await expect(calendar).toBeVisible()
    await toggleBtn.click()
    await expect(calendar).toBeHidden()
  })

  test('calendar renders correct days for the month', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    // Should have day buttons in the calendar
    const days = page.locator('.flex-date-picker__day:not(:disabled)')
    const count = await days.count()
    // A month has 28-31 days; we should have at least that many enabled in-month buttons
    expect(count).toBeGreaterThanOrEqual(28)
  })

  test('previous/next month buttons navigate months', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const monthLabel = page.locator('.flex-date-picker__month-label')
    const nextBtn = page.locator('.flex-date-picker__nav--next')
    const prevBtn = page.locator('.flex-date-picker__nav--prev')

    await toggleBtn.click()
    const initialText = await monthLabel.textContent()

    await nextBtn.click()
    const afterNext = await monthLabel.textContent()
    expect(afterNext).not.toBe(initialText)

    await prevBtn.click()
    const afterPrev = await monthLabel.textContent()
    expect(afterPrev).toBe(initialText)
  })

  test('click day selects date and closes calendar', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const calendar = page.locator('.flex-date-picker__calendar')
    const input = page.locator('.flex-date-picker__external-input')

    await toggleBtn.click()

    // Click a day that is not disabled and is in the current month
    const dayBtn = page
      .locator(
        '.flex-date-picker__day:not(:disabled):not(.flex-date-picker__day--outside)',
      )
      .first()
    await dayBtn.click()

    await expect(calendar).toBeHidden()
    // Input should have a date value in mm/dd/yyyy format
    const value = await input.inputValue()
    expect(value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  test('selected date appears in input as mm/dd/yyyy', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const input = page.locator('.flex-date-picker__external-input')

    await toggleBtn.click()

    // Click a specific day
    const dayBtns = page.locator(
      '.flex-date-picker__day:not(:disabled):not(.flex-date-picker__day--outside)',
    )
    await dayBtns.first().click()

    const value = await input.inputValue()
    expect(value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  test('ArrowLeft/Right moves focus by day', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    // Get initial focused date
    const focused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const initialDate = await focused.getAttribute('data-date')

    await page.keyboard.press('ArrowRight')
    const newFocused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const newDate = await newFocused.getAttribute('data-date')
    expect(newDate).not.toBe(initialDate)

    await page.keyboard.press('ArrowLeft')
    const backFocused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const backDate = await backFocused.getAttribute('data-date')
    expect(backDate).toBe(initialDate)
  })

  test('ArrowUp/Down moves focus by week', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    const focused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const initialDate = await focused.getAttribute('data-date')
    expect(initialDate).toBeTruthy()
    const initial = parseLocalDate(initialDate as string)

    await page.keyboard.press('ArrowDown')
    const newFocused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const newDate = await newFocused.getAttribute('data-date')
    expect(newDate).toBeTruthy()
    const moved = parseLocalDate(newDate as string)

    // Should be exactly 7 days later
    const diff = (moved.getTime() - initial.getTime()) / (1000 * 60 * 60 * 24)
    expect(diff).toBe(7)
  })

  test('Home/End moves to first/last day of week', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    await page.keyboard.press('Home')
    const homeFocused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const homeDateStr = await homeFocused.getAttribute('data-date')
    expect(homeDateStr).toBeTruthy()
    const homeDate = parseLocalDate(homeDateStr as string)
    expect(homeDate.getDay()).toBe(0) // Sunday

    await page.keyboard.press('End')
    const endFocused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const endDateStr = await endFocused.getAttribute('data-date')
    expect(endDateStr).toBeTruthy()
    const endDate = parseLocalDate(endDateStr as string)
    expect(endDate.getDay()).toBe(6) // Saturday
  })

  test('PageUp/PageDown moves by month', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    const focused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const focusedDateStr = await focused.getAttribute('data-date')
    expect(focusedDateStr).toBeTruthy()
    const initialDate = parseLocalDate(focusedDateStr as string)
    const initialMonth = initialDate.getMonth()

    await page.keyboard.press('PageDown')
    const newFocused = page.locator('.flex-date-picker__day[tabindex="0"]')
    const newDateStr = await newFocused.getAttribute('data-date')
    expect(newDateStr).toBeTruthy()
    const newDate = parseLocalDate(newDateStr as string)
    expect(newDate.getMonth()).toBe((initialMonth + 1) % 12)
  })

  test('Enter selects focused date', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const calendar = page.locator('.flex-date-picker__calendar')
    const input = page.locator('.flex-date-picker__external-input')

    await toggleBtn.click()

    // Navigate to a date and press Enter
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')

    await expect(calendar).toBeHidden()
    const value = await input.inputValue()
    expect(value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  test('Escape closes calendar', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const calendar = page.locator('.flex-date-picker__calendar')

    await toggleBtn.click()
    await expect(calendar).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(calendar).toBeHidden()
  })

  test('outside click closes calendar', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const calendar = page.locator('.flex-date-picker__calendar')

    await toggleBtn.click()
    await expect(calendar).toBeVisible()

    await page.click('body', { position: { x: 10, y: 10 } })
    await expect(calendar).toBeHidden()
  })

  test('min/max date constraints disable out-of-range days', async ({
    page,
  }) => {
    // Use a picker with tight constraints
    const html = `
      <flex-date-picker data-min-date="2025-06-10" data-max-date="2025-06-20">
        <label class="flex-label" for="date">Date</label>
        <div class="flex-date-picker__wrapper">
          <input class="flex-input flex-date-picker__external-input" id="date" name="date" type="text" placeholder="mm/dd/yyyy">
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
    `
    await renderWithJs(page, html)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    // Days outside range should be disabled
    const disabledDays = page.locator('.flex-date-picker__day:disabled')
    const disabledCount = await disabledDays.count()
    expect(disabledCount).toBeGreaterThan(0)

    // Days within range should be enabled
    const enabledInMonth = page.locator(
      '.flex-date-picker__day:not(:disabled):not(.flex-date-picker__day--outside)',
    )
    const enabledCount = await enabledInMonth.count()
    expect(enabledCount).toBe(11) // June 10-20 = 11 days
  })

  test('month label click toggles month selection view', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')
    const monthLabel = page.locator('.flex-date-picker__month-label')

    await toggleBtn.click()
    await monthLabel.click()

    // Should show month options
    const monthOptions = page.locator('.flex-date-picker__month-option')
    await expect(monthOptions).toHaveCount(12)
  })

  test('today is visually highlighted', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    const todayBtn = page.locator('.flex-date-picker__day--today')
    await expect(todayBtn).toHaveCount(1)
  })

  test('selected date has accent background', async ({ page }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    // Select a day
    const dayBtn = page
      .locator(
        '.flex-date-picker__day:not(:disabled):not(.flex-date-picker__day--outside)',
      )
      .first()
    await dayBtn.click()

    // Re-open and verify selected class
    await toggleBtn.click()
    const selected = page.locator('.flex-date-picker__day--selected')
    await expect(selected).toHaveCount(1)
  })

  test('calendar opens with focus on selected or today date', async ({
    page,
  }) => {
    await renderWithJs(page, DATE_PICKER_HTML)
    const toggleBtn = page.locator('.flex-date-picker__button')

    await toggleBtn.click()

    // The focused button should have tabindex="0"
    const focused = page.locator('.flex-date-picker__day[tabindex="0"]')
    await expect(focused).toHaveCount(1)
    // Should be focused (active element)
    await expect(focused).toBeFocused()
  })
})

test.describe('flex-date-picker accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Date Picker Test</h1>
        <flex-date-picker>
          <label class="flex-label" for="a11y-date">Date</label>
          <div class="flex-date-picker__wrapper">
            <input class="flex-input flex-date-picker__external-input" id="a11y-date" name="date"
              type="text" placeholder="mm/dd/yyyy">
            <button type="button" class="flex-date-picker__button" aria-label="Toggle calendar">Toggle</button>
            <div class="flex-date-picker__calendar" hidden role="application" aria-label="Calendar">
              <div class="flex-date-picker__calendar-header">
                <button type="button" class="flex-date-picker__nav flex-date-picker__nav--prev" aria-label="Previous month">Prev</button>
                <button type="button" class="flex-date-picker__month-label" aria-label="Select month">April 2026</button>
                <button type="button" class="flex-date-picker__nav flex-date-picker__nav--next" aria-label="Next month">Next</button>
              </div>
              <table class="flex-date-picker__table" role="presentation">
                <thead><tr><th abbr="Sunday">Su</th><th abbr="Monday">Mo</th><th abbr="Tuesday">Tu</th><th abbr="Wednesday">We</th><th abbr="Thursday">Th</th><th abbr="Friday">Fr</th><th abbr="Saturday">Sa</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </flex-date-picker>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Date Picker Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
