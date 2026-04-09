# USWDS Design System Spec 1: Infrastructure + Proof Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish design system testing infrastructure and validate it with four proof components (button, text-input family, alert, accordion).

**Architecture:** Each component lives in `src/components/flex-*/` with co-located TSX, CSS, client.ts (if interactive), meta.ts, examples.tsx, and conformance.test.ts. Conformance tests use Playwright to compare rendered output against USWDS reference HTML. A visual-descriptor library (ported from class repo) extracts computed styles and diffs them. All interactive components register as custom elements, bundled into a single `dist/components.js` served on every page.

**Tech Stack:** Bun 1.x, Hono 4.x, TypeScript 5.x, Playwright, @axe-core/playwright, @uswds/uswds 3.13.x (dev only)

**Target Repository:** `/home/daniel/src/forms-lab` on branch `slice-0/skeleton`

**Reference Implementation:** `/home/daniel/src/llm-class-2026-winter-cohort/web` (class repo)

---

## File Structure

**New files to create:**

```
src/lib/visual-descriptor/
├── index.ts              # exports extract, diff, types
├── types.ts              # VisualNode, VisualDifference, PseudoElement, DiffOptions
├── extract.ts            # extract() — Playwright page → VisualNode tree
├── diff.ts               # diff() — compare two VisualNode trees
└── schema.ts             # DEFAULT_PROPERTIES list

src/lib/test-helpers/
├── index.ts              # exports all helpers
├── render.ts             # renderFlexFixture, renderUswdsFixture
└── assertions.ts         # expectMatch

src/components/
├── registry.ts           # hardcoded component meta imports
├── register.ts           # interactive component client.ts imports
├── types.ts              # ComponentMeta, ComponentCategory types
│
├── flex-button/
│   ├── index.tsx
│   ├── styles.css
│   ├── meta.ts
│   ├── examples.tsx
│   └── conformance.test.ts
│
├── flex-text-input/
│   ├── index.tsx
│   ├── styles.css
│   ├── meta.ts
│   ├── examples.tsx
│   └── conformance.test.ts
│
├── flex-label/
│   ├── index.tsx
│   ├── styles.css
│   ├── meta.ts
│   ├── examples.tsx
│   └── conformance.test.ts
│
├── flex-textarea/
│   ├── index.tsx
│   ├── styles.css
│   ├── meta.ts
│   ├── examples.tsx
│   └── conformance.test.ts
│
├── flex-error-message/
│   ├── index.tsx
│   ├── styles.css
│   ├── meta.ts
│   ├── examples.tsx
│   └── conformance.test.ts
│
├── flex-alert/
│   ├── index.tsx
│   ├── styles.css
│   ├── meta.ts
│   ├── examples.tsx
│   └── conformance.test.ts
│
└── flex-accordion/
    ├── index.tsx
    ├── styles.css
    ├── client.ts
    ├── meta.ts
    ├── examples.tsx
    └── conformance.test.ts

scripts/
└── build-components.ts   # builds register.ts → dist/components.js
```

**Files to modify:**

- `src/public/styles.css` — add @import for new component CSS files
- `src/components/flex-layout/index.tsx` — add `<script>` tag for components.js
- `src/dev.ts` — build components.js on startup
- `src/routes/catalog/design-system.tsx` — rewrite as per-component pages with registry
- `src/routes/catalog/sidebar.ts` — add design system link
- `package.json` — add dependencies and scripts
- `tsconfig.json` — add DOM lib for Playwright types
- `.github/workflows/ci.yml` — add Playwright conformance step
- `playwright.config.ts` — new file for Playwright configuration

---

### Task 1: Install Dependencies and Configure Playwright

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Install dependencies**

```bash
cd /home/daniel/src/forms-lab && bun add -d @playwright/test @axe-core/playwright @uswds/uswds@3.13.2
```

Expected: Dependencies installed

- [ ] **Step 2: Install Playwright browsers**

```bash
cd /home/daniel/src/forms-lab && bunx playwright install chromium
```

Expected: Chromium browser downloaded

- [ ] **Step 3: Add scripts to package.json**

In `/home/daniel/src/forms-lab/package.json`, replace the `"scripts"` object with:

```json
"scripts": {
  "dev": "bun run --watch src/dev.ts",
  "start": "bun run src/dev.ts",
  "test": "bun test",
  "test:watch": "bun test --watch",
  "test:conformance": "bunx playwright test",
  "test:all": "bun test && bunx playwright test",
  "cli": "bun run src/cli.ts",
  "build:css": "bun run scripts/build-css.ts",
  "build:components": "bun run scripts/build-components.ts",
  "build": "bun run build:css && bun run build:components",
  "lint:css": "bunx stylelint 'src/**/*.css'"
}
```

Expected: Scripts updated

- [ ] **Step 4: Create playwright.config.ts**

Create `/home/daniel/src/forms-lab/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/conformance.test.ts',
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'bun run dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
```

Expected: Playwright configured

- [ ] **Step 5: Update CI workflow**

Replace the contents of `/home/daniel/src/forms-lab/.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - name: Run unit tests
        run: bun test

      - name: Type check
        run: bun run --no-warnings tsc --noEmit

      - name: Install Playwright
        run: bunx playwright install --with-deps chromium

      - name: Run conformance tests
        run: bun run test:conformance

  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Lint and format check
        run: bunx @biomejs/biome check .
```

Expected: CI includes conformance tests

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab
git add package.json bun.lock playwright.config.ts .github/workflows/ci.yml
git commit -m "chore: add Playwright, Axe, and USWDS 3.13 for conformance testing

- @playwright/test for browser-based conformance tests
- @axe-core/playwright for accessibility audits
- @uswds/uswds@3.13.2 as dev-only reference for fixtures
- Playwright config targeting conformance.test.ts files
- CI updated with build + conformance test steps"
```

Expected: Committed

---

### Task 2: Port Visual Descriptor Library

**Files:**
- Create: `src/lib/visual-descriptor/index.ts`
- Create: `src/lib/visual-descriptor/types.ts`
- Create: `src/lib/visual-descriptor/schema.ts`
- Create: `src/lib/visual-descriptor/extract.ts`
- Create: `src/lib/visual-descriptor/diff.ts`

**Note to implementer:** This library is ported from `/home/daniel/src/llm-class-2026-winter-cohort/web/src/lib/visual-descriptor/`. Read each source file, understand it, then recreate it in the forms-lab repo. Adapt imports and types as needed but preserve the API surface: `extract(page, url, selector, properties)` → `VisualNode` and `diff(reference, implementation, path, options)` → `VisualDifference[]`.

- [ ] **Step 1: Create types.ts**

Create `/home/daniel/src/forms-lab/src/lib/visual-descriptor/types.ts`:

```typescript
export interface PseudoElement {
  content: string
  styles: Record<string, string>
}

export interface VisualNode {
  tag: string
  classes: string[]
  attributes: Record<string, string>
  text: string | null
  styles: Record<string, string>
  box: {
    width: number
    height: number
    paddingTop: number
    paddingRight: number
    paddingBottom: number
    paddingLeft: number
    marginTop: number
    marginRight: number
    marginBottom: number
    marginLeft: number
  }
  before: PseudoElement | null
  after: PseudoElement | null
  children: VisualNode[]
}

export interface VisualDifference {
  path: string
  property: string
  expected: string
  actual: string
}

export interface DiffOptions {
  ignoreAttributes?: string[]
  ignoreProperties?: string[]
  ignoreBoxKeys?: string[]
  ignorePseudos?: boolean
}
```

Expected: Types defined

- [ ] **Step 2: Create schema.ts**

Create `/home/daniel/src/forms-lab/src/lib/visual-descriptor/schema.ts`:

```typescript
export const DEFAULT_PROPERTIES = [
  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'text-transform',
  'text-decoration',
  'letter-spacing',
  // Visual
  'background-color',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'box-shadow',
  'outline',
  // Layout
  'display',
  'position',
  'flex-direction',
  'flex-wrap',
  'align-items',
  'justify-content',
  'gap',
  'overflow',
]

export const TRACKED_ATTRIBUTES = [
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-required',
  'aria-invalid',
  'aria-live',
  'aria-expanded',
  'aria-hidden',
  'aria-controls',
  'aria-pressed',
  'aria-selected',
  'type',
  'for',
  'id',
  'name',
  'required',
  'disabled',
  'tabindex',
  'autocomplete',
  'inputmode',
  'data-state',
  'data-variant',
  'data-size',
]
```

Expected: Schema defined

- [ ] **Step 3: Create extract.ts**

Create `/home/daniel/src/forms-lab/src/lib/visual-descriptor/extract.ts`. Port from the class repo at `/home/daniel/src/llm-class-2026-winter-cohort/web/src/lib/visual-descriptor/extract.ts`. The function navigates to a URL, waits for a selector, then uses `page.evaluate()` to recursively walk the DOM tree extracting computed styles, box model, attributes, pseudo-elements, and text content into a `VisualNode` tree.

Read the class repo file and recreate it. Key signature:

```typescript
import type { Page } from '@playwright/test'
import type { VisualNode } from './types'
import { DEFAULT_PROPERTIES, TRACKED_ATTRIBUTES } from './schema'

export async function extract(
  page: Page,
  url: string,
  selector: string = '[data-testid="target"]',
  properties: string[] = DEFAULT_PROPERTIES,
): Promise<VisualNode> {
  // Navigate to URL, wait for selector, evaluate DOM extraction
  // Return VisualNode tree
}
```

Expected: extract.ts ported and adapted

- [ ] **Step 4: Create diff.ts**

Create `/home/daniel/src/forms-lab/src/lib/visual-descriptor/diff.ts`. Port from the class repo at `/home/daniel/src/llm-class-2026-winter-cohort/web/src/lib/visual-descriptor/diff.ts`. The function recursively compares two `VisualNode` trees and returns an array of `VisualDifference` objects.

Read the class repo file and recreate it. Key signature:

```typescript
import type { VisualNode, VisualDifference, DiffOptions } from './types'

export function diff(
  reference: VisualNode,
  implementation: VisualNode,
  path: string = '',
  options: DiffOptions = {},
): VisualDifference[] {
  // Compare tags, attributes, styles, box model, pseudos, children recursively
  // Return array of differences
}
```

Expected: diff.ts ported and adapted

- [ ] **Step 5: Create index.ts barrel export**

Create `/home/daniel/src/forms-lab/src/lib/visual-descriptor/index.ts`:

```typescript
export { extract } from './extract'
export { diff } from './diff'
export { DEFAULT_PROPERTIES, TRACKED_ATTRIBUTES } from './schema'
export type {
  VisualNode,
  VisualDifference,
  DiffOptions,
  PseudoElement,
} from './types'
```

Expected: Barrel export created

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/lib/visual-descriptor/
git commit -m "feat: port visual-descriptor library for conformance testing

- extract(): Playwright page → VisualNode tree (computed styles, box model, ARIA, pseudos)
- diff(): compare two VisualNode trees, return differences
- Ported from class repo with same API surface"
```

Expected: Committed

---

### Task 3: Create Test Helpers

**Files:**
- Create: `src/lib/test-helpers/index.ts`
- Create: `src/lib/test-helpers/render.ts`
- Create: `src/lib/test-helpers/assertions.ts`

- [ ] **Step 1: Create assertions.ts**

Create `/home/daniel/src/forms-lab/src/lib/test-helpers/assertions.ts`:

```typescript
import { expect } from '@playwright/test'
import type { VisualDifference } from '../visual-descriptor'

export function expectMatch(differences: VisualDifference[]): void {
  if (differences.length > 0) {
    const report = differences
      .map((d) => `  ${d.path}: ${d.property} — expected ${d.expected}, got ${d.actual}`)
      .join('\n')
    console.log(`Visual differences found:\n${report}`)
  }
  expect(differences).toEqual([])
}
```

Expected: Assertion helper created

- [ ] **Step 2: Create render.ts**

Create `/home/daniel/src/forms-lab/src/lib/test-helpers/render.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

function readCSSFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8')
}

function getFlexCSS(): string {
  const files = [
    'src/public/reset.css',
    'src/public/font-normalize.css',
    'src/public/base.css',
    'src/public/utilities.css',
    // Component CSS files — add each new component here
    'src/components/flex-button/styles.css',
    'src/components/flex-text-input/styles.css',
    'src/components/flex-label/styles.css',
    'src/components/flex-textarea/styles.css',
    'src/components/flex-error-message/styles.css',
    'src/components/flex-alert/styles.css',
    'src/components/flex-accordion/styles.css',
  ]
  return files.map((f) => readCSSFile(f)).join('\n')
}

function getTokenCSS(): string {
  return readCSSFile('src/public/tokens.css')
}

function getUswdsCSS(): string {
  return readFileSync(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/css/uswds.min.css'),
    'utf-8',
  )
}

export async function renderFlexFixture(page: Page, html: string): Promise<void> {
  const css = getTokenCSS() + '\n' + getFlexCSS()
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head><style>${css}</style></head>
    <body style="margin: 0; padding: 16px; font-family: system-ui;">
      ${html}
    </body>
    </html>
  `)
  await page.waitForLoadState('networkidle')
}

export async function renderUswdsFixture(page: Page, html: string): Promise<void> {
  const css = getUswdsCSS()
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head><style>${css}</style></head>
    <body style="margin: 0; padding: 16px; font-family: system-ui;">
      ${html}
    </body>
    </html>
  `)
  await page.waitForLoadState('networkidle')
}
```

Expected: Render helpers created

- [ ] **Step 3: Create index.ts barrel export**

Create `/home/daniel/src/forms-lab/src/lib/test-helpers/index.ts`:

```typescript
export { expectMatch } from './assertions'
export { renderFlexFixture, renderUswdsFixture } from './render'
```

Expected: Barrel export created

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/lib/test-helpers/
git commit -m "feat: add conformance test helpers

- renderFlexFixture: inject flex CSS + tokens into Playwright page
- renderUswdsFixture: inject USWDS CSS into Playwright page
- expectMatch: assert zero visual differences with readable report"
```

Expected: Committed

---

### Task 4: Component Types and Registry Scaffold

**Files:**
- Create: `src/components/types.ts`
- Create: `src/components/registry.ts`
- Create: `src/components/register.ts`
- Create: `scripts/build-components.ts`
- Modify: `src/dev.ts`
- Modify: `src/components/flex-layout/index.tsx`

- [ ] **Step 1: Create component types**

Create `/home/daniel/src/forms-lab/src/components/types.ts`:

```typescript
export type ComponentCategory =
  | 'form'
  | 'action'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'process'
  | 'identity'

export interface ComponentMeta {
  name: string
  slug: string
  category: ComponentCategory
  description: string
  uswds: string
  interactive: boolean
}
```

Expected: Types created

- [ ] **Step 2: Create empty registry (will be populated as components are added)**

Create `/home/daniel/src/forms-lab/src/components/registry.ts`:

```typescript
import type { ComponentMeta } from './types'

// Components are added here as they are implemented.
// Each import references the component's meta.ts file.
const components: ComponentMeta[] = []

export function getComponents(): ComponentMeta[] {
  return components
}

export function getComponentBySlug(slug: string): ComponentMeta | undefined {
  return components.find((c) => c.slug === slug)
}

export function getComponentsByCategory(): Record<string, ComponentMeta[]> {
  const grouped: Record<string, ComponentMeta[]> = {}
  for (const component of components) {
    if (!grouped[component.category]) {
      grouped[component.category] = []
    }
    grouped[component.category].push(component)
  }
  return grouped
}
```

Expected: Registry scaffold created

- [ ] **Step 3: Create empty register.ts**

Create `/home/daniel/src/forms-lab/src/components/register.ts`:

```typescript
// Interactive component client scripts are imported here.
// Each import triggers customElements.define() for that component.
// This file is built into dist/components.js and loaded on every page.

// (No interactive components yet — flex-accordion will be the first)
```

Expected: Register scaffold created

- [ ] **Step 4: Create build-components.ts**

Create `/home/daniel/src/forms-lab/scripts/build-components.ts`:

```typescript
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const entrypoint = resolve(import.meta.dir, '../src/components/register.ts')
const outdir = resolve(import.meta.dir, '../dist')

await mkdir(outdir, { recursive: true })

const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  naming: 'components.js',
  target: 'browser',
  minify: false,
})

if (!result.success) {
  console.error('Component build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('Components built to dist/components.js')
```

Expected: Build script created

- [ ] **Step 5: Update dev.ts to build components on startup**

Replace the contents of `/home/daniel/src/forms-lab/src/dev.ts` with:

```typescript
/**
 * Dev server entry point — builds CSS and components on startup and exports
 * a Bun server config for --watch hot reload compatibility.
 */
import app from './server'

// Build CSS on startup
await Bun.build({
  entrypoints: ['./src/public/styles.css'],
  outdir: './dist',
  naming: 'styles.css',
  minify: false,
})

// Build component client scripts on startup
await Bun.build({
  entrypoints: ['./src/components/register.ts'],
  outdir: './dist',
  naming: 'components.js',
  target: 'browser',
  minify: false,
})

const port = process.env.PORT || 3000
console.log(`Server running on http://localhost:${port}`)

// Export server config for Bun's native --watch reload
export default {
  port,
  fetch: app.fetch,
}
```

Expected: dev.ts builds both CSS and components

- [ ] **Step 6: Add components.js script tag to Layout**

In `/home/daniel/src/forms-lab/src/components/flex-layout/index.tsx`, add a script tag before the closing `</body>` tag. The script should go after the footer, before `</body>`:

Add this line just before `</body>`:
```tsx
<script type="module" src="/static/components.js"></script>
```

Expected: Layout loads component scripts on every page

- [ ] **Step 7: Verify build**

```bash
cd /home/daniel/src/forms-lab && bun run build
```

Expected: Both `dist/styles.css` and `dist/components.js` created

- [ ] **Step 8: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/components/types.ts src/components/registry.ts src/components/register.ts scripts/build-components.ts src/dev.ts src/components/flex-layout/index.tsx
git commit -m "feat: add component registry, register, and build pipeline

- ComponentMeta type and category enum
- Registry with getComponents, getComponentBySlug, getComponentsByCategory
- register.ts → dist/components.js bundle (loaded on every page)
- Build script for component client scripts
- dev.ts builds both CSS and components on startup
- Layout includes <script> tag for components.js"
```

Expected: Committed

---

### Task 5: Implement flex-button

**Files:**
- Create: `src/components/flex-button/index.tsx`
- Create: `src/components/flex-button/styles.css`
- Create: `src/components/flex-button/meta.ts`
- Create: `src/components/flex-button/examples.tsx`
- Create: `src/components/flex-button/conformance.test.ts`
- Modify: `src/components/registry.ts`
- Modify: `src/public/styles.css`

**Note to implementer:** The class repo's `flex-button` at `/home/daniel/src/llm-class-2026-winter-cohort/web/src/components/flex-button/styles.css` has secondary, small, hover, and disabled styles. USWDS has more variants: accent-cool, accent-warm, base, outline, inverse, unstyled, big. Read the USWDS button page at https://designsystem.digital.gov/components/button/ for the full spec. Our implementation must cover ALL variants.

- [ ] **Step 1: Create meta.ts**

Create `/home/daniel/src/forms-lab/src/components/flex-button/meta.ts`:

```typescript
import type { ComponentMeta } from '../types'

export const meta: ComponentMeta = {
  name: 'Button',
  slug: 'flex-button',
  category: 'action',
  description: 'A clickable button for form submissions and actions.',
  uswds: 'https://designsystem.digital.gov/components/button/',
  interactive: false,
}
```

Expected: Meta created

- [ ] **Step 2: Create styles.css**

Create `/home/daniel/src/forms-lab/src/components/flex-button/styles.css`. Port from class repo and add missing USWDS variants. Read USWDS button documentation for exact color values:

```css
.flex-button {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  font-weight: 700;
  line-height: 0.9;
  color: var(--flex-color-on-accent);
  background-color: var(--flex-color-accent);
  border: 0 none;
  border-radius: var(--flex-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  column-gap: var(--flex-space-sm);
  padding: 12px 20px;
  cursor: pointer;
  text-decoration: none;
  appearance: none;
}

.flex-button:visited {
  color: var(--flex-color-on-accent);
}

.flex-button:hover {
  background-color: color-mix(in srgb, var(--flex-color-accent) 85%, black);
}

.flex-button:active {
  background-color: color-mix(in srgb, var(--flex-color-accent) 70%, black);
}

.flex-button:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

.flex-button:disabled {
  background-color: var(--flex-color-text-muted);
  color: var(--flex-color-on-accent);
  cursor: not-allowed;
  opacity: 0.65;
}

/* Secondary variant */
.flex-button[data-variant="secondary"] {
  background-color: transparent;
  color: var(--flex-color-accent);
  box-shadow: inset 0 0 0 2px var(--flex-color-accent);
}

.flex-button[data-variant="secondary"]:hover {
  background-color: color-mix(in srgb, var(--flex-color-accent) 8%, transparent);
}

.flex-button[data-variant="secondary"]:active {
  background-color: color-mix(in srgb, var(--flex-color-accent) 16%, transparent);
}

.flex-button[data-variant="secondary"]:disabled {
  background-color: transparent;
  color: var(--flex-color-text-muted);
  box-shadow: inset 0 0 0 2px var(--flex-color-text-muted);
}

/* Accent-cool variant */
.flex-button[data-variant="accent-cool"] {
  background-color: var(--flex-cyan-vivid-30);
  color: var(--flex-gray-90);
}

.flex-button[data-variant="accent-cool"]:hover {
  background-color: color-mix(in srgb, var(--flex-cyan-vivid-30) 85%, black);
}

.flex-button[data-variant="accent-cool"]:active {
  background-color: color-mix(in srgb, var(--flex-cyan-vivid-30) 70%, black);
}

/* Accent-warm variant */
.flex-button[data-variant="accent-warm"] {
  background-color: var(--flex-orange-vivid-30);
  color: var(--flex-gray-90);
}

.flex-button[data-variant="accent-warm"]:hover {
  background-color: color-mix(in srgb, var(--flex-orange-vivid-30) 85%, black);
}

.flex-button[data-variant="accent-warm"]:active {
  background-color: color-mix(in srgb, var(--flex-orange-vivid-30) 70%, black);
}

/* Base variant */
.flex-button[data-variant="base"] {
  background-color: var(--flex-gray-cool-50);
  color: var(--flex-color-on-accent);
}

.flex-button[data-variant="base"]:hover {
  background-color: color-mix(in srgb, var(--flex-gray-cool-50) 85%, black);
}

.flex-button[data-variant="base"]:active {
  background-color: color-mix(in srgb, var(--flex-gray-cool-50) 70%, black);
}

/* Outline variant */
.flex-button[data-variant="outline"] {
  background-color: transparent;
  color: var(--flex-color-accent);
  box-shadow: inset 0 0 0 2px var(--flex-color-accent);
}

.flex-button[data-variant="outline"]:hover {
  background-color: color-mix(in srgb, var(--flex-color-accent) 8%, transparent);
}

.flex-button[data-variant="outline"]:disabled {
  background-color: transparent;
  color: var(--flex-color-text-muted);
  box-shadow: inset 0 0 0 2px var(--flex-color-text-muted);
}

/* Inverse variant (for dark backgrounds) */
.flex-button[data-variant="inverse"] {
  background-color: var(--flex-color-surface);
  color: var(--flex-color-text);
}

.flex-button[data-variant="inverse"]:hover {
  background-color: var(--flex-gray-cool-10);
}

/* Unstyled variant */
.flex-button[data-variant="unstyled"] {
  background: none;
  border: 0;
  padding: 0;
  font-weight: 400;
  color: var(--flex-color-accent);
  text-decoration: underline;
  border-radius: 0;
}

.flex-button[data-variant="unstyled"]:hover {
  color: color-mix(in srgb, var(--flex-color-accent) 85%, black);
}

/* Big size */
.flex-button[data-size="big"] {
  padding: 16px 24px;
  font-size: 1.125rem;
}

/* Small size (from class repo) */
.flex-button[data-size="small"] {
  padding: var(--flex-space-xs) var(--flex-space-sm);
  font-size: var(--flex-text-sm);
}
```

Expected: Full button CSS with all USWDS variants

- [ ] **Step 3: Create index.tsx**

Create `/home/daniel/src/forms-lab/src/components/flex-button/index.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx'

interface ButtonProps {
  variant?: 'secondary' | 'accent-cool' | 'accent-warm' | 'base' | 'outline' | 'inverse' | 'unstyled'
  size?: 'big' | 'small'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
  children: Child
}

export const Button: FC<ButtonProps> = ({
  variant,
  size,
  disabled,
  type = 'button',
  href,
  children,
}) => {
  const props: Record<string, string | boolean | undefined> = {
    class: 'flex-button',
    'data-variant': variant,
    'data-size': size,
  }

  if (href && !disabled) {
    return (
      <a {...props} href={href}>
        {children}
      </a>
    )
  }

  return (
    <button {...props} type={type} disabled={disabled}>
      {children}
    </button>
  )
}
```

Expected: Button component with variant/size/disabled/href support

- [ ] **Step 4: Create examples.tsx**

Create `/home/daniel/src/forms-lab/src/components/flex-button/examples.tsx`:

```tsx
import { Button } from './index'

export const defaultButton = () => <Button>Default</Button>

export const secondaryButton = () => (
  <Button variant="secondary">Secondary</Button>
)

export const accentCoolButton = () => (
  <Button variant="accent-cool">Accent Cool</Button>
)

export const accentWarmButton = () => (
  <Button variant="accent-warm">Accent Warm</Button>
)

export const baseButton = () => <Button variant="base">Base</Button>

export const outlineButton = () => (
  <Button variant="outline">Outline</Button>
)

export const inverseButton = () => (
  <Button variant="inverse">Inverse</Button>
)

export const unstyledButton = () => (
  <Button variant="unstyled">Unstyled</Button>
)

export const bigButton = () => <Button size="big">Big Button</Button>

export const smallButton = () => (
  <Button size="small">Small Button</Button>
)

export const disabledButton = () => <Button disabled>Disabled</Button>

export const disabledSecondary = () => (
  <Button variant="secondary" disabled>
    Disabled Secondary
  </Button>
)

export const allVariants = () => (
  <div class="l-stack">
    <div class="l-cluster">
      {defaultButton()}
      {secondaryButton()}
      {accentCoolButton()}
      {accentWarmButton()}
      {baseButton()}
      {outlineButton()}
    </div>
    <div class="l-cluster">
      {bigButton()}
      {smallButton()}
    </div>
    <div class="l-cluster">
      {disabledButton()}
      {disabledSecondary()}
    </div>
    <div style="background: var(--flex-gray-90); padding: var(--flex-space-md); border-radius: var(--flex-radius-md);">
      {inverseButton()}
    </div>
    <div>{unstyledButton()}</div>
  </div>
)
```

Expected: Examples for all variants, sizes, and states

- [ ] **Step 5: Create conformance.test.ts**

Create `/home/daniel/src/forms-lab/src/components/flex-button/conformance.test.ts`:

```typescript
import { test } from '@playwright/test'
import { extract, diff } from '../../lib/visual-descriptor'
import { expectMatch } from '../../lib/test-helpers'
import { renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers'

const IGNORE_FONT = {
  ignoreProperties: ['font-family', 'font-size', 'line-height'],
  ignoreBoxKeys: ['width', 'height'],
}

test.describe('flex-button conformance', () => {
  test('default button matches usa-button', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <button class="usa-button">Default</button>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <button class="flex-button">Default</button>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })

  test('secondary button matches usa-button--outline', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <button class="usa-button usa-button--outline">Secondary</button>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <button class="flex-button" data-variant="secondary">Secondary</button>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })

  test('disabled button matches usa-button disabled', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <button class="usa-button" disabled>Disabled</button>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <button class="flex-button" disabled>Disabled</button>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })

  test('big button matches usa-button--big', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <button class="usa-button usa-button--big">Big</button>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <button class="flex-button" data-size="big">Big</button>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })
})

test.describe('flex-button accessibility', () => {
  test('passes axe audit', async ({ page }) => {
    const { AxeBuilder } = await import('@axe-core/playwright')

    await renderFlexFixture(page, `
      <div>
        <button class="flex-button">Default</button>
        <button class="flex-button" data-variant="secondary">Secondary</button>
        <button class="flex-button" disabled>Disabled</button>
      </div>
    `)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
```

**Note to implementer:** The `extract()` function needs to work with `page.setContent()` (no URL navigation needed since `renderFlexFixture` already sets the content). Check the class repo's `extract.ts` to see if it handles this case — it should accept an empty URL when content is already set, or you may need to skip the `page.goto()` call when url is empty.

Expected: Conformance tests for button variants

- [ ] **Step 6: Register button in registry**

In `/home/daniel/src/forms-lab/src/components/registry.ts`, replace the empty array with:

```typescript
import type { ComponentMeta } from './types'
import { meta as button } from './flex-button/meta'

const components: ComponentMeta[] = [button]
```

Expected: Button registered

- [ ] **Step 7: Add button CSS to styles.css**

In `/home/daniel/src/forms-lab/src/public/styles.css`, add after the existing block imports:

```css
@import '../components/flex-button/styles.css' layer(block);
```

Expected: Button CSS in cascade

- [ ] **Step 8: Build and verify**

```bash
cd /home/daniel/src/forms-lab && bun run build && bun test
```

Expected: Build succeeds, unit tests pass

- [ ] **Step 9: Run conformance tests**

```bash
cd /home/daniel/src/forms-lab && bun run test:conformance
```

Expected: Conformance tests pass (or identified differences that need CSS tuning)

- [ ] **Step 10: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/components/flex-button/ src/components/registry.ts src/public/styles.css
git commit -m "feat: implement flex-button with full USWDS variant coverage

- 8 variants: default, secondary, accent-cool, accent-warm, base, outline, inverse, unstyled
- 3 sizes: default, big, small
- States: hover, active, focus-visible, disabled
- Conformance tests against USWDS reference
- Accessibility audit via Axe
- Catalog examples for all combinations"
```

Expected: Committed

---

### Task 6: Implement flex-text-input, flex-label, flex-textarea, flex-error-message

**Files:**
- Create: `src/components/flex-text-input/{index.tsx,styles.css,meta.ts,examples.tsx,conformance.test.ts}`
- Create: `src/components/flex-label/{index.tsx,styles.css,meta.ts,examples.tsx}`
- Create: `src/components/flex-textarea/{index.tsx,styles.css,meta.ts,examples.tsx}`
- Create: `src/components/flex-error-message/{index.tsx,styles.css,meta.ts,examples.tsx}`
- Modify: `src/components/registry.ts`
- Modify: `src/public/styles.css`

**Note to implementer:** Port from class repo at `/home/daniel/src/llm-class-2026-winter-cohort/web/src/components/flex-input/`, `flex-label/`, `flex-textarea/`, `flex-error-message/`. The class repo's implementations are minimal (rely heavily on base-classes.css). Our forms-lab version has similar base classes in `base.css`. Add USWDS width variants (2xs through 2xl) that the class repo doesn't have. Reference: https://designsystem.digital.gov/components/text-input/ and https://designsystem.digital.gov/components/form-controls/.

- [ ] **Step 1: Create flex-label**

Create `/home/daniel/src/forms-lab/src/components/flex-label/meta.ts`:
```typescript
import type { ComponentMeta } from '../types'
export const meta: ComponentMeta = {
  name: 'Label',
  slug: 'flex-label',
  category: 'form',
  description: 'A label for form controls, with optional required indicator.',
  uswds: 'https://designsystem.digital.gov/components/form-controls/',
  interactive: false,
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-label/styles.css`:
```css
.flex-label {
  display: block;
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  font-weight: 600;
  line-height: 1.3;
  color: var(--flex-color-text);
  margin-top: 1.5rem;
  max-width: var(--flex-control-max-width);
}

.flex-label__required {
  color: var(--flex-color-error);
  text-decoration: none;
  font-style: normal;
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-label/index.tsx`:
```tsx
import type { Child, FC } from 'hono/jsx'

interface LabelProps {
  htmlFor: string
  required?: boolean
  children: Child
}

export const Label: FC<LabelProps> = ({ htmlFor, required, children }) => (
  <label class="flex-label" for={htmlFor}>
    {children}
    {required && (
      <abbr title="required" class="flex-label__required">
        {' '}*
      </abbr>
    )}
  </label>
)
```

Create `/home/daniel/src/forms-lab/src/components/flex-label/examples.tsx`:
```tsx
import { Label } from './index'

export const defaultLabel = () => <Label htmlFor="name">Full name</Label>
export const requiredLabel = () => <Label htmlFor="email" required>Email address</Label>
```

Expected: Label component created

- [ ] **Step 2: Create flex-text-input**

Create `/home/daniel/src/forms-lab/src/components/flex-text-input/meta.ts`:
```typescript
import type { ComponentMeta } from '../types'
export const meta: ComponentMeta = {
  name: 'Text Input',
  slug: 'flex-text-input',
  category: 'form',
  description: 'A single-line text input field with optional width and state variants.',
  uswds: 'https://designsystem.digital.gov/components/text-input/',
  interactive: false,
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-text-input/styles.css`:
```css
.flex-input {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  color: var(--flex-color-text);
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-ink);
  border-radius: 0;
  padding: var(--flex-control-padding);
  height: var(--flex-control-height);
  max-width: var(--flex-control-max-width);
  width: 100%;
  appearance: none;
}

.flex-input:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

.flex-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flex-input[data-state="error"] {
  border-color: var(--flex-color-error);
  border-width: 2px;
}

.flex-input[data-state="success"] {
  border-color: var(--flex-color-success);
  border-width: 2px;
}

/* Width variants matching USWDS */
.flex-input[data-width="2xs"] { max-width: 5ex; }
.flex-input[data-width="xs"] { max-width: 9ex; }
.flex-input[data-width="sm"] { max-width: 13ex; }
.flex-input[data-width="md"] { max-width: 20ex; }
.flex-input[data-width="lg"] { max-width: 30ex; }
.flex-input[data-width="xl"] { max-width: 40ex; }
.flex-input[data-width="2xl"] { max-width: 50ex; }
```

Create `/home/daniel/src/forms-lab/src/components/flex-text-input/index.tsx`:
```tsx
import type { FC } from 'hono/jsx'

interface TextInputProps {
  id: string
  name: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password'
  state?: 'error' | 'success'
  width?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  placeholder?: string
  value?: string
  ariaDescribedby?: string
}

export const TextInput: FC<TextInputProps> = ({
  id,
  name,
  type = 'text',
  state,
  width,
  disabled,
  readonly,
  required,
  placeholder,
  value,
  ariaDescribedby,
}) => (
  <input
    class="flex-input"
    id={id}
    name={name}
    type={type}
    data-state={state}
    data-width={width}
    disabled={disabled}
    readonly={readonly}
    required={required}
    placeholder={placeholder}
    value={value}
    aria-describedby={ariaDescribedby}
    aria-invalid={state === 'error' ? 'true' : undefined}
  />
)
```

Create `/home/daniel/src/forms-lab/src/components/flex-text-input/examples.tsx`:
```tsx
import { TextInput } from './index'
import { Label } from '../flex-label/index'
import { ErrorMessage } from '../flex-error-message/index'

export const defaultInput = () => (
  <div>
    <Label htmlFor="name">Full name</Label>
    <TextInput id="name" name="name" />
  </div>
)

export const errorInput = () => (
  <div>
    <Label htmlFor="email" required>Email address</Label>
    <TextInput id="email" name="email" type="email" state="error" ariaDescribedby="email-error" />
    <ErrorMessage id="email-error">Please enter a valid email address.</ErrorMessage>
  </div>
)

export const widthVariants = () => (
  <div class="l-stack">
    <div><Label htmlFor="zip">ZIP (2xs)</Label><TextInput id="zip" name="zip" width="2xs" /></div>
    <div><Label htmlFor="phone">Phone (sm)</Label><TextInput id="phone" name="phone" width="sm" /></div>
    <div><Label htmlFor="city">City (md)</Label><TextInput id="city" name="city" width="md" /></div>
    <div><Label htmlFor="address">Address (xl)</Label><TextInput id="address" name="address" width="xl" /></div>
  </div>
)

export const disabledInput = () => (
  <div>
    <Label htmlFor="disabled">Disabled field</Label>
    <TextInput id="disabled" name="disabled" disabled value="Cannot edit" />
  </div>
)
```

Create conformance test `/home/daniel/src/forms-lab/src/components/flex-text-input/conformance.test.ts`:
```typescript
import { test, expect } from '@playwright/test'
import { extract, diff } from '../../lib/visual-descriptor'
import { expectMatch, renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers'

const IGNORE_FONT = {
  ignoreProperties: ['font-family', 'font-size', 'line-height'],
  ignoreBoxKeys: ['width', 'height'],
}

test.describe('flex-text-input conformance', () => {
  test('default input matches usa-input', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <label class="usa-label" for="input">Label</label>
        <input class="usa-input" id="input" name="input" type="text">
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <label class="flex-label" for="input">Label</label>
        <input class="flex-input" id="input" name="input" type="text">
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })

  test('error input matches usa-input--error', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <label class="usa-label" for="input">Label</label>
        <input class="usa-input usa-input--error" id="input" name="input" type="text" aria-invalid="true" aria-describedby="error">
        <span class="usa-error-message" id="error" role="alert">Error message</span>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <label class="flex-label" for="input">Label</label>
        <input class="flex-input" data-state="error" id="input" name="input" type="text" aria-invalid="true" aria-describedby="error">
        <span class="flex-error-message" id="error" role="alert">Error message</span>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })
})

test.describe('flex-text-input accessibility', () => {
  test('passes axe audit', async ({ page }) => {
    const { AxeBuilder } = await import('@axe-core/playwright')

    await renderFlexFixture(page, `
      <div>
        <label class="flex-label" for="name">Name</label>
        <input class="flex-input" id="name" name="name" type="text">
        <label class="flex-label" for="email">Email</label>
        <input class="flex-input" data-state="error" id="email" name="email" type="email" aria-invalid="true" aria-describedby="email-error">
        <span class="flex-error-message" id="email-error" role="alert">Required</span>
      </div>
    `)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
```

Expected: Full form control family created

- [ ] **Step 3: Create flex-textarea**

Create `/home/daniel/src/forms-lab/src/components/flex-textarea/meta.ts`:
```typescript
import type { ComponentMeta } from '../types'
export const meta: ComponentMeta = {
  name: 'Textarea',
  slug: 'flex-textarea',
  category: 'form',
  description: 'A multi-line text input field.',
  uswds: 'https://designsystem.digital.gov/components/text-input/',
  interactive: false,
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-textarea/styles.css`:
```css
.flex-textarea {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  color: var(--flex-color-text);
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-ink);
  border-radius: 0;
  padding: var(--flex-control-padding);
  max-width: var(--flex-control-max-width);
  width: 100%;
  min-height: 160px;
  resize: vertical;
  appearance: none;
}

.flex-textarea:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

.flex-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flex-textarea[data-state="error"] {
  border-color: var(--flex-color-error);
  border-width: 2px;
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-textarea/index.tsx`:
```tsx
import type { FC } from 'hono/jsx'

interface TextareaProps {
  id: string
  name: string
  state?: 'error'
  disabled?: boolean
  required?: boolean
  placeholder?: string
  rows?: number
  ariaDescribedby?: string
}

export const Textarea: FC<TextareaProps> = ({
  id,
  name,
  state,
  disabled,
  required,
  placeholder,
  rows,
  ariaDescribedby,
}) => (
  <textarea
    class="flex-textarea"
    id={id}
    name={name}
    data-state={state}
    disabled={disabled}
    required={required}
    placeholder={placeholder}
    rows={rows}
    aria-describedby={ariaDescribedby}
    aria-invalid={state === 'error' ? 'true' : undefined}
  />
)
```

Create `/home/daniel/src/forms-lab/src/components/flex-textarea/examples.tsx`:
```tsx
import { Textarea } from './index'
import { Label } from '../flex-label/index'

export const defaultTextarea = () => (
  <div>
    <Label htmlFor="comments">Additional comments</Label>
    <Textarea id="comments" name="comments" />
  </div>
)

export const errorTextarea = () => (
  <div>
    <Label htmlFor="desc" required>Description</Label>
    <Textarea id="desc" name="desc" state="error" ariaDescribedby="desc-error" />
  </div>
)
```

Expected: Textarea component created

- [ ] **Step 4: Create flex-error-message**

Create `/home/daniel/src/forms-lab/src/components/flex-error-message/meta.ts`:
```typescript
import type { ComponentMeta } from '../types'
export const meta: ComponentMeta = {
  name: 'Error Message',
  slug: 'flex-error-message',
  category: 'form',
  description: 'An error message displayed below a form control.',
  uswds: 'https://designsystem.digital.gov/components/form-controls/',
  interactive: false,
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-error-message/styles.css`:
```css
.flex-error-message {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  color: var(--flex-color-error);
  font-weight: 700;
  display: block;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-error-message/index.tsx`:
```tsx
import type { Child, FC } from 'hono/jsx'

interface ErrorMessageProps {
  id: string
  children: Child
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ id, children }) => (
  <span class="flex-error-message" id={id} role="alert">
    {children}
  </span>
)
```

Create `/home/daniel/src/forms-lab/src/components/flex-error-message/examples.tsx`:
```tsx
import { ErrorMessage } from './index'

export const defaultError = () => (
  <ErrorMessage id="error-1">This field is required.</ErrorMessage>
)

export const longError = () => (
  <ErrorMessage id="error-2">
    Please enter a valid email address in the format user@example.com.
  </ErrorMessage>
)
```

Expected: Error message component created

- [ ] **Step 5: Register all form components and add CSS imports**

In `/home/daniel/src/forms-lab/src/components/registry.ts`, add imports:

```typescript
import type { ComponentMeta } from './types'
import { meta as button } from './flex-button/meta'
import { meta as textInput } from './flex-text-input/meta'
import { meta as label } from './flex-label/meta'
import { meta as textarea } from './flex-textarea/meta'
import { meta as errorMessage } from './flex-error-message/meta'

const components: ComponentMeta[] = [button, textInput, label, textarea, errorMessage]
```

In `/home/daniel/src/forms-lab/src/public/styles.css`, add to the block layer section:

```css
@import '../components/flex-text-input/styles.css' layer(block);
@import '../components/flex-label/styles.css' layer(block);
@import '../components/flex-textarea/styles.css' layer(block);
@import '../components/flex-error-message/styles.css' layer(block);
```

Expected: All form components registered and CSS imported

- [ ] **Step 6: Build and test**

```bash
cd /home/daniel/src/forms-lab && bun run build && bun test && bun run test:conformance
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/components/flex-text-input/ src/components/flex-label/ src/components/flex-textarea/ src/components/flex-error-message/ src/components/registry.ts src/public/styles.css
git commit -m "feat: implement form control family (text-input, label, textarea, error-message)

- flex-text-input: width variants (2xs-2xl), error/success states
- flex-label: required indicator
- flex-textarea: resizable, error state
- flex-error-message: role=alert, bold error color
- Conformance tests against USWDS reference
- All components explicitly set font-family, font-size, color"
```

Expected: Committed

---

### Task 7: Implement flex-alert

**Files:**
- Create: `src/components/flex-alert/{index.tsx,styles.css,meta.ts,examples.tsx,conformance.test.ts}`
- Modify: `src/components/registry.ts`
- Modify: `src/public/styles.css`

**Note to implementer:** Port from class repo at `/home/daniel/src/llm-class-2026-winter-cohort/web/src/components/flex-alert/styles.css`. The class repo is missing the `emergency` variant, the `slim` modifier, and the `no-icon` modifier. Add those per USWDS: https://designsystem.digital.gov/components/alert/. Also add a heading element that the class repo omits.

- [ ] **Step 1: Create all alert files**

Create `/home/daniel/src/forms-lab/src/components/flex-alert/meta.ts`:
```typescript
import type { ComponentMeta } from '../types'
export const meta: ComponentMeta = {
  name: 'Alert',
  slug: 'flex-alert',
  category: 'feedback',
  description: 'A colored alert box for informational, warning, success, error, or emergency messages.',
  uswds: 'https://designsystem.digital.gov/components/alert/',
  interactive: false,
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-alert/styles.css`:
```css
.flex-alert {
  background-color: var(--flex-color-info-lighter);
  border-left: var(--flex-space-sm) solid var(--flex-color-info);
  padding: var(--flex-space-md) var(--flex-space-lg);
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  line-height: 1.5;
  color: var(--flex-color-text);
}

.flex-alert[data-variant="info"] {
  background-color: var(--flex-color-info-lighter);
  border-left-color: var(--flex-color-info);
}

.flex-alert[data-variant="warning"] {
  background-color: var(--flex-color-warning-lighter);
  border-left-color: var(--flex-color-warning);
}

.flex-alert[data-variant="success"] {
  background-color: var(--flex-color-success-lighter);
  border-left-color: var(--flex-color-success);
}

.flex-alert[data-variant="error"] {
  background-color: var(--flex-color-error-lighter);
  border-left-color: var(--flex-color-error);
}

.flex-alert[data-variant="emergency"] {
  background-color: var(--flex-color-error-lighter);
  border-left-color: var(--flex-color-error);
  border-left-width: var(--flex-space-sm);
}

.flex-alert__heading {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  font-weight: 700;
  margin: 0 0 var(--flex-space-xs) 0;
}

.flex-alert__text {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  line-height: 1.5;
  margin: 0;
}

/* Slim modifier */
.flex-alert[data-slim] {
  padding: var(--flex-space-sm) var(--flex-space-md);
  border-left-width: var(--flex-space-xs);
}

.flex-alert[data-slim] .flex-alert__heading {
  display: none;
}

/* No-icon modifier */
.flex-alert[data-no-icon] .flex-alert__icon {
  display: none;
}
```

Create `/home/daniel/src/forms-lab/src/components/flex-alert/index.tsx`:
```tsx
import type { Child, FC } from 'hono/jsx'

interface AlertProps {
  variant?: 'info' | 'warning' | 'success' | 'error' | 'emergency'
  heading?: string
  slim?: boolean
  noIcon?: boolean
  children: Child
}

export const Alert: FC<AlertProps> = ({
  variant = 'info',
  heading,
  slim,
  noIcon,
  children,
}) => (
  <div
    class="flex-alert"
    data-variant={variant}
    data-slim={slim || undefined}
    data-no-icon={noIcon || undefined}
    role="alert"
  >
    {heading && <h4 class="flex-alert__heading">{heading}</h4>}
    <p class="flex-alert__text">{children}</p>
  </div>
)
```

Create `/home/daniel/src/forms-lab/src/components/flex-alert/examples.tsx`:
```tsx
import { Alert } from './index'

export const infoAlert = () => (
  <Alert variant="info" heading="Informational">
    This is an informational message.
  </Alert>
)

export const warningAlert = () => (
  <Alert variant="warning" heading="Warning">
    This is a warning message.
  </Alert>
)

export const successAlert = () => (
  <Alert variant="success" heading="Success">
    Your changes have been saved.
  </Alert>
)

export const errorAlert = () => (
  <Alert variant="error" heading="Error">
    There was an error processing your request.
  </Alert>
)

export const emergencyAlert = () => (
  <Alert variant="emergency" heading="Emergency">
    This is an emergency alert message.
  </Alert>
)

export const slimAlert = () => (
  <Alert variant="info" slim>
    This is a slim informational message.
  </Alert>
)

export const noIconAlert = () => (
  <Alert variant="warning" heading="Warning" noIcon>
    This alert has no icon.
  </Alert>
)

export const allVariants = () => (
  <div class="l-stack">
    {infoAlert()}
    {warningAlert()}
    {successAlert()}
    {errorAlert()}
    {emergencyAlert()}
    {slimAlert()}
    {noIconAlert()}
  </div>
)
```

Create `/home/daniel/src/forms-lab/src/components/flex-alert/conformance.test.ts`:
```typescript
import { test, expect } from '@playwright/test'
import { extract, diff } from '../../lib/visual-descriptor'
import { expectMatch, renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers'

const IGNORE_FONT = {
  ignoreProperties: ['font-family', 'font-size', 'line-height'],
  ignoreBoxKeys: ['width', 'height'],
}

test.describe('flex-alert conformance', () => {
  test('info alert matches usa-alert--info', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <div class="usa-alert usa-alert--info" role="alert">
          <div class="usa-alert__body">
            <h4 class="usa-alert__heading">Informational</h4>
            <p class="usa-alert__text">Info message.</p>
          </div>
        </div>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <div class="flex-alert" data-variant="info" role="alert">
          <h4 class="flex-alert__heading">Informational</h4>
          <p class="flex-alert__text">Info message.</p>
        </div>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreBoxKeys: ['width', 'height', 'paddingLeft', 'paddingRight'],
    }))
  })

  test('error alert matches usa-alert--error', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <div class="usa-alert usa-alert--error" role="alert">
          <div class="usa-alert__body">
            <h4 class="usa-alert__heading">Error</h4>
            <p class="usa-alert__text">Error message.</p>
          </div>
        </div>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <div class="flex-alert" data-variant="error" role="alert">
          <h4 class="flex-alert__heading">Error</h4>
          <p class="flex-alert__text">Error message.</p>
        </div>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', {
      ...IGNORE_FONT,
      ignoreBoxKeys: ['width', 'height', 'paddingLeft', 'paddingRight'],
    }))
  })
})

test.describe('flex-alert accessibility', () => {
  test('passes axe audit', async ({ page }) => {
    const { AxeBuilder } = await import('@axe-core/playwright')

    await renderFlexFixture(page, `
      <div>
        <div class="flex-alert" data-variant="info" role="alert">
          <h4 class="flex-alert__heading">Info</h4>
          <p class="flex-alert__text">Informational message.</p>
        </div>
        <div class="flex-alert" data-variant="error" role="alert">
          <p class="flex-alert__text">Error message.</p>
        </div>
      </div>
    `)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
```

Expected: Alert component with all variants and modifiers

- [ ] **Step 2: Register alert and add CSS import**

Add to registry.ts:
```typescript
import { meta as alert } from './flex-alert/meta'
// Add to array: alert
```

Add to styles.css block section:
```css
@import '../components/flex-alert/styles.css' layer(block);
```

- [ ] **Step 3: Build and test**

```bash
cd /home/daniel/src/forms-lab && bun run build && bun test && bun run test:conformance
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/components/flex-alert/ src/components/registry.ts src/public/styles.css
git commit -m "feat: implement flex-alert with all USWDS variants

- 5 variants: info, warning, success, error, emergency
- Modifiers: slim, no-icon (boolean data attributes)
- Heading + text structure
- Conformance tests against USWDS reference
- Accessibility audit via Axe"
```

Expected: Committed

---

### Task 8: Implement flex-accordion (Interactive)

**Files:**
- Create: `src/components/flex-accordion/{index.tsx,styles.css,client.ts,meta.ts,examples.tsx,conformance.test.ts}`
- Modify: `src/components/registry.ts`
- Modify: `src/components/register.ts`
- Modify: `src/public/styles.css`

**Note to implementer:** This is the first interactive component. The `client.ts` defines a custom element that manages expand/collapse behavior, ARIA attributes, and keyboard navigation. Reference USWDS accordion: https://designsystem.digital.gov/components/accordion/

- [ ] **Step 1: Create meta.ts**

Create `/home/daniel/src/forms-lab/src/components/flex-accordion/meta.ts`:
```typescript
import type { ComponentMeta } from '../types'
export const meta: ComponentMeta = {
  name: 'Accordion',
  slug: 'flex-accordion',
  category: 'layout',
  description: 'An expandable/collapsible content section, borderless or bordered.',
  uswds: 'https://designsystem.digital.gov/components/accordion/',
  interactive: true,
}
```

- [ ] **Step 2: Create styles.css**

Create `/home/daniel/src/forms-lab/src/components/flex-accordion/styles.css`:
```css
flex-accordion {
  display: block;
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  color: var(--flex-color-text);
}

.flex-accordion__heading {
  margin: 0;
  font-size: var(--flex-text-uswds);
}

.flex-accordion__button {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  font-weight: 700;
  color: var(--flex-color-text);
  background-color: var(--flex-color-bg);
  border: 0;
  border-bottom: 1px solid var(--flex-color-border);
  padding: var(--flex-space-md);
  width: 100%;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-accordion__button:hover {
  background-color: color-mix(in srgb, var(--flex-color-bg) 90%, var(--flex-color-text));
}

.flex-accordion__button:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

.flex-accordion__button::after {
  content: '+';
  font-weight: 400;
  font-size: 1.25em;
  flex-shrink: 0;
  margin-left: var(--flex-space-sm);
}

.flex-accordion__button[aria-expanded="true"]::after {
  content: '−';
}

.flex-accordion__content {
  padding: var(--flex-space-md);
  border-bottom: 1px solid var(--flex-color-border);
}

.flex-accordion__content[hidden] {
  display: none;
}

/* Bordered variant */
flex-accordion[data-variant="bordered"] .flex-accordion__button {
  border: 1px solid var(--flex-color-border);
  border-bottom-width: 0;
}

flex-accordion[data-variant="bordered"] .flex-accordion__content {
  border: 1px solid var(--flex-color-border);
  border-top: 0;
}

flex-accordion[data-variant="bordered"] .flex-accordion__heading:last-of-type .flex-accordion__button {
  border-bottom-width: 1px;
}
```

- [ ] **Step 3: Create client.ts**

Create `/home/daniel/src/forms-lab/src/components/flex-accordion/client.ts`:
```typescript
class FlexAccordionElement extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
    this.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick.bind(this))
    this.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  private get buttons(): HTMLButtonElement[] {
    return Array.from(this.querySelectorAll('.flex-accordion__button'))
  }

  private get multiselectable(): boolean {
    return this.hasAttribute('data-multiselectable')
  }

  private handleClick(event: Event) {
    const button = (event.target as Element).closest('.flex-accordion__button')
    if (!button || !(button instanceof HTMLButtonElement)) return

    this.toggle(button)
  }

  private handleKeydown(event: KeyboardEvent) {
    const button = (event.target as Element).closest('.flex-accordion__button')
    if (!button || !(button instanceof HTMLButtonElement)) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.toggle(button)
    }
  }

  private toggle(button: HTMLButtonElement) {
    const expanded = button.getAttribute('aria-expanded') === 'true'
    const contentId = button.getAttribute('aria-controls')
    if (!contentId) return

    const content = this.querySelector(`#${contentId}`)
    if (!content) return

    if (expanded) {
      button.setAttribute('aria-expanded', 'false')
      content.setAttribute('hidden', '')
    } else {
      // If not multiselectable, close all others first
      if (!this.multiselectable) {
        for (const otherButton of this.buttons) {
          if (otherButton !== button) {
            otherButton.setAttribute('aria-expanded', 'false')
            const otherId = otherButton.getAttribute('aria-controls')
            if (otherId) {
              const otherContent = this.querySelector(`#${otherId}`)
              otherContent?.setAttribute('hidden', '')
            }
          }
        }
      }

      button.setAttribute('aria-expanded', 'true')
      content.removeAttribute('hidden')
    }
  }
}

if (!customElements.get('flex-accordion')) {
  customElements.define('flex-accordion', FlexAccordionElement)
}
```

- [ ] **Step 4: Create index.tsx**

Create `/home/daniel/src/forms-lab/src/components/flex-accordion/index.tsx`:
```tsx
import type { Child, FC } from 'hono/jsx'

interface AccordionItem {
  id: string
  title: string
  content: Child
  expanded?: boolean
}

interface AccordionProps {
  items: AccordionItem[]
  variant?: 'bordered'
  multiselectable?: boolean
}

export const Accordion: FC<AccordionProps> = ({
  items,
  variant,
  multiselectable,
}) => (
  <flex-accordion
    data-variant={variant}
    data-multiselectable={multiselectable || undefined}
  >
    {items.map((item) => (
      <div key={item.id}>
        <h3 class="flex-accordion__heading">
          <button
            class="flex-accordion__button"
            aria-expanded={item.expanded ? 'true' : 'false'}
            aria-controls={`accordion-panel-${item.id}`}
          >
            {item.title}
          </button>
        </h3>
        <div
          class="flex-accordion__content"
          id={`accordion-panel-${item.id}`}
          hidden={!item.expanded}
        >
          {item.content}
        </div>
      </div>
    ))}
  </flex-accordion>
)
```

- [ ] **Step 5: Create examples.tsx**

Create `/home/daniel/src/forms-lab/src/components/flex-accordion/examples.tsx`:
```tsx
import { Accordion } from './index'

const sampleItems = [
  { id: '1', title: 'First section', content: <p>Content for the first section.</p> },
  { id: '2', title: 'Second section', content: <p>Content for the second section.</p> },
  { id: '3', title: 'Third section', content: <p>Content for the third section.</p>, expanded: true },
]

export const defaultAccordion = () => <Accordion items={sampleItems} />

export const borderedAccordion = () => (
  <Accordion items={sampleItems} variant="bordered" />
)

export const multiselectableAccordion = () => (
  <Accordion items={sampleItems} multiselectable />
)

export const allVariants = () => (
  <div class="l-stack">
    <h3>Default (borderless)</h3>
    {defaultAccordion()}
    <h3>Bordered</h3>
    {borderedAccordion()}
    <h3>Multiselectable</h3>
    {multiselectableAccordion()}
  </div>
)
```

- [ ] **Step 6: Create conformance.test.ts**

Create `/home/daniel/src/forms-lab/src/components/flex-accordion/conformance.test.ts`:
```typescript
import { test, expect } from '@playwright/test'
import { extract, diff } from '../../lib/visual-descriptor'
import { expectMatch, renderFlexFixture, renderUswdsFixture } from '../../lib/test-helpers'

const IGNORE_FONT = {
  ignoreProperties: ['font-family', 'font-size', 'line-height'],
  ignoreBoxKeys: ['width', 'height'],
}

test.describe('flex-accordion conformance', () => {
  test('default accordion matches usa-accordion', async ({ page }) => {
    await renderUswdsFixture(page, `
      <div data-testid="target">
        <div class="usa-accordion">
          <h3 class="usa-accordion__heading">
            <button class="usa-accordion__button" aria-expanded="false" aria-controls="panel-1">Section</button>
          </h3>
          <div class="usa-accordion__content" id="panel-1" hidden>
            <p>Content.</p>
          </div>
        </div>
      </div>
    `)
    const reference = await extract(page, '', '[data-testid="target"]')

    await renderFlexFixture(page, `
      <div data-testid="target">
        <flex-accordion>
          <h3 class="flex-accordion__heading">
            <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-1">Section</button>
          </h3>
          <div class="flex-accordion__content" id="panel-1" hidden>
            <p>Content.</p>
          </div>
        </flex-accordion>
      </div>
    `)
    const implementation = await extract(page, '', '[data-testid="target"]')

    expectMatch(diff(reference, implementation, '', IGNORE_FONT))
  })
})

test.describe('flex-accordion behavior', () => {
  test('clicking button expands content', async ({ page }) => {
    await renderFlexFixture(page, `
      <flex-accordion>
        <h3 class="flex-accordion__heading">
          <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-1">Section</button>
        </h3>
        <div class="flex-accordion__content" id="panel-1" hidden>
          <p>Content.</p>
        </div>
      </flex-accordion>
      <script type="module" src="/static/components.js"></script>
    `)

    const button = page.locator('.flex-accordion__button')
    const panel = page.locator('#panel-1')

    await expect(panel).toBeHidden()
    await button.click()
    await expect(panel).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  test('only one section open at a time (default)', async ({ page }) => {
    await renderFlexFixture(page, `
      <flex-accordion>
        <h3 class="flex-accordion__heading">
          <button class="flex-accordion__button" aria-expanded="true" aria-controls="panel-1">First</button>
        </h3>
        <div class="flex-accordion__content" id="panel-1"><p>First content.</p></div>
        <h3 class="flex-accordion__heading">
          <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-2">Second</button>
        </h3>
        <div class="flex-accordion__content" id="panel-2" hidden><p>Second content.</p></div>
      </flex-accordion>
      <script type="module" src="/static/components.js"></script>
    `)

    const button2 = page.locator('.flex-accordion__button').nth(1)
    const panel1 = page.locator('#panel-1')
    const panel2 = page.locator('#panel-2')

    await button2.click()
    await expect(panel1).toBeHidden()
    await expect(panel2).toBeVisible()
  })

  test('keyboard Enter toggles accordion', async ({ page }) => {
    await renderFlexFixture(page, `
      <flex-accordion>
        <h3 class="flex-accordion__heading">
          <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-1">Section</button>
        </h3>
        <div class="flex-accordion__content" id="panel-1" hidden><p>Content.</p></div>
      </flex-accordion>
      <script type="module" src="/static/components.js"></script>
    `)

    const button = page.locator('.flex-accordion__button')
    await button.focus()
    await button.press('Enter')
    await expect(page.locator('#panel-1')).toBeVisible()
  })
})

test.describe('flex-accordion accessibility', () => {
  test('passes axe audit', async ({ page }) => {
    const { AxeBuilder } = await import('@axe-core/playwright')

    await renderFlexFixture(page, `
      <flex-accordion>
        <h3 class="flex-accordion__heading">
          <button class="flex-accordion__button" aria-expanded="false" aria-controls="panel-1">Section One</button>
        </h3>
        <div class="flex-accordion__content" id="panel-1" hidden><p>Content one.</p></div>
        <h3 class="flex-accordion__heading">
          <button class="flex-accordion__button" aria-expanded="true" aria-controls="panel-2">Section Two</button>
        </h3>
        <div class="flex-accordion__content" id="panel-2"><p>Content two.</p></div>
      </flex-accordion>
    `)

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 7: Register accordion and add imports**

Add to registry.ts:
```typescript
import { meta as accordion } from './flex-accordion/meta'
// Add to array: accordion
```

Add to register.ts:
```typescript
import './flex-accordion/client'
```

Add to styles.css block section:
```css
@import '../components/flex-accordion/styles.css' layer(block);
```

- [ ] **Step 8: Build and test**

```bash
cd /home/daniel/src/forms-lab && bun run build && bun test && bun run test:conformance
```

Expected: All tests pass including behavioral tests

- [ ] **Step 9: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/components/flex-accordion/ src/components/registry.ts src/components/register.ts src/public/styles.css
git commit -m "feat: implement flex-accordion with keyboard nav and ARIA

- Variants: default (borderless), bordered
- Modifiers: multiselectable
- Custom element with expand/collapse, single-open-at-a-time default
- Keyboard: Enter/Space to toggle
- ARIA: aria-expanded, aria-controls, hidden
- Conformance, behavioral, and accessibility tests
- First interactive component validating client.ts pipeline"
```

Expected: Committed

---

### Task 9: Update Catalog Design System Pages

**Files:**
- Modify: `src/routes/catalog/design-system.tsx`
- Modify: `src/routes/catalog/sidebar.ts`

**Note to implementer:** The current design-system.tsx is a single page with hardcoded examples. Rewrite it to use the component registry for the index page, and add dynamic per-component pages that render examples and source CSS.

- [ ] **Step 1: Rewrite design-system.tsx**

Replace the entire contents of `/home/daniel/src/forms-lab/src/routes/catalog/design-system.tsx` with a route that has:

1. `GET /` — index page listing all registered components grouped by category, with links to per-component pages. Include the existing token, composition, and rules documentation sections below the component listing.

2. `GET /:slug` — per-component page that:
   - Looks up the component by slug from the registry
   - Returns 404 if not found
   - Shows: name, category badge, description, USWDS reference link
   - Dynamically imports `examples.tsx` from the component directory and renders all exported examples
   - Reads `styles.css` from the component directory and shows it in a code block

The index page uses `getComponentsByCategory()` from the registry. The per-component page uses `getComponentBySlug()`.

For the examples import, use Bun's dynamic import: `await import(\`../../components/${slug}/examples.tsx\`)`. Each export is a function returning JSX — call each one and render the result.

For the CSS source, use `readFileSync` to read the component's `styles.css` and render it in a `<pre><code>` block.

Both pages should use the catalog sidebar layout.

- [ ] **Step 2: Update sidebar to include Design System sub-items**

No change needed — the current sidebar already has a "Design System" link. Per-component pages don't need individual sidebar entries (there will be too many). The design system index page handles navigation.

- [ ] **Step 3: Verify catalog pages render**

```bash
cd /home/daniel/src/forms-lab && bun run build
# Start dev server and check:
# /catalog/design-system — should show component index
# /catalog/design-system/flex-button — should show button examples + CSS
```

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/routes/catalog/design-system.tsx
git commit -m "feat: rewrite design system catalog with per-component pages

- Index page lists components by category from registry
- Per-component pages show live examples and source CSS
- Dynamic import of examples.tsx per component
- Retains token, composition, and rules documentation"
```

Expected: Committed

---

### Task 10: Final Verification and Cleanup

- [ ] **Step 1: Run all checks**

```bash
cd /home/daniel/src/forms-lab
bun run build
bun test
bun run test:conformance
bun run --no-warnings tsc --noEmit
bunx @biomejs/biome check .
bun run lint:css
```

Expected: Everything passes

- [ ] **Step 2: Update DESIGN.md in catalog**

Add an ADR for the component scaffold convention at `/home/daniel/src/forms-lab/catalog/decisions/design-system/component-scaffold.md`:

```markdown
---
status: stable
tags: [design-system, components, testing]
decided: 2026-04-07
---

# Component Scaffold Convention

Every USWDS component follows a standardized directory structure with co-located source, styles, client behavior, metadata, examples, and conformance tests.

## Context

With 48 USWDS components to implement, we needed a consistent structure that makes components self-contained and discoverable.

## Decision

Each component lives in `src/components/flex-*/` with:
- `index.tsx` — server-rendered JSX component
- `styles.css` — CSS using --flex-* tokens, cascade layer: block
- `client.ts` — custom element for interactive behavior (optional)
- `meta.ts` — catalog metadata (name, category, USWDS reference)
- `examples.tsx` — variant examples for catalog and tests
- `conformance.test.ts` — visual + behavioral + accessibility tests

Variants use `data-variant`, sizing uses `data-size`, states use `data-state`, orthogonal modifiers use boolean `data-*` attributes. Internal child element scoping uses `__` in class names.

A hardcoded registry (`registry.ts`) provides type-safe component lookup. A single `register.ts` bundles all interactive client scripts into `dist/components.js`, loaded on every page.

## Alternatives considered

- **Auto-discovery via glob** — fragile, runtime errors, no type safety
- **Separate test directory** — files that change together should live together
- **Per-component script loading** — requires tracking which components are on each page

## Consequences

- Adding a component requires: create directory with files, add to registry, add CSS import to styles.css, add client import to register.ts (if interactive)
- All component details are in one directory — no hunting across the tree
- Conformance tests run via Playwright against USWDS reference

## Sources

- [USWDS Components](https://designsystem.digital.gov/components/overview/)
- [Spec 1 design](../../notes/2026-04-07-slice-0-skeleton/2026-04-07-uswds-spec1-design.md)
```

- [ ] **Step 3: Update planning notes**

Append to `/home/daniel/src/forms-lab/notes/2026-04-07-slice-0-skeleton/2026-04-07-design-system-planning.md`:

```markdown

## Spec 1 implementation complete

Implemented:
- Visual-descriptor library (extract + diff)
- Conformance test helpers (render fixtures, assertions)
- Component registry and build pipeline
- Playwright configuration and CI integration
- 7 components: flex-button, flex-text-input, flex-label, flex-textarea, flex-error-message, flex-alert, flex-accordion
- Catalog design system pages with per-component views

The pattern is validated — ready for Specs 2-5 (remaining 41 components).
```

- [ ] **Step 4: Commit and push**

```bash
cd /home/daniel/src/forms-lab
git add -A
git commit -m "docs: add component scaffold ADR and update planning notes"
git push
```

Expected: All work pushed

---

## Self-Review

**1. Spec Coverage:**

- ✓ Component directory convention — Task 4 (types), all component tasks follow it
- ✓ Component registry — Task 4
- ✓ Client script pipeline (register.ts → components.js) — Task 4
- ✓ Conformance test infrastructure (visual-descriptor, helpers) — Tasks 2, 3
- ✓ Playwright configuration — Task 1
- ✓ USWDS dev dependency — Task 1
- ✓ flex-button with all variants — Task 5
- ✓ flex-text-input + flex-label + flex-textarea + flex-error-message — Task 6
- ✓ flex-alert with all variants and modifiers — Task 7
- ✓ flex-accordion with client.ts, keyboard, ARIA — Task 8
- ✓ Catalog per-component pages — Task 9
- ✓ Axe accessibility audits — in each conformance test
- ✓ CI updated — Task 1
- ✓ Planning notes — Task 10
- ✓ DESIGN.md/ADR update — Task 10

**2. Placeholder Scan:**

Task 2 (visual-descriptor) Steps 3-4 say "Port from class repo" with key signatures but not full implementations. This is intentional — the implementer reads the 100+ line source files and recreates them. The API surface and behavior are fully specified.

Task 9 Step 1 describes the design-system.tsx rewrite conceptually rather than with full code. This is because the component depends heavily on dynamic imports and the existing page structure. The implementer reads the current file and rewrites it following the described pattern.

All other tasks have complete code.

**3. Type Consistency:**

- `ComponentMeta` and `ComponentCategory` defined in Task 4, used consistently in all meta.ts files
- `extract()` and `diff()` signatures consistent between Tasks 2 and 5-8
- `renderFlexFixture` and `renderUswdsFixture` signatures consistent between Task 3 and all conformance tests
- `expectMatch` used consistently
- Registry functions (`getComponents`, `getComponentBySlug`, `getComponentsByCategory`) defined in Task 4, used in Task 9

---

## Execution Handoff

Plan complete and saved to `notes/2026-04-07-slice-0-skeleton/2026-04-07-uswds-spec1-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
