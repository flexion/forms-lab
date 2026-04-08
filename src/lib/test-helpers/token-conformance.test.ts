import { expect, test } from '@playwright/test'
import { renderFlexFixture, renderUswdsFixture } from './render'

/**
 * Token conformance test — verifies our semantic color tokens produce
 * the same computed colors as USWDS theme tokens.
 *
 * Each entry maps our semantic token to the USWDS class that applies
 * the equivalent theme color. We render a div with each and compare
 * the computed background-color.
 */

interface TokenMapping {
  name: string
  flexToken: string
  uswdsClass: string
  property: 'background-color' | 'color' | 'border-color'
}

const TOKEN_MAPPINGS: TokenMapping[] = [
  // Background colors
  {
    name: 'bg-subtle = base-lightest',
    flexToken: '--flex-color-bg-subtle',
    uswdsClass: 'bg-base-lightest',
    property: 'background-color',
  },
  {
    name: 'surface = white',
    flexToken: '--flex-color-surface',
    uswdsClass: 'bg-white',
    property: 'background-color',
  },
  {
    name: 'accent = primary',
    flexToken: '--flex-color-accent',
    uswdsClass: 'bg-primary',
    property: 'background-color',
  },
  {
    name: 'info = info',
    flexToken: '--flex-color-info',
    uswdsClass: 'bg-info',
    property: 'background-color',
  },
  {
    name: 'info-lighter = info-lighter',
    flexToken: '--flex-color-info-lighter',
    uswdsClass: 'bg-info-lighter',
    property: 'background-color',
  },
  {
    name: 'success = success',
    flexToken: '--flex-color-success',
    uswdsClass: 'bg-success',
    property: 'background-color',
  },
  {
    name: 'success-lighter = success-lighter',
    flexToken: '--flex-color-success-lighter',
    uswdsClass: 'bg-success-lighter',
    property: 'background-color',
  },
  {
    name: 'warning = warning',
    flexToken: '--flex-color-warning',
    uswdsClass: 'bg-warning',
    property: 'background-color',
  },
  {
    name: 'warning-lighter = warning-lighter',
    flexToken: '--flex-color-warning-lighter',
    uswdsClass: 'bg-warning-lighter',
    property: 'background-color',
  },
  {
    name: 'error = error',
    flexToken: '--flex-color-error',
    uswdsClass: 'bg-error',
    property: 'background-color',
  },
  {
    name: 'error-lighter = error-lighter',
    flexToken: '--flex-color-error-lighter',
    uswdsClass: 'bg-error-lighter',
    property: 'background-color',
  },
  // Disabled tokens don't have direct USWDS utility classes — they map to
  // specific gray palette grades verified by the palette token values themselves.
  // disabled-lighter = gray-20 (#c9c9c9), disabled-dark = gray-70 (#454545)

  // Text colors
  {
    name: 'text = ink',
    flexToken: '--flex-color-text',
    uswdsClass: 'text-ink',
    property: 'color',
  },
  {
    name: 'text-muted = base-dark',
    flexToken: '--flex-color-text-muted',
    uswdsClass: 'text-base-dark',
    property: 'color',
  },
  {
    name: 'ink = base',
    flexToken: '--flex-color-ink',
    uswdsClass: 'text-base',
    property: 'color',
  },
]

test.describe('token conformance — flex semantic tokens vs USWDS theme tokens', () => {
  for (const mapping of TOKEN_MAPPINGS) {
    test(`${mapping.name}`, async ({ page }) => {
      // Render our token
      await renderFlexFixture(
        page,
        `<div data-testid="flex" style="${mapping.property}: var(${mapping.flexToken}); width: 50px; height: 50px;"></div>`,
      )
      const flexColor = await page
        .locator('[data-testid="flex"]')
        .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), mapping.property)

      // Render USWDS token
      await renderUswdsFixture(
        page,
        `<div data-testid="uswds" class="${mapping.uswdsClass}" style="width: 50px; height: 50px;">${mapping.property === 'color' ? 'text' : ''}</div>`,
      )
      const uswdsColor = await page
        .locator('[data-testid="uswds"]')
        .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), mapping.property)

      expect(
        flexColor,
        `Token ${mapping.flexToken} (${flexColor}) should match USWDS .${mapping.uswdsClass} (${uswdsColor})`,
      ).toBe(uswdsColor)
    })
  }
})
