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

// --- Custom behavioral tests ---

test.describe('flex-language-selector multi-language behavior', () => {
  async function renderMultiWithJs(page: import('@playwright/test').Page) {
    await renderFlexFixture(
      page,
      `<nav aria-label="Language selection">
        <flex-language-selector>
          <button type="button" class="flex-language-selector__button" aria-expanded="false" aria-controls="lang-menu">
            Languages
          </button>
          <ul class="flex-language-selector__menu" id="lang-menu" hidden>
            <li><a href="/es" class="flex-language-selector__link" lang="es">Espa\u00f1ol</a></li>
            <li><a href="/fr" class="flex-language-selector__link" lang="fr">Fran\u00e7ais</a></li>
            <li><a href="/zh" class="flex-language-selector__link" lang="zh">\u4e2d\u6587</a></li>
          </ul>
        </flex-language-selector>
      </nav>
      <script>${componentsJs}</script>`,
    )
    await page.waitForFunction(() =>
      customElements.get('flex-language-selector'),
    )
  }

  test('button click opens menu', async ({ page }) => {
    await renderMultiWithJs(page)

    const button = page.locator('.flex-language-selector__button')
    const menu = page.locator('#lang-menu')

    await expect(menu).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')

    await button.click()

    await expect(menu).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  test('button click again closes menu', async ({ page }) => {
    await renderMultiWithJs(page)

    const button = page.locator('.flex-language-selector__button')
    const menu = page.locator('#lang-menu')

    // Open
    await button.click()
    await expect(menu).toBeVisible()

    // Close
    await button.click()
    await expect(menu).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('outside click closes menu', async ({ page }) => {
    await renderMultiWithJs(page)

    const button = page.locator('.flex-language-selector__button')
    const menu = page.locator('#lang-menu')

    // Open
    await button.click()
    await expect(menu).toBeVisible()

    // Click outside
    await page.locator('body').click({ position: { x: 10, y: 10 } })

    await expect(menu).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('escape key closes menu and focuses button', async ({ page }) => {
    await renderMultiWithJs(page)

    const button = page.locator('.flex-language-selector__button')
    const menu = page.locator('#lang-menu')

    // Open
    await button.click()
    await expect(menu).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    await expect(menu).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
  })

  test('language links are visible when menu is open', async ({ page }) => {
    await renderMultiWithJs(page)

    const button = page.locator('.flex-language-selector__button')
    await button.click()

    const links = page.locator('.flex-language-selector__link')
    await expect(links).toHaveCount(3)
    await expect(links.first()).toBeVisible()
  })
})

test.describe('flex-language-selector two-language variant', () => {
  test('renders as a simple link without dropdown', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<flex-language-selector data-variant="two">
        <a href="/es" class="flex-language-selector__link" lang="es">Espa\u00f1ol</a>
      </flex-language-selector>
      <script>${componentsJs}</script>`,
    )
    await page.waitForFunction(() =>
      customElements.get('flex-language-selector'),
    )

    const link = page.locator('.flex-language-selector__link')
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/es')
    await expect(link).toHaveAttribute('lang', 'es')

    // No button or menu should exist
    await expect(page.locator('.flex-language-selector__button')).toHaveCount(0)
    await expect(page.locator('.flex-language-selector__menu')).toHaveCount(0)
  })
})

test.describe('flex-language-selector accessibility', () => {
  test('multi-language accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Language Selector Test</h1>
        <nav aria-label="Language selection">
          <flex-language-selector>
            <button type="button" class="flex-language-selector__button" aria-expanded="false" aria-controls="lang-a11y">
              Languages
            </button>
            <ul class="flex-language-selector__menu" id="lang-a11y" hidden>
              <li><a href="/es" class="flex-language-selector__link" lang="es">Espa\u00f1ol</a></li>
              <li><a href="/fr" class="flex-language-selector__link" lang="fr">Fran\u00e7ais</a></li>
            </ul>
          </flex-language-selector>
        </nav>
      </main>`,
    )

    await page.evaluate(() => {
      document.title = 'Language Selector Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('two-language accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Language Selector Test</h1>
        <nav aria-label="Language selection">
          <flex-language-selector data-variant="two">
            <a href="/es" class="flex-language-selector__link" lang="es">Espa\u00f1ol</a>
          </flex-language-selector>
        </nav>
      </main>`,
    )

    await page.evaluate(() => {
      document.title = 'Language Selector Two Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
