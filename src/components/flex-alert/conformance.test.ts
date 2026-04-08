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
          <h4 class="usa-alert__heading">Informative status</h4>
          <p class="usa-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);" class="usa-link">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="info" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Informative status</h4>
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
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
          <h4 class="usa-alert__heading">Error status</h4>
          <p class="usa-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);" class="usa-link">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="error" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Error status</h4>
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
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
          <h4 class="usa-alert__heading">Success status</h4>
          <p class="usa-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);" class="usa-link">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="success" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Success status</h4>
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
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
          <h4 class="usa-alert__heading">Warning status</h4>
          <p class="usa-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);" class="usa-link">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
      </div>`,
    )
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="warning" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Warning status</h4>
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
      </div>`,
    )
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', STRUCTURAL_IGNORE))
  })
})

// --- Icon color conformance ---
// USWDS alert icons are ink-colored (gray-90) for standard variants,
// but WHITE for emergency (which has a dark background). Verified by
// inspecting USWDS's computed .usa-alert__body::before background-color.

const INK_ICON_VARIANTS = ['info', 'success', 'warning', 'error']

test.describe('flex-alert icon color conformance', () => {
  for (const variant of INK_ICON_VARIANTS) {
    test(`${variant} alert icon is ink-colored`, async ({ page }) => {
      await renderFlexFixture(
        page,
        `<div class="flex-alert" data-variant="${variant}" role="alert" data-testid="target">
          <h4 class="flex-alert__heading">${variant.charAt(0).toUpperCase() + variant.slice(1)} status</h4>
          <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
        <div data-testid="ink" style="background-color: var(--flex-color-text); width: 10px; height: 10px;"></div>`,
      )

      const iconColor = await page
        .locator('[data-testid="target"]')
        .evaluate((el) =>
          getComputedStyle(el, '::before').getPropertyValue('background-color'),
        )

      const inkColor = await page
        .locator('[data-testid="ink"]')
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('background-color'),
        )

      expect(
        iconColor,
        `Alert "${variant}" icon (${iconColor}) must be ink (${inkColor}). Fix ::before background-color in flex-alert/styles.css.`,
      ).toBe(inkColor)
    })
  }

  test('emergency alert icon is white (inverted for dark background)', async ({
    page,
  }) => {
    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="emergency" role="alert" data-testid="target">
        <h4 class="flex-alert__heading">Emergency status</h4>
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
      </div>
      <div data-testid="white" style="background-color: var(--flex-color-on-accent); width: 10px; height: 10px;"></div>`,
    )

    const iconColor = await page
      .locator('[data-testid="target"]')
      .evaluate((el) =>
        getComputedStyle(el, '::before').getPropertyValue('background-color'),
      )

    const whiteColor = await page
      .locator('[data-testid="white"]')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('background-color'),
      )

    expect(
      iconColor,
      `Emergency icon (${iconColor}) must be white (${whiteColor}). Emergency has dark bg, icon must be inverted. Fix in flex-alert/styles.css.`,
    ).toBe(whiteColor)
  })

  test('emergency alert has dark background and white text', async ({
    page,
  }) => {
    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="emergency" role="alert" data-testid="target">
        <h4 class="flex-alert__heading" data-testid="heading">Emergency status</h4>
        <p class="flex-alert__text" data-testid="text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);" data-testid="link">consectetur adipiscing</a> elit, sed do eiusmod.</p>
      </div>
      <div data-testid="emergency-bg" style="background-color: var(--flex-color-emergency); width: 10px; height: 10px;"></div>`,
    )

    const bg = await page
      .locator('[data-testid="target"]')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('background-color'),
      )

    const expectedBg = await page
      .locator('[data-testid="emergency-bg"]')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('background-color'),
      )

    expect(
      bg,
      `Emergency background (${bg}) must match --flex-color-emergency (${expectedBg}).`,
    ).toBe(expectedBg)

    const headingColor = await page
      .locator('[data-testid="heading"]')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('color'))

    const textColor = await page
      .locator('[data-testid="text"]')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('color'))

    const linkColor = await page
      .locator('[data-testid="link"]')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('color'))

    // Heading, text, and links must all be white on dark emergency background
    expect(headingColor, 'Emergency heading must be white').toBe(
      'rgb(255, 255, 255)',
    )
    expect(textColor, 'Emergency text must be white').toBe(
      'rgb(255, 255, 255)',
    )
    expect(linkColor, 'Emergency link must be white').toBe(
      'rgb(255, 255, 255)',
    )
  })

  test('slim alert has no visible icon', async ({ page }) => {
    await renderFlexFixture(
      page,
      `<div class="flex-alert" data-variant="info" data-slim role="alert" data-testid="target">
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
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
        <h4 class="flex-alert__heading">Informative status</h4>
        <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
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
          <h4 class="flex-alert__heading">Informative status</h4>
          <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
        <div class="flex-alert" data-variant="warning" role="alert">
          <h4 class="flex-alert__heading">Warning status</h4>
          <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
        <div class="flex-alert" data-variant="success" role="alert">
          <h4 class="flex-alert__heading">Success status</h4>
          <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
        <div class="flex-alert" data-variant="error" role="alert">
          <h4 class="flex-alert__heading">Error status</h4>
          <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
        </div>
        <div class="flex-alert" data-variant="emergency" role="alert">
          <h4 class="flex-alert__heading">Emergency status</h4>
          <p class="flex-alert__text">Lorem ipsum dolor sit amet, <a href="javascript:void(0);">consectetur adipiscing</a> elit, sed do eiusmod.</p>
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
