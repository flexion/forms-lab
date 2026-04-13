# Grid and Layout System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a page-level layout tier (`l-page-content`, `l-page-sidebar-start`, `l-page-sidebar-end`) with named-line breakout tracks on top of the existing composition primitives, and migrate the current `.catalog-layout` and deployment table off their ad-hoc grid definitions onto the new system.

**Architecture:** Two-tier layout model. Tier 1 is a small set of named page layouts that define top-level structure using CSS Grid with named lines for content-width breakout tracks (content, popout, feature, full). Tier 2 is the existing composition primitives (stack, cluster, grid, sidebar, center) plus a new switcher. Page layouts set up named containers for container queries. No framework grid, no utility classes.

**Tech Stack:** CSS (cascade layers, CSS Grid, container queries, custom properties), Hono JSX (server-rendered), Playwright (conformance tests), Stylelint (token enforcement), Bun (runtime and bundler).

**Reference spec:** `notes/2026-04-12-grid-layout-system-design.md`

---

## File Structure

**Files to create:**

- `src/app/public/page-layouts.css` — new page layouts (`l-page-content`, `l-page-sidebar-start`, `l-page-sidebar-end`) and breakout track classes (`l-popout`, `l-feature`, `l-full`)
- `src/app/components/flex-layout/page-layout-conformance.test.ts` — Playwright tests covering each page layout at narrow/medium/wide viewports
- `src/app/public/switcher-conformance.test.ts` — Playwright conformance test for the new `l-switcher` composition
- `test/layout-tokens.test.ts` — unit test asserting the new tokens are present in the built CSS bundle

**Files to modify:**

- `src/app/public/tokens.css` — add content-width, sidebar-width, and breakpoint tokens; deprecate `--flex-content-max-width` as an alias
- `src/app/public/compositions.css` — add `l-switcher`; leave existing primitives untouched
- `src/app/public/styles.css` — import `page-layouts.css`
- `src/app/components/flex-layout/index.tsx` — support opting the page wrapper into one of the three page layouts
- `src/app/components/flex-layout/styles.css` — rewrite `.catalog-layout` in terms of `l-page-sidebar-start`; remove the inline `--flex-content-max-width` reference
- `src/app/components/deployment-table.css` — use a breakout track instead of an ad-hoc grid
- `src/app/routes/catalog/design-system.tsx` — add a `layout` slug documentation page
- `src/app/routes/catalog/sidebar.ts` — add Layout entry to the design system sidebar (if applicable)
- `.stylelintrc.json` — add content-width token enforcement for `max-inline-size` and `max-width`

---

## Task 1: Add layout tokens

Adds the new content-width, sidebar-width, and breakpoint tokens to `tokens.css`, and keeps `--flex-content-max-width` as a deprecated alias so existing call sites do not break.

**Files:**
- Modify: `src/app/public/tokens.css:1624-1625`
- Create: `test/layout-tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/layout-tokens.test.ts` — a new unit test file that reads the built CSS bundle and asserts each new token is declared.

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'

describe('layout tokens', () => {
  const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf-8')

  it('declares content-width tokens', () => {
    expect(css).toContain('--flex-content-narrow: 45ch')
    expect(css).toContain('--flex-content-default: 65ch')
    expect(css).toContain('--flex-content-wide: 85ch')
  })

  it('declares sidebar-width token', () => {
    expect(css).toContain('--flex-sidebar-width: 15rem')
  })

  it('declares breakpoint tokens', () => {
    expect(css).toContain('--flex-bp-sm: 37.5rem')
    expect(css).toContain('--flex-bp-md: 48rem')
    expect(css).toContain('--flex-bp-lg: 64rem')
  })

  it('keeps --flex-content-max-width as a deprecated alias', () => {
    expect(css).toContain('--flex-content-max-width: var(--flex-content-default)')
  })
})
```

- [ ] **Step 2: Run test and confirm it fails**

```bash
bun run build:css && bun test test/layout-tokens.test.ts
```

Expected: four failures, all of the form `Expected ... to contain "--flex-content-narrow: 45ch"`.

- [ ] **Step 3: Update `tokens.css`**

Open `src/app/public/tokens.css` and find line 1624-1625:

```css
  /* Layout tokens */
  --flex-content-max-width: 60rem;
```

Replace with:

```css
  /* Layout tokens */
  --flex-content-narrow: 45ch;
  --flex-content-default: 65ch;
  --flex-content-wide: 85ch;
  --flex-sidebar-width: 15rem;

  /* Breakpoint tokens (documentation + @container style() queries).
     Media queries use the raw values; these are the single source of truth. */
  --flex-bp-sm: 37.5rem;
  --flex-bp-md: 48rem;
  --flex-bp-lg: 64rem;

  /* Deprecated: alias kept for one release cycle. Prefer --flex-content-default. */
  --flex-content-max-width: var(--flex-content-default);
```

- [ ] **Step 4: Rebuild CSS and rerun the test**

```bash
bun run build:css && bun test test/layout-tokens.test.ts
```

Expected: all four new assertions pass, full smoke suite passes.

- [ ] **Step 5: Run the full check**

```bash
bun run check
```

Expected: lint, typecheck, and 245+ tests pass. The existing `.l-center` and `.catalog-layout` callers continue to work because the alias resolves to 65ch, not 60rem. Note that this narrows the existing content width; visual regressions in the catalog and footer are expected and addressed in Task 7.

- [ ] **Step 6: Commit**

```bash
git add src/app/public/tokens.css test/layout-tokens.test.ts
git commit -m "feat(tokens): add layout tokens for page-level grid system

Adds --flex-content-narrow/default/wide, --flex-sidebar-width, and
--flex-bp-sm/md/lg. Retains --flex-content-max-width as a deprecated
alias pointing at --flex-content-default so existing callers keep
rendering during the migration."
```

---

## Task 2: Add the `l-switcher` composition

Adds a new composition primitive that lays children out horizontally when there is room and vertically when there is not. Based on Every Layout's Switcher. Takes a `--threshold` custom property for the breakpoint and an optional `--limit` for maximum items before forced wrapping.

**Files:**
- Modify: `src/app/public/compositions.css` (append after `.l-grid`)
- Create: `src/app/public/switcher-conformance.test.ts`

**Note on test file naming:** Playwright's `playwright.config.ts` has `testMatch: '**/*conformance*.test.ts'`. Any Playwright test must include `conformance` in its filename, otherwise it will not be picked up. All tests in this plan that use `renderFlexFixture` (Playwright) follow this convention.

- [ ] **Step 1: Write the failing test**

Create `src/app/public/switcher-conformance.test.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { renderFlexFixture } from '../../lib/test-helpers/render'

const fixture = `
  <div class="l-switcher" style="--threshold: 30rem;">
    <div data-testid="a" style="background: red;">A</div>
    <div data-testid="b" style="background: green;">B</div>
    <div data-testid="c" style="background: blue;">C</div>
  </div>
`

test.describe('l-switcher composition', () => {
  test('lays out horizontally when above threshold', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 })
    await renderFlexFixture(page, fixture)

    const a = await page.locator('[data-testid="a"]').boundingBox()
    const b = await page.locator('[data-testid="b"]').boundingBox()
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    // Same row: top coordinates match
    expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(2)
  })

  test('stacks vertically when below threshold', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 600 })
    await renderFlexFixture(page, fixture)

    const a = await page.locator('[data-testid="a"]').boundingBox()
    const b = await page.locator('[data-testid="b"]').boundingBox()
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    // Stacked: b is below a
    expect((b?.y ?? 0)).toBeGreaterThan((a?.y ?? 0) + 5)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
bun run build:css && bunx playwright test src/app/public/switcher-conformance.test.ts
```

Expected: failures in both tests because `.l-switcher` does not exist. Playwright will report elements overlap or align incorrectly.

- [ ] **Step 3: Add the composition**

Open `src/app/public/compositions.css` and append after the existing `.l-grid` block (line 57):

```css
.l-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: var(--switcher-space, var(--flex-space-md));
}

.l-switcher > * {
  flex-grow: 1;
  flex-basis: calc((var(--threshold, 30rem) - 100%) * 999);
}

.l-switcher > :nth-last-child(n + var(--limit, 5)),
.l-switcher > :nth-last-child(n + var(--limit, 5)) ~ * {
  flex-basis: 100%;
}
```

The `calc((threshold - 100%) * 999)` trick is the core of Every Layout's Switcher: when the container is narrower than the threshold, the flex-basis goes strongly negative and items take up full rows; when wider, flex-basis is strongly positive and items share the row.

- [ ] **Step 4: Rebuild CSS and rerun the test**

```bash
bun run build:css && bunx playwright test src/app/public/switcher-conformance.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Run the full check**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/public/compositions.css src/app/public/switcher-conformance.test.ts
git commit -m "feat(compositions): add l-switcher for horizontal/vertical layouts

Adds the Switcher composition from Every Layout. Children are laid out
horizontally when the container width is above --threshold (default
30rem) and stacked vertically when it is below. Useful for form field
groups and action rows where stack and cluster produce suboptimal
results."
```

---

## Task 3: Add `l-page-content` with breakout tracks

Creates `page-layouts.css` with the first page layout. Single centered content region. Children default to the `content` track; elements with `l-popout`, `l-feature`, or `l-full` opt into wider tracks. Sets up the named container for downstream container queries.

**Files:**
- Create: `src/app/public/page-layouts.css`
- Modify: `src/app/public/styles.css` (add `@import`)
- Create: `src/app/components/flex-layout/page-layout-conformance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/flex-layout/page-layout-conformance.test.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { renderFlexFixture } from '../../../lib/test-helpers/render'

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

    const headingBox = await page.locator('[data-testid="heading"]').boundingBox()
    const paragraphBox = await page.locator('[data-testid="paragraph"]').boundingBox()
    expect(headingBox).not.toBeNull()
    expect(paragraphBox).not.toBeNull()

    // Content track is centered within the viewport
    const viewportWidth = 1280
    const center = viewportWidth / 2
    expect(Math.abs(((headingBox?.x ?? 0) + (headingBox?.width ?? 0) / 2) - center))
      .toBeLessThan(2)
    // Content track is narrower than viewport (65ch default, roughly 40rem)
    expect(headingBox?.width ?? 0).toBeLessThan(700)
  })

  test('places l-feature wider than content track', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const headingBox = await page.locator('[data-testid="heading"]').boundingBox()
    const featureBox = await page.locator('[data-testid="feature"]').boundingBox()
    expect(featureBox?.width ?? 0).toBeGreaterThan(headingBox?.width ?? 0)
  })

  test('places l-full at 100% of the container', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const fullBox = await page.locator('[data-testid="full"]').boundingBox()
    expect(fullBox?.width ?? 0).toBeGreaterThan(1200)
  })

  test('content track collapses gracefully on narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await renderFlexFixture(page, contentFixture)

    const headingBox = await page.locator('[data-testid="heading"]').boundingBox()
    // Content uses most of the viewport minus gutter
    expect(headingBox?.width ?? 0).toBeGreaterThan(280)
    expect(headingBox?.width ?? 0).toBeLessThan(360)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
bun run build:css && bunx playwright test src/app/components/flex-layout/page-layout-conformance.test.ts
```

Expected: all four tests fail because `.l-page-content` has no styles.

- [ ] **Step 3: Create `page-layouts.css`**

Create `src/app/public/page-layouts.css`:

```css
@layer composition {
  /* Page layouts are Tier 1 of the layout system. They define the top-level
     structure of a page with opinionated proportions. They are top-level only
     and are never nested inside another page layout or a composition. */

  /* Shared breakout track grid. Used by l-page-content directly and by the
     main content region of sidebar page layouts.
     Named lines define four tracks: content, popout, feature, full.
     Children default to the content track; opt into wider tracks with
     .l-popout, .l-feature, or .l-full. */
  .l-page-content,
  .l-page-main {
    display: grid;
    grid-template-columns:
      [full-start] minmax(var(--flex-space-md), 1fr)
      [feature-start] minmax(0, 5rem)
      [popout-start] minmax(0, 2rem)
      [content-start] min(
          var(--flex-content-default),
          100% - var(--flex-space-md) * 2
        ) [content-end]
      minmax(0, 2rem) [popout-end]
      minmax(0, 5rem) [feature-end]
      minmax(var(--flex-space-md), 1fr) [full-end];
    row-gap: var(--flex-space-md);

    /* Named container for child components to query against. */
    container-type: inline-size;
    container-name: page-content;
  }

  .l-page-content > *,
  .l-page-main > * {
    grid-column: content;
    min-inline-size: 0;
  }

  .l-page-content > .l-popout,
  .l-page-main > .l-popout {
    grid-column: popout;
  }

  .l-page-content > .l-feature,
  .l-page-main > .l-feature {
    grid-column: feature;
  }

  .l-page-content > .l-full,
  .l-page-main > .l-full {
    grid-column: full;
  }

  /* Narrow and wide content-track variants.
     Overriding --flex-content-default on the page layout root changes
     the default track width for all descendants. */
  .l-page-content[data-width="narrow"],
  .l-page-main[data-width="narrow"] {
    --flex-content-default: var(--flex-content-narrow);
  }

  .l-page-content[data-width="wide"],
  .l-page-main[data-width="wide"] {
    --flex-content-default: var(--flex-content-wide);
  }
}
```

- [ ] **Step 4: Import `page-layouts.css` from `styles.css`**

Open `src/app/public/styles.css` and find the line that imports `compositions.css`. Add an import for `page-layouts.css` directly after it so both live in the `composition` layer:

```css
@import url("./compositions.css");
@import url("./page-layouts.css");
```

If `styles.css` uses a different import style (for example `@import "./compositions.css"`), follow the surrounding convention.

- [ ] **Step 5: Rebuild CSS and rerun the test**

```bash
bun run build:css && bunx playwright test src/app/components/flex-layout/page-layout-conformance.test.ts
```

Expected: all four tests pass.

- [ ] **Step 6: Run the full check**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/public/page-layouts.css src/app/public/styles.css src/app/components/flex-layout/page-layout-conformance.test.ts
git commit -m "feat(layout): add l-page-content with breakout tracks

Introduces the first Tier 1 page layout. A CSS Grid with named lines
defines four content-width tracks (content, popout, feature, full).
Children default to the content track; .l-popout, .l-feature, and
.l-full opt into wider tracks. Sets up the page-content named container
so descendant components can query it."
```

---

## Task 4: Add `l-page-sidebar-start`

Adds the sidebar-start page layout. The outer element is a two-column grid: sidebar on the left, main content on the right. The main content region is a `.l-page-main` element that inherits the breakout track grid from Task 3. Below `--flex-bp-md`, the outer grid collapses to a single column.

**Files:**
- Modify: `src/app/public/page-layouts.css`
- Modify: `src/app/components/flex-layout/page-layout-conformance.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/app/components/flex-layout/page-layout-conformance.test.ts`:

```typescript
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
  test('places sidebar and main side by side on wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, sidebarStartFixture)

    const sidebarBox = await page.locator('[data-testid="sidebar"]').boundingBox()
    const mainBox = await page.locator('[data-testid="main"]').boundingBox()
    expect(sidebarBox).not.toBeNull()
    expect(mainBox).not.toBeNull()

    // Sidebar is to the left of main
    expect((sidebarBox?.x ?? 0) + (sidebarBox?.width ?? 0))
      .toBeLessThanOrEqual((mainBox?.x ?? 0) + 1)
    // They sit on the same row
    expect(Math.abs((sidebarBox?.y ?? 0) - (mainBox?.y ?? 0))).toBeLessThan(2)
  })

  test('collapses sidebar above main below md breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await renderFlexFixture(page, sidebarStartFixture)

    const sidebarBox = await page.locator('[data-testid="sidebar"]').boundingBox()
    const mainBox = await page.locator('[data-testid="main"]').boundingBox()

    // Sidebar sits above main
    expect((sidebarBox?.y ?? 0) + (sidebarBox?.height ?? 0))
      .toBeLessThanOrEqual((mainBox?.y ?? 0) + 1)
  })

  test('main content uses breakout tracks inside sidebar layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, `
      <div class="l-page-sidebar-start">
        <aside class="l-page-sidebar"><nav>Nav</nav></aside>
        <main class="l-page-main">
          <p data-testid="content-para">Default content track.</p>
          <div class="l-full" data-testid="full-el">Full width inside main.</div>
        </main>
      </div>
    `)

    const contentBox = await page.locator('[data-testid="content-para"]').boundingBox()
    const fullBox = await page.locator('[data-testid="full-el"]').boundingBox()
    expect(fullBox?.width ?? 0).toBeGreaterThan(contentBox?.width ?? 0)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
bun run build:css && bunx playwright test src/app/components/flex-layout/page-layout-conformance.test.ts
```

Expected: new `l-page-sidebar-start` tests fail; existing `l-page-content` tests still pass.

- [ ] **Step 3: Add the sidebar-start layout**

Append to `src/app/public/page-layouts.css` inside the existing `@layer composition { ... }` block:

```css
  .l-page-sidebar-start {
    display: grid;
    grid-template-columns: var(--flex-sidebar-width) minmax(0, 1fr);
    gap: var(--flex-space-lg);
    padding-block: var(--flex-space-lg);
  }

  .l-page-sidebar-start > .l-page-sidebar {
    position: sticky;
    inset-block-start: var(--flex-space-md);
    max-block-size: calc(100vh - 120px);
    overflow-y: auto;
    padding-inline-start: var(--flex-space-md);
    container-type: inline-size;
    container-name: page-sidebar;
  }

  .l-page-sidebar-start > .l-page-main {
    /* Inherits the breakout grid from the shared rule at the top of this file. */
    min-inline-size: 0;
  }

  @media (max-width: 48rem) {
    .l-page-sidebar-start {
      grid-template-columns: minmax(0, 1fr);
    }

    .l-page-sidebar-start > .l-page-sidebar {
      position: static;
      max-block-size: none;
      overflow-y: visible;
      padding-inline-start: var(--flex-space-md);
      padding-inline-end: var(--flex-space-md);
      border-block-end: 1px solid var(--flex-color-border);
      padding-block-end: var(--flex-space-md);
    }
  }
```

- [ ] **Step 4: Rebuild CSS and rerun the tests**

```bash
bun run build:css && bunx playwright test src/app/components/flex-layout/page-layout-conformance.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 5: Run the full check**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/public/page-layouts.css src/app/components/flex-layout/page-layout-conformance.test.ts
git commit -m "feat(layout): add l-page-sidebar-start page layout

Two-region layout with a sticky sidebar on the left and a main content
region on the right. The main region reuses the breakout track grid
from l-page-content. Collapses to single-column below the md
breakpoint."
```

---

## Task 5: Add `l-page-sidebar-end`

Mirrors the sidebar-start layout with the sidebar on the right instead of the left. Same responsive behavior: collapses to single-column below `--flex-bp-md`, with the sidebar stacked below main content (not above) because the right sidebar is supplementary rather than navigational.

**Files:**
- Modify: `src/app/public/page-layouts.css`
- Modify: `src/app/components/flex-layout/page-layout-conformance.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/app/components/flex-layout/page-layout-conformance.test.ts`:

```typescript
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
  test('places main on left and sidebar on right on wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await renderFlexFixture(page, sidebarEndFixture)

    const mainBox = await page.locator('[data-testid="end-main"]').boundingBox()
    const sidebarBox = await page.locator('[data-testid="end-sidebar"]').boundingBox()

    expect((mainBox?.x ?? 0) + (mainBox?.width ?? 0))
      .toBeLessThanOrEqual((sidebarBox?.x ?? 0) + 1)
    expect(Math.abs((mainBox?.y ?? 0) - (sidebarBox?.y ?? 0))).toBeLessThan(2)
  })

  test('stacks sidebar below main below md breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await renderFlexFixture(page, sidebarEndFixture)

    const mainBox = await page.locator('[data-testid="end-main"]').boundingBox()
    const sidebarBox = await page.locator('[data-testid="end-sidebar"]').boundingBox()

    expect((mainBox?.y ?? 0) + (mainBox?.height ?? 0))
      .toBeLessThanOrEqual((sidebarBox?.y ?? 0) + 1)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
bun run build:css && bunx playwright test src/app/components/flex-layout/page-layout-conformance.test.ts
```

Expected: both new tests fail.

- [ ] **Step 3: Add the sidebar-end layout**

Append to `src/app/public/page-layouts.css` inside the `@layer composition` block:

```css
  .l-page-sidebar-end {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--flex-sidebar-width);
    gap: var(--flex-space-lg);
    padding-block: var(--flex-space-lg);
  }

  .l-page-sidebar-end > .l-page-main {
    min-inline-size: 0;
  }

  .l-page-sidebar-end > .l-page-sidebar {
    padding-inline-end: var(--flex-space-md);
    container-type: inline-size;
    container-name: page-sidebar;
  }

  @media (max-width: 48rem) {
    .l-page-sidebar-end {
      grid-template-columns: minmax(0, 1fr);
    }

    .l-page-sidebar-end > .l-page-sidebar {
      padding-inline-start: var(--flex-space-md);
      border-block-start: 1px solid var(--flex-color-border);
      padding-block-start: var(--flex-space-md);
    }
  }
```

- [ ] **Step 4: Rebuild CSS and rerun the tests**

```bash
bun run build:css && bunx playwright test src/app/components/flex-layout/page-layout-conformance.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run the full check**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/public/page-layouts.css src/app/components/flex-layout/page-layout-conformance.test.ts
git commit -m "feat(layout): add l-page-sidebar-end page layout

Mirror of l-page-sidebar-start with the sidebar on the right. On narrow
viewports, supplementary sidebar stacks below main content rather than
above, since the right sidebar is for contextual help rather than
primary navigation."
```

---

## Task 6: Add `/catalog/design-system/layout` documentation page

Creates a new documentation page in the catalog under the design system section. Shows each page layout, each breakout track, and the new switcher composition. Explains when to use each one — this guidance is the part that steers future contributors and LLM agents toward correct layouts.

**Files:**
- Modify: `src/app/routes/catalog/design-system.tsx` (add `layout` slug branch)
- Modify: `src/app/routes/catalog/design-system.tsx` (add "Layout" foundation card on the index)
- Modify: `test/catalog-design-system.test.ts` (add coverage for the new page)

- [ ] **Step 1: Write the failing test**

Open `test/catalog-design-system.test.ts` and add a new test (match existing test patterns in the file — use the project's HTTP test helper for catalog routes):

```typescript
import { describe, expect, it } from 'bun:test'
import { app } from '../src/app/server'

describe('catalog design system — layout page', () => {
  it('returns 200 and renders the layout heading', async () => {
    const res = await app.request('/catalog/design-system/layout')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<h1>Layout</h1>')
    expect(html).toContain('l-page-content')
    expect(html).toContain('l-page-sidebar-start')
    expect(html).toContain('l-page-sidebar-end')
    expect(html).toContain('Breakout tracks')
    expect(html).toContain('l-switcher')
  })

  it('lists layout under design system foundations', async () => {
    const res = await app.request('/catalog/design-system')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('/catalog/design-system/layout')
    expect(html).toContain('Layout')
  })
})
```

If the existing test file uses a different request helper (for example `fetch` against a running server), follow the surrounding convention.

- [ ] **Step 2: Run the test and confirm it fails**

```bash
bun test test/catalog-design-system.test.ts
```

Expected: both tests fail with 404 or missing heading.

- [ ] **Step 3: Add the foundation card on the index**

Open `src/app/routes/catalog/design-system.tsx` and find the `foundations` array (line 59). Add a new entry after the existing "Compositions" entry:

```tsx
    {
      title: 'Layout',
      href: resolveUrl('/catalog/design-system/layout'),
      description:
        'Page layouts (content, sidebar-start, sidebar-end), breakout tracks, and container contracts that guide layouts toward correctness by default.',
    },
```

- [ ] **Step 4: Add the layout slug branch**

In the same file, find the `designSystem.get('/:slug', ...)` handler (line 144) and add a new branch for `slug === 'layout'` alongside the existing `typography` branch. Model the structure after the typography branch:

```tsx
  if (slug === 'layout') {
    const sidebarData = getDesignSystemSidebar('/catalog/design-system/layout')
    const sidebar = <CatalogSidebar sections={sidebarData} />

    return c.html(
      <Layout
        title="Layout — Design System"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Layout</h1>

        <section class="l-stack">
          <h2>Two-tier model</h2>
          <p>
            The layout system has two tiers. <strong>Page layouts</strong> are
            a small set of named patterns that define the top-level structure
            of a page. <strong>Compositions</strong> (stack, cluster, grid,
            sidebar, center, switcher) handle layout within page regions.
          </p>
          <p>
            Every page picks one page layout. Page layouts are top-level only
            and are never nested inside each other or inside a composition.
          </p>
        </section>

        <section class="l-stack">
          <h2>Page layouts</h2>

          <article class="l-stack">
            <h3><code class="flex-mono">l-page-content</code></h3>
            <p>
              Single centered content region with breakout tracks. For prose
              pages, simple forms, and any view without a persistent sidebar.
            </p>
            <p>
              <strong>When to use:</strong> a page that is primarily reading
              material or a single form, with no navigation rail.
            </p>
            <pre class="flex-mono"><code>{`<main class="l-page-content">
  <h1>Title</h1>
  <p>Content flows in the default content track.</p>
  <figure class="l-feature">Wider breakout element.</figure>
  <div class="l-full">Edge-to-edge banner.</div>
</main>`}</code></pre>
          </article>

          <article class="l-stack">
            <h3><code class="flex-mono">l-page-sidebar-start</code></h3>
            <p>
              Two regions: navigation or primary sidebar on the left, content
              on the right. The content region reuses the breakout track grid.
              Collapses to a single column below the md breakpoint.
            </p>
            <p>
              <strong>When to use:</strong> pages with a persistent navigation
              or section sidebar. This is what the catalog uses.
            </p>
            <pre class="flex-mono"><code>{`<div class="l-page-sidebar-start">
  <aside class="l-page-sidebar"><nav>...</nav></aside>
  <main class="l-page-main">
    <h1>Title</h1>
    <p>Content.</p>
  </main>
</div>`}</code></pre>
          </article>

          <article class="l-stack">
            <h3><code class="flex-mono">l-page-sidebar-end</code></h3>
            <p>
              Mirror of sidebar-start with a supplementary panel on the right:
              contextual help, metadata, outline. On narrow viewports the
              supplementary panel stacks below main content rather than above.
            </p>
            <p>
              <strong>When to use:</strong> pages where the right panel
              supports the main content rather than navigates between pages.
            </p>
          </article>
        </section>

        <section class="l-stack">
          <h2>Breakout tracks</h2>
          <p>
            Within the content region of any page layout, a CSS Grid with
            named lines defines four tracks. Children default to the
            <code class="flex-mono">content</code> track. Specific elements
            opt into wider tracks with a class.
          </p>
          <ul>
            <li>
              <code class="flex-mono">content</code> — default. Readable prose
              and form width. Based on <code class="flex-mono">--flex-content-default</code>{' '}
              (65ch).
            </li>
            <li>
              <code class="flex-mono">l-popout</code> — slightly wider. For
              wide tables, code blocks, card groups.
            </li>
            <li>
              <code class="flex-mono">l-feature</code> — wider still. For hero
              sections, callouts, wide images.
            </li>
            <li>
              <code class="flex-mono">l-full</code> — edge-to-edge of the
              content region. For full-bleed backgrounds and dividers.
            </li>
          </ul>
          <p>
            To use a different default width for an entire page, set{' '}
            <code class="flex-mono">data-width="narrow"</code> or{' '}
            <code class="flex-mono">data-width="wide"</code> on the page layout
            root.
          </p>
        </section>

        <section class="l-stack">
          <h2>Container contract</h2>
          <p>
            Each page layout sets a named container on its content region
            (<code class="flex-mono">page-content</code>) and its sidebar
            region (<code class="flex-mono">page-sidebar</code>). Components
            inside those regions should use <code class="flex-mono">@container</code>{' '}
            queries against those names instead of viewport media queries, so
            they adapt to their actual available width rather than the window.
          </p>
        </section>

        <section class="l-stack">
          <h2>The <code class="flex-mono">l-switcher</code> composition</h2>
          <p>
            A new composition primitive: lays children out horizontally when
            the container is above <code class="flex-mono">--threshold</code>{' '}
            (default 30rem) and stacks them vertically when below. Useful for
            action rows and form field groups.
          </p>
          <pre class="flex-mono"><code>{`<div class="l-switcher" style="--threshold: 30rem;">
  <label>First name <input /></label>
  <label>Last name <input /></label>
</div>`}</code></pre>
        </section>

        <section class="l-stack">
          <h2>What this system does not provide</h2>
          <ul>
            <li>A 12-column utility grid</li>
            <li>Breakpoint-prefixed column span classes</li>
            <li>Utilities that duplicate native CSS Grid capabilities</li>
          </ul>
          <p>
            Native CSS Grid, subgrid, and container queries cover those needs.
            The layout system offers a small, opinionated vocabulary — page
            layouts, breakout tracks, and compositions — designed to make
            correct layouts the path of least resistance.
          </p>
        </section>
      </Layout>,
    )
  }
```

- [ ] **Step 5: Update the design system sidebar**

Open `src/app/routes/catalog/sidebar.ts` and find `getDesignSystemSidebar`. If it lists foundations explicitly (check the body below line 80), add a "Layout" entry pointing at `/catalog/design-system/layout`. If it derives foundations from the page's rendering, no change is needed here.

- [ ] **Step 6: Rerun the tests**

```bash
bun run check
```

Expected: the two new tests pass along with the existing suite.

- [ ] **Step 7: Commit**

```bash
git add src/app/routes/catalog/design-system.tsx src/app/routes/catalog/sidebar.ts test/catalog-design-system.test.ts
git commit -m "docs(catalog): add layout page under design system

New /catalog/design-system/layout page documents the page layouts,
breakout tracks, container contract, and l-switcher composition. The
'when to use' guidance for each layout is the part that steers future
contributors toward correct results."
```

---

## Task 7: Migrate `.catalog-layout` to `l-page-sidebar-start`

Rewrites the existing `.catalog-layout` rule in `flex-layout/styles.css` so the catalog uses `l-page-sidebar-start` for its page structure. Removes the hardcoded 240px sidebar column and the inline `--flex-content-max-width` reference. The visual effect is that catalog pages now use the new breakout tracks and the new content-width default (65ch).

**Files:**
- Modify: `src/app/components/flex-layout/styles.css:16-30`
- Modify: `src/app/components/flex-layout/index.tsx` (emit the new classes on the catalog shell)
- Possibly modify: `test/flex-layout.test.tsx` (update assertions for new markup)

- [ ] **Step 1: Inspect the current Layout component**

```bash
bun --print 'await Bun.file("src/app/components/flex-layout/index.tsx").text()' | head -80
```

Identify how the catalog shell is rendered. Look for where `.catalog-layout`, `.catalog-sidebar`, and the main content slot are emitted.

- [ ] **Step 2: Write the failing test**

Open `test/flex-layout.test.tsx` and add (or update) a test that asserts the catalog shell now emits the new classes:

```tsx
import { describe, expect, it } from 'bun:test'
import { Layout } from '../src/app/components/flex-layout'

describe('Layout — catalog shell uses l-page-sidebar-start', () => {
  it('emits l-page-sidebar-start on the catalog wrapper', () => {
    const html = (
      <Layout
        title="Test"
        sidebar={<nav data-testid="nav">nav</nav>}
        currentPath="/catalog"
      >
        <p>Body</p>
      </Layout>
    ).toString()

    expect(html).toContain('class="l-page-sidebar-start"')
    expect(html).toContain('class="l-page-sidebar')
    expect(html).toContain('class="l-page-main')
    // No hardcoded catalog-layout class
    expect(html).not.toContain('class="catalog-layout"')
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
bun test test/flex-layout.test.tsx
```

Expected: failure because the shell still emits `.catalog-layout`.

- [ ] **Step 4: Update the Layout component**

Open `src/app/components/flex-layout/index.tsx`. Replace the element that currently has `class="catalog-layout"` with:

```tsx
<div class="l-page-sidebar-start">
  <aside class="l-page-sidebar catalog-sidebar">
    {sidebar}
  </aside>
  <main class="l-page-main">
    {children}
  </main>
</div>
```

Keep the `catalog-sidebar` class alongside `l-page-sidebar` so the existing sticky-scroll and toggle styles continue to apply — they are component-level sidebar concerns that the page layout does not own.

- [ ] **Step 5: Update `flex-layout/styles.css`**

Open `src/app/components/flex-layout/styles.css` and remove lines 16-30 (the `.catalog-layout` block) along with lines 83-97 (the `.catalog-layout` media query). The grid structure is now owned by `l-page-sidebar-start` in `page-layouts.css`.

Keep the `.catalog-sidebar` block and the `.catalog-nav-toggle` blocks unchanged — those are the component-level sidebar styles that still apply.

The resulting file should start with `.site-footer` and continue with the two remaining `.catalog-*` blocks and their media query.

- [ ] **Step 6: Rebuild and rerun the tests**

```bash
bun run build:css && bun run check
```

Expected: all tests pass. The catalog now renders through the new page layout. Visual inspection in the dev server should show the catalog sidebar and main content with the new content width (narrower than before) and the sticky behavior preserved.

- [ ] **Step 7: Visually verify in the dev server**

```bash
bun run dev
```

Open `http://localhost:3000/catalog` and each of its sub-pages in a browser. Verify:
- Sidebar is on the left, main content on the right
- Sidebar is sticky as you scroll
- Main content is visibly narrower than before (65ch default)
- Narrow viewport (~600px) collapses the sidebar above the main content

Report any visual regressions that are not expected narrowings; fix them inline before committing. Stop the dev server when done (`Ctrl-C`).

- [ ] **Step 8: Commit**

```bash
git add src/app/components/flex-layout/styles.css src/app/components/flex-layout/index.tsx test/flex-layout.test.tsx
git commit -m "feat(layout): migrate catalog shell to l-page-sidebar-start

Replaces the ad-hoc .catalog-layout grid with the new l-page-sidebar-start
page layout. The hardcoded 240px sidebar column and the 60rem content
width are replaced by --flex-sidebar-width (15rem) and the named-line
breakout grid. The catalog-sidebar component-level styles stay in place
for sticky scrolling and the narrow-viewport toggle."
```

---

## Task 8: Migrate the deployment table to use a breakout track

The deployment table uses a hardcoded `grid-template-columns` definition. Rewrite it to live inside a page layout content region and use the `l-popout` or `l-feature` breakout track so it gets a bit more room than the default content width without losing its structure.

**Files:**
- Modify: `src/app/components/deployment-table.css`
- Modify: `src/app/components/deployment-table.tsx` (wrap in `l-feature`)
- Modify: `test/deployment-table.test.tsx` (assert breakout class)

- [ ] **Step 1: Read the current implementation**

```bash
bun --print 'await Bun.file("src/app/components/deployment-table.css").text()'
bun --print 'await Bun.file("src/app/components/deployment-table.tsx").text()'
```

- [ ] **Step 2: Write the failing test**

Open `test/deployment-table.test.tsx` and add:

```tsx
import { describe, expect, it } from 'bun:test'
import { DeploymentTable } from '../src/app/components/deployment-table'

describe('deployment table — breakout track', () => {
  it('renders inside the l-feature breakout track', () => {
    const html = (<DeploymentTable deployments={[]} />).toString()
    expect(html).toContain('class="l-feature deployment-table"')
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
bun test test/deployment-table.test.tsx
```

- [ ] **Step 4: Update the component**

Open `src/app/components/deployment-table.tsx`. Find the root element of the table (likely a `<div class="deployment-table">`) and change the class to `l-feature deployment-table`.

- [ ] **Step 5: Update `deployment-table.css`**

Open `src/app/components/deployment-table.css`. The existing grid keeps its column definitions for internal structure (it is still an internal data grid), but remove any margin/width overrides that attempted to make it wider than the content track — the `l-feature` class now handles that.

If the file contains lines like `max-width: none;`, `margin-inline: -...rem;`, or similar horizontal-stretching hacks, delete them.

- [ ] **Step 6: Rebuild and rerun the tests**

```bash
bun run build:css && bun run check
```

Expected: all tests pass. The deployment table now sits in the feature track on the homepage and scales naturally with the content region.

- [ ] **Step 7: Visually verify**

```bash
bun run dev
```

Open `http://localhost:3000/` and confirm the deployment table is wider than the surrounding content but not edge-to-edge, and that its columns are still readable.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/deployment-table.css src/app/components/deployment-table.tsx test/deployment-table.test.tsx
git commit -m "feat(layout): move deployment table into l-feature breakout track

The table previously used an ad-hoc grid with inline overrides to be
wider than the surrounding content. It now opts into the l-feature
breakout track provided by the page layout and keeps only its internal
column definitions."
```

---

## Task 9: Sweep remaining page-level `.l-center` usages

Identify any remaining places where `.l-center` is used at the page level (as a top-level wrapper for all page content) and migrate them to a page layout. Component-level uses of `.l-center` (centering a card or widget inside its own parent) stay as they are — the disambiguation is about page-level versus component-level usage, not about the CSS rule itself.

**Files:**
- Search: all `.tsx` and `.css` files for `.l-center` usage
- Modify: any page-level callers found

- [ ] **Step 1: Enumerate current usages**

```bash
bunx biome check --formatter-enabled=false src/ 2>/dev/null # ensure no noise
```

Then use Grep for `l-center` across the app:

```
Grep pattern: "l-center" in src/app
```

Classify each usage:
- **Page-level:** wraps the main content of an entire page. Migrate.
- **Component-level:** centers a card, widget, or sub-region inside a larger layout. Leave as-is.

- [ ] **Step 2: For each page-level usage, write a test**

For each page-level caller found, add a test (or extend an existing route test) asserting the route now emits a page layout class:

```tsx
it('uses a page layout class instead of l-center', async () => {
  const res = await app.request('/some-route')
  const html = await res.text()
  // Exact assertion depends on which page layout is appropriate
  expect(html).toMatch(/class="l-page-(content|sidebar-start|sidebar-end)"/)
})
```

- [ ] **Step 3: Run the tests and confirm failures**

```bash
bun run check
```

Expected: failures matching the routes just updated.

- [ ] **Step 4: Migrate each caller**

For each caller:

- If the page is a simple content flow, use `l-page-content`.
- If the page has a sidebar (navigation), use `l-page-sidebar-start`.
- If the page has a supplementary right panel, use `l-page-sidebar-end`.

Update the route's JSX to emit the chosen page layout instead of `.l-center`. Leave component-level `.l-center` usages untouched.

If no page-level `.l-center` usages are found after Task 7's migration, document this in the commit message and move on.

- [ ] **Step 5: Rerun the full check**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(layout): migrate page-level l-center callers to page layouts

Sweeps remaining places where .l-center was used as a top-level page
wrapper and migrates them to the appropriate page layout. Component-
level uses of l-center (centering a card inside a larger region) are
unchanged."
```

If no migrations were needed, skip the commit and add a note to the PR description instead.

---

## Task 10: Extend stylelint to flag hardcoded content widths

Adds rules to `.stylelintrc.json` so that `max-inline-size` and `max-width` values must come from `--flex-content-*` tokens (or the deprecated alias) rather than hardcoded lengths. This closes the loop: the tokens exist, the page layouts use them, and the linter now prevents regression.

**Files:**
- Modify: `.stylelintrc.json`

- [ ] **Step 1: Read the current config**

```bash
bun --print 'await Bun.file(".stylelintrc.json").text()'
```

Identify the `scale-unlimited/declaration-strict-value` block and its `ignoreValues` or `expandShorthand` configuration.

- [ ] **Step 2: Add content-width enforcement**

Update `.stylelintrc.json` so the strict-value rule covers `max-inline-size` and `max-width`, and accepts `var(--flex-content-narrow)`, `var(--flex-content-default)`, `var(--flex-content-wide)`, and `var(--flex-content-max-width)` (the deprecated alias).

The exact structure depends on the plugin's configuration. Typically:

```json
{
  "rules": {
    "scale-unlimited/declaration-strict-value": [
      [
        "/color/",
        "font-family",
        "font-size",
        "background",
        "max-inline-size",
        "max-width"
      ],
      {
        "ignoreValues": {
          "max-inline-size": ["/^var\\(--flex-content-/", "none", "100%", "auto", "min-content", "max-content"],
          "max-width": ["/^var\\(--flex-content-/", "none", "100%", "auto", "min-content", "max-content"]
        }
      }
    ]
  }
}
```

Match the surrounding convention — the existing file will indicate whether to extend the existing `ignoreValues` map or introduce a new one.

- [ ] **Step 3: Run the CSS lint**

```bash
bun run lint:css
```

Expected: any hardcoded `max-width: 60rem` or `max-inline-size: 40rem` in the source CSS now surfaces as a lint error. The new `page-layouts.css` and `tokens.css` pass because they use `var(--flex-content-*)`.

- [ ] **Step 4: Fix any offenders**

If the lint reports errors on existing files, fix them by replacing the hardcoded value with the appropriate `--flex-content-*` token.

- [ ] **Step 5: Run the full check**

```bash
bun run check
```

Expected: all checks pass.

- [ ] **Step 6: Commit**

```bash
git add .stylelintrc.json
git commit -m "chore(lint): enforce content-width tokens for max-inline-size

max-inline-size and max-width declarations must now use one of
--flex-content-narrow/default/wide (or the deprecated
--flex-content-max-width alias). Closes the loop between the layout
tokens and the codebase that consumes them."
```

---

## Final verification

- [ ] **Run the full check one more time**

```bash
bun run check
```

Expected: all lint, type, and test checks pass.

- [ ] **Update the design spec frontmatter**

Open `notes/2026-04-12-grid-layout-system-design.md` and change:

```yaml
status: draft
```

to:

```yaml
status: stable
```

- [ ] **Commit the status change**

```bash
git add notes/2026-04-12-grid-layout-system-design.md
git commit -m "docs(design): mark grid layout design as stable"
```

- [ ] **Push and mark the draft PR ready**

```bash
git push
gh pr ready  # converts the draft PR to ready for review
```

---

## Spec coverage check

- Two-tier layout model: Tasks 3, 4, 5 introduce the page layouts; existing compositions stay unchanged per the design.
- Three page layouts (`l-page-content`, `l-page-sidebar-start`, `l-page-sidebar-end`): Tasks 3, 4, 5.
- Named-line breakout tracks: Task 3 defines them; Tasks 4 and 5 reuse via `.l-page-main`.
- New tokens (content-widths, sidebar-width, breakpoints): Task 1.
- Deprecated `--flex-content-max-width` alias: Task 1.
- New `l-switcher` composition: Task 2.
- Container contract (named containers on content regions): Tasks 3, 4, 5 (`container-name: page-content`, `container-name: page-sidebar`).
- Catalog documentation page: Task 6.
- Migration of `.catalog-layout`: Task 7.
- Migration of deployment table: Task 8.
- Sweep remaining `.l-center` page-level uses: Task 9.
- Stylelint enforcement: Task 10.
- Visual conformance tests: Tasks 3, 4, 5 each include Playwright tests at narrow/medium/wide viewports.
- `.l-center` and `.l-sidebar` refinement: documented in Task 6's catalog page; no CSS change is required — the refinement is usage-level (stop using `.l-center` at page level, stop confusing `.l-sidebar` with `.l-page-sidebar-*`).
- `.l-stack`, `.l-cluster`, `.l-grid` unchanged: none of the tasks touch them.
- Cascade layer placement: Task 3 wraps `page-layouts.css` in `@layer composition`.
- Nesting contract (page layouts top-level only): enforced by convention and documented in Task 6; no code change required.

Deprecation removal of `--flex-content-max-width` after one release cycle is deliberately out of scope for this plan — it will be a one-line follow-up.
