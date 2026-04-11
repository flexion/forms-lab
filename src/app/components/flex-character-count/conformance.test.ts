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

test.describe('flex-character-count behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-character-count'))
  }

  test('initial message shows total characters allowed', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-character-count data-maxlength="100">
        <label class="flex-label" for="msg">Message</label>
        <textarea class="flex-textarea" id="msg" name="msg" maxlength="100"></textarea>
        <span class="flex-character-count__message" aria-live="polite">100 characters allowed</span>
      </flex-character-count>
    `,
    )

    const message = page.locator('.flex-character-count__message')
    await expect(message).toHaveText('100 characters allowed')
  })

  test('typing updates remaining count', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-character-count data-maxlength="20">
        <label class="flex-label" for="msg">Message</label>
        <textarea class="flex-textarea" id="msg" name="msg" maxlength="20"></textarea>
        <span class="flex-character-count__message" aria-live="polite">20 characters allowed</span>
      </flex-character-count>
    `,
    )

    const textarea = page.locator('textarea')
    const message = page.locator('.flex-character-count__message')

    await textarea.fill('Hello')
    await expect(message).toHaveText('15 characters left')
  })

  test('over-limit shows error state', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-character-count data-maxlength="5">
        <label class="flex-label" for="msg">Message</label>
        <textarea class="flex-textarea" id="msg" name="msg" maxlength="5"></textarea>
        <span class="flex-character-count__message" aria-live="polite">5 characters allowed</span>
      </flex-character-count>
    `,
    )

    const textarea = page.locator('textarea')
    const message = page.locator('.flex-character-count__message')

    // Remove maxlength to allow typing beyond limit for testing
    await textarea.evaluate((el: HTMLTextAreaElement) =>
      el.removeAttribute('maxlength'),
    )
    await textarea.fill('Hello World')

    await expect(message).toHaveText('6 characters over limit')
    await expect(message).toHaveAttribute('data-state', 'error')
  })

  test('clearing input returns to initial message', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-character-count data-maxlength="10">
        <label class="flex-label" for="msg">Message</label>
        <textarea class="flex-textarea" id="msg" name="msg" maxlength="10"></textarea>
        <span class="flex-character-count__message" aria-live="polite">10 characters allowed</span>
      </flex-character-count>
    `,
    )

    const textarea = page.locator('textarea')
    const message = page.locator('.flex-character-count__message')

    await textarea.fill('Hello')
    await expect(message).toHaveText('5 characters left')

    await textarea.fill('')
    await expect(message).toHaveText('10 characters allowed')
  })
})

test.describe('flex-character-count accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Character Count Test</h1>
        <flex-character-count data-maxlength="100">
          <label class="flex-label" for="msg">Message</label>
          <textarea class="flex-textarea" id="msg" name="msg" maxlength="100" aria-describedby="msg-status"></textarea>
          <span class="flex-character-count__message" id="msg-status" aria-live="polite">100 characters allowed</span>
        </flex-character-count>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Character Count Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
