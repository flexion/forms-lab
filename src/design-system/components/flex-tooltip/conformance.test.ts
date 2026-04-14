import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  runAccessibilityAudit,
  runVisualConformance,
} from '../../test-helpers/conformance-runner'
import { renderFlexFixture } from '../../test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance and accessibility
runVisualConformance(spec)
runAccessibilityAudit(spec)

// --- Behavioral tests ---

const TOOLTIP_HTML = `
  <div style="padding: 100px; text-align: center;">
    <flex-tooltip data-position="top">
      <button type="button" class="flex-tooltip__trigger" aria-describedby="tip-test" id="trigger">
        Hover me
      </button>
      <span class="flex-tooltip__body" id="tip-test" role="tooltip">Tooltip text</span>
    </flex-tooltip>
  </div>`

async function renderTooltipWithJs(
  page: import('@playwright/test').Page,
  html: string,
) {
  await renderFlexFixture(
    page,
    `${html}
    <script>${componentsJs}</script>`,
  )
  await page.waitForFunction(() => customElements.get('flex-tooltip'))
}

test.describe('flex-tooltip behavior', () => {
  test('tooltip shows on hover and hides on mouseleave', async ({ page }) => {
    await renderTooltipWithJs(page, TOOLTIP_HTML)

    const trigger = page.locator('#trigger')
    const body = page.locator('#tip-test')

    await expect(body).toBeHidden()

    await trigger.hover()
    await expect(body).toBeVisible()

    // Move away from the trigger
    await page.mouse.move(0, 0)
    await expect(body).toBeHidden()
  })

  test('tooltip shows on focus and hides on blur', async ({ page }) => {
    await renderTooltipWithJs(page, TOOLTIP_HTML)

    const trigger = page.locator('#trigger')
    const body = page.locator('#tip-test')

    await expect(body).toBeHidden()

    await trigger.focus()
    await expect(body).toBeVisible()

    await trigger.blur()
    await expect(body).toBeHidden()
  })

  test('tooltip has correct ARIA attributes', async ({ page }) => {
    await renderTooltipWithJs(page, TOOLTIP_HTML)

    const trigger = page.locator('#trigger')
    const body = page.locator('#tip-test')

    await expect(trigger).toHaveAttribute('aria-describedby', 'tip-test')
    await expect(body).toHaveAttribute('role', 'tooltip')
  })

  test('tooltip positions at top by default', async ({ page }) => {
    await renderTooltipWithJs(page, TOOLTIP_HTML)

    const trigger = page.locator('#trigger')
    const body = page.locator('#tip-test')

    await trigger.hover()
    await expect(body).toBeVisible()
    await expect(body).toHaveAttribute('data-position-actual', 'top')
  })

  test('tooltip respects bottom position', async ({ page }) => {
    await renderTooltipWithJs(
      page,
      `<div style="padding: 100px; text-align: center;">
        <flex-tooltip data-position="bottom">
          <button type="button" class="flex-tooltip__trigger" aria-describedby="tip-bottom" id="trigger-bottom">
            Hover me
          </button>
          <span class="flex-tooltip__body" id="tip-bottom" role="tooltip">Bottom tooltip</span>
        </flex-tooltip>
      </div>`,
    )

    const trigger = page.locator('#trigger-bottom')
    const body = page.locator('#tip-bottom')

    await trigger.hover()
    await expect(body).toBeVisible()
    await expect(body).toHaveAttribute('data-position-actual', 'bottom')
  })

  test('tooltip flips when it would overflow viewport (top -> bottom)', async ({
    page,
  }) => {
    await renderTooltipWithJs(
      page,
      `<div style="padding: 5px;">
        <flex-tooltip data-position="top">
          <button type="button" class="flex-tooltip__trigger" aria-describedby="tip-flip" id="trigger-flip">
            Hover me
          </button>
          <span class="flex-tooltip__body" id="tip-flip" role="tooltip">Flipped tooltip</span>
        </flex-tooltip>
      </div>`,
    )

    const trigger = page.locator('#trigger-flip')
    const body = page.locator('#tip-flip')

    await trigger.hover()
    await expect(body).toBeVisible()
    // Should flip to bottom since there's no room at top
    await expect(body).toHaveAttribute('data-position-actual', 'bottom')
  })
})

test.describe('flex-tooltip accessibility', () => {
  test('tooltip passes axe audit', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Tooltip Test</h1>
        <flex-tooltip data-position="top">
          <button type="button" class="flex-tooltip__trigger" aria-describedby="tip-axe">
            Hover for info
          </button>
          <span class="flex-tooltip__body" id="tip-axe" role="tooltip">
            Helpful tooltip text
          </span>
        </flex-tooltip>
      </main>`,
    )

    await page.evaluate(() => {
      document.title = 'Tooltip Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
