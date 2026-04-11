import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runVisualConformance } from '../../../shared/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../../shared/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance
runVisualConformance(spec)

// --- Custom behavioral tests ---

test.describe('flex-memorable-date behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-memorable-date'))
  }

  const defaultFixture = `
    <flex-memorable-date>
      <fieldset class="flex-fieldset">
        <legend class="flex-legend">Date of birth</legend>
        <div class="flex-memorable-date__fields">
          <div class="flex-memorable-date__field flex-memorable-date__field--month">
            <label class="flex-label" for="dob-month">Month</label>
            <input class="flex-input" id="dob-month" name="dob-month" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
          </div>
          <div class="flex-memorable-date__field flex-memorable-date__field--day">
            <label class="flex-label" for="dob-day">Day</label>
            <input class="flex-input" id="dob-day" name="dob-day" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
          </div>
          <div class="flex-memorable-date__field flex-memorable-date__field--year">
            <label class="flex-label" for="dob-year">Year</label>
            <input class="flex-input" id="dob-year" name="dob-year" type="text" maxlength="4" pattern="[0-9]*" inputmode="numeric">
          </div>
        </div>
      </fieldset>
    </flex-memorable-date>
  `

  test('auto-advances from month to day after 2 digits', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const month = page.locator('#dob-month')
    const day = page.locator('#dob-day')

    await month.focus()
    await month.pressSequentially('12')

    await expect(day).toBeFocused()
  })

  test('auto-advances from day to year after 2 digits', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const day = page.locator('#dob-day')
    const year = page.locator('#dob-year')

    await day.focus()
    await day.pressSequentially('25')

    await expect(year).toBeFocused()
  })

  test('invalid month shows error on blur', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const month = page.locator('#dob-month')

    await month.fill('13')
    await month.blur()

    await expect(month).toHaveAttribute('data-state', 'error')
  })

  test('month 0 shows error on blur', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const month = page.locator('#dob-month')

    await month.fill('0')
    await month.blur()

    await expect(month).toHaveAttribute('data-state', 'error')
  })

  test('invalid day shows error on blur', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const day = page.locator('#dob-day')

    await day.fill('32')
    await day.blur()

    await expect(day).toHaveAttribute('data-state', 'error')
  })

  test('day 0 shows error on blur', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const day = page.locator('#dob-day')

    await day.fill('0')
    await day.blur()

    await expect(day).toHaveAttribute('data-state', 'error')
  })

  test('year with fewer than 4 digits shows error on blur', async ({
    page,
  }) => {
    await renderWithJs(page, defaultFixture)

    const year = page.locator('#dob-year')

    await year.fill('99')
    await year.blur()

    await expect(year).toHaveAttribute('data-state', 'error')
  })

  test('valid values clear error state', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const month = page.locator('#dob-month')

    // First make it invalid
    await month.fill('13')
    await month.blur()
    await expect(month).toHaveAttribute('data-state', 'error')

    // Then correct it
    await month.fill('12')
    await month.blur()
    await expect(month).not.toHaveAttribute('data-state', 'error')
  })

  test('empty fields do not show errors on blur', async ({ page }) => {
    await renderWithJs(page, defaultFixture)

    const month = page.locator('#dob-month')
    const day = page.locator('#dob-day')
    const year = page.locator('#dob-year')

    await month.focus()
    await month.blur()
    await day.focus()
    await day.blur()
    await year.focus()
    await year.blur()

    await expect(month).not.toHaveAttribute('data-state', 'error')
    await expect(day).not.toHaveAttribute('data-state', 'error')
    await expect(year).not.toHaveAttribute('data-state', 'error')
  })
})

test.describe('flex-memorable-date accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Memorable Date Test</h1>
        <flex-memorable-date>
          <fieldset class="flex-fieldset">
            <legend class="flex-legend">Date of birth</legend>
            <div class="flex-memorable-date__fields">
              <div class="flex-memorable-date__field flex-memorable-date__field--month">
                <label class="flex-label" for="dob-month">Month</label>
                <input class="flex-input" id="dob-month" name="dob-month" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
              </div>
              <div class="flex-memorable-date__field flex-memorable-date__field--day">
                <label class="flex-label" for="dob-day">Day</label>
                <input class="flex-input" id="dob-day" name="dob-day" type="text" maxlength="2" pattern="[0-9]*" inputmode="numeric">
              </div>
              <div class="flex-memorable-date__field flex-memorable-date__field--year">
                <label class="flex-label" for="dob-year">Year</label>
                <input class="flex-input" id="dob-year" name="dob-year" type="text" maxlength="4" pattern="[0-9]*" inputmode="numeric">
              </div>
            </div>
          </fieldset>
        </flex-memorable-date>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Memorable Date Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
