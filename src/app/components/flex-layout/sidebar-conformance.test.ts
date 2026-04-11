import { expect, test } from '@playwright/test'
import { renderFlexFixture } from '../../../lib/test-helpers/render'

const sidebarFixture = `
<aside class="catalog-sidebar">
  <details class="catalog-nav-toggle" open>
    <summary>In this section</summary>
    <nav aria-label="Catalog navigation">
      <ul class="flex-sidenav">
        <li class="flex-sidenav__item"><a href="/one" class="flex-sidenav__link">Page One</a></li>
        <li class="flex-sidenav__item"><a href="/two" class="flex-sidenav__link">Page Two</a></li>
        <li class="flex-sidenav__item"><a href="/three" class="flex-sidenav__link">Page Three</a></li>
      </ul>
    </nav>
  </details>
  <script>
    (function(){
      var d=document.querySelector(".catalog-nav-toggle");
      function u(){if(innerWidth<=768)d.removeAttribute("open");else d.setAttribute("open","")}
      u();
      addEventListener("resize",u);
    }())
  </script>
</aside>
`

test.describe('sidebar collapse on narrow viewports', () => {
  test('starts open at wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, sidebarFixture)

    const details = page.locator('.catalog-nav-toggle')
    await expect(details).toHaveAttribute('open', '')
  })

  test('starts closed at narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await renderFlexFixture(page, sidebarFixture)

    const details = page.locator('.catalog-nav-toggle')
    await expect(details).not.toHaveAttribute('open', '')
  })

  test('closes when resizing from wide to narrow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, sidebarFixture)

    const details = page.locator('.catalog-nav-toggle')
    await expect(details).toHaveAttribute('open', '')

    await page.setViewportSize({ width: 600, height: 800 })
    await expect(details).not.toHaveAttribute('open', '')
  })

  test('opens when resizing from narrow to wide', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await renderFlexFixture(page, sidebarFixture)

    const details = page.locator('.catalog-nav-toggle')
    await expect(details).not.toHaveAttribute('open', '')

    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(details).toHaveAttribute('open', '')
  })
})
