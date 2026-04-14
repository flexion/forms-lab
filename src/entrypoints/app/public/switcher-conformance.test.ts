import { expect, test } from '@playwright/test'
import { renderFlexFixture } from '../../../design-system/test-helpers/render'

const fixture = `
  <div class="l-switcher" style="--threshold: 30rem;">
    <div data-testid="a" style="background: red;">A</div>
    <div data-testid="b" style="background: green;">B</div>
    <div data-testid="c" style="background: blue;">C</div>
  </div>
`

test.describe('l-switcher composition', () => {
  test('lays all children out on a single row when above threshold', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 600 })
    await renderFlexFixture(page, fixture)

    const a = await page.locator('[data-testid="a"]').boundingBox()
    const b = await page.locator('[data-testid="b"]').boundingBox()
    const c = await page.locator('[data-testid="c"]').boundingBox()
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(c).not.toBeNull()

    // All three children share the same y coordinate — same row.
    expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(2)
    expect(Math.abs((a?.y ?? 0) - (c?.y ?? 0))).toBeLessThan(2)

    // Left-to-right order, proving they are side-by-side, not wrapped.
    expect(a?.x ?? 0).toBeLessThan(b?.x ?? 0)
    expect(b?.x ?? 0).toBeLessThan(c?.x ?? 0)
  })

  test('stacks all children in a single column when below threshold', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 600 })
    await renderFlexFixture(page, fixture)

    const a = await page.locator('[data-testid="a"]').boundingBox()
    const b = await page.locator('[data-testid="b"]').boundingBox()
    const c = await page.locator('[data-testid="c"]').boundingBox()
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(c).not.toBeNull()

    // All three children share the same x coordinate — same column.
    expect(Math.abs((a?.x ?? 0) - (b?.x ?? 0))).toBeLessThan(2)
    expect(Math.abs((a?.x ?? 0) - (c?.x ?? 0))).toBeLessThan(2)

    // Top-to-bottom order, proving they are stacked, not arranged in a 2x2 grid.
    expect(a?.y ?? 0).toBeLessThan(b?.y ?? 0)
    expect(b?.y ?? 0).toBeLessThan(c?.y ?? 0)
  })
})
