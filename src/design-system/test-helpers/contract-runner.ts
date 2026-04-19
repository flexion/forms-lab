// src/design-system/test-helpers/contract-runner.ts

import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import type {
  Contract,
  CustomContract,
  FixtureInteraction,
  UswdsContract,
} from '../contract/types'
import { diff, extract } from '../visual-descriptor'
import { expectMatch } from './assertions'
import { renderFlexFixture, renderUswdsFixture } from './render'

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

function runUswdsContract(spec: UswdsContract) {
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

  test.describe(`${spec.component} contract (USWDS-derived)`, () => {
    for (const fixture of spec.fixtures) {
      test(`visual: ${fixture.name}`, async ({ page }) => {
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

    test('passes axe audit', async ({ page }) => {
      const AxeBuilder = (await import('@axe-core/playwright')).default
      const html =
        spec.accessibilityFixtureHtml ??
        `<main><h1>${spec.component} Test</h1>${spec.fixtures.map((f) => f.flex).join('\n')}</main>`
      await renderFlexFixture(page, html)
      await page.evaluate(() => {
        document.title = 'Contract Test'
      })
      const results = await new AxeBuilder({ page })
        .disableRules(['heading-order'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  })
}

function runCustomContract(spec: CustomContract) {
  test.describe(`${spec.component} contract (custom)`, () => {
    test('passes axe audit', async ({ page }) => {
      const AxeBuilder = (await import('@axe-core/playwright')).default

      // Dynamically import examples.tsx for this component and render every
      // export as a single fixture for the audit.
      const examplesModule = await import(
        `../components/${spec.component}/examples.tsx`
      )
      const renderedExports = Object.entries(examplesModule)
        .filter(([key]) => key !== 'default')
        .map(([, fn]) => (fn as () => unknown)())
        .map((node) => String(node))
        .join('\n')

      const html =
        spec.accessibilityFixtureHtml ??
        `<main><h1>${spec.component} Test</h1>${renderedExports}</main>`
      await renderFlexFixture(page, html)
      await page.evaluate(() => {
        document.title = 'Contract Test'
      })
      const results = await new AxeBuilder({ page })
        .disableRules(['heading-order'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  })
}

/**
 * Run the contract test suite for a component. Switches on spec.kind.
 *
 * - uswds-derived: visual computed-style diff per fixture + axe audit.
 * - custom:        renders every examples.tsx export and runs axe.
 */
export function runContract(spec: Contract) {
  if (spec.kind === 'uswds-derived') {
    runUswdsContract(spec)
  } else {
    runCustomContract(spec)
  }
}
