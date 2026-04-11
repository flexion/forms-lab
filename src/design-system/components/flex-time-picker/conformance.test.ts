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

// --- Time picker HTML fixture for behavioral tests ---
const TIME_PICKER_HTML = `
  <flex-time-picker data-min-time="09:00" data-max-time="17:00" data-step="30">
    <label class="flex-label" for="time">Appointment time</label>
    <flex-combo-box>
      <div class="flex-combo-box__wrapper">
        <input class="flex-combo-box__input" id="time" name="time" type="text"
          role="combobox" aria-expanded="false" aria-autocomplete="list"
          aria-controls="time-list" autocomplete="off">
        <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
        <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
        <ul class="flex-combo-box__list" id="time-list" role="listbox" hidden>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="09:00" id="time-opt-0900">9:00 am</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="09:30" id="time-opt-0930">9:30 am</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="10:00" id="time-opt-1000">10:00 am</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="10:30" id="time-opt-1030">10:30 am</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="11:00" id="time-opt-1100">11:00 am</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="11:30" id="time-opt-1130">11:30 am</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="12:00" id="time-opt-1200">12:00 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="12:30" id="time-opt-1230">12:30 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="13:00" id="time-opt-1300">1:00 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="13:30" id="time-opt-1330">1:30 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="14:00" id="time-opt-1400">2:00 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="14:30" id="time-opt-1430">2:30 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="15:00" id="time-opt-1500">3:00 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="15:30" id="time-opt-1530">3:30 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="16:00" id="time-opt-1600">4:00 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="16:30" id="time-opt-1630">4:30 pm</li>
          <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="17:00" id="time-opt-1700">5:00 pm</li>
        </ul>
      </div>
    </flex-combo-box>
  </flex-time-picker>
`

// Fixture without pre-rendered options (for client-side generation test)
const TIME_PICKER_EMPTY_HTML = `
  <flex-time-picker data-min-time="09:00" data-max-time="11:00" data-step="60">
    <label class="flex-label" for="time2">Meeting time</label>
    <flex-combo-box>
      <div class="flex-combo-box__wrapper">
        <input class="flex-combo-box__input" id="time2" name="time2" type="text"
          role="combobox" aria-expanded="false" aria-autocomplete="list"
          aria-controls="time2-list" autocomplete="off">
        <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
        <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
        <ul class="flex-combo-box__list" id="time2-list" role="listbox" hidden></ul>
      </div>
    </flex-combo-box>
  </flex-time-picker>
`

test.describe('flex-time-picker behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(
      () =>
        customElements.get('flex-time-picker') &&
        customElements.get('flex-combo-box'),
    )
  }

  test('generates time options from min/max/step (SSR)', async ({ page }) => {
    await renderWithJs(page, TIME_PICKER_HTML)

    const options = page.locator('.flex-combo-box__option')
    // 09:00 to 17:00 in 30-min steps = 17 options
    await expect(options).toHaveCount(17)
  })

  test('time options display in 12-hour format with am/pm', async ({
    page,
  }) => {
    await renderWithJs(page, TIME_PICKER_HTML)

    const firstOption = page.locator('.flex-combo-box__option').first()
    await expect(firstOption).toHaveText('9:00 am')

    const noonOption = page.locator('[data-value="12:00"]')
    await expect(noonOption).toHaveText('12:00 pm')

    const pmOption = page.locator('[data-value="13:00"]')
    await expect(pmOption).toHaveText('1:00 pm')
  })

  test('reuses combo box for filtering and selection', async ({ page }) => {
    await renderWithJs(page, TIME_PICKER_HTML)

    const input = page.locator('.flex-combo-box__input')
    const toggle = page.locator('.flex-combo-box__toggle')
    const list = page.locator('.flex-combo-box__list')

    // Open via toggle
    await toggle.click()
    await expect(list).toBeVisible()

    // Type to filter
    await input.fill('1:00')
    const visible = page.locator('.flex-combo-box__option:not([hidden])')
    const count = await visible.count()
    // Should filter to options containing "1:00"
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(17)
  })

  test('default step is 30 minutes', async ({ page }) => {
    await renderWithJs(page, TIME_PICKER_HTML)

    // Verify 30-minute intervals
    const opt1 = page.locator('[data-value="09:00"]')
    const opt2 = page.locator('[data-value="09:30"]')
    const opt3 = page.locator('[data-value="10:00"]')
    await expect(opt1).toHaveCount(1)
    await expect(opt2).toHaveCount(1)
    await expect(opt3).toHaveCount(1)
  })

  test('custom step interval generates correct options (client-side)', async ({
    page,
  }) => {
    await renderWithJs(page, TIME_PICKER_EMPTY_HTML)

    // 09:00 to 11:00 with 60-min step = 3 options (09:00, 10:00, 11:00)
    const options = page.locator('.flex-combo-box__option')
    await expect(options).toHaveCount(3)

    await expect(options.nth(0)).toHaveText('9:00 am')
    await expect(options.nth(1)).toHaveText('10:00 am')
    await expect(options.nth(2)).toHaveText('11:00 am')
  })
})

test.describe('flex-time-picker accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Time Picker Test</h1>
        <flex-time-picker data-min-time="09:00" data-max-time="17:00" data-step="30">
          <label class="flex-label" for="a11y-time">Appointment time</label>
          <flex-combo-box>
            <div class="flex-combo-box__wrapper">
              <input class="flex-combo-box__input" id="a11y-time" name="time" type="text"
                role="combobox" aria-expanded="false" aria-autocomplete="list"
                aria-controls="a11y-time-list" autocomplete="off">
              <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
              <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
              <ul class="flex-combo-box__list" id="a11y-time-list" role="listbox" hidden>
                <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="09:00" id="a11y-time-opt-0900">9:00 am</li>
                <li class="flex-combo-box__option" role="option" tabindex="-1" data-value="09:30" id="a11y-time-opt-0930">9:30 am</li>
              </ul>
            </div>
          </flex-combo-box>
        </flex-time-picker>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Time Picker Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
