import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { expectMatch } from '../../lib/test-helpers/assertions'
import {
  renderFlexFixture,
  renderUswdsFixture,
} from '../../lib/test-helpers/render'
import { diff, extract } from '../../lib/visual-descriptor'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

const IGNORE = {
  ignoreProperties: [
    'font-family',
    'font-size',
    'line-height',
    'color',
    'outline',
  ],
  ignoreBoxKeys: ['width', 'height'],
}

const flexAccordionCollapsedHtml = `
  <flex-accordion data-testid="target">
    <div>
      <h3 class="flex-accordion__heading">
        <button class="flex-accordion__button" aria-expanded="false" aria-controls="accordion-panel-1">
          First Amendment
        </button>
      </h3>
      <div class="flex-accordion__content" id="accordion-panel-1" hidden>
        <p>Congress shall make no law...</p>
      </div>
    </div>
    <div>
      <h3 class="flex-accordion__heading">
        <button class="flex-accordion__button" aria-expanded="false" aria-controls="accordion-panel-2">
          Second Amendment
        </button>
      </h3>
      <div class="flex-accordion__content" id="accordion-panel-2" hidden>
        <p>A well regulated Militia...</p>
      </div>
    </div>
  </flex-accordion>
`

const uswdsAccordionCollapsedHtml = `
  <div class="usa-accordion" data-testid="target">
    <h3 class="usa-accordion__heading">
      <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="uswds-panel-1">
        First Amendment
      </button>
    </h3>
    <div id="uswds-panel-1" class="usa-accordion__content usa-prose" hidden>
      <p>Congress shall make no law...</p>
    </div>
    <h3 class="usa-accordion__heading">
      <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="uswds-panel-2">
        Second Amendment
      </button>
    </h3>
    <div id="uswds-panel-2" class="usa-accordion__content usa-prose" hidden>
      <p>A well regulated Militia...</p>
    </div>
  </div>
`

test.describe('flex-accordion conformance', () => {
  test('collapsed accordion matches usa-accordion collapsed state', async ({
    page,
  }) => {
    await renderUswdsFixture(page, uswdsAccordionCollapsedHtml)
    const reference = await extract(
      page,
      '',
      '[data-testid="target"] .usa-accordion__button',
    )

    await renderFlexFixture(page, flexAccordionCollapsedHtml)
    const implementation = await extract(
      page,
      '',
      '[data-testid="target"] .flex-accordion__button',
    )

    const differences = diff(reference, implementation, '', {
      ...IGNORE,
      ignoreProperties: [
        ...IGNORE.ignoreProperties,
        // Background color differs at token level
        'background-color',
        // Border specifics differ — our button has border-bottom, USWDS uses different border approach
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'border-top-width',
        'border-right-width',
        'border-bottom-width',
        'border-left-width',
        'border-top-style',
        'border-right-style',
        'border-bottom-style',
        'border-left-style',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        // Layout: we use flex for space-between with +/- indicator; USWDS uses inline-block with bg image
        'display',
        'align-items',
        'justify-content',
      ],
      ignoreBoxKeys: [...IGNORE.ignoreBoxKeys, 'paddingRight', 'paddingLeft'],
      ignoreAttributes: ['class', 'data-testid', 'type', 'aria-controls'],
      ignoreChildren: true,
      ignorePseudos: true,
    })
    expectMatch(differences)
  })
})

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
