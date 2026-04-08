import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runVisualConformance } from '../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../lib/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance
runVisualConformance(spec)

// --- Custom behavioral tests ---
// These test interactive behavior (click, keyboard, multiselectable) that
// the generic runner doesn't cover.

test.describe('flex-accordion behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    // Wait for custom element to be defined
    await page.waitForFunction(() => customElements.get('flex-accordion'))
  }

  test('click button expands content and updates aria-expanded', async ({
    page,
  }) => {
    await renderWithJs(
      page,
      `
      <flex-accordion>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-1">Title</button>
          </h3>
          <div class="flex-accordion__content" id="panel-1" hidden><p>Content</p></div>
        </div>
      </flex-accordion>
    `,
    )

    const button = page.locator('.flex-accordion__button')
    const content = page.locator('#panel-1')

    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(content).toBeHidden()

    await button.click()

    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(content).toBeVisible()
  })

  test('click again collapses content', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-accordion>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="true" aria-controls="panel-1">Title</button>
          </h3>
          <div class="flex-accordion__content" id="panel-1"><p>Content</p></div>
        </div>
      </flex-accordion>
    `,
    )

    const button = page.locator('.flex-accordion__button')
    const content = page.locator('#panel-1')

    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(content).toBeVisible()

    await button.click()

    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(content).toBeHidden()
  })

  test('default mode: opening one closes others', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-accordion>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="true" aria-controls="panel-a">A</button>
          </h3>
          <div class="flex-accordion__content" id="panel-a"><p>A content</p></div>
        </div>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-b">B</button>
          </h3>
          <div class="flex-accordion__content" id="panel-b" hidden><p>B content</p></div>
        </div>
      </flex-accordion>
    `,
    )

    const buttonA = page.locator('.flex-accordion__button', { hasText: 'A' })
    const buttonB = page.locator('.flex-accordion__button', { hasText: 'B' })
    const contentA = page.locator('#panel-a')
    const contentB = page.locator('#panel-b')

    await expect(buttonA).toHaveAttribute('aria-expanded', 'true')
    await expect(contentA).toBeVisible()

    await buttonB.click()

    await expect(buttonB).toHaveAttribute('aria-expanded', 'true')
    await expect(contentB).toBeVisible()
    await expect(buttonA).toHaveAttribute('aria-expanded', 'false')
    await expect(contentA).toBeHidden()
  })

  test('multiselectable: multiple can be open', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-accordion data-multiselectable>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="true" aria-controls="panel-a">A</button>
          </h3>
          <div class="flex-accordion__content" id="panel-a"><p>A content</p></div>
        </div>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-b">B</button>
          </h3>
          <div class="flex-accordion__content" id="panel-b" hidden><p>B content</p></div>
        </div>
      </flex-accordion>
    `,
    )

    const buttonA = page.locator('.flex-accordion__button', { hasText: 'A' })
    const buttonB = page.locator('.flex-accordion__button', { hasText: 'B' })
    const contentA = page.locator('#panel-a')
    const contentB = page.locator('#panel-b')

    await buttonB.click()

    await expect(buttonA).toHaveAttribute('aria-expanded', 'true')
    await expect(contentA).toBeVisible()
    await expect(buttonB).toHaveAttribute('aria-expanded', 'true')
    await expect(contentB).toBeVisible()
  })

  test('keyboard Enter toggles accordion', async ({ page }) => {
    await renderWithJs(
      page,
      `
      <flex-accordion>
        <div>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-1">Title</button>
          </h3>
          <div class="flex-accordion__content" id="panel-1" hidden><p>Content</p></div>
        </div>
      </flex-accordion>
    `,
    )

    const button = page.locator('.flex-accordion__button')
    const content = page.locator('#panel-1')

    await button.focus()
    await page.keyboard.press('Enter')

    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(content).toBeVisible()

    await page.keyboard.press('Enter')

    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(content).toBeHidden()
  })
})

test.describe('flex-accordion hover state', () => {
  test('button hover background matches USWDS', async ({ page }) => {
    const { renderUswdsFixture } = await import('../../lib/test-helpers/render')

    // Get USWDS hover background-color
    await renderUswdsFixture(
      page,
      `<div class="usa-accordion">
        <h3 class="usa-accordion__heading">
          <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="p1">Section</button>
        </h3>
        <div id="p1" class="usa-accordion__content usa-prose" hidden><p>Content.</p></div>
      </div>`,
    )
    await page.hover('.usa-accordion__button')
    const uswdsHoverBg = await page
      .locator('.usa-accordion__button')
      .evaluate((el) => getComputedStyle(el).backgroundColor)

    // Get our hover background-color
    await renderFlexFixture(
      page,
      `<flex-accordion>
        <div>
          <h3 class="flex-accordion__heading">
            <button type="button" class="flex-accordion__button" aria-expanded="false" aria-controls="p1">Section</button>
          </h3>
          <div class="flex-accordion__content" id="p1" hidden><p>Content.</p></div>
        </div>
      </flex-accordion>`,
    )
    await page.hover('.flex-accordion__button')
    const flexHoverBg = await page
      .locator('.flex-accordion__button')
      .evaluate((el) => getComputedStyle(el).backgroundColor)

    expect(
      flexHoverBg,
      `Accordion hover bg (${flexHoverBg}) should match USWDS (${uswdsHoverBg}). Fix :hover background-color in flex-accordion/styles.css.`,
    ).toBe(uswdsHoverBg)
  })
})

test.describe('flex-accordion accessibility', () => {
  test('accessibility audit with mixed expanded/collapsed states', async ({
    page,
  }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Accordion Test</h1>
        <flex-accordion>
          <div>
            <h3 class="flex-accordion__heading">
              <button class="flex-accordion__button" aria-expanded="true" aria-controls="panel-1">First</button>
            </h3>
            <div class="flex-accordion__content" id="panel-1"><p>First content.</p></div>
          </div>
          <div>
            <h3 class="flex-accordion__heading">
              <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-2">Second</button>
            </h3>
            <div class="flex-accordion__content" id="panel-2" hidden><p>Second content.</p></div>
          </div>
          <div>
            <h3 class="flex-accordion__heading">
              <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-3">Third</button>
            </h3>
            <div class="flex-accordion__content" id="panel-3" hidden><p>Third content.</p></div>
          </div>
        </flex-accordion>
      </main>
    `,
    )

    await page.evaluate(() => {
      document.title = 'Accordion Conformance Test'
    })

    const results = await new AxeBuilder({ page })
      .disableRules(['heading-order'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
