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

// --- Custom behavioral tests ---

const COMBO_HTML = `
  <flex-combo-box>
    <label class="flex-label" for="fruit">Select a fruit</label>
    <div class="flex-combo-box__wrapper">
      <input class="flex-combo-box__input" id="fruit" name="fruit" type="text"
        role="combobox" aria-expanded="false" aria-autocomplete="list"
        aria-controls="fruit-list" autocomplete="off">
      <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
      <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
      <ul class="flex-combo-box__list" id="fruit-list" role="listbox" hidden>
        <li class="flex-combo-box__option" role="option" data-value="apple" id="fruit-opt-apple">Apple</li>
        <li class="flex-combo-box__option" role="option" data-value="apricot" id="fruit-opt-apricot">Apricot</li>
        <li class="flex-combo-box__option" role="option" data-value="banana" id="fruit-opt-banana">Banana</li>
        <li class="flex-combo-box__option" role="option" data-value="cherry" id="fruit-opt-cherry">Cherry</li>
        <li class="flex-combo-box__option" role="option" data-value="grape" id="fruit-opt-grape">Grape</li>
      </ul>
    </div>
  </flex-combo-box>
`

test.describe('flex-combo-box behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-combo-box'))
  }

  test('click toggle opens dropdown showing all options', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const list = page.locator('.flex-combo-box__list')
    const toggle = page.locator('.flex-combo-box__toggle')

    await expect(list).toBeHidden()
    await expect(input).toHaveAttribute('aria-expanded', 'false')

    await toggle.click()

    await expect(list).toBeVisible()
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    // All options visible
    const visible = page.locator('.flex-combo-box__option:not([hidden])')
    await expect(visible).toHaveCount(5)
  })

  test('typing filters options case-insensitively', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')

    await input.click()
    await input.fill('ap')

    const visible = page.locator('.flex-combo-box__option:not([hidden])')
    // 'ap' matches Apple, Apricot, Grape (gr-ap-e)
    await expect(visible).toHaveCount(3)
  })

  test('shows "No results found" when filter matches nothing', async ({
    page,
  }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')

    await input.click()
    await input.fill('zzz')

    const noResults = page.locator('.flex-combo-box__no-results')
    await expect(noResults).toBeVisible()
    await expect(noResults).toHaveText('No results found')
  })

  test('click option selects it and closes list', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const list = page.locator('.flex-combo-box__list')
    const toggle = page.locator('.flex-combo-box__toggle')

    await toggle.click()
    await page.locator('li[data-value="banana"]').click()

    await expect(input).toHaveValue('Banana')
    await expect(list).toBeHidden()
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    // Clear button should be visible
    await expect(page.locator('.flex-combo-box__clear')).toBeVisible()
    // aria-selected should be set
    await expect(page.locator('li[data-value="banana"]')).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('ArrowDown opens list if closed and navigates', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const list = page.locator('.flex-combo-box__list')

    await input.focus()
    await page.keyboard.press('ArrowDown')

    await expect(list).toBeVisible()

    // First option should be focused
    await expect(page.locator('li[data-value="apple"]')).toHaveAttribute(
      'data-focused',
      '',
    )
    await expect(input).toHaveAttribute(
      'aria-activedescendant',
      'fruit-opt-apple',
    )

    // Navigate down
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('li[data-value="apricot"]')).toHaveAttribute(
      'data-focused',
      '',
    )
  })

  test('ArrowUp moves highlight up, wrapping around', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')

    await input.focus()
    await page.keyboard.press('ArrowDown') // open + focus apple
    await page.keyboard.press('ArrowUp') // should wrap to grape (last)

    await expect(page.locator('li[data-value="grape"]')).toHaveAttribute(
      'data-focused',
      '',
    )
  })

  test('Enter selects highlighted option', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const list = page.locator('.flex-combo-box__list')

    await input.focus()
    await page.keyboard.press('ArrowDown') // apple
    await page.keyboard.press('ArrowDown') // apricot
    await page.keyboard.press('Enter')

    await expect(input).toHaveValue('Apricot')
    await expect(list).toBeHidden()
  })

  test('Escape closes list and restores previous value', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const toggle = page.locator('.flex-combo-box__toggle')

    // First select banana
    await toggle.click()
    await page.locator('li[data-value="banana"]').click()
    await expect(input).toHaveValue('Banana')

    // Start typing (which changes input value)
    await input.fill('ch')
    await expect(input).toHaveValue('ch')

    // Press Escape — should restore "Banana"
    await page.keyboard.press('Escape')
    await expect(input).toHaveValue('Banana')
    await expect(page.locator('.flex-combo-box__list')).toBeHidden()
  })

  test('Tab closes list and keeps selection', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')

    await input.focus()
    await page.keyboard.press('ArrowDown') // apple
    await page.keyboard.press('ArrowDown') // apricot
    await page.keyboard.press('Tab')

    await expect(page.locator('.flex-combo-box__list')).toBeHidden()
    await expect(input).toHaveValue('Apricot')
  })

  test('clear button resets input', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const clearBtn = page.locator('.flex-combo-box__clear')
    const toggle = page.locator('.flex-combo-box__toggle')

    // Select something first
    await toggle.click()
    await page.locator('li[data-value="cherry"]').click()
    await expect(input).toHaveValue('Cherry')
    await expect(clearBtn).toBeVisible()

    // Clear it
    await clearBtn.click()
    await expect(input).toHaveValue('')
    await expect(clearBtn).toBeHidden()
  })

  test('outside click closes dropdown', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const toggle = page.locator('.flex-combo-box__toggle')
    const list = page.locator('.flex-combo-box__list')

    await toggle.click()
    await expect(list).toBeVisible()

    await page.click('body', { position: { x: 10, y: 10 } })
    await expect(list).toBeHidden()
  })

  test('aria-expanded updates on open/close', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const input = page.locator('.flex-combo-box__input')
    const toggle = page.locator('.flex-combo-box__toggle')

    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  test('aria-selected marks the selected option', async ({ page }) => {
    await renderWithJs(page, COMBO_HTML)
    const toggle = page.locator('.flex-combo-box__toggle')

    await toggle.click()
    await page.locator('li[data-value="cherry"]').click()

    await expect(page.locator('li[data-value="cherry"]')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Others should not have aria-selected
    await expect(page.locator('li[data-value="apple"]')).not.toHaveAttribute(
      'aria-selected',
    )
  })
})

test.describe('flex-combo-box accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Combo Box Test</h1>
        <flex-combo-box>
          <label class="flex-label" for="a11y-fruit">Select a fruit</label>
          <div class="flex-combo-box__wrapper">
            <input class="flex-combo-box__input" id="a11y-fruit" name="fruit" type="text"
              role="combobox" aria-expanded="false" aria-autocomplete="list"
              aria-controls="a11y-list" autocomplete="off">
            <button type="button" class="flex-combo-box__toggle" tabindex="-1" aria-label="Toggle options">Toggle</button>
            <button type="button" class="flex-combo-box__clear" tabindex="-1" aria-label="Clear selection" hidden>Clear</button>
            <ul class="flex-combo-box__list" id="a11y-list" role="listbox" hidden>
              <li class="flex-combo-box__option" role="option" data-value="apple" id="a11y-opt-apple">Apple</li>
              <li class="flex-combo-box__option" role="option" data-value="banana" id="a11y-opt-banana">Banana</li>
            </ul>
          </div>
        </flex-combo-box>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Combo Box Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
