import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

function headerWithUserMenuHtml() {
  return `<flex-header class="flex-header">
    <div class="flex-header__inner">
      <div class="flex-header__logo">
        <a href="/" class="flex-header__logo-link">
          <span class="flex-header__logo-text">Forms Lab</span>
        </a>
      </div>
      <button type="button" class="flex-header__menu-btn" aria-expanded="false" aria-controls="header-nav">Menu</button>
      <nav class="flex-header__nav" id="header-nav" aria-label="Primary navigation">
        <button type="button" class="flex-header__close-btn" aria-controls="header-nav">Close</button>
        <ul class="flex-header__nav-list">
          <li class="flex-header__nav-item">
            <a href="/catalog" class="flex-header__nav-link">Catalog</a>
          </li>
        </ul>
        <div class="flex-header__user-menu" data-header-user-menu>
          <button type="button" class="flex-header__user-trigger"
                  aria-haspopup="menu" aria-expanded="false"
                  aria-controls="header-user-menu">
            <img src="https://example.com/avatar.png" alt=""
                 width="32" height="32" class="flex-header__avatar">
            <span class="u-visually-hidden">Account menu for Test User</span>
          </button>
          <div class="flex-header__user-panel" id="header-user-menu"
               role="menu" aria-label="Account menu for Test User" hidden>
            <div class="flex-header__user-identity">
              <img src="https://example.com/avatar.png" alt="" width="48" height="48"
                   class="flex-header__avatar flex-header__avatar--lg">
              <div>
                <div class="flex-header__user-name">Test User</div>
                <div class="flex-header__user-login">@testuser</div>
              </div>
            </div>
            <form method="post" action="/auth/signout" class="flex-header__user-signout">
              <button type="submit" role="menuitem" class="flex-header__user-signout-btn">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
    </div>
  </flex-header>
  <script>${componentsJs}</script>`
}

async function renderDesktopHeader(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await renderFlexFixture(page, headerWithUserMenuHtml())
  await page.waitForFunction(() => customElements.get('flex-header'))
}

test.describe('flex-header user menu', () => {
  test('trigger click toggles aria-expanded and panel hidden attribute', async ({
    page,
  }) => {
    await renderDesktopHeader(page)

    const trigger = page.locator('.flex-header__user-trigger')
    const panel = page.locator('.flex-header__user-panel')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('hidden', '')

    await trigger.click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).not.toHaveAttribute('hidden', '')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('hidden', '')
  })

  test('Escape closes the menu and returns focus to the trigger', async ({
    page,
  }) => {
    await renderDesktopHeader(page)
    const trigger = page.locator('.flex-header__user-trigger')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const focusedClass = await page.evaluate(
      () => document.activeElement?.className,
    )
    expect(focusedClass).toContain('flex-header__user-trigger')
  })

  test('outside click closes the menu', async ({ page }) => {
    await renderDesktopHeader(page)
    const trigger = page.locator('.flex-header__user-trigger')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Click somewhere outside the menu root but not on a link
    await page
      .locator('.flex-header__inner')
      .click({ position: { x: 10, y: 10 } })

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('crossing to mobile viewport force-closes the menu', async ({
    page,
  }) => {
    await renderDesktopHeader(page)
    const trigger = page.locator('.flex-header__user-trigger')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Shrink to mobile width to fire the breakpoint change
    await page.setViewportSize({ width: 375, height: 667 })

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
