import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers/render'
import { expectMatch } from '../../lib/test-helpers/assertions'
import { extract, diff } from '../../lib/visual-descriptor'

const IGNORE_FONT = {
  ignoreProperties: [
    'font-family',
    'font-size',
    'line-height',
    'display',
    // Border color differs at token level (--flex-color-ink vs USWDS ink)
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ],
  ignoreBoxKeys: ['width', 'height'],
}

test.describe('flex-text-input conformance', () => {
  test('default input matches usa-input', async ({ page }) => {
    await renderUswdsFixture(
      page,
      '<input class="usa-input" data-testid="target" />',
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      '<input class="flex-input" data-testid="target" />',
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreAttributes: ['class', 'data-testid'],
    })
    expectMatch(differences)
  })

  test('error state matches usa-input--error', async ({ page }) => {
    await renderUswdsFixture(
      page,
      '<input class="usa-input usa-input--error" data-testid="target" />',
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      '<input class="flex-input" data-state="error" data-testid="target" />',
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreAttributes: ['class', 'data-testid', 'data-state'],
    })
    expectMatch(differences)
  })

  test('accessibility audit with form controls', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Text Input Test</h1>
        <label class="flex-label" for="test-input">Name</label>
        <input class="flex-input" id="test-input" data-testid="target" />
        <label class="flex-label" for="test-error">Email</label>
        <input class="flex-input" id="test-error" data-state="error" aria-describedby="err-msg" />
        <span class="flex-error-message" id="err-msg" role="alert">Error</span>
        <label class="flex-label" for="test-disabled">Disabled</label>
        <input class="flex-input" id="test-disabled" disabled />
      </main>`,
    )

    await page.evaluate(() => {
      document.title = 'Text Input Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
