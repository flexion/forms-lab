import { expect, test } from '@playwright/test'
import { renderFlexFixture } from '../../test-helpers/render'

const contentFixture = `
  <main class="l-page-content">
    <h1 data-testid="heading">Title</h1>
    <p data-testid="paragraph">Body content.</p>
    <figure class="l-feature" data-testid="feature">Feature-width breakout</figure>
    <div class="l-full" data-testid="full">Full-width breakout</div>
  </main>
`

test.describe('l-page-content', () => {
  test('wraps heading and paragraph in the content track', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const headingBox = await page
      .locator('[data-testid="heading"]')
      .boundingBox()
    const paragraphBox = await page
      .locator('[data-testid="paragraph"]')
      .boundingBox()
    expect(headingBox).not.toBeNull()
    expect(paragraphBox).not.toBeNull()

    const viewportWidth = 1280
    const center = viewportWidth / 2
    expect(
      Math.abs((headingBox?.x ?? 0) + (headingBox?.width ?? 0) / 2 - center),
    ).toBeLessThan(2)
    expect(headingBox?.width ?? 0).toBeGreaterThan(700)
    expect(headingBox?.width ?? 0).toBeLessThan(900)
  })

  test('places l-feature wider than content track', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const headingBox = await page
      .locator('[data-testid="heading"]')
      .boundingBox()
    const featureBox = await page
      .locator('[data-testid="feature"]')
      .boundingBox()
    expect(featureBox?.width ?? 0).toBeGreaterThan(headingBox?.width ?? 0)
  })

  test('places l-full at 100% of the container', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const fullBox = await page.locator('[data-testid="full"]').boundingBox()
    expect(fullBox?.width ?? 0).toBeGreaterThan(1200)
  })

  test('content track collapses gracefully on narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const headingBox = await page
      .locator('[data-testid="heading"]')
      .boundingBox()
    expect(headingBox?.width ?? 0).toBeGreaterThan(280)
    expect(headingBox?.width ?? 0).toBeLessThan(360)
  })

  test('places l-popout wider than content but narrower than feature', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(
      page,
      `
        <main class="l-page-content">
          <p data-testid="content-el">Content</p>
          <div class="l-popout" data-testid="popout-el">Popout</div>
          <div class="l-feature" data-testid="feature-el">Feature</div>
        </main>
      `,
    )

    const contentBox = await page
      .locator('[data-testid="content-el"]')
      .boundingBox()
    const popoutBox = await page
      .locator('[data-testid="popout-el"]')
      .boundingBox()
    const featureBox = await page
      .locator('[data-testid="feature-el"]')
      .boundingBox()

    expect(popoutBox?.width ?? 0).toBeGreaterThan(contentBox?.width ?? 0)
    expect(popoutBox?.width ?? 0).toBeLessThan(featureBox?.width ?? 0)
  })

  test('data-width="narrow" uses the narrower content-default token', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(
      page,
      `
        <main class="l-page-content" data-width="narrow">
          <p data-testid="narrow-content">Narrow content</p>
        </main>
        <main class="l-page-content">
          <p data-testid="default-content">Default content</p>
        </main>
      `,
    )

    const narrowBox = await page
      .locator('[data-testid="narrow-content"]')
      .boundingBox()
    const defaultBox = await page
      .locator('[data-testid="default-content"]')
      .boundingBox()

    // Narrow variant is strictly narrower than default variant
    expect(narrowBox?.width ?? 0).toBeLessThan(defaultBox?.width ?? 0)
  })
})

const sidebarStartFixture = `
  <div class="l-page-sidebar-start">
    <aside class="l-page-sidebar" data-testid="sidebar">
      <nav>Sidebar nav</nav>
    </aside>
    <main class="l-page-main" data-testid="main">
      <h1 data-testid="sidebar-heading">Title</h1>
      <p data-testid="sidebar-paragraph">Content.</p>
    </main>
  </div>
`

test.describe('l-page-sidebar-start', () => {
  test('places sidebar and main side by side on wide viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, sidebarStartFixture)

    const sidebarBox = await page
      .locator('[data-testid="sidebar"]')
      .boundingBox()
    const mainBox = await page.locator('[data-testid="main"]').boundingBox()
    expect(sidebarBox).not.toBeNull()
    expect(mainBox).not.toBeNull()

    // Sidebar is to the left of main
    expect((sidebarBox?.x ?? 0) + (sidebarBox?.width ?? 0)).toBeLessThanOrEqual(
      (mainBox?.x ?? 0) + 1,
    )
    // Same row
    expect(Math.abs((sidebarBox?.y ?? 0) - (mainBox?.y ?? 0))).toBeLessThan(2)
  })

  test('collapses sidebar above main below md breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await renderFlexFixture(page, sidebarStartFixture)

    const sidebarBox = await page
      .locator('[data-testid="sidebar"]')
      .boundingBox()
    const mainBox = await page.locator('[data-testid="main"]').boundingBox()

    // Sidebar sits above main
    expect(
      (sidebarBox?.y ?? 0) + (sidebarBox?.height ?? 0),
    ).toBeLessThanOrEqual((mainBox?.y ?? 0) + 1)

    // In collapsed single-column mode, main fills most of the viewport width
    // (proving the media query fired, not that content just wrapped into a
    // narrow column next to the sidebar)
    expect(mainBox?.width ?? 0).toBeGreaterThan(400)
  })

  test('main content uses breakout tracks inside sidebar layout', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(
      page,
      `
        <div class="l-page-sidebar-start">
          <aside class="l-page-sidebar"><nav>Nav</nav></aside>
          <main class="l-page-main">
            <p data-testid="content-para">Default content track.</p>
            <div class="l-full" data-testid="full-el">Full width inside main.</div>
          </main>
        </div>
      `,
    )

    const contentBox = await page
      .locator('[data-testid="content-para"]')
      .boundingBox()
    const fullBox = await page.locator('[data-testid="full-el"]').boundingBox()
    expect(fullBox?.width ?? 0).toBeGreaterThan(contentBox?.width ?? 0)
  })
})

const sidebarEndFixture = `
  <div class="l-page-sidebar-end">
    <main class="l-page-main" data-testid="end-main">
      <h1>Title</h1>
    </main>
    <aside class="l-page-sidebar" data-testid="end-sidebar">
      <nav>Supplementary</nav>
    </aside>
  </div>
`

test.describe('l-page-sidebar-end', () => {
  test('places main on left and sidebar on right on wide viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, sidebarEndFixture)

    const mainBox = await page.locator('[data-testid="end-main"]').boundingBox()
    const sidebarBox = await page
      .locator('[data-testid="end-sidebar"]')
      .boundingBox()

    expect((mainBox?.x ?? 0) + (mainBox?.width ?? 0)).toBeLessThanOrEqual(
      (sidebarBox?.x ?? 0) + 1,
    )
    expect(Math.abs((mainBox?.y ?? 0) - (sidebarBox?.y ?? 0))).toBeLessThan(2)
  })

  test('stacks sidebar below main below md breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await renderFlexFixture(page, sidebarEndFixture)

    const mainBox = await page.locator('[data-testid="end-main"]').boundingBox()
    const sidebarBox = await page
      .locator('[data-testid="end-sidebar"]')
      .boundingBox()

    // Main is above sidebar
    expect((mainBox?.y ?? 0) + (mainBox?.height ?? 0)).toBeLessThanOrEqual(
      (sidebarBox?.y ?? 0) + 1,
    )

    // In collapsed single-column mode, main fills most of the viewport width
    expect(mainBox?.width ?? 0).toBeGreaterThan(400)
  })
})
