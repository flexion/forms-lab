# CSS Modernization Design

**Date:** 2026-04-11
**Status:** draft
**Branch:** `css-modernization` (off `main`)

## Goal

Modernize the design system CSS to use idiomatic, modern CSS while maintaining USWDS 3.13 visual conformance. Reduce duplication, improve consistency, and adopt browser features that are well-supported across current evergreen browsers.

## What does not change

- Layer architecture: `reset > tokens > composition > base > block > utility`
- Build pipeline: `Bun.build()` from `src/app/public/styles.css`
- Component class names, data attributes, and HTML structure
- Token naming convention (`--flex-*`)
- USWDS visual conformance (validated by existing tests)

## Approach

Foundation-first, components follow. Two phases within a single branch:

1. **Foundation pass** -- tokens, reset, base, compositions, utilities
2. **Component pass** -- all ~50 `flex-*` component stylesheets

Conformance tests run after each phase to catch regressions.

## Changes

### Token cleanup

**Drop `@property` for palette colors.** The ~340 USWDS palette tokens (`--flex-gray-5`, `--flex-red-vivid-50`, etc.) are static constants that never animate or need typed fallback resolution. They become plain custom properties on `:root`. This roughly halves `tokens.css`.

**Keep `@property` for semantic tokens.** Tokens like `--flex-color-bg`, `--flex-space-md`, and `--flex-control-height` retain their `@property` definitions. The type annotations (`<color>`, `<length>`) are meaningful and could enable future transitions.

### Dark mode consolidation with `light-dark()`

Replace the duplicated dark-mode token blocks (`[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { [data-theme="auto"] }`) with the `light-dark()` CSS function.

Semantic color tokens become:

```css
:root {
  --flex-color-bg: light-dark(var(--flex-white), var(--flex-gray-90));
  --flex-color-surface: light-dark(var(--flex-white), var(--flex-gray-80));
  /* etc. */
}
```

The `[data-theme]` attribute controls `color-scheme`:

```css
:root[data-theme="dark"]  { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="auto"]  { color-scheme: light dark; }
```

The browser resolves the correct value automatically. Dark mode overrides are defined once, not twice.

### Max-width token

Replace hardcoded `960px` with a custom property:

```css
--flex-content-max-width: 60rem;
```

Consumed by `.l-center`, `.flex-header__inner`, `.flex-footer__*-container`, `.catalog-layout`, and similar.

### Breakpoint consistency

Standardize all media queries on `rem` units. Canonical breakpoints documented as comments in tokens (CSS cannot use custom properties in `@media` conditions):

```css
/* Breakpoints (for @media use -- not consumable as var())
   --flex-bp-sm: 37.5rem   (600px)
   --flex-bp-md: 48rem     (768px)
   --flex-bp-lg: 64rem     (1024px)
*/
```

All existing media queries (`63.99em`, `768px`, `599px`, `40em`) get converted to use these canonical values.

### Logical properties

Replace all directional properties with logical equivalents:

| Physical | Logical |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` (or `margin-inline`) |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` (or `padding-inline`) |
| `padding-top` / `padding-bottom` | `padding-block-start` / `padding-block-end` (or `padding-block`) |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `border-top` / `border-bottom` | `border-block-start` / `border-block-end` |
| `left` / `right` / `top` / `bottom` | `inset-inline-start` / `inset-inline-end` / `inset-block-start` / `inset-block-end` |
| `width` / `height` (in layout contexts) | `inline-size` / `block-size` |
| `border-top-left-radius` etc. | `border-start-start-radius` etc. |

Some places already use logical properties (e.g., `margin-inline`, `padding-block` in compositions). This makes it consistent everywhere.

### CSS nesting in components

Restructure component files to use shallow nesting (max 2 levels):

- State selectors: `:hover`, `:focus-visible`, `:disabled`
- Variant selectors: `[data-variant="..."]`, `[data-size="..."]`, `[data-state="..."]`
- Child element selectors: `.flex-card__header`, `.flex-card__body`
- Media queries scoped to a component

Foundation files (reset, tokens, base, compositions, utilities) stay flat.

**Example -- before:**

```css
.flex-button { /* base */ }
.flex-button:hover { /* hover */ }
.flex-button:active { /* active */ }
.flex-button[data-variant="secondary"] { /* variant */ }
.flex-button[data-variant="secondary"]:hover { /* variant hover */ }
```

**Example -- after:**

```css
.flex-button {
  /* base */

  &:hover { /* hover */ }
  &:active { /* active */ }

  &[data-variant="secondary"] {
    /* variant */
    &:hover { /* variant hover */ }
  }
}
```

### Eliminate redundant typography declarations

Many components redeclare `font-family: var(--flex-font-sans)`, `font-size: 1.06rem`, and `line-height: 1.5`. These inherit from `html`/`body` in `base.css`. Components should only declare typography properties when they deviate from the inherited baseline.

### Reset improvements

- Add `height: auto` to the image/media reset to preserve aspect ratios.
- Add `font-size-adjust` for improved fallback font metrics during web font loading.

### `prefers-contrast: more`

Add high-contrast overrides:

- Thicker borders on interactive controls
- Stronger text colors (eliminate reliance on subtle gray distinctions)
- Remove background colors that depend on low-contrast differentiation

Applied as a `@media (prefers-contrast: more)` block in the utility layer.

### `prefers-reduced-motion` consolidation

`base.css` already has a universal reduced-motion rule. Verify it covers all animation cases. The header's separate `@media (prefers-reduced-motion)` block should become redundant and can be removed.

### Container queries (selective)

Use `@container` queries only where the viewport width is not the right signal:

- **Card component** -- cards appear in varying-width grid cells
- **Catalog sidebar layout** -- collapses based on available space, not viewport

Most components remain on media queries. This is not a wholesale migration.

### Print styles

A small `@media print` block in the utility layer:

- Hide header nav, footer, theme toggle, sidebar
- Force text to black on white
- Remove decorative background colors
- Ensure content fills the page width

### Vendor prefix cleanup

Remove `-webkit-mask-size` and `-webkit-mask-repeat` in `base-classes.css`. The `mask-*` properties have been unprefixed in all target browsers.

### Stylelint updates

Update stylelint config if any rule patterns change (e.g., new custom properties like `--flex-content-max-width`).

## Validation strategy

1. `bun run check` (lint + type check + tests) after each phase
2. Visual inspection of key pages in dev server (catalog, component examples, dark mode, forms)
3. Conformance tests verify USWDS component rendering
4. Test in both light and dark themes
5. Verify `prefers-reduced-motion`, `prefers-contrast: more`, and print via browser devtools
