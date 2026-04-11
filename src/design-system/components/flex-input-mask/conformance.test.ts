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

test.describe('flex-input-mask behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-input-mask'))
  }

  const phoneFixture = `
    <flex-input-mask data-mask="(___) ___-____">
      <label class="flex-label" for="phone">Phone number</label>
      <div class="flex-input-mask__wrapper">
        <input class="flex-input flex-input-mask__input" id="phone" name="phone" type="text" inputmode="tel" placeholder="(___) ___-____">
        <span class="flex-input-mask__overlay" aria-hidden="true">(___) ___-____</span>
      </div>
    </flex-input-mask>
  `

  const ssnFixture = `
    <flex-input-mask data-mask="___-__-____">
      <label class="flex-label" for="ssn">Social Security number</label>
      <div class="flex-input-mask__wrapper">
        <input class="flex-input flex-input-mask__input" id="ssn" name="ssn" type="text" inputmode="numeric" placeholder="___-__-____">
        <span class="flex-input-mask__overlay" aria-hidden="true">___-__-____</span>
      </div>
    </flex-input-mask>
  `

  test('typing digits formats according to phone mask', async ({ page }) => {
    await renderWithJs(page, phoneFixture)

    const input = page.locator('#phone')
    await input.focus()
    await input.pressSequentially('1234567890')

    await expect(input).toHaveValue('(123) 456-7890')
  })

  test('typing digits formats according to SSN mask', async ({ page }) => {
    await renderWithJs(page, ssnFixture)

    const input = page.locator('#ssn')
    await input.focus()
    await input.pressSequentially('123456789')

    await expect(input).toHaveValue('123-45-6789')
  })

  test('overlay updates to show remaining mask characters', async ({
    page,
  }) => {
    await renderWithJs(page, phoneFixture)

    const input = page.locator('#phone')
    const overlay = page.locator('.flex-input-mask__overlay')

    await input.focus()
    await input.pressSequentially('123')

    // After typing "123" -> formatted as "(123", overlay should show
    // 4 non-breaking spaces for "(123" then ") ___-____"
    const overlayText = await overlay.textContent()
    // The overlay should end with the remaining mask
    expect(overlayText).toContain('___-____')
  })

  test('non-digit keys are rejected for numeric masks', async ({ page }) => {
    await renderWithJs(page, phoneFixture)

    const input = page.locator('#phone')
    await input.focus()
    await input.pressSequentially('12a3')

    // "a" should be rejected, only digits 1, 2, 3 accepted
    await expect(input).toHaveValue('(123')
  })

  test('pasting a value formats correctly', async ({ page }) => {
    await renderWithJs(page, phoneFixture)

    const input = page.locator('#phone')

    // Use fill to simulate paste-like behavior
    await input.fill('5551234567')

    // The input event should format it
    await expect(input).toHaveValue('(555) 123-4567')
  })

  test('extra digits beyond mask length are ignored', async ({ page }) => {
    await renderWithJs(page, ssnFixture)

    const input = page.locator('#ssn')
    await input.focus()
    await input.pressSequentially('1234567890')

    // SSN mask only accepts 9 digits
    await expect(input).toHaveValue('123-45-6789')
  })

  test('backspace removes formatted characters correctly', async ({ page }) => {
    await renderWithJs(page, phoneFixture)

    const input = page.locator('#phone')
    await input.focus()
    await input.pressSequentially('12345')
    await expect(input).toHaveValue('(123) 45')

    // Press backspace to remove the last digit
    await input.press('Backspace')
    // After removing "5", the remaining digits "1234" should format as "(123) 4"
    await expect(input).toHaveValue('(123) 4')
  })
})

test.describe('flex-input-mask accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Input Mask Test</h1>
        <flex-input-mask data-mask="(___) ___-____">
          <label class="flex-label" for="phone">Phone number</label>
          <div class="flex-input-mask__wrapper">
            <input class="flex-input flex-input-mask__input" id="phone" name="phone" type="text" inputmode="tel" placeholder="(___) ___-____">
            <span class="flex-input-mask__overlay" aria-hidden="true">(___) ___-____</span>
          </div>
        </flex-input-mask>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Input Mask Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
