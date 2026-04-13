# Header Profile Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ad-hoc avatar / sign-out nav items in the signed-in header with a single profile dropdown menu that uses a popover on desktop and an inline "utility section" inside the existing slide-in panel on mobile, moving the theme toggle into the menu for signed-in users.

**Architecture:** A new `HeaderUserMenu` sub-component added to `flex-header` (no new custom element, no new primitive) rendered as a child of `.flex-header__nav` next to the existing `<ul class="flex-header__nav-list">`. The same DOM is reused on desktop and mobile; CSS (`display: contents` + unset positioning at the mobile breakpoint) produces the inline treatment. Disclosure behavior (click / outside-click / Escape / breakpoint sync / focus return) is owned by the existing `FlexHeaderElement` controller in `client.ts`.

**Tech Stack:** Bun, Hono JSX (server-rendered HTML), plain TypeScript web component, native CSS with `@layer` and `--flex-*` tokens, Playwright for DOM-behavior tests, bun:test for JSX unit tests.

**Spec:** `notes/2026-04-12-header-profile-menu-design.md`

---

## File Structure

### Create

- No new files. All work lands in existing component files.

### Modify

- `src/app/components/flex-header/index.tsx` — add `HeaderUserMenu` FC, extend `Header` with `user` / `signoutAction` props, move `ThemeToggle` placement inside `.flex-header__nav`.
- `src/app/components/flex-header/client.ts` — extend `FlexHeaderElement` with a second disclosure controller for `[data-header-user-menu]`.
- `src/app/components/flex-header/styles.css` — replace the ad-hoc signed-in rules with `__user-*` block, add desktop popover + mobile inline section, adjust theme-toggle placement inside nav.
- `src/app/components/flex-header/examples.tsx` — add a `SignedIn` example.
- `src/app/components/flex-header/conformance-spec.tsx` — add account-menu mapping entries and a third behavior test marker.
- `src/app/components/flex-header/conformance.test.ts` — add a `flex-header user menu` describe block with Playwright tests for disclosure semantics.
- `src/app/components/flex-layout/index.tsx` — stop rendering ad-hoc `<li>` children for signed-in users; pass `user` and resolved `signoutAction` to `<Header>`.
- `test/flex-layout.test.tsx` — update signed-in assertions to match the new DOM.
- `src/app/public/tokens.css` — add a `--flex-shadow-md` token used by the popover.

---

## Task 1: Add the shadow token used by the popover

**Files:**
- Modify: `src/app/public/tokens.css`

- [ ] **Step 1: Find the token section that holds existing shape/radius values**

Run: `rg -n "--flex-radius-sm" src/app/public/tokens.css`
Expected: one hit near line 1628 (inside the `:root` declaration).

- [ ] **Step 2: Add `--flex-shadow-md` adjacent to the radius tokens**

Edit `src/app/public/tokens.css`. Find the line defining `--flex-radius-bubble` and add the new token two lines below, keeping it inside the same `:root { … }` block:

```css
  --flex-radius-sm: 4px;
  --flex-radius-md: 8px;
  --flex-radius-bubble: 14px;

  --flex-shadow-md: 0 4px 12px rgb(0 0 0 / 15%);
```

If there is also a `@property` declaration for the radius tokens earlier in the file (there is for `--flex-space-*` — check around line 107), add a matching declaration for `--flex-shadow-md`:

```css
@property --flex-shadow-md {
  syntax: "*";
  inherits: true;
  initial-value: 0 4px 12px rgb(0 0 0 / 15%);
}
```

Only add the `@property` block if the existing pattern in the file uses `@property` for shape tokens. If the existing radii are not registered with `@property`, skip this and only add the `:root` value.

- [ ] **Step 3: Verify stylelint still passes**

Run: `bun run lint:css`
Expected: PASS with 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/app/public/tokens.css
git commit -m "feat(tokens): add --flex-shadow-md token for popovers"
```

---

## Task 2: Update `test/flex-layout.test.tsx` to assert the new signed-in DOM (failing test first)

**Files:**
- Modify: `test/flex-layout.test.tsx`

The existing test asserts the old DOM (`Test User` appears as raw text, a `Sign out` form). We rewrite it to describe the new contract: avatar trigger + hidden panel containing user identity, theme toggle, and signout form. This test will fail until Task 3 ships.

- [ ] **Step 1: Replace the `renders user identity when signed in` test with a more precise contract**

Edit `test/flex-layout.test.tsx`. Replace the body of that test (currently lines 17-34) with:

```tsx
  it('renders a profile dropdown menu when signed in', () => {
    const user: SessionUser = {
      login: 'testuser',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    }

    const result = Layout({
      currentPath: '/',
      user,
      children: <p>Content</p>,
    })
    const html = result?.toString() ?? ''

    // Trigger button
    expect(html).toContain('data-header-user-menu')
    expect(html).toContain('class="flex-header__user-trigger"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="header-user-menu"')
    expect(html).toContain('https://example.com/avatar.png')

    // Panel (hidden by default)
    expect(html).toMatch(
      /id="header-user-menu"[^>]*hidden|hidden[^>]*id="header-user-menu"/,
    )
    expect(html).toContain('Test User')
    expect(html).toContain('@testuser')
    expect(html).toContain('Sign out')
    expect(html).toContain('action="/auth/signout"')

    // Theme toggle is inside the panel, not a separate header widget
    expect(html).toContain('flex-header__user-theme')

    // Old ad-hoc classes are gone
    expect(html).not.toContain('flex-header__user-info')
    expect(html).not.toContain('flex-header__signout-btn')
  })

  it('renders inline theme toggle when signed out', () => {
    const result = Layout({
      currentPath: '/',
      children: <p>Content</p>,
    })
    const html = result?.toString() ?? ''

    expect(html).toContain('Sign in')
    expect(html).toContain('/auth/signin')
    // Theme toggle is present inline (not inside a user panel)
    expect(html).toContain('data-theme-toggle')
    expect(html).not.toContain('data-header-user-menu')
  })
```

Remove the old `renders sign-in link when no user` test (the second new test above subsumes it).

- [ ] **Step 2: Run the test to confirm it fails**

Run: `bun test test/flex-layout.test.tsx 2>&1 | tail -20`
Expected: FAIL. Both new tests will fail because the current DOM uses `flex-header__user-info` and does not render a `HeaderUserMenu`.

- [ ] **Step 3: Do not commit yet**

The failing test is the first half of a TDD pair — the implementation in Task 3 closes the loop. Commit both together at the end of Task 3.

---

## Task 3: Implement `HeaderUserMenu` JSX, extend `Header` props, rewire `flex-layout`

**Files:**
- Modify: `src/app/components/flex-header/index.tsx`
- Modify: `src/app/components/flex-layout/index.tsx`

- [ ] **Step 1: Add `HeaderUserMenu` and extend `Header` props in `flex-header/index.tsx`**

Edit `src/app/components/flex-header/index.tsx`. At the top of the file, import the session type:

```tsx
import type { Child, FC } from 'hono/jsx'
import type { SessionUser } from '../../../lib/session'
```

Add a new exported FC after the existing `ThemeToggle` definition (before `interface HeaderProps`):

```tsx
export interface HeaderUserMenuProps {
  user: SessionUser
  signoutAction: string
  menuId?: string
}

const CaretIcon: FC = () => (
  <svg
    class="flex-header__user-caret"
    viewBox="0 0 12 12"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 4l4 4 4-4z" fill="currentColor" />
  </svg>
)

export const HeaderUserMenu: FC<HeaderUserMenuProps> = ({
  user,
  signoutAction,
  menuId = 'header-user-menu',
}) => {
  return (
    <div class="flex-header__user-menu" data-header-user-menu>
      <button
        type="button"
        class="flex-header__user-trigger"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls={menuId}
      >
        <img
          src={user.avatarUrl}
          alt=""
          width="32"
          height="32"
          class="flex-header__avatar"
        />
        <span class="u-visually-hidden">Account menu for {user.name}</span>
        <CaretIcon />
      </button>
      <div
        class="flex-header__user-panel"
        id={menuId}
        role="menu"
        aria-label={`Account menu for ${user.name}`}
        hidden
      >
        <div class="flex-header__user-identity" role="presentation">
          <img
            src={user.avatarUrl}
            alt=""
            width="48"
            height="48"
            class="flex-header__avatar flex-header__avatar--lg"
          />
          <div class="flex-header__user-identity-text">
            <div class="flex-header__user-name">{user.name}</div>
            <div class="flex-header__user-login">@{user.login}</div>
          </div>
        </div>
        <div class="flex-header__user-divider" role="separator" />
        <div class="flex-header__user-theme">
          <ThemeToggle />
        </div>
        <div class="flex-header__user-divider" role="separator" />
        <form
          method="post"
          action={signoutAction}
          class="flex-header__user-signout"
        >
          <button
            type="submit"
            role="menuitem"
            class="flex-header__user-signout-btn"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Extend the `HeaderProps` interface and the `Header` component to own user/signout and to place `ThemeToggle` inside the nav**

Replace the existing `HeaderProps` interface and `Header` FC in the same file with:

```tsx
interface HeaderProps {
  logoText?: string
  logoHref?: string
  navId?: string
  navLabel?: string
  user?: SessionUser | null
  signoutAction?: string
  children?: Child
}

export const Header: FC<HeaderProps> = ({
  logoText = 'Forms Lab',
  logoHref = '/',
  navId = 'header-nav',
  navLabel = 'Primary navigation',
  user,
  signoutAction,
  children,
}) => {
  return (
    <flex-header class="flex-header">
      <div class="flex-header__inner">
        <div class="flex-header__logo">
          <a href={logoHref} class="flex-header__logo-link">
            <span class="flex-header__logo-text">{logoText}</span>
          </a>
        </div>
        <button
          type="button"
          class="flex-header__menu-btn"
          aria-expanded="false"
          aria-controls={navId}
        >
          Menu
        </button>
        <nav class="flex-header__nav" id={navId} aria-label={navLabel}>
          <button
            type="button"
            class="flex-header__close-btn"
            aria-controls={navId}
          >
            Close
          </button>
          <ul class="flex-header__nav-list">{children}</ul>
          {user && signoutAction ? (
            <HeaderUserMenu user={user} signoutAction={signoutAction} />
          ) : (
            <ThemeToggle />
          )}
        </nav>
      </div>
    </flex-header>
  )
}
```

Note: `ThemeToggle` moves from being a sibling of `<nav>` to being a child of `<nav>`. This is deliberate — it gives signed-out users the same "utility section" placement on mobile that the profile menu gets for signed-in users.

- [ ] **Step 3: Rewire `flex-layout/index.tsx` to pass user + signoutAction and remove the ad-hoc `<li>` children**

Edit `src/app/components/flex-layout/index.tsx`. Replace the signed-in branch (currently lines 86-118) with:

```tsx
        <Header
          user={props.user ?? undefined}
          signoutAction={resolveUrl('/auth/signout')}
        >
          <HeaderNavItem
            href={resolveUrl('/')}
            label="Home"
            current={props.currentPath === '/'}
          />
          <HeaderNavItem
            href={resolveUrl('/catalog')}
            label="Catalog"
            current={props.currentPath?.startsWith('/catalog') ?? false}
          />
          {props.user ? (
            <HeaderNavItem
              href={resolveUrl('/projects')}
              label="Projects"
              current={props.currentPath?.startsWith('/projects') ?? false}
            />
          ) : (
            <HeaderNavItem href={resolveUrl('/auth/signin')} label="Sign in" />
          )}
        </Header>
```

(The rest of `Layout` — sidebar, footer, etc. — is unchanged.)

- [ ] **Step 4: Run the unit test and verify it passes**

Run: `bun test test/flex-layout.test.tsx 2>&1 | tail -30`
Expected: PASS — both `renders a profile dropdown menu when signed in` and `renders inline theme toggle when signed out`.

- [ ] **Step 5: Run type check**

Run: `bun run --no-warnings tsc --noEmit 2>&1 | tail -10`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flex-header/index.tsx \
  src/app/components/flex-layout/index.tsx \
  test/flex-layout.test.tsx
git commit -m "feat(header): add HeaderUserMenu profile dropdown component

Replaces the ad-hoc avatar/user-info/sign-out nav items with a
single HeaderUserMenu that renders a trigger button and a hidden
panel containing user identity, the theme toggle, and a signout
form. Header takes user+signoutAction props and owns the JSX
structure; flex-layout no longer emits raw <li> children for
auth state. ThemeToggle moves inside .flex-header__nav so
signed-out users get a matching utility-section placement.

Visual styles and disclosure behavior land in subsequent commits."
```

---

## Task 4: Desktop popover CSS

**Files:**
- Modify: `src/app/components/flex-header/styles.css`

- [ ] **Step 1: Remove the superseded ad-hoc rules**

Delete these rule blocks from `src/app/components/flex-header/styles.css` (they are the `--- Auth items ---` section near lines 173-188):

```css
.flex-header__user-info {
  gap: 0.5rem;
}

.flex-header__avatar {
  border-radius: 50%;
}

.flex-header__signout-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
```

- [ ] **Step 2: Add the new desktop-first user-menu ruleset**

Insert this block at the same location (inside the existing `@layer block { ... }` if styles are layered, or at file scope matching surrounding rules):

```css
/* --- User menu (signed-in profile dropdown) --- */

.flex-header__user-menu {
  position: relative;
  margin-inline-start: auto;
  padding-inline-start: var(--flex-space-sm);
}

.flex-header__user-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--flex-space-xs);
  padding: var(--flex-space-xs) var(--flex-space-sm);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--flex-color-text);
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: var(--flex-color-border);
    background: rgb(0 0 0 / 3%);
  }

  &:focus-visible {
    outline: 0.25rem solid var(--flex-color-focus);
    outline-offset: 2px;
  }
}

.flex-header__avatar {
  border-radius: 50%;
  display: block;
}

.flex-header__avatar--lg {
  inline-size: 3rem;
  block-size: 3rem;
}

.flex-header__user-caret {
  inline-size: 0.75rem;
  block-size: 0.75rem;
  color: var(--flex-color-text-muted);
}

.flex-header__user-panel {
  position: absolute;
  inset-block-start: calc(100% + var(--flex-space-xs));
  inset-inline-end: 0;
  min-inline-size: 16rem;
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-border);
  border-radius: var(--flex-radius-md);
  box-shadow: var(--flex-shadow-md);
  padding: var(--flex-space-sm) 0;
  z-index: 500;
}

.flex-header__user-panel[hidden] {
  display: none;
}

.flex-header__user-identity {
  display: flex;
  align-items: center;
  gap: var(--flex-space-sm);
  padding: var(--flex-space-sm) var(--flex-space-md);
}

.flex-header__user-name {
  font-weight: 700;
  color: var(--flex-color-text);
  line-height: 1.2;
}

.flex-header__user-login {
  font-size: 0.85rem;
  color: var(--flex-color-text-muted);
  line-height: 1.2;
}

.flex-header__user-divider {
  block-size: 1px;
  background: var(--flex-color-border);
  margin-block: var(--flex-space-xs);
}

.flex-header__user-theme {
  padding: var(--flex-space-xs) var(--flex-space-md);
}

/* Inside the panel the theme toggle is the full row, not an auto-margin widget */
.flex-header__user-theme .flex-theme-toggle {
  margin-inline-start: 0;
  padding-inline-start: 0;
}

.flex-header__user-signout {
  padding: 0 var(--flex-space-md) var(--flex-space-xs);
}

.flex-header__user-signout-btn {
  inline-size: 100%;
  background: transparent;
  border: 1px solid var(--flex-color-border);
  border-radius: var(--flex-radius-sm);
  padding: var(--flex-space-xs) var(--flex-space-sm);
  font: inherit;
  font-weight: 700;
  color: var(--flex-color-text);
  cursor: pointer;

  &:hover {
    background: var(--flex-color-accent);
    color: var(--flex-color-on-accent);
    border-color: var(--flex-color-accent);
  }

  &:focus-visible {
    outline: 0.25rem solid var(--flex-color-focus);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 3: Adjust the theme-toggle placement now that it is nested inside `.flex-header__nav`**

The current `.flex-theme-toggle` rule (near the bottom of the file) uses `margin-inline-start: auto` to push itself to the right. Now that it lives inside `.flex-header__nav` (which is already `justify-content: flex-end`), the auto margin still works for desktop but the selector scope should narrow so the intra-panel copy does not inherit it.

Find the existing:

```css
.flex-theme-toggle {
  display: flex;
  align-items: center;
  margin-inline-start: auto;
  padding-inline-start: 0.5rem;
  flex-shrink: 0;
}
```

Replace with:

```css
.flex-header__nav > .flex-theme-toggle {
  display: flex;
  align-items: center;
  margin-inline-start: auto;
  padding-inline-start: var(--flex-space-sm);
  flex-shrink: 0;
}
```

Leave the other `.flex-theme-toggle__*` selectors unchanged — they apply in both locations.

- [ ] **Step 4: Lint CSS**

Run: `bun run lint:css`
Expected: PASS.

- [ ] **Step 5: Build CSS to verify it compiles**

Run: `bun run build:css 2>&1 | tail -10`
Expected: success, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flex-header/styles.css
git commit -m "feat(header): desktop popover styles for HeaderUserMenu

Adds the __user-menu, __user-trigger, __user-panel, __user-identity,
__user-divider, __user-theme, and __user-signout-btn ruleset.
Removes the superseded __user-info / __signout-btn rules. Narrows
the theme-toggle positional rule so it only applies when the toggle
sits directly under .flex-header__nav (not when nested inside the
user panel)."
```

---

## Task 5: Mobile inline utility section CSS

**Files:**
- Modify: `src/app/components/flex-header/styles.css`

- [ ] **Step 1: Extend the existing mobile media query with user-menu rules**

Find the existing `@media (max-width: 63.9375rem) { … }` block in the file. Inside that block, after the existing `.flex-header__nav-link--current` rule, add:

```css
  /* User menu becomes an inline utility section inside the slide-in panel */
  .flex-header__user-menu {
    display: contents;
  }

  .flex-header__user-trigger {
    display: none;
  }

  .flex-header__user-panel,
  .flex-header__user-panel[hidden] {
    display: block;
    position: static;
    inset: auto;
    min-inline-size: 0;
    background: transparent;
    border: 0;
    border-block-start: 2px solid var(--flex-color-border);
    border-radius: 0;
    box-shadow: none;
    padding: var(--flex-space-md) 0 0;
    margin-block-start: var(--flex-space-sm);
    order: 99;
  }

  .flex-header__user-identity {
    padding-inline: 0;
  }

  .flex-header__user-theme {
    padding-inline: 0;
  }

  .flex-header__user-signout {
    padding-inline: 0;
  }

  /* Signed-out parallel: theme toggle as a utility section at the bottom of the panel */
  .flex-header__nav > .flex-theme-toggle {
    order: 99;
    margin-inline-start: 0;
    padding-inline-start: 0;
    padding-block-start: var(--flex-space-md);
    margin-block-start: var(--flex-space-sm);
    border-block-start: 2px solid var(--flex-color-border);
    inline-size: 100%;
  }
```

The `[hidden]` override for the panel is intentional: on mobile the panel is always-visible as an inline section; the disclosure semantics only apply on desktop. On mobile the trigger button is `display: none` so the panel's `aria-expanded="false"` on an invisible control is harmless.

- [ ] **Step 2: Rebuild CSS and run lint**

Run: `bun run build:css && bun run lint:css`
Expected: both succeed with no errors.

- [ ] **Step 3: Manually verify the built CSS contains the new rules**

Run: `rg -n "flex-header__user-menu" dist/styles.css | head`
Expected: at least two hits (desktop block + mobile override).

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-header/styles.css
git commit -m "feat(header): mobile inline utility section for user menu

On mobile, the user-menu wrapper becomes display: contents, the
trigger is hidden, and the panel re-parents visually as the last
block inside the slide-in nav. The signed-out theme toggle gets
matching placement so both auth states show a parallel utility
section at the bottom of the mobile nav."
```

---

## Task 6: Disclosure client behavior

**Files:**
- Modify: `src/app/components/flex-header/client.ts`

- [ ] **Step 1: Add a user-menu state block inside `FlexHeaderElement`**

Edit `src/app/components/flex-header/client.ts`. Inside the `FlexHeaderElement` class, add private fields and wire a new controller. Place these after the existing `mediaQuery` field:

```ts
  private userTrigger: HTMLButtonElement | null = null
  private userPanel: HTMLElement | null = null
  private userMenuRoot: HTMLElement | null = null
```

- [ ] **Step 2: Wire user-menu event listeners in `connectedCallback`**

Inside `connectedCallback()`, after the existing `this.mediaQuery.addEventListener(...)` line, add:

```ts
    this.userMenuRoot = this.querySelector('[data-header-user-menu]')
    if (this.userMenuRoot) {
      this.userTrigger = this.userMenuRoot.querySelector(
        '.flex-header__user-trigger',
      )
      this.userPanel = this.userMenuRoot.querySelector(
        '.flex-header__user-panel',
      )
      this.userTrigger?.addEventListener('click', this.handleUserTriggerClick)
      document.addEventListener('click', this.handleUserOutsideClick, true)
      document.addEventListener('keydown', this.handleUserKeydown)
    }
```

- [ ] **Step 3: Add cleanup in `disconnectedCallback`**

Inside `disconnectedCallback()`, before the `this.removeOverlay()` line, add:

```ts
    this.userTrigger?.removeEventListener(
      'click',
      this.handleUserTriggerClick,
    )
    document.removeEventListener('click', this.handleUserOutsideClick, true)
    document.removeEventListener('keydown', this.handleUserKeydown)
```

- [ ] **Step 4: Add user-menu handlers and helpers inside the class**

After the existing `handleBreakpointChange` handler, add:

```ts
  private get isUserMenuOpen(): boolean {
    return this.userTrigger?.getAttribute('aria-expanded') === 'true'
  }

  private handleUserTriggerClick = (event: MouseEvent) => {
    event.stopPropagation()
    if (this.isUserMenuOpen) {
      this.closeUserMenu()
    } else {
      this.openUserMenu()
    }
  }

  private handleUserOutsideClick = (event: MouseEvent) => {
    if (!this.isUserMenuOpen) return
    if (!this.userMenuRoot) return
    const target = event.target as Node
    if (this.userMenuRoot.contains(target)) return
    this.closeUserMenu()
  }

  private handleUserKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isUserMenuOpen) {
      event.preventDefault()
      this.closeUserMenu()
      this.userTrigger?.focus()
    }
  }

  private openUserMenu() {
    if (!this.userTrigger || !this.userPanel) return
    this.userTrigger.setAttribute('aria-expanded', 'true')
    this.userPanel.removeAttribute('hidden')
    // Move focus to the first focusable element inside the panel
    const focusable = this.userPanel.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()
  }

  private closeUserMenu() {
    if (!this.userTrigger || !this.userPanel) return
    this.userTrigger.setAttribute('aria-expanded', 'false')
    this.userPanel.setAttribute('hidden', '')
  }
```

- [ ] **Step 5: Extend `handleBreakpointChange` so switching to mobile force-closes the user menu**

Replace the existing `handleBreakpointChange` handler body with:

```ts
  private handleBreakpointChange = (event: MediaQueryListEvent) => {
    if (event.matches && this.isOpen) {
      // Crossed to desktop — reset mobile nav state
      this.close()
    }
    if (!event.matches && this.isUserMenuOpen) {
      // Crossed to mobile — the user-menu becomes inline; reset disclosure state
      this.closeUserMenu()
    }
  }
```

- [ ] **Step 6: Rebuild components JS to pick up the changes**

Run: `bun run build:components 2>&1 | tail -5`
Expected: success.

- [ ] **Step 7: Type check**

Run: `bun run --no-warnings tsc --noEmit 2>&1 | tail -10`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/flex-header/client.ts
git commit -m "feat(header): disclosure behavior for HeaderUserMenu

Extends FlexHeaderElement with a second disclosure controller for
[data-header-user-menu]: click toggles open/closed, Escape closes
and returns focus to the trigger, outside click closes without
stealing focus, and crossing to the mobile breakpoint force-closes
the disclosure state (the panel becomes an inline utility section
on mobile via CSS)."
```

---

## Task 7: Playwright conformance + behavior tests for the user menu

**Files:**
- Modify: `src/app/components/flex-header/conformance-spec.tsx`
- Modify: `src/app/components/flex-header/conformance.test.ts`

- [ ] **Step 1: Add mapping entries and behavior markers to `conformance-spec.tsx`**

Edit `src/app/components/flex-header/conformance-spec.tsx`. Add these entries to the `mapping` array (after the `usa-overlay` entry):

```ts
    {
      uswds: 'usa-accordion__button (as disclosure trigger)',
      flex: '.flex-header__user-trigger',
      notes:
        'Profile dropdown trigger — USWDS uses accordion button semantics for submenus; ours uses a menu-button disclosure for account actions',
    },
    {
      uswds: 'usa-nav__submenu',
      flex: '.flex-header__user-panel',
      notes:
        'Disclosure panel containing user identity, theme preference, and sign out',
    },
```

Add these entries to the `behavior` array:

```ts
    {
      description:
        'User-menu trigger click toggles aria-expanded and the panel hidden attribute',
      tested: true,
    },
    {
      description:
        'Escape key closes the user menu and returns focus to the trigger',
      tested: true,
    },
    {
      description:
        'Outside click closes the user menu without stealing focus',
      tested: true,
    },
    {
      description:
        'Crossing to the mobile breakpoint force-closes the user menu disclosure',
      tested: true,
    },
```

- [ ] **Step 2: Add a Playwright describe block for the user menu in `conformance.test.ts`**

Edit `src/app/components/flex-header/conformance.test.ts`. After the existing `test.describe('flex-header mobile menu', ...)` block, append:

```ts
function headerWithUserMenuHtml() {
  return `<flex-header class="flex-header">
    <div class="flex-header__inner">
      <div class="flex-header__logo">
        <a href="/" class="flex-header__logo-link">
          <span class="flex-header__logo-text">Forms Lab</span>
        </a>
      </div>
      <button type="button" class="flex-header__menu-btn" aria-expanded="false" aria-controls="header-nav">Menu</button>
      <nav class="flex-header__nav" id="header-nav" aria-label="Primary navigation">
        <button type="button" class="flex-header__close-btn" aria-controls="header-nav">Close</button>
        <ul class="flex-header__nav-list">
          <li class="flex-header__nav-item">
            <a href="/catalog" class="flex-header__nav-link">Catalog</a>
          </li>
        </ul>
        <div class="flex-header__user-menu" data-header-user-menu>
          <button type="button" class="flex-header__user-trigger"
                  aria-haspopup="menu" aria-expanded="false"
                  aria-controls="header-user-menu">
            <img src="https://example.com/avatar.png" alt=""
                 width="32" height="32" class="flex-header__avatar">
            <span class="u-visually-hidden">Account menu for Test User</span>
          </button>
          <div class="flex-header__user-panel" id="header-user-menu"
               role="menu" aria-label="Account menu for Test User" hidden>
            <div class="flex-header__user-identity">
              <img src="https://example.com/avatar.png" alt="" width="48" height="48"
                   class="flex-header__avatar flex-header__avatar--lg">
              <div>
                <div class="flex-header__user-name">Test User</div>
                <div class="flex-header__user-login">@testuser</div>
              </div>
            </div>
            <form method="post" action="/auth/signout" class="flex-header__user-signout">
              <button type="submit" role="menuitem" class="flex-header__user-signout-btn">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
    </div>
  </flex-header>
  <script>${componentsJs}</script>`
}

async function renderDesktopHeader(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await renderFlexFixture(page, headerWithUserMenuHtml())
  await page.waitForFunction(() => customElements.get('flex-header'))
}

test.describe('flex-header user menu', () => {
  test('trigger click toggles aria-expanded and panel hidden attribute', async ({
    page,
  }) => {
    await renderDesktopHeader(page)

    const trigger = page.locator('.flex-header__user-trigger')
    const panel = page.locator('.flex-header__user-panel')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('hidden', '')

    await trigger.click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).not.toHaveAttribute('hidden', '')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('hidden', '')
  })

  test('Escape closes the menu and returns focus to the trigger', async ({
    page,
  }) => {
    await renderDesktopHeader(page)
    const trigger = page.locator('.flex-header__user-trigger')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const focusedClass = await page.evaluate(
      () => document.activeElement?.className,
    )
    expect(focusedClass).toContain('flex-header__user-trigger')
  })

  test('outside click closes the menu', async ({ page }) => {
    await renderDesktopHeader(page)
    const trigger = page.locator('.flex-header__user-trigger')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Click somewhere outside the menu root
    await page.locator('.flex-header__logo-text').click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('crossing to mobile viewport force-closes the menu', async ({
    page,
  }) => {
    await renderDesktopHeader(page)
    const trigger = page.locator('.flex-header__user-trigger')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Shrink to mobile width to fire the breakpoint change
    await page.setViewportSize({ width: 375, height: 667 })

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
```

- [ ] **Step 2b: Verify the existing `runVisualConformance` fixtures still pass for the basic header**

No edit needed — the existing `fixtures` array targets the basic signed-out header. It should still pass unchanged. This step is a reminder not to delete or replace those fixtures.

- [ ] **Step 3: Run Playwright conformance suite against the flex-header tests**

Run: `bunx playwright test src/app/components/flex-header/conformance.test.ts 2>&1 | tail -30`
Expected: all mobile-menu tests still pass, all new user-menu tests pass.

If tests fail due to the Playwright test runner not finding `dist/components.js`, run `bun run build:components && bun run build:css` first.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-header/conformance-spec.tsx \
  src/app/components/flex-header/conformance.test.ts
git commit -m "test(header): playwright tests for HeaderUserMenu disclosure

Adds a 'flex-header user menu' describe block covering trigger
click toggle, Escape close + focus return, outside click close,
and breakpoint-forced close. Extends the conformance spec with
mapping entries for the disclosure trigger and panel plus four
new behavior markers."
```

---

## Task 8: SignedIn example + final verification

**Files:**
- Modify: `src/app/components/flex-header/examples.tsx`

- [ ] **Step 1: Add a `SignedIn` example**

Replace the contents of `src/app/components/flex-header/examples.tsx` with:

```tsx
import type { FC } from 'hono/jsx'
import type { SessionUser } from '../../../lib/session'
import { Header, HeaderNavItem } from './index'

export const Default: FC = () => (
  <Header>
    <HeaderNavItem href="/catalog" label="Catalog" />
    <HeaderNavItem href="/catalog/design-system" label="Design System" />
  </Header>
)

export const WithCurrentPage: FC = () => (
  <Header>
    <HeaderNavItem href="/catalog" label="Catalog" current />
    <HeaderNavItem href="/catalog/design-system" label="Design System" />
  </Header>
)

const exampleUser: SessionUser = {
  login: 'danielnaab',
  name: 'Daniel Naab',
  avatarUrl: 'https://github.com/danielnaab.png',
}

export const SignedIn: FC = () => (
  <Header user={exampleUser} signoutAction="/auth/signout">
    <HeaderNavItem href="/catalog" label="Catalog" />
    <HeaderNavItem href="/projects" label="Projects" current />
  </Header>
)
```

- [ ] **Step 2: Run `bun run check` for lint + type + unit tests**

Run: `bun run check 2>&1 | tail -20`
Expected: 0 biome errors, 0 tsc errors, all unit tests pass (including the updated `flex-layout.test.tsx`).

- [ ] **Step 3: Run the full Playwright conformance suite**

Run: `bunx playwright test 2>&1 | tail -30`
Expected: all conformance tests pass (existing component suites plus new user-menu block).

- [ ] **Step 4: Start the dev server and browser-check the signed-out and signed-in headers**

Run: `bun run dev` in a background terminal, then visit `http://localhost:3000/catalog/design-system` (signed-out) and, if an `.env` with OAuth is configured, sign in and visit any page. Confirm visually that:

- Desktop signed-out: theme toggle sits at the right of the nav row, nav list is unchanged
- Desktop signed-in: avatar + caret trigger appears; click opens the popover with identity + theme + sign out; Escape and outside click both close
- Mobile signed-out (resize browser to < 1024px): hamburger opens a slide-in panel containing nav items and, at the bottom with a top border, the theme toggle utility section
- Mobile signed-in: same slide-in panel, nav items plus a bottom utility section with avatar, name, theme toggle, and sign out button — no nested disclosure

If the dev server is not practical to start in this environment, this step may be marked N/A with a note in the commit message. The previous Playwright tests provide the automated coverage.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-header/examples.tsx
git commit -m "docs(header): add SignedIn example for design system catalog"
```

---

## Self-Review Results

**Spec coverage check:**

- Desktop avatar+caret trigger → Task 3 (HeaderUserMenu JSX) + Task 4 (CSS)
- Menu contents (identity, theme, signout) → Task 3 (JSX) + Task 4 (CSS)
- Mobile inline utility section → Task 5 (CSS)
- Signed-out parallel theme toggle → Task 5 (CSS, `.flex-header__nav > .flex-theme-toggle`)
- Disclosure semantics (click/outside/Escape/breakpoint) → Task 6 (client) + Task 7 (tests)
- `aria-haspopup`, `aria-controls`, `aria-expanded`, hidden attribute → Task 3 (JSX) + asserted in Tasks 2, 7
- Theme toggle reuse inside the panel → Task 3, Step 1 (reused `<ThemeToggle />`)
- `flex-layout` cleanup of raw `<li>` children → Task 3, Step 3
- Conformance spec + fixtures → Task 7
- SignedIn example → Task 8
- Follow-ups explicitly deferred: not in this plan (spec lists them)

**Placeholder scan:** no TODOs, no "similar to above" references, no vague error-handling notes. Code blocks are complete.

**Type consistency:**
- `HeaderUserMenuProps` defined once in Task 3 and referenced by name in Task 7 fixtures
- `SessionUser` imported consistently from `../../../lib/session`
- Event handler names match between wiring (Step 2) and method definitions (Step 4) in Task 6
- `menuId` default `'header-user-menu'` matches `aria-controls` in fixtures and the client-side `querySelector('.flex-header__user-panel')` lookup (scoped to the menu root, not by id)
