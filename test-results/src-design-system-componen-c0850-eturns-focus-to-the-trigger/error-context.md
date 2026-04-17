# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/design-system/components/flex-header/conformance.test.ts >> flex-header user menu >> Escape closes the menu and returns focus to the trigger
- Location: src/design-system/components/flex-header/conformance.test.ts:227:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('.flex-header__user-trigger')
Expected: "true"
Received: "false"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('.flex-header__user-trigger')
    9 × locator resolved to <button type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="header-user-menu" class="flex-header__user-trigger">…</button>
      - unexpected value "false"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Forms Lab" [ref=e5] [cursor=pointer]:
    - /url: /
  - navigation "Primary navigation" [ref=e6]:
    - list [ref=e7]:
      - listitem [ref=e8]:
        - link "Catalog" [ref=e9] [cursor=pointer]:
          - /url: /catalog
    - button "Account menu for Test User" [active] [ref=e11]:
      - generic [ref=e12]: Account menu for Test User
```

# Test source

```ts
  134 | 
  135 |   test('body scroll is locked when mobile nav is open', async ({ page }) => {
  136 |     await renderMobileHeader(page)
  137 | 
  138 |     const menuBtn = page.locator('.flex-header__menu-btn')
  139 | 
  140 |     // Open
  141 |     await menuBtn.click()
  142 |     const overflow = await page.evaluate(() => document.body.style.overflow)
  143 |     expect(overflow).toBe('hidden')
  144 | 
  145 |     // Close
  146 |     await page.locator('.flex-header__close-btn').click()
  147 |     const overflowAfter = await page.evaluate(
  148 |       () => document.body.style.overflow,
  149 |     )
  150 |     expect(overflowAfter).toBe('')
  151 |   })
  152 | })
  153 | 
  154 | function headerWithUserMenuHtml() {
  155 |   return `<flex-header class="flex-header">
  156 |     <div class="flex-header__inner">
  157 |       <div class="flex-header__logo">
  158 |         <a href="/" class="flex-header__logo-link">
  159 |           <span class="flex-header__logo-text">Forms Lab</span>
  160 |         </a>
  161 |       </div>
  162 |       <button type="button" class="flex-header__menu-btn" aria-expanded="false" aria-controls="header-nav">Menu</button>
  163 |       <nav class="flex-header__nav" id="header-nav" aria-label="Primary navigation">
  164 |         <button type="button" class="flex-header__close-btn" aria-controls="header-nav">Close</button>
  165 |         <ul class="flex-header__nav-list">
  166 |           <li class="flex-header__nav-item">
  167 |             <a href="/catalog" class="flex-header__nav-link">Catalog</a>
  168 |           </li>
  169 |         </ul>
  170 |         <div class="flex-header__user-menu" data-header-user-menu>
  171 |           <button type="button" class="flex-header__user-trigger"
  172 |                   aria-haspopup="menu" aria-expanded="false"
  173 |                   aria-controls="header-user-menu">
  174 |             <img src="https://example.com/avatar.png" alt=""
  175 |                  width="32" height="32" class="flex-header__avatar">
  176 |             <span class="u-visually-hidden">Account menu for Test User</span>
  177 |           </button>
  178 |           <div class="flex-header__user-panel" id="header-user-menu"
  179 |                role="menu" aria-label="Account menu for Test User" hidden>
  180 |             <div class="flex-header__user-identity">
  181 |               <img src="https://example.com/avatar.png" alt="" width="48" height="48"
  182 |                    class="flex-header__avatar flex-header__avatar--lg">
  183 |               <div>
  184 |                 <div class="flex-header__user-name">Test User</div>
  185 |                 <div class="flex-header__user-login">@testuser</div>
  186 |               </div>
  187 |             </div>
  188 |             <form method="post" action="/auth/signout" class="flex-header__user-signout">
  189 |               <button type="submit" role="menuitem" class="flex-header__user-signout-btn">Sign out</button>
  190 |             </form>
  191 |           </div>
  192 |         </div>
  193 |       </nav>
  194 |     </div>
  195 |   </flex-header>
  196 |   <script>${componentsJs}</script>`
  197 | }
  198 | 
  199 | async function renderDesktopHeader(page: import('@playwright/test').Page) {
  200 |   await page.setViewportSize({ width: 1280, height: 800 })
  201 |   await renderFlexFixture(page, headerWithUserMenuHtml())
  202 |   await page.waitForFunction(() => customElements.get('flex-header'))
  203 | }
  204 | 
  205 | test.describe('flex-header user menu', () => {
  206 |   test('trigger click toggles aria-expanded and panel hidden attribute', async ({
  207 |     page,
  208 |   }) => {
  209 |     await renderDesktopHeader(page)
  210 | 
  211 |     const trigger = page.locator('.flex-header__user-trigger')
  212 |     const panel = page.locator('.flex-header__user-panel')
  213 | 
  214 |     await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  215 |     await expect(panel).toHaveAttribute('hidden', '')
  216 | 
  217 |     await trigger.click()
  218 | 
  219 |     await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  220 |     await expect(panel).not.toHaveAttribute('hidden', '')
  221 | 
  222 |     await trigger.click()
  223 |     await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  224 |     await expect(panel).toHaveAttribute('hidden', '')
  225 |   })
  226 | 
  227 |   test('Escape closes the menu and returns focus to the trigger', async ({
  228 |     page,
  229 |   }) => {
  230 |     await renderDesktopHeader(page)
  231 |     const trigger = page.locator('.flex-header__user-trigger')
  232 | 
  233 |     await trigger.click()
> 234 |     await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      |                           ^ Error: expect(locator).toHaveAttribute(expected) failed
  235 | 
  236 |     await page.keyboard.press('Escape')
  237 | 
  238 |     await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  239 |     const focusedClass = await page.evaluate(
  240 |       () => document.activeElement?.className,
  241 |     )
  242 |     expect(focusedClass).toContain('flex-header__user-trigger')
  243 |   })
  244 | 
  245 |   test('outside click closes the menu', async ({ page }) => {
  246 |     await renderDesktopHeader(page)
  247 |     const trigger = page.locator('.flex-header__user-trigger')
  248 | 
  249 |     await trigger.click()
  250 |     await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  251 | 
  252 |     // Click somewhere outside the menu root but not on a link
  253 |     await page
  254 |       .locator('.flex-header__inner')
  255 |       .click({ position: { x: 10, y: 10 } })
  256 | 
  257 |     await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  258 |   })
  259 | 
  260 |   test('crossing to mobile viewport force-closes the menu', async ({
  261 |     page,
  262 |   }) => {
  263 |     await renderDesktopHeader(page)
  264 |     const trigger = page.locator('.flex-header__user-trigger')
  265 | 
  266 |     await trigger.click()
  267 |     await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  268 | 
  269 |     // Shrink to mobile width to fire the breakpoint change
  270 |     await page.setViewportSize({ width: 375, height: 667 })
  271 | 
  272 |     await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  273 |   })
  274 | })
  275 | 
```