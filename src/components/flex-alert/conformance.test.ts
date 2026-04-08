import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers/render'
import { expectMatch } from '../../lib/test-helpers/assertions'
import { extract, diff } from '../../lib/visual-descriptor'

const IGNORE = {
  ignoreProperties: [
    'font-family',
    'font-size',
    'line-height',
    'display',
    // Our structure has no __body wrapper, so padding lives on the outer element
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    // Border color on non-left sides is inherited text color, differs at token level
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    // Outline color inherits from color
    'outline',
    'color',
  ],
  ignoreBoxKeys: ['width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
}

test.describe('flex-alert conformance', () => {
  test('info alert matches usa-alert--info', async ({ page }) => {
    await renderUswdsFixture(
      page,
      `<div class="usa-alert usa-alert--info" role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">Heading</h4>
          <p class="usa-alert__text">Body text.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="info" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Heading</h4>
        <p class="flex-alert__text">Body text.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE,
      ignoreAttributes: ['class', 'data-testid', 'data-variant'],
      ignoreChildren: true,
    })
    expectMatch(differences)
  })

  test('error alert matches usa-alert--error', async ({ page }) => {
    await renderUswdsFixture(
      page,
      `<div class="usa-alert usa-alert--error" role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">Error</h4>
          <p class="usa-alert__text">Error text.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="error" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Error</h4>
        <p class="flex-alert__text">Error text.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    const differences = diff(reference, implementation, '', {
      ...IGNORE,
      ignoreProperties: [
        ...IGNORE.ignoreProperties,
        // Error red shade differs at token level (USWDS red-warm-vivid-60 vs our red-vivid-60)
        'border-left-color',
      ],
      ignoreAttributes: ['class', 'data-testid', 'data-variant'],
      ignoreChildren: true,
    })
    expectMatch(differences)
  })

  test('accessibility audit with all variants', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<main>
        <h1>Alert Test</h1>
        <div class="flex-alert" data-variant="info" role="alert">
          <h4 class="flex-alert__heading">Info</h4>
          <p class="flex-alert__text">Info alert.</p>
        </div>
        <div class="flex-alert" data-variant="warning" role="alert">
          <h4 class="flex-alert__heading">Warning</h4>
          <p class="flex-alert__text">Warning alert.</p>
        </div>
        <div class="flex-alert" data-variant="success" role="alert">
          <h4 class="flex-alert__heading">Success</h4>
          <p class="flex-alert__text">Success alert.</p>
        </div>
        <div class="flex-alert" data-variant="error" role="alert">
          <h4 class="flex-alert__heading">Error</h4>
          <p class="flex-alert__text">Error alert.</p>
        </div>
        <div class="flex-alert" data-variant="emergency" role="alert">
          <h4 class="flex-alert__heading">Emergency</h4>
          <p class="flex-alert__text">Emergency alert.</p>
        </div>
      </main>`,
    )

    await page.evaluate(() => {
      document.title = 'Alert Conformance Test'
    })

    const results = await new AxeBuilder({ page })
      .disableRules(['heading-order'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
