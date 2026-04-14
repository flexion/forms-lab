---
status: stable
date: 2026-04-12
author: Daniel Naab
topic: Grid and layout system for the flex-* design system
---

# Grid and layout system design

## Problem

Claude Code and other contributors compose layouts using the existing `flex-*` design system, and the results are consistently off. The failures are mostly proportional (content too wide or too narrow, sidebar wrong size, gaps wrong) and structural (compositions nested in ways that produce unexpected results). Smaller numbers of issues fall into other categories — wrong composition choice, responsive breakage, generally unprofessional feel — but all of them share a root cause: the design system is not opinionated enough to guide a non-expert toward a correct layout.

The existing compositions (`l-stack`, `l-cluster`, `l-center`, `l-sidebar`, `l-grid`) are good primitives borrowed from Every Layout and CUBE CSS. They encode common spatial patterns well. What they do not do is define how a page is structured at the top level, how content widths relate to each other, or how compositions nest inside a parent layout context. That leaves too many decisions to taste.

This design adds a page-level layout tier above the existing compositions, a named-line grid for content width management, and a small set of opinionated defaults. The goal is a design system that produces correct layouts by default, where "correct" means professionally proportioned, responsive, and accessible.

## Goals

- Constrain layout decisions so that a non-expert (including an LLM) composes correct-looking pages by default.
- Keep the existing composition primitives as the right abstraction for within-region layout.
- Use native CSS Grid, container queries, and named lines rather than a utility class framework.
- Provide a small, learnable vocabulary of page layouts and breakout tracks.
- Maintain parity of philosophy, not implementation, with mature government and enterprise design systems (GOV.UK, Carbon, Salesforce Lightning).

## Non-goals

- A 12-column utility grid system in the style of USWDS, Bootstrap, or older Tailwind.
- Breakpoint-prefixed utility classes (e.g., `tablet:grid-col-8`).
- Changes to the `flex-*` component API or data-attribute conventions.
- Changes to the token color palette, typography scale, or spacing scale.
- A new CSS build pipeline or preprocessor.
- Parity with USWDS's grid CSS classes. Parity with USWDS tokens (colors, typography, spacing) is preserved; parity with its grid implementation is explicitly rejected as a legacy approach.

## Background: why not a 12-column grid

USWDS provides a flexbox-based 12-column grid with breakpoint-prefixed column classes. It is a traditional framework grid. It is also the approach the CSS community is moving away from, for three reasons:

1. **Native CSS Grid is the abstraction.** `repeat(auto-fit, minmax(...))`, named lines, template areas, and subgrid already provide the capabilities that framework grids wrap.
2. **Component-level layout beats page-level column counts.** Container queries let components adapt to their actual container, not the viewport. A 12-column grid encodes viewport assumptions that container queries break.
3. **More choices produce worse results.** A framework grid offers many ways to express a layout (col-4 vs col-6 vs col-8 at which breakpoint). Each choice is an opportunity for the wrong answer. An opinionated named-layout system gives fewer, safer choices.

Peer evidence supports this. GOV.UK uses named fractions (`two-thirds`, `one-half`) and explicit guidance like "main content should always be in a two-thirds column." Carbon uses page-level shell layouts with named regions. Salesforce Lightning moved from a flexbox grid to native CSS Grid in SLDS 2. The trend is toward fewer, more opinionated layout patterns.

## Design

### Two-tier layout model

The system has two distinct tiers:

**Tier 1: page layouts.** A small set of named layout patterns that define the top-level structure of a page. Each one sets up a CSS Grid with opinionated proportions and regions. You choose exactly one per page.

**Tier 2: compositions.** The existing primitives (stack, cluster, grid, sidebar, center, and a new switcher) handle layout *within* page regions. They do not change their API; they just now operate inside a well-defined parent context.

The LLM's first decision on any page becomes "which page layout?" — a choice from three options — rather than "what CSS Grid properties should I write?" This single constrained choice eliminates most proportional errors at the top level.

**Nesting contract.** Page layouts are top-level only. A page layout is never nested inside another page layout or inside a composition. Compositions compose freely with each other inside a page region. The layout tree is bounded: page layout → compositions → content.

### Page layouts

Three page layouts cover the use cases in the current application:

#### `l-page-content`

Single centered content region with breakout tracks. For prose pages, simple forms, and any view that does not need a persistent sidebar.

The content region is a CSS Grid with named lines defining content, popout, feature, and full tracks (see "Content-width tracks" below).

```html
<body class="l-page-content">
  <h1>Page title</h1>
  <p>Content flows in the default content track.</p>
  <figure class="l-feature">Wider breakout element.</figure>
  <div class="l-full">Edge-to-edge banner.</div>
</body>
```

#### `l-page-sidebar-start`

Two-region layout with navigation or a primary sidebar on the left and content on the right. The content region has the same named-line breakout tracks as `l-page-content`.

- Sidebar region: fixed width from `--flex-sidebar-width` (default 15rem), sticky positioning.
- Content region: inherits the breakout track grid.
- Below `--flex-bp-md` (48rem): sidebar collapses above content, both become single-column.

This replaces the current `.catalog-layout` pattern.

```html
<body class="l-page-sidebar-start">
  <nav class="l-page-sidebar">…</nav>
  <main class="l-page-main">…</main>
</body>
```

#### `l-page-sidebar-end`

Mirror of `l-page-sidebar-start` with content on the left and a supplementary panel on the right. For pages with contextual help, metadata panels, or outline views.

- Same breakpoint and stacking behavior.
- The right panel is supplementary, not navigational; it collapses below content on narrow viewports.

### Content-width tracks

Within the content region of any page layout, a CSS Grid with named lines controls how wide content is. This is the "breakout layout" pattern from Ryan Mulligan and Josh Comeau.

Children of the content region default to the content track. Specific elements opt into wider tracks with a class: `.l-popout`, `.l-feature`, `.l-full`.

Tracks, narrowest to widest:

| Track | Width | Use |
|---|---|---|
| `content` | `min(65ch, 100% − gutter)` | Default. Prose, forms, most UI. |
| `popout` | content + ~2rem each side | Wide tables, code blocks, card groups. |
| `feature` | content + ~5rem each side | Hero sections, callouts, wide images. |
| `full` | 100% of the content region | Full-bleed backgrounds, dividers. |

Implementation, as a single grid definition with named lines:

```css
.l-page-content,
.l-page-main {
  display: grid;
  grid-template-columns:
    [full-start]    1fr
    [feature-start] minmax(0, 5rem)
    [popout-start]  minmax(0, 2rem)
    [content-start] min(var(--flex-content-default), 100% - var(--flex-space-lg) * 2) [content-end]
                    minmax(0, 2rem) [popout-end]
                    minmax(0, 5rem) [feature-end]
                    1fr [full-end];
  row-gap: var(--flex-space-md);
}

.l-page-content > *,
.l-page-main > * {
  grid-column: content;
}

.l-popout  { grid-column: popout; }
.l-feature { grid-column: feature; }
.l-full    { grid-column: full; }
```

The `minmax(0, ...)` tracks collapse to zero on narrow viewports with no media queries required. The `min(width, 100% - gutter)` pattern ensures the content track never overflows its parent.

A page layout can set a different default content width by overriding `--flex-content-default` on its root element, or via `data-width="narrow"` / `data-width="wide"` attributes that switch to alternate tokens.

### Compositions: what stays, what changes

All existing compositions remain. Small refinements disambiguate page-level from component-level use:

**Unchanged:**
- `.l-stack` — vertical flow with gap.
- `.l-cluster` — horizontal wrap with gap.
- `.l-grid` — auto-fill responsive grid.

**Refined:**
- `.l-center` becomes a component-level centering primitive. Page-level centering is now handled by page layouts. Existing call sites in templates that wrap full-page content in `.l-center` are migrated to use a page layout instead.
- `.l-sidebar` becomes a component-level sidebar pattern (for media objects and similar two-element layouts). Page-level sidebars are handled by `l-page-sidebar-start` and `l-page-sidebar-end`. The naming disambiguation is important: page sidebars and component sidebars are different tools that happened to share a name.

**New:**
- `.l-switcher` — horizontal when there is room, vertical when there is not. Based on Every Layout's Switcher pattern. Takes a `--threshold` custom property and a `--limit` for maximum item count before forced wrapping. Useful for form field groups and action rows where the current options (stack, cluster) produce suboptimal layouts.

### Tokens

New tokens (added to `tokens.css`):

```css
--flex-content-narrow:  45ch;
--flex-content-default: 65ch;
--flex-content-wide:    85ch;

--flex-sidebar-width: 15rem;

--flex-bp-sm: 37.5rem;
--flex-bp-md: 48rem;
--flex-bp-lg: 64rem;
```

Retired:

- `--flex-content-max-width: 60rem` — replaced by the three content-width tokens above. Kept as a deprecated alias (`var(--flex-content-default)`) for one release cycle so existing components migrate incrementally.

The new default (65ch, roughly 40rem depending on font metrics) is meaningfully narrower than the current 60rem. This is intentional: 65ch is the standard readable line length for prose and forms, and the narrower default is what drives the "content fills the region" improvement. Pages that genuinely need more width opt in via `data-width="wide"` (85ch) or by placing content in the `l-popout` or `l-feature` track. During migration, each page gets a deliberate choice of width rather than inheriting 60rem by default.

Breakpoint tokens as CSS custom properties serve as single-source-of-truth documentation and are usable in `@container style()` queries. Media queries continue to use the raw values where needed; a shared Sass-style preprocessing step is out of scope.

### The container contract

Each page layout sets `container-type: inline-size` and a `container-name` on its content region. Compositions and components inside the region can use `@container` queries against the named container instead of viewport media queries.

Named containers:

- `page-content` — the content region of any page layout.
- `page-sidebar` — the sidebar region of sidebar page layouts.

This solves the "card looks fine full-width but breaks when the sidebar appears" class of bugs. A card inside `l-page-sidebar-start` adapts to its actual available width, not the viewport. Components that already declare `container-type` on themselves continue to work — they become nested containers, which is legal CSS.

### Cascade layers

The new rules live in the `composition` layer (for page layouts, breakout tracks, and the new switcher) and the `tokens` layer (for the new custom properties). No changes to the layer structure itself: `reset, tokens, composition, base, block, utility`.

Page layouts live in `composition` rather than a new `layout` layer because they compose with the other layout primitives and should share their specificity tier.

## Migration

The migration is incremental. Existing pages continue to work throughout.

1. Add new tokens and the new composition classes. No existing page changes yet.
2. Migrate `.catalog-layout` to `l-page-sidebar-start` as the reference example. Verify against the catalog's visual conformance suite.
3. Migrate `deployment-table.css` to use a page layout with `l-feature` or `l-full` for the table. Remove the hardcoded grid-template-columns.
4. Sweep remaining `.l-center` usages at page level and migrate to page layouts. Leave component-level uses of `.l-center` alone.
5. Add a catalog page at `/catalog/layout` documenting all three page layouts, all four breakout tracks, and each composition, with code samples and "when to use" guidance.
6. Review each `flex-*` component in light of the container contract. Most will not change. Components that currently use viewport media queries where container queries would be more correct get updated.
7. Remove the `--flex-content-max-width` deprecation alias after one release cycle.

A separate implementation plan will break this into executable tasks; this design doc describes the target state.

## Testing

- Visual conformance tests (Playwright) for each page layout at narrow (320px), medium (768px), and wide (1280px) viewports.
- A catalog page demonstrating all layouts and breakout tracks, which serves as both documentation and regression fixture.
- Stylelint rules extended to flag raw content-width numbers where a `--flex-content-*` token should be used.
- Existing test suite (`bun run check`) continues to pass throughout migration.

## Risks and open questions

**Risk: over-constraining.** Three page layouts may not cover every future page. Mitigation: the design is additive — a new page layout can be added when a real need appears, but adding one on speculation is out of scope. The three layouts were chosen to cover the current application and the GOV.UK-style patterns typical of government forms.

**Risk: subgrid adoption.** The design does not rely on subgrid, but subgrid would improve alignment between content in nested compositions. This is a future enhancement, not part of the initial implementation.

**Risk: container query specificity.** Mixing container queries and media queries in the same stylesheet can be confusing. The design leans on container queries for component adaptation and media queries only for page layout collapse. This boundary should be documented in the catalog layout page.

**Open question: catalog layout page location.** The new documentation page can live at `/catalog/layout` (alongside other catalog pages) or at `/catalog/design-system/layout` (grouped with a future design-system section). Default to `/catalog/layout` unless a design-system grouping exists when implementation starts.

**Open question: breakout tracks inside sidebars.** The design gives breakout tracks only to the main content region of sidebar layouts, not to the sidebar region itself. Sidebars are navigation or supplementary and do not need breakout tracks. If a future sidebar needs a feature-wide element, it will use a normal flex-* component, not a breakout class.

## Sources

- [Every Layout](https://every-layout.dev/) — Stack, Cluster, Center, Sidebar, Switcher, Grid primitives.
- [CUBE CSS](https://cube.fyi/) — Composition/Utility/Block/Exception methodology; the basis for the current layer structure.
- [GOV.UK Design System — layout](https://design-system.service.gov.uk/styles/layout/) — fraction-based grid, two-thirds content column guidance.
- [Carbon Design System — 2x Grid](https://carbondesignsystem.com/guidelines/2x-grid/overview/) — token-driven grid with shell layouts.
- [Salesforce Lightning Design System 2 migration notes](https://www.lightningdesignsystem.com/) — flexbox grid to native CSS Grid transition.
- [USWDS — Layout grid](https://designsystem.digital.gov/utilities/layout-grid/) — the 12-column pattern this design explicitly does not adopt.
- [Josh Comeau — Full-Bleed Layout Using CSS Grid](https://www.joshwcomeau.com/css/full-bleed/) — named-line breakout pattern.
- [Ryan Mulligan — Layout Breakouts With CSS Grid](https://ryanmulligan.dev/blog/layout-breakouts/) — extended breakout tracks.
- [MDN — CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries) — component-level responsive behavior.
