import { expect, test } from '@playwright/test'
import { renderFlexFixture, renderUswdsFixture } from './render'

/**
 * Token Conformance Test
 * ======================
 *
 * PURPOSE: Guarantees our --flex-color-* semantic tokens produce identical
 * computed colors to USWDS 3.13 default theme tokens. This is the primary
 * safeguard against visual drift from the USWDS design system.
 *
 * HOW IT WORKS: For each mapping, we render a div styled with our token
 * and another div styled with the equivalent USWDS utility class, then
 * compare the computed CSS property values. They must be identical.
 *
 * IMPORTANT — READ BEFORE MODIFYING:
 *
 * - If a test FAILS, the fix is almost always in src/public/tokens.css.
 *   The token's palette reference has drifted from USWDS. Check the
 *   USWDS theme settings at:
 *   https://github.com/uswds/uswds/blob/main/packages/uswds-core/src/styles/settings/_settings-color.scss
 *
 * - Do NOT "fix" a failure by changing the USWDS class in the mapping.
 *   The USWDS classes are the source of truth. If a mapping looks wrong,
 *   verify against the USWDS documentation before changing it.
 *
 * - Do NOT remove a mapping to make tests pass. Every semantic token
 *   that corresponds to a USWDS theme token MUST be tested here.
 *
 * - When adding a new --flex-color-* token to tokens.css, add a
 *   corresponding entry here with the USWDS equivalent.
 *
 * - Tokens that don't map to a USWDS utility class (e.g., disabled-*)
 *   are verified against raw palette utility classes (bg-gray-20, etc.)
 *   since USWDS documents the palette grade but doesn't provide a
 *   semantic utility class for them.
 *
 * USWDS 3.13 theme token reference:
 *   base-lightest = gray-5, base-lighter = gray-cool-10, base-light = gray-cool-30,
 *   base = gray-cool-50, base-dark = gray-cool-60, base-darker = gray-cool-70,
 *   base-darkest/ink = gray-90, primary = blue-60v, info = cyan-30v,
 *   success = green-cool-40v, warning = gold-20v, error = red-warm-50v
 */

interface TokenMapping {
  /** Human-readable description: "our name = USWDS name" */
  name: string
  /** Our CSS custom property, e.g. '--flex-color-accent' */
  flexToken: string
  /** USWDS utility class that applies the equivalent color */
  uswdsClass: string
  /** CSS property to compare */
  property: 'background-color' | 'color' | 'border-color'
}

const TOKEN_MAPPINGS: TokenMapping[] = [
  // --- Page backgrounds ---
  {
    name: 'bg = white (USWDS default page background)',
    flexToken: '--flex-color-bg',
    uswdsClass: 'bg-white',
    property: 'background-color',
  },
  {
    name: 'bg-subtle = base-lightest (gray-5)',
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

  // --- Borders and UI chrome ---
  {
    name: 'border = base-lighter (gray-cool-10)',
    flexToken: '--flex-color-border',
    uswdsClass: 'bg-base-lighter',
    property: 'background-color',
  },
  {
    name: 'table-header = base-lighter (gray-cool-10)',
    flexToken: '--flex-color-table-header',
    uswdsClass: 'bg-base-lighter',
    property: 'background-color',
  },
  {
    name: 'ink = base (gray-cool-50)',
    flexToken: '--flex-color-ink',
    uswdsClass: 'bg-base',
    property: 'background-color',
  },
  {
    name: 'on-accent = white',
    flexToken: '--flex-color-on-accent',
    uswdsClass: 'bg-white',
    property: 'background-color',
  },

  // --- Primary / accent ---
  {
    name: 'accent = primary (blue-60v)',
    flexToken: '--flex-color-accent',
    uswdsClass: 'bg-primary',
    property: 'background-color',
  },

  // --- Status: info ---
  {
    name: 'info = info (cyan-30v)',
    flexToken: '--flex-color-info',
    uswdsClass: 'bg-info',
    property: 'background-color',
  },
  {
    name: 'info-lighter = info-lighter (cyan-5)',
    flexToken: '--flex-color-info-lighter',
    uswdsClass: 'bg-info-lighter',
    property: 'background-color',
  },

  // --- Status: success ---
  {
    name: 'success = success (green-cool-40v)',
    flexToken: '--flex-color-success',
    uswdsClass: 'bg-success',
    property: 'background-color',
  },
  {
    name: 'success-lighter = success-lighter (green-cool-5)',
    flexToken: '--flex-color-success-lighter',
    uswdsClass: 'bg-success-lighter',
    property: 'background-color',
  },

  // --- Status: warning ---
  {
    name: 'warning = warning (gold-20v)',
    flexToken: '--flex-color-warning',
    uswdsClass: 'bg-warning',
    property: 'background-color',
  },
  {
    name: 'warning-lighter = warning-lighter (yellow-5)',
    flexToken: '--flex-color-warning-lighter',
    uswdsClass: 'bg-warning-lighter',
    property: 'background-color',
  },

  // --- Status: error / emergency ---
  {
    name: 'error = error (red-warm-50v)',
    flexToken: '--flex-color-error',
    uswdsClass: 'bg-error',
    property: 'background-color',
  },
  {
    name: 'emergency = emergency (red-warm-60v)',
    flexToken: '--flex-color-emergency',
    uswdsClass: 'bg-emergency',
    property: 'background-color',
  },
  {
    name: 'error-lighter = error-lighter (red-warm-10)',
    flexToken: '--flex-color-error-lighter',
    uswdsClass: 'bg-error-lighter',
    property: 'background-color',
  },

  // --- Disabled states ---
  // USWDS doesn't have semantic utility classes for disabled, but documents
  // the palette grades. We verify against raw gray palette utility classes.
  {
    name: 'disabled = gray-50',
    flexToken: '--flex-color-disabled',
    uswdsClass: 'bg-gray-50',
    property: 'background-color',
  },
  // disabled-light (gray-40) and disabled-lighter (gray-20) don't have
  // USWDS utility classes — verified via hex assertion tests below.
  {
    name: 'disabled-dark = gray-70',
    flexToken: '--flex-color-disabled-dark',
    uswdsClass: 'bg-gray-70',
    property: 'background-color',
  },

  // --- Text colors ---
  {
    name: 'text = ink (gray-90)',
    flexToken: '--flex-color-text',
    uswdsClass: 'text-ink',
    property: 'color',
  },
  {
    name: 'text-muted = base-dark (gray-cool-60)',
    flexToken: '--flex-color-text-muted',
    uswdsClass: 'text-base-dark',
    property: 'color',
  },
]

test.describe('token conformance — flex semantic tokens vs USWDS theme tokens', () => {
  for (const mapping of TOKEN_MAPPINGS) {
    test(`${mapping.name}`, async ({ page }) => {
      // Render element styled with our semantic token
      await renderFlexFixture(
        page,
        `<div data-testid="flex" style="${mapping.property}: var(${mapping.flexToken}); width: 50px; height: 50px;">${mapping.property === 'color' ? 'text' : ''}</div>`,
      )
      const flexColor = await page
        .locator('[data-testid="flex"]')
        .evaluate(
          (el, prop) => getComputedStyle(el).getPropertyValue(prop),
          mapping.property,
        )

      // Render element styled with USWDS utility class
      await renderUswdsFixture(
        page,
        `<div data-testid="uswds" class="${mapping.uswdsClass}" style="width: 50px; height: 50px;">${mapping.property === 'color' ? 'text' : ''}</div>`,
      )
      const uswdsColor = await page
        .locator('[data-testid="uswds"]')
        .evaluate(
          (el, prop) => getComputedStyle(el).getPropertyValue(prop),
          mapping.property,
        )

      expect(
        flexColor,
        `Token ${mapping.flexToken} (${flexColor}) should match USWDS .${mapping.uswdsClass} (${uswdsColor}). Fix the token in src/public/tokens.css, NOT this test.`,
      ).toBe(uswdsColor)
    })
  }
})

/**
 * Hex-based token tests for USWDS palette grades that don't have
 * utility classes (gray-20, gray-40). These verify our tokens resolve
 * to the correct USWDS palette hex values directly.
 */
const HEX_MAPPINGS: { name: string; flexToken: string; expectedRgb: string }[] =
  [
    {
      name: 'disabled-light = gray-40 (#919191)',
      flexToken: '--flex-color-disabled-light',
      expectedRgb: 'rgb(145, 145, 145)',
    },
    {
      name: 'disabled-lighter = gray-20 (#c9c9c9)',
      flexToken: '--flex-color-disabled-lighter',
      expectedRgb: 'rgb(201, 201, 201)',
    },
  ]

test.describe(
  'token conformance — hex verification for tokens without USWDS utility classes',
  () => {
    for (const mapping of HEX_MAPPINGS) {
      test(`${mapping.name}`, async ({ page }) => {
        await renderFlexFixture(
          page,
          `<div data-testid="flex" style="background-color: var(${mapping.flexToken}); width: 50px; height: 50px;"></div>`,
        )
        const computed = await page
          .locator('[data-testid="flex"]')
          .evaluate((el) =>
            getComputedStyle(el).getPropertyValue('background-color'),
          )

        expect(
          computed,
          `Token ${mapping.flexToken} (${computed}) should be ${mapping.expectedRgb}. Fix the token in src/public/tokens.css, NOT this test.`,
        ).toBe(mapping.expectedRgb)
      })
    }
  },
)
