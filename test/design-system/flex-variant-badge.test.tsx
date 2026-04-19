import { expect, test } from 'bun:test'
import { VariantBadge } from '../../src/design-system/components/flex-variant-badge'

async function render(element: unknown): Promise<string> {
  // Hono JSX returns string promises for async components; sync components
  // return strings directly. Await handles both.
  return String(await element)
}

test('extraction badge uses "Extracted by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'extraction',
      variantId: 'sonnet',
      variantName: 'Claude Sonnet 4',
    }),
  )
  expect(html).toContain('Extracted by')
  expect(html).toContain('Claude Sonnet 4')
  expect(html).toContain('/settings/variants?task=extraction')
})

test('shaping badge uses "Shaped by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'shaping',
      variantId: 'bedrock-sonnet',
      variantName: 'Sonnet (Bedrock)',
    }),
  )
  expect(html).toContain('Shaped by')
})

test('filling badge uses "Guided by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'filling',
      variantId: 'x',
      variantName: 'X',
    }),
  )
  expect(html).toContain('Guided by')
})

test('field-mapping badge uses "Mapped by" verb', async () => {
  const html = await render(
    VariantBadge({
      task: 'field-mapping',
      variantId: 'x',
      variantName: 'X',
    }),
  )
  expect(html).toContain('Mapped by')
})
