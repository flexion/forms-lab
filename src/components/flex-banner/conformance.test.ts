import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  runAccessibilityAudit,
  runVisualConformance,
} from '../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../lib/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance and accessibility
runVisualConformance(spec)
runAccessibilityAudit(spec)

// --- Custom tests for banner guidance icons and expand/collapse ---

test.describe('flex-banner guidance icons', () => {
  test('dot-gov icon renders as an img element', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<flex-banner class="flex-banner" role="region" aria-label="Official website">
        <div class="flex-banner__header">
          <div class="flex-banner__inner">
            <div class="flex-banner__header-text"><p>An official website</p></div>
            <button type="button" class="flex-banner__button" aria-expanded="true" aria-controls="bc">
              <span class="flex-banner__button-text">Here's how you know</span>
            </button>
          </div>
        </div>
        <div class="flex-banner__content" id="bc">
          <div class="flex-banner__guidance">
            <div class="flex-banner__guidance-gov">
              <div class="flex-banner__icon">
                <img src="http://localhost:3000/static/img/icon-dot-gov.svg" alt="Dot gov" class="flex-banner__icon-img" role="img" />
              </div>
              <div class="flex-banner__guidance-text">
                <p><strong>Official websites use .gov</strong></p>
              </div>
            </div>
            <div class="flex-banner__guidance-ssl">
              <div class="flex-banner__icon">
                <img src="http://localhost:3000/static/img/icon-https.svg" alt="HTTPS" class="flex-banner__icon-img" role="img" />
              </div>
              <div class="flex-banner__guidance-text">
                <p><strong>Secure .gov websites use HTTPS</strong></p>
              </div>
            </div>
          </div>
        </div>
      </flex-banner>`,
    )

    // Verify both icon images are present and have dimensions
    const govIcon = page.locator(
      '.flex-banner__guidance-gov .flex-banner__icon-img',
    )
    await expect(govIcon).toBeVisible()
    const govBox = await govIcon.boundingBox()
    expect(govBox).not.toBeNull()
    expect(govBox?.width).toBeGreaterThan(0)
    expect(govBox?.height).toBeGreaterThan(0)

    const sslIcon = page.locator(
      '.flex-banner__guidance-ssl .flex-banner__icon-img',
    )
    await expect(sslIcon).toBeVisible()
    const sslBox = await sslIcon.boundingBox()
    expect(sslBox).not.toBeNull()
    expect(sslBox?.width).toBeGreaterThan(0)
    expect(sslBox?.height).toBeGreaterThan(0)
  })
})

test.describe('flex-banner expand/collapse behavior', () => {
  async function renderBannerWithJs(page: import('@playwright/test').Page) {
    await renderFlexFixture(
      page,
      `<flex-banner class="flex-banner" role="region" aria-label="Official website">
        <div class="flex-banner__header">
          <div class="flex-banner__inner">
            <div class="flex-banner__header-text"><p>An official website</p></div>
            <button type="button" class="flex-banner__button" aria-expanded="false" aria-controls="bc">
              <span class="flex-banner__button-text">Here's how you know</span>
            </button>
          </div>
        </div>
        <div class="flex-banner__content" id="bc" hidden>
          <div class="flex-banner__guidance">
            <div class="flex-banner__guidance-gov">
              <div class="flex-banner__guidance-text">
                <p><strong>Official websites use .gov</strong></p>
              </div>
            </div>
          </div>
        </div>
      </flex-banner>
      <script>${componentsJs}</script>`,
    )
    await page.waitForFunction(() => customElements.get('flex-banner'))
  }

  test('clicking button expands content', async ({ page }) => {
    await renderBannerWithJs(page)

    const button = page.locator('.flex-banner__button')
    const content = page.locator('#bc')

    await expect(content).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')

    await button.click()

    await expect(content).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  test('clicking again collapses content', async ({ page }) => {
    await renderBannerWithJs(page)

    const button = page.locator('.flex-banner__button')
    const content = page.locator('#bc')

    // Expand
    await button.click()
    await expect(content).toBeVisible()

    // Collapse
    await button.click()
    await expect(content).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})
