import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { expectMatch } from '../../lib/test-helpers/assertions'
import {
  renderFlexFixture,
  renderUswdsFixture,
} from '../../lib/test-helpers/render'
import { diff, extract } from '../../lib/visual-descriptor'

/**
 * Alert conformance tests verify:
 * 1. Visual match against USWDS for background-color and border-left-color
 * 2. Icon color matches the variant's status color (via ::before pseudo-element)
 * 3. All 5 variants have correct icon colors
 * 4. Accessibility audit passes
 */

const STRUCTURAL_IGNORE = {
  // Our alert has a flatter structure than USWDS (no __body wrapper),
  // so we compare the outer element's visual properties directly
  ignoreProperties: [
    'font-family',
    'font-size',
    'line-height',
    'display',
    'position',
    'outline',
    // Padding differs due to our icon approach (CSS ::before vs USWDS bg image)
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    // Non-left borders are transparent in both, but computed values differ
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
  ],
  ignoreBoxKeys: [
    'width',
    'height',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ] as string[],
  ignorePseudos: true,
  ignoreChildren: true,
  ignoreAttributes: ['class', 'data-testid', 'data-variant'],
}

// --- Visual conformance: background and border colors ---

test.describe('flex-alert visual conformance', () => {
  test('info alert background and border match USWDS', async ({ page }) => {
    await renderUswdsFixture(
      page,
      `<div class="usa-alert usa-alert--info" role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">Heading</h4>
          <p class="usa-alert__text">Body.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="info" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Heading</h4>
        <p class="flex-alert__text">Body.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', STRUCTURAL_IGNORE))
  })

  test('error alert background and border match USWDS', async ({ page }) => {
    await renderUswdsFixture(
      page,
      `<div class="usa-alert usa-alert--error" role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">Error</h4>
          <p class="usa-alert__text">Error.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="error" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Error</h4>
        <p class="flex-alert__text">Error.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', STRUCTURAL_IGNORE))
  })

  test('success alert background and border match USWDS', async ({ page }) => {
    await renderUswdsFixture(
      page,
      `<div class="usa-alert usa-alert--success" role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">Success</h4>
          <p class="usa-alert__text">Success.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="success" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Success</h4>
        <p class="flex-alert__text">Success.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', STRUCTURAL_IGNORE))
  })

  test('warning alert background and border match USWDS', async ({ page }) => {
    await renderUswdsFixture(
      page,
      `<div class="usa-alert usa-alert--warning" role="alert" data-testid="target">
        <div class="usa-alert__body">
          <h4 class="usa-alert__heading">Warning</h4>
          <p class="usa-alert__text">Warning.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="warning" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Warning</h4>
        <p class="flex-alert__text">Warning.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', STRUCTURAL_IGNORE))
  })
})

// --- Icon color conformance ---
// USWDS alert icons are ALWAYS ink-colored (gray-90 / #1b1b1b), regardless
// of variant. The status color appears only on the left border and background,
// NOT on the icon. This matches USWDS's actual rendering — verified by
// inspecting computed styles on .usa-alert__body::before.

const ICON_VARIANTS = ['info', 'success', 'warning', 'error', 'emergency']

test.describe('flex-alert icon color conformance', () => {
  for (const variant of ICON_VARIANTS) {
    test(`${variant} alert icon is ink-colored (not status-colored)`, async ({
      page,
    }) => {
      await renderFlexFixture(
        page,
        `<div class="flex-alert" data-variant="${variant}" role="alert" data-testid="target">
          <h4 class="flex-alert__heading">Test</h4>
          <p class="flex-alert__text">Test.</p>
        </div>
        <div data-testid="ink" style="background-color: var(--flex-color-text); width: 10px; height: 10px;"></div>`,
      )

      // Get the icon's computed background-color (the ::before pseudo-element)
      const iconColor = await page
        .locator('[data-testid="target"]')
        .evaluate((el) => {
          const style = getComputedStyle(el, '::before')
          return style.getPropertyValue('background-color')
        })

      // Get the ink color from our token
      const inkColor = await page
        .locator('[data-testid="ink"]')
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('background-color'),
        )

      expect(
        iconColor,
        `Alert variant "${variant}" icon color (${iconColor}) must be ink (${inkColor}), not status-colored. USWDS alert icons are always dark. Fix ::before background-color in flex-alert/styles.css.`,
      ).toBe(inkColor)
    })
  }

  test('slim alert has no visible icon', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="info" data-slim role="alert" data-testid="target">
        <p class="flex-alert__text">Slim alert.</p>
      </div>`,
    )

    const display = await page
      .locator('[data-testid="target"]')
      .evaluate((el) => {
        return getComputedStyle(el, '::before').getPropertyValue('display')
      })

    expect(display).toBe('none')
  })

  test('no-icon alert has no visible icon', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="info" data-no-icon role="alert" data-testid="target">
        <h4 class="flex-alert__heading">No icon</h4>
        <p class="flex-alert__text">No icon alert.</p>
      </div>`,
    )

    const display = await page
      .locator('[data-testid="target"]')
      .evaluate((el) => {
        return getComputedStyle(el, '::before').getPropertyValue('display')
      })

    expect(display).toBe('none')
  })
})

// --- Accessibility ---

test.describe('flex-alert accessibility', () => {
  test('all variants pass axe audit', async ({ page }) => {
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
