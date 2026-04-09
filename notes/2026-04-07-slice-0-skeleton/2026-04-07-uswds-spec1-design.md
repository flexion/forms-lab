# USWDS Design System Spec 1: Infrastructure + Proof Batch

**Date:** 2026-04-07
**Status:** Approved
**Story:** flexion/forms-lab#1
**Branch:** `slice-0/skeleton`
**Repository:** flexion/forms-lab

## Overview

Establish the design system infrastructure (testing, conformance, catalog routing, client script pipeline) and validate it with four proof components: button, text input family, alert, and accordion. This spec proves the full component lifecycle before scaling to all 48 USWDS components in subsequent specs.

## Component Directory Convention

Every component lives in `src/components/flex-*/` with co-located files:

```
src/components/flex-button/
├── index.tsx            # server-rendered JSX component
├── styles.css           # CSS (cascade layer: block)
├── client.ts            # client-side custom element (if interactive)
├── meta.ts              # catalog metadata
├── examples.tsx         # variant examples (catalog demos + test source)
└── conformance.test.ts  # visual + behavioral + accessibility conformance
```

- `index.tsx` — exports the server-rendered JSX component. Renders standard HTML or custom element tags (for interactive components).
- `styles.css` — one CSS file per component, uses `--flex-*` tokens exclusively. Imported in the master `styles.css` cascade at the `block` layer.
- `client.ts` — defines an `HTMLElement` subclass, registered via `customElements.define`. Only present for interactive components. Guard check: `if (!customElements.get('flex-accordion'))`.
- `meta.ts` — exports typed metadata for the catalog registry: name, slug, category, description, USWDS reference URL, interactive flag.
- `examples.tsx` — exports functions returning JSX for each variant/state. Used by both the catalog design system page and conformance tests.
- `conformance.test.ts` — Playwright-based tests comparing our rendering against USWDS reference fixtures. Includes visual conformance, behavioral conformance (for interactive components), and Axe accessibility audits.

## USWDS-to-Flex Mapping Convention

USWDS uses BEM modifiers (`usa-button--secondary`). We use data attributes with a standard vocabulary:

| Attribute | Purpose | Mutually exclusive? | Example |
|---|---|---|---|
| `data-variant` | Primary visual distinction | Yes | `data-variant="secondary"` |
| `data-size` | Sizing | Yes | `data-size="big"` |
| `data-state` | Interactive/form state | Yes | `data-state="error"` |
| Boolean `data-*` | Orthogonal modifiers | No (combinable) | `data-slim`, `data-no-icon`, `data-bordered` |
| ARIA attributes | Accessibility state | Per spec | `aria-expanded="true"`, `disabled` |

CSS selectors follow naturally:
```css
.flex-button[data-variant="secondary"] { ... }
.flex-button[data-size="big"] { ... }
.flex-alert[data-slim] { ... }
```

This aligns with peer web component libraries (Shoelace, Spectrum, shadcn) which use `variant` and `size` as the standard attribute names.

**Internal structural classes** use `__` for child element scoping within a component (e.g., `.flex-alert__icon`, `.flex-alert__heading`). This is not BEM — it's a scoping convention for selectors targeting child elements within a single component's CSS file. Variants and states always use data attributes, never class modifiers.

## Component Registry

Hardcoded imports in `src/components/registry.ts`. Each component's `meta.ts` is explicitly imported and exported as a typed array. No auto-discovery — build-time type safety, no runtime filesystem scanning.

```typescript
import { meta as button } from './flex-button/meta'
import { meta as textInput } from './flex-text-input/meta'
// ... all components

export const components = [button, textInput, ...]
```

**Meta type:**

```typescript
export interface ComponentMeta {
  name: string           // "Button"
  slug: string           // "flex-button"
  category: ComponentCategory
  description: string
  uswds: string          // URL to USWDS docs
  interactive: boolean   // has client.ts
}

export type ComponentCategory =
  | 'form'
  | 'action'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'process'
  | 'identity'
```

## Client Script Pipeline

### Single bundle, always loaded

All interactive components register their custom elements in `src/components/register.ts`:

```typescript
import './flex-accordion/client'
// ... all interactive components
```

Built into a single bundle served on every page. Custom element registration is cheap — `connectedCallback` only fires when the element appears in the DOM.

### Transpilation route

```
GET /static/components.js
→ Bun.build({ entrypoints: ['src/components/register.ts'], target: 'browser' })
```

Added to `dev.ts` (build on startup) and served via `serveStatic` from `dist/`.

### Layout integration

The Layout component always includes:
```html
<script type="module" src="/static/components.js"></script>
```

No `scripts` prop, no per-page tracking, no way to forget.

## Conformance Test Infrastructure

### Dependencies

- `@playwright/test` — browser-based testing
- `@axe-core/playwright` — accessibility audits
- `@uswds/uswds@3.13.x` — dev-only, pinned to match our token source, reference CSS for fixtures

### What conformance tests verify

For each component + variant combination:

**Visual conformance:**
1. Render USWDS reference HTML (hardcoded in test) with USWDS CSS
2. Render flex-* HTML (from `examples.tsx`) with our CSS
3. Extract computed styles via Playwright: color, background-color, padding, margin, border, border-radius, font-size, font-weight
4. Compare: values must match within tolerance (font-family excluded — we use size-adjust normalization, USWDS uses raw fonts)

**Behavioral conformance (interactive components):**
1. Keyboard navigation matches USWDS spec (Tab, Arrow, Enter, Escape, Space)
2. ARIA attributes update correctly on interaction
3. Focus management (trapping, restoration)
4. State transitions match expected behavior

**Accessibility:**
1. Axe audit on each component — zero violations
2. Both light and dark mode
3. Keyboard-only operation verified

### Test helpers

Shared utilities in `src/lib/test-helpers/`:
- `extractStyles(page, selector)` — returns computed style object
- `compareStyles(actual, expected, options)` — diffs with tolerance and ignored properties
- `renderFlexFixture(page, html, css)` — renders our component in a Playwright page
- `renderUswdsFixture(page, html)` — renders USWDS reference in a Playwright page
- `axeAudit(page)` — runs Axe and returns violations

### USWDS CSS serving for tests

A test helper loads USWDS CSS from `node_modules/@uswds/uswds/dist/css/uswds.min.css` and injects it into Playwright pages for reference fixtures.

## Catalog Design System Routing

### Routes

- `GET /catalog/design-system` — index page, components grouped by category with counts and links
- `GET /catalog/design-system/:slug` — per-component page

### Per-component page contents

1. **Header** — component name, category badge, USWDS reference link
2. **Examples** — live rendered output from `examples.tsx`, one section per variant/state
3. **Usage** — description from `meta.ts`, any usage notes
4. **Source CSS** — rendered in a code block, read from `styles.css`

### Sidebar integration

The catalog sidebar's "Design System" entry links to the index. The index page itself can be the entry point — no need for individual components in the sidebar (too many). The index page groups by category with anchor links.

### Registry integration

The catalog route imports from `registry.ts` and groups by `category`. For per-component pages, it looks up by `slug`, dynamically imports `examples.tsx`, reads `styles.css` from disk.

## Proof Batch: Four Components

### 1. flex-button

**USWDS reference:** https://designsystem.digital.gov/components/button/

**Variants (`data-variant`):** default (no attr), secondary, accent-cool, accent-warm, base, outline, inverse, unstyled

**Sizes (`data-size`):** default (no attr), big

**States:** hover, active, focus-visible, disabled

**No `client.ts`** — CSS only.

**CSS structure:**
```css
.flex-button { /* default/primary styles */ }
.flex-button[data-variant="secondary"] { ... }
.flex-button[data-variant="accent-cool"] { ... }
.flex-button[data-variant="accent-warm"] { ... }
.flex-button[data-variant="base"] { ... }
.flex-button[data-variant="outline"] { ... }
.flex-button[data-variant="inverse"] { ... }
.flex-button[data-variant="unstyled"] { ... }
.flex-button[data-size="big"] { ... }
.flex-button:hover { ... }
.flex-button:active { ... }
.flex-button:focus-visible { ... }
.flex-button:disabled { ... }
```

**Conformance:** all variant × size × state combinations compared against USWDS.

### 2. flex-text-input + flex-label + flex-textarea + flex-error-message

**USWDS references:**
- https://designsystem.digital.gov/components/text-input/
- https://designsystem.digital.gov/components/form-controls/

These are always used together as a form field group. Implemented as separate components but tested as a unit.

**flex-text-input:**
- Width variants (`data-width`): 2xs, xs, sm, md, lg, xl, 2xl
- States: `data-state="error"`, `data-state="success"`, `disabled`, `readonly`

**flex-label:**
- Required indicator (`<abbr>` with class)

**flex-textarea:**
- Same base styles as text-input but `<textarea>` element
- Height: default, or rows attribute

**flex-error-message:**
- `role="alert"` required
- Display: block, error color, bold

**No `client.ts`** for any of these.

**Conformance:** field group (label + input + error message) rendered as a unit, compared against USWDS form control fixtures.

### 3. flex-alert

**USWDS reference:** https://designsystem.digital.gov/components/alert/

**Variants (`data-variant`):** info, warning, success, error, emergency

**Boolean modifiers:** `data-slim`, `data-no-icon`

**Structure:** icon region + heading + body. Heading optional for slim variant.

```html
<div class="flex-alert" data-variant="warning" role="alert">
  <div class="flex-alert__icon"><!-- SVG icon --></div>
  <div class="flex-alert__body">
    <h4 class="flex-alert__heading">Warning status</h4>
    <p class="flex-alert__text">Alert body text.</p>
  </div>
</div>
```

**No `client.ts`** — CSS only.

**Conformance:** all variant × modifier combinations. Icon presence/absence verified.

### 4. flex-accordion

**USWDS reference:** https://designsystem.digital.gov/components/accordion/

**Variants (`data-variant`):** default (borderless), bordered

**Boolean modifiers:** `data-multiselectable`

**Structure:**

```html
<flex-accordion data-variant="bordered">
  <h3 class="flex-accordion__heading">
    <button class="flex-accordion__button"
            aria-expanded="false"
            aria-controls="panel-1">
      Section Title
    </button>
  </h3>
  <div class="flex-accordion__content" id="panel-1" hidden>
    <p>Panel content.</p>
  </div>
</flex-accordion>
```

**`client.ts` required:**
- Toggle: click or Enter/Space on button toggles `aria-expanded` and `hidden`
- Multiselectable: when `data-multiselectable` is absent, opening one section closes others
- Keyboard: Tab between buttons, Enter/Space to toggle

**Conformance:**
- Visual: border styles, spacing, expanded/collapsed states
- Behavioral: keyboard navigation, ARIA state transitions, multiselectable behavior
- Accessibility: Axe audit, screen reader compatibility

## CSS Integration

Each proof component's `styles.css` gets imported in the master `src/public/styles.css` at the `block` layer:

```css
/* Block — component styles */
@import '../components/flex-layout/styles.css' layer(block);
@import '../components/flex-badge/styles.css' layer(block);
@import '../components/flex-card/styles.css' layer(block);
@import '../components/flex-prose/styles.css' layer(block);
@import '../components/flex-button/styles.css' layer(block);
@import '../components/flex-text-input/styles.css' layer(block);
@import '../components/flex-label/styles.css' layer(block);
@import '../components/flex-textarea/styles.css' layer(block);
@import '../components/flex-error-message/styles.css' layer(block);
@import '../components/flex-alert/styles.css' layer(block);
@import '../components/flex-accordion/styles.css' layer(block);
```

## Build Updates

### package.json scripts

```json
"build:css": "bun run scripts/build-css.ts",
"build:components": "bun run scripts/build-components.ts",
"build": "bun run build:css && bun run build:components",
"test:conformance": "bunx playwright test",
"test:unit": "bun test",
"test": "bun test && bunx playwright test"
```

### scripts/build-components.ts

Builds the client script bundle:
```typescript
await Bun.build({
  entrypoints: ['src/components/register.ts'],
  outdir: './dist',
  naming: 'components.js',
  target: 'browser',
  minify: false,
})
```

### dev.ts update

Build both CSS and component JS on startup.

### CI update

Add Playwright installation and conformance test step to `.github/workflows/ci.yml`.

## DESIGN.md Update

Add to the existing design system rules documentation in the catalog:

- Component directory convention (file listing, responsibilities)
- USWDS-to-flex mapping table (data-variant, data-size, data-state, booleans)
- Client script pattern (custom element, connectedCallback, guard check)
- Conformance testing approach

## Definition of Done

- [ ] Component directory convention documented and followed by all 4 proof components
- [ ] `src/components/registry.ts` with typed metadata for all proof components
- [ ] `src/components/register.ts` builds to `dist/components.js`
- [ ] Layout loads `components.js` on every page
- [ ] Conformance test helpers in `src/lib/test-helpers/`
- [ ] `@uswds/uswds` installed as dev dependency, reference CSS loadable in tests
- [ ] `@playwright/test` and `@axe-core/playwright` installed
- [ ] flex-button: all 8 variants, 2 sizes, 4 states. Conformance passes.
- [ ] flex-text-input + flex-label + flex-textarea + flex-error-message: all width variants, error/success/disabled states. Conformance passes.
- [ ] flex-alert: all 5 variants, slim + no-icon modifiers. Conformance passes.
- [ ] flex-accordion: bordered + borderless, multiselectable. Keyboard nav works. Conformance passes.
- [ ] Axe accessibility audits pass for all proof components (light + dark mode)
- [ ] Catalog design system index page groups components by category
- [ ] Per-component catalog pages show live examples and source CSS
- [ ] `bun test` (unit) passes
- [ ] `bunx playwright test` (conformance) passes
- [ ] `tsc --noEmit` passes
- [ ] Biome and stylelint pass
- [ ] Planning notes updated in `notes/2026-04-07-slice-0-skeleton/`

## Out of Scope

- Remaining 44 USWDS components (Specs 2-5)
- Complex interactive components (date picker, combo box, modal, tooltip)
- Icon SVG sprite system
- Form composition component (flex-form-group)
- Page-level components
