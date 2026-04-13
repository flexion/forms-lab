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

test.describe('flex-tab-group behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-tab-group'))
  }

  const fixture = `
    <flex-tab-group>
      <div role="tablist" aria-label="Test tabs">
        <button type="button" role="tab" aria-selected="true" aria-controls="p1" id="t1" class="flex-tab-group__tab">First</button>
        <button type="button" role="tab" aria-selected="false" aria-controls="p2" id="t2" tabindex="-1" class="flex-tab-group__tab">Second</button>
        <button type="button" role="tab" aria-selected="false" aria-controls="p3" id="t3" tabindex="-1" class="flex-tab-group__tab">Third</button>
      </div>
      <div role="tabpanel" id="p1" aria-labelledby="t1" class="flex-tab-group__panel"><p>First content</p></div>
      <div role="tabpanel" id="p2" aria-labelledby="t2" class="flex-tab-group__panel" hidden><p>Second content</p></div>
      <div role="tabpanel" id="p3" aria-labelledby="t3" class="flex-tab-group__panel" hidden><p>Third content</p></div>
    </flex-tab-group>
  `

  test('click tab switches active panel', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab2 = page.locator('#t2')
    const panel1 = page.locator('#p1')
    const panel2 = page.locator('#p2')
    await expect(panel1).toBeVisible()
    await expect(panel2).toBeHidden()
    await tab2.click()
    await expect(tab2).toHaveAttribute('aria-selected', 'true')
    await expect(panel2).toBeVisible()
    await expect(panel1).toBeHidden()
  })

  test('Arrow Right moves to next tab', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab1 = page.locator('#t1')
    const tab2 = page.locator('#t2')
    const panel2 = page.locator('#p2')
    await tab1.focus()
    await page.keyboard.press('ArrowRight')
    await expect(tab2).toBeFocused()
    await expect(tab2).toHaveAttribute('aria-selected', 'true')
    await expect(panel2).toBeVisible()
  })

  test('Arrow Left moves to previous tab', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab2 = page.locator('#t2')
    await tab2.click()
    await expect(tab2).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowLeft')
    const tab1 = page.locator('#t1')
    await expect(tab1).toBeFocused()
    await expect(tab1).toHaveAttribute('aria-selected', 'true')
  })

  test('Home moves to first tab', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab3 = page.locator('#t3')
    await tab3.click()
    await page.keyboard.press('Home')
    const tab1 = page.locator('#t1')
    await expect(tab1).toBeFocused()
    await expect(tab1).toHaveAttribute('aria-selected', 'true')
  })

  test('End moves to last tab', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab1 = page.locator('#t1')
    await tab1.focus()
    await page.keyboard.press('End')
    const tab3 = page.locator('#t3')
    await expect(tab3).toBeFocused()
    await expect(tab3).toHaveAttribute('aria-selected', 'true')
  })

  test('Arrow Right wraps from last to first', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab3 = page.locator('#t3')
    await tab3.click()
    await page.keyboard.press('ArrowRight')
    const tab1 = page.locator('#t1')
    await expect(tab1).toBeFocused()
    await expect(tab1).toHaveAttribute('aria-selected', 'true')
  })

  test('Arrow Left wraps from first to last', async ({ page }) => {
    await renderWithJs(page, fixture)
    const tab1 = page.locator('#t1')
    await tab1.focus()
    await page.keyboard.press('ArrowLeft')
    const tab3 = page.locator('#t3')
    await expect(tab3).toBeFocused()
    await expect(tab3).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('flex-tab-group nesting', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-tab-group'))
  }

  test('clicking inner tab does not affect outer tab group', async ({
    page,
  }) => {
    await renderWithJs(
      page,
      `
      <flex-tab-group>
        <div role="tablist" aria-label="Outer">
          <button type="button" role="tab" aria-selected="true" aria-controls="outer-p1" id="outer-t1" class="flex-tab-group__tab">Preview</button>
          <button type="button" role="tab" aria-selected="false" aria-controls="outer-p2" id="outer-t2" tabindex="-1" class="flex-tab-group__tab">Code</button>
        </div>
        <div role="tabpanel" id="outer-p1" aria-labelledby="outer-t1" class="flex-tab-group__panel">
          <flex-tab-group>
            <div role="tablist" aria-label="Inner">
              <button type="button" role="tab" aria-selected="true" aria-controls="inner-p1" id="inner-t1" class="flex-tab-group__tab">First</button>
              <button type="button" role="tab" aria-selected="false" aria-controls="inner-p2" id="inner-t2" tabindex="-1" class="flex-tab-group__tab">Second</button>
            </div>
            <div role="tabpanel" id="inner-p1" aria-labelledby="inner-t1" class="flex-tab-group__panel"><p>Inner first</p></div>
            <div role="tabpanel" id="inner-p2" aria-labelledby="inner-t2" class="flex-tab-group__panel" hidden><p>Inner second</p></div>
          </flex-tab-group>
        </div>
        <div role="tabpanel" id="outer-p2" aria-labelledby="outer-t2" class="flex-tab-group__panel" hidden><p>Code content</p></div>
      </flex-tab-group>
      `,
    )

    // Click inner tab
    await page.locator('#inner-t2').click()

    // Inner tab group should switch
    await expect(page.locator('#inner-t2')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.locator('#inner-p2')).toBeVisible()

    // Outer tab group should be unaffected
    await expect(page.locator('#outer-t1')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.locator('#outer-p1')).toBeVisible()
  })
})

test.describe('flex-tab-group accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Tab Test</h1>
        <flex-tab-group>
          <div role="tablist" aria-label="Test tabs">
            <button type="button" role="tab" aria-selected="true" aria-controls="a-p1" id="a-t1" class="flex-tab-group__tab">First</button>
            <button type="button" role="tab" aria-selected="false" aria-controls="a-p2" id="a-t2" tabindex="-1" class="flex-tab-group__tab">Second</button>
          </div>
          <div role="tabpanel" id="a-p1" aria-labelledby="a-t1" class="flex-tab-group__panel"><p>First content.</p></div>
          <div role="tabpanel" id="a-p2" aria-labelledby="a-t2" class="flex-tab-group__panel" hidden><p>Second content.</p></div>
        </flex-tab-group>
      </main>
      `,
    )
    await page.evaluate(() => {
      document.title = 'Tab Group Conformance Test'
    })
    const results = await new AxeBuilder({ page })
      .disableRules(['heading-order'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
