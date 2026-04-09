# Component Catalog Tabbed Example Viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `flex-tab-group` component to the design system and use it in the catalog to show per-example Preview/Code tabs with syntax-highlighted rendered HTML.

**Architecture:** New `flex-tab-group` web component following the established pattern (server JSX + custom element). The catalog `design-system.tsx` route captures each example's rendered HTML, pretty-prints and highlights it, then wraps preview and code in tab groups. The CSS source section is wrapped in an accordion for tidiness.

**Tech Stack:** Hono JSX, custom elements, highlight.js, design tokens, Playwright (conformance tests), bun:test (unit tests)

---

## File Map

**Create:**
- `src/app/components/flex-tab-group/index.tsx` — TabGroup and Tab server components
- `src/app/components/flex-tab-group/client.ts` — FlexTabGroupElement custom element
- `src/app/components/flex-tab-group/styles.css` — Tab styling with design tokens
- `src/app/components/flex-tab-group/meta.ts` — Component metadata for registry
- `src/app/components/flex-tab-group/examples.tsx` — Self-documenting catalog examples
- `src/app/components/flex-tab-group/conformance-spec.tsx` — USWDS conformance mapping
- `src/app/components/flex-tab-group/conformance.test.ts` — Playwright conformance + behavior tests
- `src/lib/format-html.ts` — HTML pretty-printer utility
- `test/format-html.test.ts` — Unit tests for the pretty-printer
- `test/catalog-design-system.test.ts` — Catalog page integration tests

**Modify:**
- `src/app/components/registry.ts` — Add flex-tab-group to component list
- `src/app/components/register.ts` — Add client.ts import for custom element
- `src/app/public/styles.css` — Add CSS import for flex-tab-group
- `src/app/routes/catalog/design-system.tsx` — Tabbed example rendering + accordion CSS source

---

### Task 1: HTML Pretty-Printer Utility

**Files:**
- Create: `src/lib/format-html.ts`
- Create: `test/format-html.test.ts`

- [ ] **Step 1: Write failing tests for the HTML formatter**

Create `test/format-html.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { formatHtml } from '../src/lib/format-html'

describe('formatHtml', () => {
  it('indents nested tags', () => {
    const input = '<div><p>Hello</p></div>'
    const output = formatHtml(input)
    expect(output).toBe('<div>\n  <p>Hello</p>\n</div>')
  })

  it('handles self-closing tags', () => {
    const input = '<div><input type="text" /><span>Label</span></div>'
    const output = formatHtml(input)
    expect(output).toBe(
      '<div>\n  <input type="text" />\n  <span>Label</span>\n</div>'
    )
  })

  it('handles multiple attributes', () => {
    const input = '<button class="flex-button" data-variant="secondary">Click</button>'
    const output = formatHtml(input)
    expect(output).toBe(
      '<button class="flex-button" data-variant="secondary">Click</button>'
    )
  })

  it('handles deeply nested markup', () => {
    const input = '<div><ul><li>One</li><li>Two</li></ul></div>'
    const output = formatHtml(input)
    expect(output).toBe(
      '<div>\n  <ul>\n    <li>One</li>\n    <li>Two</li>\n  </ul>\n</div>'
    )
  })

  it('preserves inline content without adding newlines', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    const output = formatHtml(input)
    expect(output).toBe('<p>Hello <strong>world</strong></p>')
  })

  it('handles empty input', () => {
    expect(formatHtml('')).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/format-html.test.ts`
Expected: FAIL — module `../src/lib/format-html` not found

- [ ] **Step 3: Implement the HTML formatter**

Create `src/lib/format-html.ts`:

```typescript
/**
 * Lightweight HTML pretty-printer for component example output.
 * Handles simple tag indentation — not a full parser.
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const INLINE_ELEMENTS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data',
  'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var',
])

export function formatHtml(html: string): string {
  if (!html.trim()) return ''

  // Tokenize into tags and text segments
  const tokens = html.match(/(<[^>]+>|[^<]+)/g)
  if (!tokens) return html

  const lines: string[] = []
  let indent = 0

  for (const token of tokens) {
    const trimmed = token.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('</')) {
      // Closing tag
      indent--
      const tagName = trimmed.match(/<\/(\w+)/)?.[1] ?? ''
      // Merge with previous line if it's the matching open tag with inline content
      const lastLine = lines[lines.length - 1]
      if (lastLine !== undefined) {
        const openPattern = new RegExp(`^(\\s*)<${tagName}[^>]*>`)
        if (openPattern.test(lastLine) && !lastLine.includes(`</${tagName}>`)) {
          // Check if everything between open and close is inline
          lines[lines.length - 1] = lastLine + trimmed
          continue
        }
      }
      lines.push('  '.repeat(Math.max(0, indent)) + trimmed)
    } else if (trimmed.startsWith('<')) {
      // Opening or self-closing tag
      const tagName = trimmed.match(/<(\w+)/)?.[1] ?? ''
      const selfClosing = trimmed.endsWith('/>') || VOID_ELEMENTS.has(tagName)

      lines.push('  '.repeat(indent) + trimmed)
      if (!selfClosing) {
        indent++
      }
    } else {
      // Text node — append to previous line if it exists
      if (lines.length > 0) {
        lines[lines.length - 1] += trimmed
      } else {
        lines.push(trimmed)
      }
    }
  }

  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests and iterate until they pass**

Run: `bun test test/format-html.test.ts`
Expected: PASS. If any assertions fail, adjust the formatter logic to match expected output, then re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format-html.ts test/format-html.test.ts
git commit -m "feat: add HTML pretty-printer utility for catalog code display"
```

---

### Task 2: `flex-tab-group` Server Component

**Files:**
- Create: `src/app/components/flex-tab-group/index.tsx`
- Create: `src/app/components/flex-tab-group/meta.ts`

- [ ] **Step 1: Create the component metadata**

Create `src/app/components/flex-tab-group/meta.ts`:

```typescript
import type { ComponentMeta } from '../types'

export const meta: ComponentMeta = {
  name: 'Tab Group',
  slug: 'flex-tab-group',
  category: 'layout',
  description:
    'A tabbed interface for switching between content panels. Progressively enhanced from stacked content.',
  uswds: 'https://designsystem.digital.gov/components/tab/',
  interactive: true,
}
```

- [ ] **Step 2: Create the server component**

Create `src/app/components/flex-tab-group/index.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx'

interface TabProps {
  title: string
  children: Child
}

export const Tab: FC<TabProps> = ({ title, children }) => (
  <div data-tab-title={title}>{children}</div>
)

interface TabGroupProps {
  label: string
  children: Child
}

let tabGroupCounter = 0

export const TabGroup: FC<TabGroupProps> = ({ label, children }) => {
  const id = `tab-group-${++tabGroupCounter}`
  const tabs = Array.isArray(children) ? children : [children]

  return (
    <flex-tab-group>
      <div role="tablist" aria-label={label}>
        {tabs.map((tab, i) => {
          const title = tab?.props?.['data-tab-title'] ?? `Tab ${i + 1}`
          const panelId = `${id}-panel-${i}`
          const tabId = `${id}-tab-${i}`
          return (
            <button
              type="button"
              role="tab"
              aria-selected={i === 0 ? 'true' : 'false'}
              aria-controls={panelId}
              id={tabId}
              tabindex={i === 0 ? undefined : -1}
              class="flex-tab-group__tab"
            >
              {title}
            </button>
          )
        })}
      </div>
      {tabs.map((tab, i) => {
        const title = tab?.props?.['data-tab-title'] ?? `Tab ${i + 1}`
        const panelId = `${id}-panel-${i}`
        const tabId = `${id}-tab-${i}`
        return (
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={i !== 0}
            class="flex-tab-group__panel"
          >
            {tab?.props?.children ?? tab}
          </div>
        )
      })}
    </flex-tab-group>
  )
}
```

Note: The `tabGroupCounter` provides unique IDs for server-rendered pages. The Hono JSX `.toString()` approach means each `Tab` child renders as a `<div data-tab-title="...">` wrapper, and `TabGroup` reads these to build the tablist. Adjust the child extraction logic if Hono's JSX children shape differs — test in step 4.

- [ ] **Step 3: Verify the component renders correct HTML**

Create a quick smoke test by adding to an existing test file or running in the REPL. The key check is that `TabGroup` with two `Tab` children produces:
- A `<flex-tab-group>` wrapper
- A `<div role="tablist">` with two `<button role="tab">` elements
- Two `<div role="tabpanel">` elements, the second with `hidden`

Run: `bun -e "import { TabGroup, Tab } from './src/app/components/flex-tab-group/index.tsx'; console.log((<TabGroup label='test'><Tab title='A'>Content A</Tab><Tab title='B'>Content B</Tab></TabGroup>).toString())"`

Expected: Valid HTML with correct ARIA attributes. If the child extraction doesn't work as expected (Hono JSX may flatten children differently), adjust the `TabGroup` implementation.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-tab-group/index.tsx src/app/components/flex-tab-group/meta.ts
git commit -m "feat: add flex-tab-group server component and metadata"
```

---

### Task 3: `flex-tab-group` Client Enhancement

**Files:**
- Create: `src/app/components/flex-tab-group/client.ts`

- [ ] **Step 1: Create the custom element**

Create `src/app/components/flex-tab-group/client.ts`:

```typescript
class FlexTabGroupElement extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick.bind(this))
    this.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick.bind(this))
    this.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  private get tabs(): HTMLButtonElement[] {
    const tablist = this.querySelector('[role="tablist"]')
    if (!tablist) return []
    return Array.from(tablist.querySelectorAll('[role="tab"]'))
  }

  private handleClick(event: Event) {
    const tab = (event.target as Element).closest('[role="tab"]')
    if (!tab || !(tab instanceof HTMLButtonElement)) return
    this.selectTab(tab)
  }

  private handleKeydown(event: KeyboardEvent) {
    const tab = (event.target as Element).closest('[role="tab"]')
    if (!tab || !(tab instanceof HTMLButtonElement)) return

    const tabs = this.tabs
    const index = tabs.indexOf(tab)
    if (index === -1) return

    let target: HTMLButtonElement | undefined

    switch (event.key) {
      case 'ArrowRight':
        target = tabs[(index + 1) % tabs.length]
        break
      case 'ArrowLeft':
        target = tabs[(index - 1 + tabs.length) % tabs.length]
        break
      case 'Home':
        target = tabs[0]
        break
      case 'End':
        target = tabs[tabs.length - 1]
        break
      default:
        return
    }

    if (target) {
      event.preventDefault()
      target.focus()
      this.selectTab(target)
    }
  }

  private selectTab(selected: HTMLButtonElement) {
    for (const tab of this.tabs) {
      const panelId = tab.getAttribute('aria-controls')
      const panel = panelId ? this.querySelector(`#${panelId}`) : null
      const isSelected = tab === selected

      tab.setAttribute('aria-selected', String(isSelected))
      tab.tabIndex = isSelected ? 0 : -1

      if (panel) {
        if (isSelected) {
          panel.removeAttribute('hidden')
        } else {
          panel.setAttribute('hidden', '')
        }
      }
    }
  }
}

if (!customElements.get('flex-tab-group')) {
  customElements.define('flex-tab-group', FlexTabGroupElement)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/flex-tab-group/client.ts
git commit -m "feat: add flex-tab-group custom element with keyboard navigation"
```

---

### Task 4: `flex-tab-group` Styles

**Files:**
- Create: `src/app/components/flex-tab-group/styles.css`

- [ ] **Step 1: Create the tab group styles**

Create `src/app/components/flex-tab-group/styles.css`:

```css
flex-tab-group {
  display: block;
}

[role="tablist"] {
  display: flex;
  border-bottom: 1px solid var(--flex-color-border);
  gap: 0;
}

.flex-tab-group__tab {
  padding: var(--flex-space-sm) var(--flex-space-md);
  background: none;
  border: 1px solid transparent;
  border-bottom: none;
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  font-weight: 700;
  color: var(--flex-color-text-muted);
  cursor: pointer;
  position: relative;
  top: 1px;
}

.flex-tab-group__tab:hover {
  color: var(--flex-color-text);
}

.flex-tab-group__tab:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: -2px;
  z-index: 1;
}

.flex-tab-group__tab[aria-selected="true"] {
  color: var(--flex-color-text);
  border-color: var(--flex-color-border);
  background: var(--flex-color-bg);
  border-bottom-color: var(--flex-color-bg);
}

.flex-tab-group__panel {
  padding: var(--flex-space-md);
  border: 1px solid var(--flex-color-border);
  border-top: none;
}

.flex-tab-group__panel[hidden] {
  display: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/flex-tab-group/styles.css
git commit -m "feat: add flex-tab-group styles with design tokens"
```

---

### Task 5: Register `flex-tab-group`

**Files:**
- Modify: `src/app/components/registry.ts`
- Modify: `src/app/components/register.ts`
- Modify: `src/app/public/styles.css`

- [ ] **Step 1: Add to component registry**

In `src/app/components/registry.ts`, add the import and entry:

Add import after the existing imports (alphabetical order, after `table`):

```typescript
import { meta as tabGroup } from './flex-tab-group/meta'
```

Add `tabGroup` to the `components` array (alphabetical order, after `table`):

```typescript
  table,
  tabGroup,
  tag,
```

- [ ] **Step 2: Add client import to register.ts**

In `src/app/components/register.ts`, add after the existing imports:

```typescript
import './flex-tab-group/client'
```

- [ ] **Step 3: Add CSS import to styles.css**

In `src/app/public/styles.css`, add after the other block layer imports (before the `/* Utility */` comment):

```css
@import "../components/flex-tab-group/styles.css" layer(block);
```

- [ ] **Step 4: Verify builds pass**

Run: `bun run build:css && bun run --no-warnings tsc --noEmit`
Expected: Both pass without errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/registry.ts src/app/components/register.ts src/app/public/styles.css
git commit -m "feat: register flex-tab-group in component system"
```

---

### Task 6: `flex-tab-group` Examples and Conformance Spec

**Files:**
- Create: `src/app/components/flex-tab-group/examples.tsx`
- Create: `src/app/components/flex-tab-group/conformance-spec.tsx`

- [ ] **Step 1: Create examples**

Create `src/app/components/flex-tab-group/examples.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import { Tab, TabGroup } from './index'

export const DefaultTabs: FC = () => (
  <TabGroup label="Default example">
    <Tab title="First">
      <p>First panel content.</p>
    </Tab>
    <Tab title="Second">
      <p>Second panel content.</p>
    </Tab>
    <Tab title="Third">
      <p>Third panel content.</p>
    </Tab>
  </TabGroup>
)

export const TwoTabs: FC = () => (
  <TabGroup label="Two tab example">
    <Tab title="Preview">
      <p>This is the preview.</p>
    </Tab>
    <Tab title="Code">
      <pre><code>&lt;p&gt;This is the preview.&lt;/p&gt;</code></pre>
    </Tab>
  </TabGroup>
)
```

- [ ] **Step 2: Create conformance spec**

Create `src/app/components/flex-tab-group/conformance-spec.tsx`:

```tsx
/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

export const spec: ConformanceSpec = {
  component: 'flex-tab-group',
  reference: 'https://designsystem.digital.gov/components/tab/',
  mapping: [
    {
      uswds: 'usa-tab',
      flex: '<flex-tab-group> (custom element)',
      notes: 'Container element',
    },
    {
      uswds: '.usa-tab__panel',
      flex: '.flex-tab-group__panel',
      notes: 'Tab panel content area',
    },
    {
      uswds: 'role="tab"',
      flex: '.flex-tab-group__tab',
      notes: 'Tab button',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'font-weight',
    'cursor',
  ],
  structuralIgnores: [
    'color',
    'outline',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'display',
    'background-color',
  ],
  intentionalDifferences: [],
  fixtures: [
    {
      name: 'selected tab matches usa-tab button',
      uswds: `<div class="usa-tab" data-testid="target">
    <div role="tablist">
      <button role="tab" aria-selected="true" class="usa-tab__button" id="uswds-t1" aria-controls="uswds-p1">First</button>
      <button role="tab" aria-selected="false" class="usa-tab__button" id="uswds-t2" aria-controls="uswds-p2" tabindex="-1">Second</button>
    </div>
    <div role="tabpanel" id="uswds-p1" aria-labelledby="uswds-t1" class="usa-tab__panel"><p>First content</p></div>
    <div role="tabpanel" id="uswds-p2" aria-labelledby="uswds-t2" class="usa-tab__panel" hidden><p>Second content</p></div>
  </div>`,
      flex: `<flex-tab-group data-testid="target">
    <div role="tablist" aria-label="Test tabs">
      <button type="button" role="tab" aria-selected="true" aria-controls="flex-p1" id="flex-t1" class="flex-tab-group__tab">First</button>
      <button type="button" role="tab" aria-selected="false" aria-controls="flex-p2" id="flex-t2" tabindex="-1" class="flex-tab-group__tab">Second</button>
    </div>
    <div role="tabpanel" id="flex-p1" aria-labelledby="flex-t1" class="flex-tab-group__panel"><p>First content</p></div>
    <div role="tabpanel" id="flex-p2" aria-labelledby="flex-t2" class="flex-tab-group__panel" hidden><p>Second content</p></div>
  </flex-tab-group>`,
      uswdsSelector: '[data-testid="target"] [role="tab"][aria-selected="true"]',
      flexSelector: '[data-testid="target"] [role="tab"][aria-selected="true"]',
    },
  ],
  behavior: [
    { description: 'Click tab switches active panel', tested: true },
    { description: 'Arrow Right moves to next tab', tested: true },
    { description: 'Arrow Left moves to previous tab', tested: true },
    { description: 'Home moves to first tab', tested: true },
    { description: 'End moves to last tab', tested: true },
    { description: 'Tab wraps at edges', tested: true },
    { description: 'Accessibility audit passes', tested: true },
  ],
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/components/flex-tab-group/examples.tsx src/app/components/flex-tab-group/conformance-spec.tsx
git commit -m "feat: add flex-tab-group examples and conformance spec"
```

---

### Task 7: `flex-tab-group` Conformance and Behavior Tests

**Files:**
- Create: `src/app/components/flex-tab-group/conformance.test.ts`

- [ ] **Step 1: Create the conformance and behavior test file**

Create `src/app/components/flex-tab-group/conformance.test.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { runVisualConformance } from '../../../lib/test-helpers/conformance-runner'
import { renderFlexFixture } from '../../../lib/test-helpers/render'
import { spec } from './conformance-spec'

const componentsJs = readFileSync(
  resolve(process.cwd(), 'dist/components.js'),
  'utf-8',
)

// Spec-driven visual conformance
runVisualConformance(spec)

// --- Custom behavioral tests ---

test.describe('flex-tab-group behavior', () => {
  async function renderWithJs(
    page: import('@playwright/test').Page,
    html: string,
  ) {
    await renderFlexFixture(page, `${html}<script>${componentsJs}</script>`)
    await page.waitForFunction(() => customElements.get('flex-tab-group'))
  }

  const fixture = `
    <flex-tab-group>
      <div role="tablist" aria-label="Test tabs">
        <button type="button" role="tab" aria-selected="true" aria-controls="p1" id="t1" class="flex-tab-group__tab">First</button>
        <button type="button" role="tab" aria-selected="false" aria-controls="p2" id="t2" tabindex="-1" class="flex-tab-group__tab">Second</button>
        <button type="button" role="tab" aria-selected="false" aria-controls="p3" id="t3" tabindex="-1" class="flex-tab-group__tab">Third</button>
      </div>
      <div role="tabpanel" id="p1" aria-labelledby="t1" class="flex-tab-group__panel"><p>First content</p></div>
      <div role="tabpanel" id="p2" aria-labelledby="t2" class="flex-tab-group__panel" hidden><p>Second content</p></div>
      <div role="tabpanel" id="p3" aria-labelledby="t3" class="flex-tab-group__panel" hidden><p>Third content</p></div>
    </flex-tab-group>
  `

  test('click tab switches active panel', async ({ page }) => {
    await renderWithJs(page, fixture)

    const tab2 = page.locator('#t2')
    const panel1 = page.locator('#p1')
    const panel2 = page.locator('#p2')

    await expect(panel1).toBeVisible()
    await expect(panel2).toBeHidden()

    await tab2.click()

    await expect(tab2).toHaveAttribute('aria-selected', 'true')
    await expect(panel2).toBeVisible()
    await expect(panel1).toBeHidden()
  })

  test('Arrow Right moves to next tab', async ({ page }) => {
    await renderWithJs(page, fixture)

    const tab1 = page.locator('#t1')
    const tab2 = page.locator('#t2')
    const panel2 = page.locator('#p2')

    await tab1.focus()
    await page.keyboard.press('ArrowRight')

    await expect(tab2).toBeFocused()
    await expect(tab2).toHaveAttribute('aria-selected', 'true')
    await expect(panel2).toBeVisible()
  })

  test('Arrow Left moves to previous tab', async ({ page }) => {
    await renderWithJs(page, fixture)

    // First select tab 2
    const tab2 = page.locator('#t2')
    await tab2.click()
    await expect(tab2).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('ArrowLeft')

    const tab1 = page.locator('#t1')
    await expect(tab1).toBeFocused()
    await expect(tab1).toHaveAttribute('aria-selected', 'true')
  })

  test('Home moves to first tab', async ({ page }) => {
    await renderWithJs(page, fixture)

    const tab3 = page.locator('#t3')
    await tab3.click()

    await page.keyboard.press('Home')

    const tab1 = page.locator('#t1')
    await expect(tab1).toBeFocused()
    await expect(tab1).toHaveAttribute('aria-selected', 'true')
  })

  test('End moves to last tab', async ({ page }) => {
    await renderWithJs(page, fixture)

    const tab1 = page.locator('#t1')
    await tab1.focus()

    await page.keyboard.press('End')

    const tab3 = page.locator('#t3')
    await expect(tab3).toBeFocused()
    await expect(tab3).toHaveAttribute('aria-selected', 'true')
  })

  test('Arrow Right wraps from last to first', async ({ page }) => {
    await renderWithJs(page, fixture)

    const tab3 = page.locator('#t3')
    await tab3.click()

    await page.keyboard.press('ArrowRight')

    const tab1 = page.locator('#t1')
    await expect(tab1).toBeFocused()
    await expect(tab1).toHaveAttribute('aria-selected', 'true')
  })

  test('Arrow Left wraps from first to last', async ({ page }) => {
    await renderWithJs(page, fixture)

    const tab1 = page.locator('#t1')
    await tab1.focus()

    await page.keyboard.press('ArrowLeft')

    const tab3 = page.locator('#t3')
    await expect(tab3).toBeFocused()
    await expect(tab3).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('flex-tab-group accessibility', () => {
  test('accessibility audit passes', async ({ page }) => {
    await renderFlexFixture(
      page,
      `
      <main>
        <h1>Tab Test</h1>
        <flex-tab-group>
          <div role="tablist" aria-label="Test tabs">
            <button type="button" role="tab" aria-selected="true" aria-controls="a-p1" id="a-t1" class="flex-tab-group__tab">First</button>
            <button type="button" role="tab" aria-selected="false" aria-controls="a-p2" id="a-t2" tabindex="-1" class="flex-tab-group__tab">Second</button>
          </div>
          <div role="tabpanel" id="a-p1" aria-labelledby="a-t1" class="flex-tab-group__panel"><p>First content.</p></div>
          <div role="tabpanel" id="a-p2" aria-labelledby="a-t2" class="flex-tab-group__panel" hidden><p>Second content.</p></div>
        </flex-tab-group>
      </main>
      `,
    )

    await page.evaluate(() => {
      document.title = 'Tab Group Conformance Test'
    })

    const results = await new AxeBuilder({ page })
      .disableRules(['heading-order'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
```

- [ ] **Step 2: Build components and run conformance tests**

Run: `bun run build:css && bun run scripts/build-components.ts && bunx playwright test src/app/components/flex-tab-group/conformance.test.ts`
Expected: All tests pass. If USWDS tab class names differ from what's in the conformance spec fixtures, adjust the fixture HTML to match actual USWDS markup.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/flex-tab-group/conformance.test.ts
git commit -m "test: add flex-tab-group conformance and behavior tests"
```

---

### Task 8: Catalog Integration — Tabbed Examples and Accordion CSS Source

**Files:**
- Modify: `src/app/routes/catalog/design-system.tsx`
- Create: `test/catalog-design-system.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `test/catalog-design-system.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/app/server'

describe('GET /catalog/design-system/:slug (tabbed examples)', () => {
  it('renders tab groups for component examples', async () => {
    const res = await app.request('/catalog/design-system/flex-button')
    expect(res.status).toBe(200)

    const body = await res.text()
    // Should have tab group wrapper
    expect(body).toContain('flex-tab-group')
    // Should have Preview and Code tabs
    expect(body).toContain('role="tab"')
    expect(body).toContain('Preview')
    expect(body).toContain('Code')
    // Should have tabpanels
    expect(body).toContain('role="tabpanel"')
  })

  it('renders syntax-highlighted HTML in Code tab', async () => {
    const res = await app.request('/catalog/design-system/flex-button')
    const body = await res.text()
    // The code panel should contain highlighted HTML (hljs classes)
    expect(body).toContain('hljs')
    // Should contain actual rendered markup (escaped angle brackets in highlighted form)
    expect(body).toContain('flex-button')
  })

  it('wraps CSS source in an accordion', async () => {
    const res = await app.request('/catalog/design-system/flex-button')
    const body = await res.text()
    expect(body).toContain('flex-accordion')
    expect(body).toContain('Source CSS')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/catalog-design-system.test.ts`
Expected: FAIL — tab-related assertions fail because the current page doesn't render tabs.

- [ ] **Step 3: Update design-system.tsx — add imports and register HTML language**

In `src/app/routes/catalog/design-system.tsx`, update the top of the file.

Add `xml` (HTML) language to highlight.js. Change:

```typescript
import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'

hljs.registerLanguage('css', css)
```

To:

```typescript
import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
```

Add imports for the new components and formatter:

```typescript
import { Accordion } from '../../components/flex-accordion'
import { Tab, TabGroup } from '../../components/flex-tab-group'
import { formatHtml } from '../../../lib/format-html'
```

- [ ] **Step 4: Update the examples rendering section**

Replace the examples section (lines ~901-912) — change:

```tsx
      {exampleEntries.length > 0 && (
        <section class="l-stack">
          <h2>Examples</h2>
          {exampleEntries.map(([name, ExampleFn]) => (
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              <h3>{name}</h3>
              <div style="padding: var(--flex-space-md); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md);">
                <ExampleFn />
              </div>
            </div>
          ))}
        </section>
      )}
```

With:

```tsx
      {exampleEntries.length > 0 && (
        <section class="l-stack">
          <h2>Examples</h2>
          {exampleEntries.map(([name, ExampleFn]) => {
            const rendered = (<ExampleFn />).toString()
            const formatted = formatHtml(rendered)
            const highlighted = hljs.highlight(formatted, { language: 'xml' }).value
            return (
              <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
                <h3>{name}</h3>
                <TabGroup label={`${name} example`}>
                  <Tab title="Preview">
                    <div dangerouslySetInnerHTML={{ __html: rendered }} />
                  </Tab>
                  <Tab title="Code">
                    <pre style="margin: 0; overflow-x: auto; font-size: var(--flex-text-sm); line-height: 1.5;">
                      <code
                        class="hljs"
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                      />
                    </pre>
                  </Tab>
                </TabGroup>
              </div>
            )
          })}
        </section>
      )}
```

- [ ] **Step 5: Wrap CSS source section in accordion**

Replace the CSS source section (lines ~996-1029) — change:

```tsx
      {cssSource &&
        (() => {
          const extendsMatch = cssSource.match(
            /Extends:\s*(.+?)\s*\(base-classes\.css(#[\w-]+)\)/,
          )
          const baseClassName = extendsMatch ? extendsMatch[1] : null
          const baseAnchor = extendsMatch ? extendsMatch[2] : null
          return (
            <section class="l-stack">
              <h2>Source CSS</h2>
              {baseClassName && (
                <p>
                  Base styles:{' '}
                  <a
                    href={resolveUrl(
                      `/catalog/design-system/base-classes${baseAnchor}`,
                    )}
                  >
                    {baseClassName}
                  </a>
                </p>
              )}
              <pre style="overflow-x: auto; padding: var(--flex-space-md); background: var(--flex-color-bg-subtle); border: 1px solid var(--flex-color-border); border-radius: var(--flex-radius-md); font-size: var(--flex-text-sm); line-height: 1.5;">
                <code
                  class="hljs"
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlight(cssSource, { language: 'css' })
                      .value,
                  }}
                />
              </pre>
            </section>
          )
        })()}
```

With:

```tsx
      {cssSource &&
        (() => {
          const extendsMatch = cssSource.match(
            /Extends:\s*(.+?)\s*\(base-classes\.css(#[\w-]+)\)/,
          )
          const baseClassName = extendsMatch ? extendsMatch[1] : null
          const baseAnchor = extendsMatch ? extendsMatch[2] : null
          return (
            <section class="l-stack">
              <h2>Source CSS</h2>
              {baseClassName && (
                <p>
                  Base styles:{' '}
                  <a
                    href={resolveUrl(
                      `/catalog/design-system/base-classes${baseAnchor}`,
                    )}
                  >
                    {baseClassName}
                  </a>
                </p>
              )}
              <Accordion
                items={[
                  {
                    id: `${meta.slug}-css`,
                    title: 'View stylesheet',
                    content: (
                      <pre style="overflow-x: auto; margin: 0; font-size: var(--flex-text-sm); line-height: 1.5;">
                        <code
                          class="hljs"
                          dangerouslySetInnerHTML={{
                            __html: hljs.highlight(cssSource, { language: 'css' }).value,
                          }}
                        />
                      </pre>
                    ),
                  },
                ]}
              />
            </section>
          )
        })()}
```

- [ ] **Step 6: Run the integration tests**

Run: `bun test test/catalog-design-system.test.ts`
Expected: PASS

- [ ] **Step 7: Run the full test suite**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 8: Run linting and type check**

Run: `bunx @biomejs/biome check . && bun run --no-warnings tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/routes/catalog/design-system.tsx test/catalog-design-system.test.ts
git commit -m "feat: add tabbed Preview/Code examples and accordion CSS source to catalog"
```

---

### Task 9: Final Verification and Cleanup

- [ ] **Step 1: Build all assets**

Run: `bun run build:css && bun run scripts/build-components.ts`
Expected: Both succeed.

- [ ] **Step 2: Run dev server and visually verify**

Run: `bun run dev`

Open the browser and check:
- `/catalog/design-system/flex-button` — should show tabbed examples with Preview/Code
- `/catalog/design-system/flex-tab-group` — the tab component should document itself
- `/catalog/design-system/flex-accordion` — CSS source should be in an accordion
- Verify tab switching works (click and keyboard)
- Verify code panels show formatted, syntax-highlighted HTML

- [ ] **Step 3: Run stylelint**

Run: `bun run lint:css`
Expected: No errors.

- [ ] **Step 4: Run full test suite including Playwright**

Run: `bun test && bunx playwright test`
Expected: All pass.
