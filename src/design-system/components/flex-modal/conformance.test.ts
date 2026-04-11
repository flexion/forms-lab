import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  runAccessibilityAudit,
  runVisualConformance,
} from '../../../shared/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../../shared/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance and accessibility
runVisualConformance(spec)
runAccessibilityAudit(spec)

// --- Behavioral tests ---

const MODAL_HTML = `
  <button type="button" class="flex-button" aria-controls="test-modal" data-open-modal id="trigger">
    Open modal
  </button>
  <flex-modal id="test-modal" hidden>
    <div class="flex-modal__overlay"></div>
    <div class="flex-modal__content" role="dialog" aria-modal="true" aria-labelledby="test-heading" aria-describedby="test-body">
      <div class="flex-modal__main">
        <h2 class="flex-modal__heading" id="test-heading">Test modal</h2>
        <div class="flex-modal__body" id="test-body"><p>Body content.</p></div>
        <div class="flex-modal__footer">
          <button type="button" class="flex-button" data-close-modal id="close-footer">Close</button>
        </div>
      </div>
      <button type="button" class="flex-modal__close" aria-label="Close this modal" data-close-modal id="close-x">
        &times;
      </button>
    </div>
  </flex-modal>`

const FORCED_ACTION_HTML = `
  <button type="button" class="flex-button" aria-controls="forced-modal" data-open-modal id="trigger-forced">
    Open forced modal
  </button>
  <flex-modal id="forced-modal" hidden data-forced-action>
    <div class="flex-modal__overlay"></div>
    <div class="flex-modal__content" role="dialog" aria-modal="true" aria-labelledby="forced-heading" aria-describedby="forced-body">
      <div class="flex-modal__main">
        <h2 class="flex-modal__heading" id="forced-heading">Forced action</h2>
        <div class="flex-modal__body" id="forced-body"><p>You must act.</p></div>
        <div class="flex-modal__footer">
          <button type="button" class="flex-button" data-close-modal id="close-forced">Accept</button>
        </div>
      </div>
    </div>
  </flex-modal>`

async function renderModalWithJs(
  page: import('@playwright/test').Page,
  html: string,
) {
  await renderFlexFixture(
    page,
    `${html}
    <script>${componentsJs}</script>`,
  )
  await page.waitForFunction(() => customElements.get('flex-modal'))
}

test.describe('flex-modal behavior', () => {
  test('trigger button opens modal', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    const modal = page.locator('#test-modal')

    await expect(modal).toBeHidden()
    await trigger.click()
    await expect(modal).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('close button closes modal and restores focus', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    const modal = page.locator('#test-modal')
    const closeX = page.locator('#close-x')

    await trigger.click()
    await expect(modal).toBeVisible()

    await closeX.click()
    await expect(modal).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('footer close button closes modal', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    const modal = page.locator('#test-modal')
    const closeFooter = page.locator('#close-footer')

    await trigger.click()
    await expect(modal).toBeVisible()

    await closeFooter.click()
    await expect(modal).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('escape key closes modal', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    const modal = page.locator('#test-modal')

    await trigger.click()
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('overlay click closes modal', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    const modal = page.locator('#test-modal')

    await trigger.click()
    await expect(modal).toBeVisible()

    // Click on the visible overlay area (outside the centered content)
    // Using the flex-modal element at a corner position, which is the overlay area
    await page.locator('flex-modal').click({ position: { x: 5, y: 5 } })
    await expect(modal).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('first focusable element receives focus on open', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    await trigger.click()

    // The first focusable in column-reverse layout: close-footer comes first in DOM inside __main,
    // but __close button is also focusable. With column-reverse, close button renders at top visually
    // but in DOM order, __main children come first. Let's check what's actually focused.
    const focusedId = await page.evaluate(() => document.activeElement?.id)
    // The first focusable element in .flex-modal__content is the footer close button
    // (it comes first in DOM within __main, before the __close button)
    expect(focusedId).toBe('close-footer')
  })

  test('focus traps within modal on Tab', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    await trigger.click()

    // Tab from last to first
    // Focus is on close-footer. Tab should go to close-x, then wrap to close-footer.
    await page.keyboard.press('Tab')
    const afterTab = await page.evaluate(() => document.activeElement?.id)
    expect(afterTab).toBe('close-x')

    // Tab again should wrap back to first focusable
    await page.keyboard.press('Tab')
    const afterTab2 = await page.evaluate(() => document.activeElement?.id)
    expect(afterTab2).toBe('close-footer')
  })

  test('focus traps within modal on Shift+Tab', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    await trigger.click()

    // Focus is on close-footer (first). Shift+Tab should wrap to close-x (last).
    await page.keyboard.press('Shift+Tab')
    const afterShiftTab = await page.evaluate(() => document.activeElement?.id)
    expect(afterShiftTab).toBe('close-x')
  })

  test('body scroll lock is applied when modal opens', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    await trigger.click()

    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).toBe('hidden')
  })

  test('body scroll lock is removed when modal closes', async ({ page }) => {
    await renderModalWithJs(page, MODAL_HTML)

    const trigger = page.locator('#trigger')
    await trigger.click()
    await page.keyboard.press('Escape')

    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).toBe('')
  })
})

test.describe('flex-modal forced action', () => {
  test('escape does not close forced action modal', async ({ page }) => {
    await renderModalWithJs(page, FORCED_ACTION_HTML)

    const trigger = page.locator('#trigger-forced')
    const modal = page.locator('#forced-modal')

    await trigger.click()
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(modal).toBeVisible()
  })

  test('overlay click does not close forced action modal', async ({ page }) => {
    await renderModalWithJs(page, FORCED_ACTION_HTML)

    const trigger = page.locator('#trigger-forced')
    const modal = page.locator('#forced-modal')
    const overlay = page.locator('.flex-modal__overlay')

    await trigger.click()
    await expect(modal).toBeVisible()

    await overlay.click({ force: true })
    await expect(modal).toBeVisible()
  })

  test('close button still works in forced action modal', async ({ page }) => {
    await renderModalWithJs(page, FORCED_ACTION_HTML)

    const trigger = page.locator('#trigger-forced')
    const modal = page.locator('#forced-modal')
    const closeBtn = page.locator('#close-forced')

    await trigger.click()
    await expect(modal).toBeVisible()

    await closeBtn.click()
    await expect(modal).toBeHidden()
  })
})

test.describe('flex-modal accessibility', () => {
  test('modal passes axe audit', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Modal Test</h1>
        <button type="button" class="flex-button" aria-controls="modal-axe" data-open-modal>Open</button>
        <flex-modal id="modal-axe" hidden>
          <div class="flex-modal__overlay"></div>
          <div class="flex-modal__content" role="dialog" aria-modal="true" aria-labelledby="modal-axe-h" aria-describedby="modal-axe-b">
            <div class="flex-modal__main">
              <h2 class="flex-modal__heading" id="modal-axe-h">Heading</h2>
              <div class="flex-modal__body" id="modal-axe-b"><p>Body.</p></div>
              <div class="flex-modal__footer">
                <button type="button" class="flex-button" data-close-modal>Close</button>
              </div>
            </div>
            <button type="button" class="flex-modal__close" aria-label="Close this modal" data-close-modal>&times;</button>
          </div>
        </flex-modal>
      </main>`,
    )

    await page.evaluate(() => {
      document.title = 'Modal Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
