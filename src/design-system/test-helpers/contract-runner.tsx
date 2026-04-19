import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import type { FC } from 'hono/jsx'
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

async function runAxeAudit(page: Page, html: string): Promise<void> {
  const AxeBuilder = (await import('@axe-core/playwright')).default
  await renderFlexFixture(page, html)
  await page.evaluate(() => {
    document.title = 'Contract Test'
  })
  const results = await new AxeBuilder({ page })
    .disableRules(['heading-order'])
    .analyze()
  expect(results.violations).toEqual([])
}

async function loadExamplesOrThrow(
  component: string,
): Promise<Record<string, unknown>> {
  let examplesModule: Record<string, unknown>
  try {
    examplesModule = await import(`../components/${component}/examples.tsx`)
  } catch (err) {
    throw new Error(
      `runContract: cannot load examples.tsx for "${component}". ` +
        `Custom contracts require src/design-system/components/${component}/examples.tsx ` +
        `with at least one named export.`,
      { cause: err },
    )
  }
  const namedExports = Object.keys(examplesModule).filter(
    (k) => k !== 'default',
  )
  if (namedExports.length === 0) {
    throw new Error(
      `runContract: examples.tsx for "${component}" has no named exports. ` +
        `Add one export per variant declared in contract.variants.`,
    )
  }
  return examplesModule
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
      const html =
        spec.accessibilityFixtureHtml ??
        `<main><h1>${spec.component} Test</h1>${spec.fixtures.map((f) => f.flex).join('\n')}</main>`
      await runAxeAudit(page, html)
    })
  })
}

function runCustomContract(spec: CustomContract) {
  test.describe(`${spec.component} contract (custom)`, () => {
    if (spec.accessibilityFixtureHtml) {
      test('axe: custom fixture', async ({ page }) => {
        const html = spec.accessibilityFixtureHtml as string
        await runAxeAudit(page, html)
      })
      return
    }

    for (const variant of spec.variants) {
      test(`axe: ${variant.name}`, async ({ page }) => {
        const examplesModule = await loadExamplesOrThrow(spec.component)
        const fn = examplesModule[variant.name]
        if (typeof fn !== 'function') {
          throw new Error(
            `runContract: contract.variants declares "${variant.name}" but examples.tsx for "${spec.component}" has no matching export. ` +
              `Either add an export named "${variant.name}" to examples.tsx, or remove "${variant.name}" from contract.variants.`,
          )
        }
        const Fn = fn as FC
        const rendered = (<Fn />).toString()
        const html = `<main><h1>${spec.component} Test</h1>${rendered}</main>`
        await runAxeAudit(page, html)
      })
    }
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
