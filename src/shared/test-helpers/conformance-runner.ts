import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import type {
  ConformanceSpec,
  FixtureInteraction,
} from '../../design-system/conformance/types'
import { diff, extract } from '../visual-descriptor'
import { expectMatch } from './assertions'
import { renderFlexFixture, renderUswdsFixture } from './render'

/**
 * Trigger an interaction on the page before extracting styles.
 */
async function triggerInteraction(
  page: Page,
  action: FixtureInteraction['action'],
  selector: string,
) {
  const element = page.locator(selector)
  switch (action) {
    case 'hover':
      await element.hover()
      break
    case 'focus':
      await element.focus()
      break
    case 'click':
      await element.click()
      break
  }
}

/**
 * Run visual conformance tests from a ConformanceSpec.
 *
 * For each fixture, renders both USWDS and flex HTML, optionally
 * triggers an interaction (hover/focus/click), extracts computed
 * styles, and diffs them. Properties in spec.structuralIgnores
 * and spec.intentionalDifferences are excluded from comparison.
 */
export function runVisualConformance(spec: ConformanceSpec) {
  const ignoreProperties = [
    ...spec.structuralIgnores,
    ...spec.intentionalDifferences.map((d) => d.property),
  ]

  const ignoreBoxKeys = ['width', 'height', ...(spec.extraIgnoreBoxKeys ?? [])]

  const ignoreAttributes = [
    'class',
    'data-testid',
    'data-variant',
    'data-size',
    'data-state',
    'data-slim',
    'data-no-icon',
    ...(spec.extraIgnoreAttributes ?? []),
  ]

  test.describe(`${spec.component} visual conformance`, () => {
    for (const fixture of spec.fixtures) {
      test(`${fixture.name}`, async ({ page }) => {
        // Render USWDS reference
        await renderUswdsFixture(page, fixture.uswds)
        if (fixture.interaction) {
          await triggerInteraction(
            page,
            fixture.interaction.action,
            fixture.interaction.uswdsSelector,
          )
        }
        const reference = await extract(
          page,
          '',
          fixture.uswdsSelector ?? '[data-testid="target"]',
        )

        // Render flex implementation
        await renderFlexFixture(page, fixture.flex)
        if (fixture.interaction) {
          await triggerInteraction(
            page,
            fixture.interaction.action,
            fixture.interaction.flexSelector,
          )
        }
        const implementation = await extract(
          page,
          '',
          fixture.flexSelector ?? '[data-testid="target"]',
        )

        const differences = diff(reference, implementation, '', {
          ignoreProperties,
          ignoreBoxKeys,
          ignoreAttributes,
          ignoreChildren: true,
          ignorePseudos: true,
        })
        expectMatch(differences)
      })
    }
  })
}

/**
 * Run accessibility audit from a ConformanceSpec.
 * Renders all fixtures together and runs Axe.
 * If spec.accessibilityFixtureHtml is set, uses that instead of combining fixtures.
 */
export function runAccessibilityAudit(spec: ConformanceSpec) {
  test.describe(`${spec.component} accessibility`, () => {
    test('passes axe audit', async ({ page }) => {
      const AxeBuilder = (await import('@axe-core/playwright')).default

      let html: string
      if (spec.accessibilityFixtureHtml) {
        html = spec.accessibilityFixtureHtml
      } else {
        const allFixtures = spec.fixtures.map((f) => f.flex).join('\n')
        html = `<main><h1>${spec.component} Test</h1>${allFixtures}</main>`
      }

      await renderFlexFixture(page, html)

      await page.evaluate(() => {
        document.title = 'Conformance Test'
      })

      const results = await new AxeBuilder({ page })
        .disableRules(['heading-order'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  })
}
