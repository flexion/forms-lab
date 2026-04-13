---
title: Header profile dropdown menu
status: draft
date: 2026-04-12
---

# Header profile dropdown menu

## Context

The current header (`src/app/components/flex-header/`) implements USWDS's basic header variant with a responsive slide-in mobile nav. When a user is signed in, `flex-layout` renders the avatar, display name, and sign-out form as three separate top-level `<li>` children inside the header's nav list (`src/app/components/flex-layout/index.tsx:86-114`). This clutters the header on desktop and produces three stacked items at the bottom of the mobile nav panel, none of which reads as "your account."

The repository already has one disclosure-menu pattern — `flex-language-selector` — and a standalone theme toggle that sits next to the nav list on every page.

This work adds a profile dropdown for signed-in users and cleans up the header's signed-in layout. It is scoped to `flex-header` so existing patterns and the mobile overlay lifecycle are not disturbed.

## Goals

1. Signed-in users see a single account affordance in the header (avatar + caret on desktop, inline profile section in the mobile panel) containing user identity, theme preference, and sign-out.
2. The header reads cleanly when signed in — no stacked nav items for avatar and sign-out.
3. Mobile and desktop share the same DOM; CSS drives the layout difference.
4. Signed-out users are unchanged in structure — theme toggle still reachable.
5. The change is contained to `flex-header` and its direct consumer `flex-layout`; no new primitives, no new custom elements.

## Non-goals

- A full USWDS "extended" header variant with secondary nav and dropdown submenus on top-level nav items.
- Extracting a shared disclosure-menu primitive across `flex-language-selector` and the new user menu.
- A `/profile` route or any new server endpoints.
- Renaming or relocating the existing `ThemeToggle` into its own component directory.

These are tracked as follow-ups at the bottom of this document.

## Design decisions

### 1. Placement: inside `flex-header` as a new sub-component

A new exported `HeaderUserMenu` sub-component in `flex-header/index.tsx`. Rejected alternatives: a generic `flex-menu-button` primitive (YAGNI — two existing call sites with distinct needs), and a standalone `flex-user-menu` component (fights the mobile overlay lifecycle already owned by `flex-header`).

### 2. Desktop trigger: avatar + caret only

The trigger renders as a round avatar image followed by a small caret, with an `aria-label` (or visually hidden span) naming the user and identifying the control as an account menu. Compact, reads as a dropdown, does not push other nav items around as the display name length varies.

### 3. Menu contents: identity header, theme toggle, sign-out

The panel contains, in order:

1. An identity block: larger avatar, display name, `@login`
2. Divider
3. A labeled theme toggle — the existing `ThemeToggle` component rendered inside the panel
4. Divider
5. A form posting to `/auth/signout` with a single "Sign out" button

Signed-out users continue to see the inline `ThemeToggle` where it lives today. This produces a mild signed-in / signed-out asymmetry (the theme toggle moves into the menu when signed in), which is an explicit trade: no user ever sees two theme affordances in the same state, and the signed-in header is cleaner.

### 4. Mobile: one slide-in panel, profile section rendered inline

On mobile, the same DOM is reused. The trigger button is hidden, and CSS re-parents the panel visually as the last block inside the existing slide-in nav. The panel loses its card styling and gains a top border to read as a distinct "utility section." No nested disclosure, no second overlay, no JS reparenting.

Signed-out mobile users get the same "utility section" treatment for the standalone theme toggle, producing parallel structure across states.

### 5. Single custom element

`flex-header`'s existing `FlexHeaderElement` gains ownership of the user-menu disclosure behavior. No new custom element is defined. This avoids two custom elements racing on the same DOM subtree and keeps breakpoint-sync logic in one place.

## Architecture

### Files touched

- `src/app/components/flex-header/index.tsx`
  - New exported `HeaderUserMenu` FC
  - `Header` gains an optional `user?: SessionUser` and `signoutAction?: string` prop. When `user` is present, `Header` renders `<HeaderUserMenu>` after the nav list and suppresses the inline `<ThemeToggle>`.
  - Existing `ThemeToggle` unchanged externally; may gain an optional className hook for embedding inside the panel
- `src/app/components/flex-header/client.ts`
  - Extend `FlexHeaderElement.connectedCallback` to locate `[data-header-user-menu]` and wire a separate disclosure state (click trigger, click outside, Escape, breakpoint sync, focus return)
  - Existing `initThemeToggle()` is unchanged — it still finds `[data-theme-toggle]` wherever it lives in the DOM
- `src/app/components/flex-header/styles.css`
  - Delete ad-hoc `.flex-header__user-info`, `.flex-header__avatar`, `.flex-header__signout-btn` rules
  - Add `__user-menu`, `__user-trigger`, `__user-panel`, `__user-identity`, `__user-name`, `__user-login`, `__user-divider`, `__user-theme`, `__user-signout`, `__user-signout-btn` ruleset
  - Mobile media query: `display: contents` on the menu wrapper, hide the trigger, re-style the panel as an inline utility section, ignore the `hidden` attribute
- `src/app/components/flex-layout/index.tsx`
  - Remove the raw `<li>` children for avatar, user info, and sign-out
  - Pass `user` and the resolved signout action through to `<Header>`
- `src/app/components/flex-header/examples.tsx`
  - Add a `SignedIn` example with a mock `SessionUser`
- `src/app/components/flex-header/conformance-spec.tsx`
  - Add a spec entry describing the signed-in disclosure semantics
- `src/app/components/flex-header/conformance.test.ts`
  - Extend with signed-in assertions (trigger ARIA, panel contents, signout form action)
- `test/` (new file, following the sidebar-test pattern in recent commits)
  - Open/close via click
  - Escape closes and returns focus to trigger
  - Outside click closes without stealing focus
  - Breakpoint change forces close
  - Theme radio inside the panel still persists to localStorage

### Component interface

```ts
export interface HeaderUserMenuProps {
  user: SessionUser
  signoutAction: string
  menuId?: string
}
```

```ts
export interface HeaderProps {
  logoText?: string
  logoHref?: string
  navId?: string
  navLabel?: string
  user?: SessionUser | null
  signoutAction?: string
  children?: Child
}
```

### Markup (simplified)

```html
<flex-header class="flex-header">
  <div class="flex-header__inner">
    <div class="flex-header__logo">…</div>
    <button class="flex-header__menu-btn" aria-expanded="false" aria-controls="header-nav">Menu</button>
    <nav class="flex-header__nav" id="header-nav" aria-label="Primary navigation">
      <button class="flex-header__close-btn" aria-controls="header-nav">Close</button>
      <ul class="flex-header__nav-list">
        <li class="flex-header__nav-item"><a href="/" aria-current="page">Home</a></li>
        <li class="flex-header__nav-item"><a href="/catalog">Catalog</a></li>
        <li class="flex-header__nav-item"><a href="/projects">Projects</a></li>
      </ul>

      <!-- When user is signed in -->
      <div class="flex-header__user-menu" data-header-user-menu>
        <button
          type="button"
          class="flex-header__user-trigger"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-controls="header-user-menu"
        >
          <img class="flex-header__avatar" src="…" alt="" width="32" height="32">
          <span class="flex-sr-only">Account menu for Daniel Naab</span>
          <svg class="flex-header__user-caret" aria-hidden="true" focusable="false">…</svg>
        </button>

        <div class="flex-header__user-panel" id="header-user-menu" role="menu" hidden>
          <div class="flex-header__user-identity" role="presentation">
            <img class="flex-header__avatar flex-header__avatar--lg" src="…" alt="">
            <div>
              <div class="flex-header__user-name">Daniel Naab</div>
              <div class="flex-header__user-login">@danielnaab</div>
            </div>
          </div>

          <div class="flex-header__user-divider" role="separator"></div>

          <div class="flex-header__user-theme">
            <!-- Existing ThemeToggle component rendered here -->
          </div>

          <div class="flex-header__user-divider" role="separator"></div>

          <form method="post" action="/auth/signout" class="flex-header__user-signout">
            <button type="submit" role="menuitem" class="flex-header__user-signout-btn">Sign out</button>
          </form>
        </div>
      </div>

      <!-- When user is signed out, ThemeToggle stays here as before -->
    </nav>
  </div>
</flex-header>
```

### Client state machine

```
closed
  └── click trigger        → open
  └── Enter/Space on trigger → open

open
  └── click trigger        → closed
  └── Escape (document)    → closed, focus → trigger
  └── click outside menu   → closed, focus unchanged
  └── focusout past panel  → closed
  └── breakpoint ≥ 64em → < 64em → closed
```

On open, focus moves to the first focusable element inside the panel (in practice, the first theme radio). On close via Escape or trigger re-click, focus returns to the trigger. Outside-click closes without stealing focus.

### CSS strategy

Desktop:

- `.flex-header__user-menu` is `position: relative`
- `.flex-header__user-panel` is absolutely positioned below the trigger, right-aligned to the trigger, with card styling
- `.flex-header__user-panel[hidden]` honored as `display: none`

Mobile (< 64em):

- `.flex-header__user-menu` becomes `display: contents`; its trigger is `display: none`
- `.flex-header__user-panel` becomes `display: block`, `position: static`, with a top border and transparent background
- The `hidden` attribute is explicitly overridden on mobile so the panel is always rendered as an inline utility section
- `order: 99` ensures the panel sits below the nav list inside the flex column of the mobile slide-in

Tokens: all spacing, color, border, radius, shadow values come from existing `--flex-*` tokens. If a suitable `--flex-shadow-*` token is missing for the popover, a token is added to the shared tokens file rather than a hardcoded shadow.

## Accessibility

- Trigger: `aria-haspopup="menu"`, `aria-expanded` reflecting state, `aria-controls` pointing at the panel id, accessible name via visually hidden text or `aria-label`
- Panel: `role="menu"` with `role="menuitem"` on interactive items; the theme radios remain a normal radiogroup (valid nesting inside a `role="menu"` for our purposes is pragmatic — we accept this as a minor departure from pure APG to keep theming discoverable)
- Decorative avatar image uses `alt=""`
- Focus is not trapped — Tabbing past the last panel item closes the menu naturally via focusout
- Escape is handled at the document level, matching `flex-language-selector`'s pattern
- Mobile renders the panel contents inline, so no popover ARIA semantics apply; the trigger is hidden from assistive tech via `display: none`

## Testing

1. Extend `conformance.test.ts` with a signed-in render case asserting:
   - trigger has `aria-haspopup="menu"`, `aria-expanded="false"`, `aria-controls` wired
   - panel has the `hidden` attribute when closed
   - panel contains avatar, user name, user login, theme fieldset, signout form with matching action
2. Keep signed-out conformance assertions green
3. New client-behavior test in `test/` following the sidebar-collapse test pattern:
   - click trigger → panel visible, `aria-expanded="true"`
   - Escape while open → panel hidden, focus on trigger
   - click outside panel → panel hidden, focus unchanged
   - crossing desktop → mobile breakpoint while open → panel closed
   - theme radio inside panel persists to `localStorage`
4. `examples.tsx` gains a `SignedIn` story so the catalog design-system page shows the new state
5. `bun run check` passes before push, per repo convention (hook enforced)

## Review of flex-* components

Findings that inform this work and shape follow-ups:

- **flex-header** is conformant to the USWDS basic header variant. The extended variant (dropdown submenus on top-level nav items, secondary nav, mega-menu) is unimplemented. This PR adds a profile account menu, which is adjacent to but not the extended variant. The meta description remains "basic variant" with a note about the account menu addition.
- **flex-layout** carries header composition details (raw `<li>` children for auth state) that belong inside `flex-header`. Migrating them here is part of this PR per the repo convention of improving flex components when touched.
- **flex-language-selector** already implements a click-disclosure pattern with similar ergonomics. Not unified now — see follow-up 2.
- **ThemeToggle** lives inside `flex-header/index.tsx` as a co-exported component. Structurally it should be its own `flex-theme-toggle` component directory, matching the one-component-per-directory convention. Not done in this PR to keep the diff focused.

## Follow-ups (out of scope for this PR)

1. Extract `ThemeToggle` into a standalone `flex-theme-toggle` component directory with its own conformance spec and meta
2. Extract a shared `flex-disclosure-menu` primitive once a third call site needs it; migrate `flex-language-selector` and `HeaderUserMenu` onto it
3. Implement the USWDS extended header variant (secondary nav, top-level dropdown submenus, mega-menu)
4. Add a `/profile` route so the account menu can link to user details
5. Add hover-intent delay handling if the disclosure menu ever becomes hover-triggered (currently click-only by design)
