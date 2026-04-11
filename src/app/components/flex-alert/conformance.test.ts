import { expect, test } from '@playwright/test'
import {
  runAccessibilityAudit,
  runVisualConformance,
} from '../../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../../lib/test-helpers/render'
import { spec } from './conformance-spec'

// Spec-driven visual conformance and accessibility
runVisualConformance(spec)
runAccessibilityAudit(spec)

// --- Custom tests: icon colors, emergency, slim/no-icon ---
// These test CSS pseudo-elements and computed token colors that the
// generic runner can't handle.

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
    expect(textColor, 'Emergency text must be white').toBe('rgb(255, 255, 255)')
    expect(linkColor, 'Emergency link must be white').toBe('rgb(255, 255, 255)')
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
