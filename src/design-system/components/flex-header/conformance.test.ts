import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

// --- Custom tests for header mobile menu behavior ---

function headerHtml(opts?: { expanded?: boolean }) {
  const expanded = opts?.expanded ?? false
  return `<flex-header class="flex-header">
    <div class="flex-header__inner">
      <div class="flex-header__logo">
        <a href="/" class="flex-header__logo-link">
          <span class="flex-header__logo-text">Forms Lab</span>
        </a>
      </div>
      <button type="button" class="flex-header__menu-btn" aria-expanded="${expanded}" aria-controls="header-nav">Menu</button>
      <nav class="flex-header__nav${expanded ? ' is-visible' : ''}" id="header-nav" aria-label="Primary navigation">
        <button type="button" class="flex-header__close-btn" aria-controls="header-nav">Close</button>
        <ul class="flex-header__nav-list">
          <li class="flex-header__nav-item">
            <a href="/catalog" class="flex-header__nav-link flex-header__nav-link--current" aria-current="page">Catalog</a>
          </li>
          <li class="flex-header__nav-item">
            <a href="/catalog/design-system" class="flex-header__nav-link">Design System</a>
          </li>
        </ul>
      </nav>
    </div>
  </flex-header>
  <script>${componentsJs}</script>`
}

async function renderMobileHeader(page: import('@playwright/test').Page) {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 })
  await renderFlexFixture(page, headerHtml())
  await page.waitForFunction(() => customElements.get('flex-header'))
}

test.describe('flex-header mobile menu', () => {
  test('menu button opens nav and sets aria-expanded', async ({ page }) => {
    await renderMobileHeader(page)

    const menuBtn = page.locator('.flex-header__menu-btn')
    const nav = page.locator('.flex-header__nav')

    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false')

    await menuBtn.click()

    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true')
    await expect(nav).toHaveClass(/is-visible/)
  })

  test('close button hides nav and returns focus to menu button', async ({
    page,
  }) => {
    await renderMobileHeader(page)

    const menuBtn = page.locator('.flex-header__menu-btn')
    const closeBtn = page.locator('.flex-header__close-btn')

    // Open
    await menuBtn.click()
    await expect(page.locator('.flex-header__nav')).toHaveClass(/is-visible/)

    // Close
    await closeBtn.click()

    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.flex-header__nav')).not.toHaveClass(
      /is-visible/,
    )

    // Focus should return to menu button
    const focusedTag = await page.evaluate(
      () => document.activeElement?.className,
    )
    expect(focusedTag).toContain('flex-header__menu-btn')
  })

  test('escape key closes nav', async ({ page }) => {
    await renderMobileHeader(page)

    const menuBtn = page.locator('.flex-header__menu-btn')

    // Open
    await menuBtn.click()
    await expect(page.locator('.flex-header__nav')).toHaveClass(/is-visible/)

    // Press Escape
    await page.keyboard.press('Escape')

    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.flex-header__nav')).not.toHaveClass(
      /is-visible/,
    )
  })

  test('overlay click closes nav', async ({ page }) => {
    await renderMobileHeader(page)

    const menuBtn = page.locator('.flex-header__menu-btn')

    // Open
    await menuBtn.click()
    await expect(page.locator('.flex-header__nav')).toHaveClass(/is-visible/)

    // Click the overlay (appended to body by JS, position: fixed)
    const overlay = page.locator('.flex-header__overlay')
    await expect(overlay).toBeVisible()
    await overlay.click({ position: { x: 10, y: 10 } })

    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.flex-header__nav')).not.toHaveClass(
      /is-visible/,
    )
  })

  test('body scroll is locked when mobile nav is open', async ({ page }) => {
    await renderMobileHeader(page)

    const menuBtn = page.locator('.flex-header__menu-btn')

    // Open
    await menuBtn.click()
    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).toBe('hidden')

    // Close
    await page.locator('.flex-header__close-btn').click()
    const overflowAfter = await page.evaluate(
      () => document.body.style.overflow,
    )
    expect(overflowAfter).toBe('')
  })
})
