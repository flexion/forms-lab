import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers/render'
import { expectMatch } from '../../lib/test-helpers/assertions'
import { extract, diff } from '../../lib/visual-descriptor'

const IGNORE_FONT = {
  ignoreProperties: ['font-family', 'font-size', 'line-height', 'display'],
  ignoreBoxKeys: ['width', 'height'],
}

test.describe('flex-button conformance', () => {
  test('default button matches usa-button', async ({ page }) => {
    await renderUswdsFixture(
      page,
      '<button class="usa-button" data-testid="target">Default</button>',
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      '<button class="flex-button" data-testid="target">Default</button>',
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreAttributes: ['class', 'data-testid'],
    })
    expectMatch(differences)
  })

  test('outline button matches usa-button--outline', async ({ page }) => {
    await renderUswdsFixture(
      page,
      '<button class="usa-button usa-button--outline" data-testid="target">Outline</button>',
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      '<button class="flex-button" data-variant="outline" data-testid="target">Outline</button>',
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreAttributes: ['class', 'data-testid', 'data-variant'],
    })
    expectMatch(differences)
  })

  test('disabled button', async ({ page }) => {
    await renderUswdsFixture(
      page,
      '<button class="usa-button" disabled data-testid="target">Disabled</button>',
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      '<button class="flex-button" disabled data-testid="target">Disabled</button>',
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreAttributes: ['class', 'data-testid'],
    })
    expectMatch(differences)
  })

  test('big button matches usa-button--big', async ({ page }) => {
    await renderUswdsFixture(
      page,
      '<button class="usa-button usa-button--big" data-testid="target">Big</button>',
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      '<button class="flex-button" data-size="big" data-testid="target">Big</button>',
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreAttributes: ['class', 'data-testid', 'data-size'],
    })
    expectMatch(differences)
  })

  test('accessibility audit with multiple variants', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Button Test</h1>
        <button class="flex-button" data-testid="target">Default</button>
        <button class="flex-button" data-variant="secondary">Secondary</button>
        <button class="flex-button" data-variant="outline">Outline</button>
        <button class="flex-button" data-variant="base">Base</button>
        <button class="flex-button" data-variant="accent-cool">Accent Cool</button>
        <button class="flex-button" data-variant="accent-warm">Accent Warm</button>
        <button class="flex-button" disabled>Disabled</button>
      </main>`,
    )

    // Add title for axe page-level checks
    await page.evaluate(() => {
      document.title = 'Button Conformance Test'
    })

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
