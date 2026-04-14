# Walkthrough Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided walkthrough content type to the catalog with dual rendering modes (normal catalog view and focused presentation mode), populated with initial content covering the project as built to date.

**Architecture:** Walkthrough pages are markdown files in `catalog/walkthrough/` with frontmatter defining order, title, rubric tags, timing, and audience. A new Hono route at `/catalog/walkthrough` renders these as a sequential experience with prev/next navigation. A `?present` query parameter switches to a minimal-chrome presentation layout with keyboard navigation. The index page aggregates rubric coverage from frontmatter metadata.

**Tech Stack:** Hono (server-rendered JSX), markdown-it, USWDS-conformant design system components, CSS cascade layers

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/entrypoints/app/routes/catalog/walkthrough.tsx` | Route handlers: index page and page detail (normal + present modes) |
| `src/design-system/components/flex-walkthrough-nav/index.tsx` | Prev/next navigation + progress indicator component |
| `src/design-system/components/flex-walkthrough-nav/styles.css` | Navigation styling for both modes |
| `src/design-system/components/flex-present-layout/index.tsx` | Minimal-chrome layout for presentation mode |
| `src/design-system/components/flex-present-layout/styles.css` | Present-mode typography and spacing |
| `test/catalog-walkthrough.test.ts` | Route integration tests |
| `catalog/walkthrough/01-the-problem.md` | Walkthrough page: problem space |
| `catalog/walkthrough/02-our-approach.md` | Walkthrough page: approach and innovation |
| `catalog/walkthrough/03-llm-assisted-extraction.md` | Walkthrough page: LLM extraction pipeline |
| `catalog/walkthrough/04-evaluation-and-experimentation.md` | Walkthrough page: evaluation methodology |
| `catalog/walkthrough/05-production-infrastructure.md` | Walkthrough page: deployment and ops |
| `catalog/walkthrough/06-inference-pipeline.md` | Walkthrough page: pipeline design |
| `catalog/walkthrough/07-live-demo.md` | Walkthrough page: interactive demo |
| `catalog/walkthrough/08-whats-next.md` | Walkthrough page: future work |

### Modified Files

| File | Change |
|---|---|
| `src/services/content/types.ts` | Add `WalkthroughPage` interface |
| `src/entrypoints/app/routes/catalog/index.tsx` | Mount walkthrough route, add card to landing page |
| `src/entrypoints/app/routes/catalog/sidebar.ts` | Add walkthrough entry to `getCatalogSidebar`, add `getWalkthroughSidebar` |
| `src/entrypoints/app/public/styles.css` | Import walkthrough-nav and present-layout stylesheets |

---

## Task 1: WalkthroughPage Type and First Content File

**Files:**
- Modify: `src/services/content/types.ts`
- Create: `catalog/walkthrough/01-the-problem.md`

- [ ] **Step 1: Add WalkthroughPage type**

In `src/services/content/types.ts`, add after the `Story` interface:

```typescript
export interface WalkthroughPage {
  slug: string
  title: string
  order: number
  rubric: string[]
  timing: string
  audience: string[]
  content: string
}
```

- [ ] **Step 2: Create first walkthrough content file**

Create `catalog/walkthrough/01-the-problem.md`:

```markdown
---
title: "The Problem"
order: 1
rubric: []
timing: "1 min"
audience: [evaluator, general]
---

# Government Forms Are Stuck in Paper

Federal agencies manage thousands of forms that collect information from the public. These forms are complex -- multi-page documents with conditional logic, validation rules, sensitivity classifications, and accessibility requirements.

Today, digitizing these forms is a manual, expensive process. A single form can take weeks to convert from PDF to a working web experience. The result is fragile, hard to maintain, and disconnected from the source document.

**What if an LLM could do the heavy lifting?**

Forms Lab explores using large language models to automatically extract structured data from PDF forms and generate accessible, standards-compliant web experiences -- turning weeks of work into minutes.
```

- [ ] **Step 3: Commit**

```bash
git add src/services/content/types.ts catalog/walkthrough/01-the-problem.md
git commit -m "feat(walkthrough): add WalkthroughPage type and first content file"
```

---

## Task 2: Walkthrough Index Route

**Files:**
- Create: `src/entrypoints/app/routes/catalog/walkthrough.tsx`
- Create: `test/catalog-walkthrough.test.ts`
- Modify: `src/entrypoints/app/routes/catalog/index.tsx`

- [ ] **Step 1: Write failing test for walkthrough index**

Create `test/catalog-walkthrough.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'

describe('Walkthrough Routes', () => {
  describe('GET /catalog/walkthrough', () => {
    it('returns 200 and lists walkthrough pages', async () => {
      const res = await app.request('/catalog/walkthrough')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Walkthrough')
      expect(body).toContain('The Problem')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: FAIL (404 — route not registered)

- [ ] **Step 3: Create walkthrough route file**

Create `src/entrypoints/app/routes/catalog/walkthrough.tsx`:

```tsx
import { join } from 'node:path'
import { Hono } from 'hono'
import { ContentCard } from '../../../../design-system/components/flex-card'
import { CatalogSidebar } from '../../../../design-system/components/flex-catalog-sidebar'
import { Layout } from '../../../../design-system/components/flex-layout'
import { TagList } from '../../../../design-system/components/flex-tag-list'
import { readMarkdownDir } from '../../../../services/content/markdown'
import type { WalkthroughPage } from '../../../../services/content/types'
import { resolveUrl } from '../../../../shared/base-path'
import { getCatalogSidebar } from './sidebar'

const walkthrough = new Hono()

function parseArrayField(value: string | undefined): string[] {
  if (!value) return []
  return value
    .replace(/[[\]]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseWalkthroughPage(file: {
  frontmatter: Record<string, string>
  content: string
  filename: string
}): WalkthroughPage {
  return {
    slug: file.filename,
    title: file.frontmatter.title || file.filename,
    order: parseInt(file.frontmatter.order || '0', 10),
    rubric: parseArrayField(file.frontmatter.rubric),
    timing: file.frontmatter.timing || '',
    audience: parseArrayField(file.frontmatter.audience),
    content: file.content,
  }
}

async function loadWalkthroughPages(): Promise<WalkthroughPage[]> {
  const dir = join(process.cwd(), 'catalog', 'walkthrough')
  const files = await readMarkdownDir(dir)
  return files.map(parseWalkthroughPage).sort((a, b) => a.order - b.order)
}

const RUBRIC_AREAS = [
  'model-functionality',
  'innovation',
  'environment-setup',
  'inference-pipeline',
  'technical-documentation',
  'demo-presentation',
] as const

walkthrough.get('/', async (c) => {
  const pages = await loadWalkthroughPages()

  const coveredAreas = new Set(pages.flatMap((p) => p.rubric))
  const totalMinutes = pages.reduce((sum, p) => {
    const match = p.timing.match(/(\d+)/)
    return sum + (match ? parseInt(match[1], 10) : 0)
  }, 0)

  const sidebarData = getCatalogSidebar('/catalog/walkthrough')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  const firstPage = pages[0]

  return c.html(
    <Layout
      title="Walkthrough"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Project Walkthrough</h1>
      <p>
        A guided tour of the Forms Lab project — problem, approach, LLM
        integration, production environment, and live demo.
        {totalMinutes > 0 && <> Estimated time: {totalMinutes} minutes.</>}
      </p>

      {firstPage && (
        <p>
          <a href={resolveUrl(`/catalog/walkthrough/${firstPage.slug}`)} class="flex-button">
            Start walkthrough
          </a>
        </p>
      )}

      <section>
        <h2>Rubric Coverage</h2>
        <div class="l-cluster">
          {RUBRIC_AREAS.map((area) => (
            <span
              key={area}
              class="badge"
              data-status={coveredAreas.has(area) ? 'closed' : 'open'}
            >
              {area}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>Sections</h2>
        <div class="l-stack">
          {pages.map((page, i) => (
            <ContentCard
              key={page.slug}
              title={`${i + 1}. ${page.title}`}
              href={resolveUrl(`/catalog/walkthrough/${page.slug}`)}
              description={page.timing ? `${page.timing}` : undefined}
            >
              <TagList tags={page.rubric} />
            </ContentCard>
          ))}
        </div>
      </section>
    </Layout>,
  )
})

export default walkthrough
```

- [ ] **Step 4: Register the route in catalog index**

In `src/entrypoints/app/routes/catalog/index.tsx`, add the import and route:

Add import:
```typescript
import walkthrough from './walkthrough'
```

Add route (after the existing `catalog.route` calls):
```typescript
catalog.route('/walkthrough', walkthrough)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/routes/catalog/walkthrough.tsx src/entrypoints/app/routes/catalog/index.tsx test/catalog-walkthrough.test.ts
git commit -m "feat(walkthrough): add index route with rubric coverage summary"
```

---

## Task 3: Walkthrough Page Route with Navigation (Normal Mode)

**Files:**
- Create: `src/design-system/components/flex-walkthrough-nav/index.tsx`
- Create: `src/design-system/components/flex-walkthrough-nav/styles.css`
- Modify: `src/entrypoints/app/routes/catalog/walkthrough.tsx`
- Modify: `src/entrypoints/app/public/styles.css`
- Modify: `test/catalog-walkthrough.test.ts`

- [ ] **Step 1: Write failing test for page detail route**

Add to `test/catalog-walkthrough.test.ts`:

```typescript
describe('GET /catalog/walkthrough/:slug', () => {
  it('returns 200 and renders walkthrough page', async () => {
    const res = await app.request('/catalog/walkthrough/01-the-problem')
    expect(res.status).toBe(200)

    const body = await res.text()
    expect(body).toContain('The Problem')
    expect(body).toContain('Government Forms')
  })

  it('shows progress indicator', async () => {
    const res = await app.request('/catalog/walkthrough/01-the-problem')
    const body = await res.text()
    expect(body).toContain('1 of')
  })

  it('returns 404 for unknown slug', async () => {
    const res = await app.request('/catalog/walkthrough/nonexistent')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: FAIL (route not found, 404 for valid slug)

- [ ] **Step 3: Create WalkthroughNav component**

Create `src/design-system/components/flex-walkthrough-nav/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'

interface WalkthroughNavProps {
  currentPage: number
  totalPages: number
  prevUrl: string | null
  nextUrl: string | null
}

export const WalkthroughNav: FC<WalkthroughNavProps> = ({
  currentPage,
  totalPages,
  prevUrl,
  nextUrl,
}) => {
  return (
    <nav class="flex-walkthrough-nav" aria-label="Walkthrough navigation">
      <span class="flex-walkthrough-nav__progress">
        {currentPage} of {totalPages}
      </span>
      <div class="flex-walkthrough-nav__controls">
        {prevUrl ? (
          <a href={prevUrl} class="flex-walkthrough-nav__link">
            ← Previous
          </a>
        ) : (
          <span class="flex-walkthrough-nav__link" data-disabled>
            ← Previous
          </span>
        )}
        {nextUrl ? (
          <a href={nextUrl} class="flex-walkthrough-nav__link">
            Next →
          </a>
        ) : (
          <span class="flex-walkthrough-nav__link" data-disabled>
            Next →
          </span>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Create WalkthroughNav styles**

Create `src/design-system/components/flex-walkthrough-nav/styles.css`:

```css
.flex-walkthrough-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: var(--flex-space-md);
  border-block-start: 1px solid var(--flex-color-border);
  margin-block-start: var(--flex-space-lg);
}

.flex-walkthrough-nav__progress {
  font-size: var(--flex-text-sm);
  color: var(--flex-color-text-muted);
}

.flex-walkthrough-nav__controls {
  display: flex;
  gap: var(--flex-space-md);
}

.flex-walkthrough-nav__link {
  color: var(--flex-color-accent);
  text-decoration: none;
  font-weight: 700;
}

.flex-walkthrough-nav__link:hover {
  text-decoration: underline;
}

.flex-walkthrough-nav__link[data-disabled] {
  color: var(--flex-color-text-muted);
  pointer-events: none;
}
```

- [ ] **Step 5: Add stylesheet import**

In `src/entrypoints/app/public/styles.css`, add before the `/* Utility */` comment:

```css
@import "../../../design-system/components/flex-walkthrough-nav/styles.css" layer(block);
```

- [ ] **Step 6: Add page detail route handler**

In `src/entrypoints/app/routes/catalog/walkthrough.tsx`, add these new imports at the top, and update the existing markdown import to also include `renderMarkdown`:

```typescript
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'
import { Prose } from '../../../../design-system/components/flex-prose'
import { WalkthroughNav } from '../../../../design-system/components/flex-walkthrough-nav'
```

Update the existing import:
```typescript
import { readMarkdownDir, renderMarkdown } from '../../../../services/content/markdown'
```

Then add the route handler after the `walkthrough.get('/')` handler and before `export default walkthrough`:

```tsx
walkthrough.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const pages = await loadWalkthroughPages()
  const pageIndex = pages.findIndex((p) => p.slug === slug)

  if (pageIndex === -1) {
    const sidebarData = getCatalogSidebar('/catalog/walkthrough')
    const sidebar = <CatalogSidebar sections={sidebarData} />
    return c.html(
      <Layout
        title="Not Found"
        sidebar={sidebar}
        currentPath="/catalog"
        user={c.get('user')}
      >
        <h1>Page Not Found</h1>
        <p>The walkthrough page "{slug}" does not exist.</p>
      </Layout>,
      404,
    )
  }

  const page = pages[pageIndex]
  const prevPage = pageIndex > 0 ? pages[pageIndex - 1] : null
  const nextPage = pageIndex < pages.length - 1 ? pages[pageIndex + 1] : null

  const sidebarData = getCatalogSidebar('/catalog/walkthrough')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title={page.title}
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <Breadcrumb
        items={[
          { label: 'Catalog', href: resolveUrl('/catalog') },
          { label: 'Walkthrough', href: resolveUrl('/catalog/walkthrough') },
          { label: page.title },
        ]}
      />
      <Prose html={renderMarkdown(page.content)} />
      <WalkthroughNav
        currentPage={pageIndex + 1}
        totalPages={pages.length}
        prevUrl={
          prevPage
            ? resolveUrl(`/catalog/walkthrough/${prevPage.slug}`)
            : null
        }
        nextUrl={
          nextPage
            ? resolveUrl(`/catalog/walkthrough/${nextPage.slug}`)
            : null
        }
      />
    </Layout>,
  )
})
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add src/design-system/components/flex-walkthrough-nav/ src/entrypoints/app/routes/catalog/walkthrough.tsx src/entrypoints/app/public/styles.css test/catalog-walkthrough.test.ts
git commit -m "feat(walkthrough): add page detail route with prev/next navigation"
```

---

## Task 4: Sidebar Integration and Catalog Landing Card

**Files:**
- Modify: `src/entrypoints/app/routes/catalog/sidebar.ts`
- Modify: `src/entrypoints/app/routes/catalog/index.tsx`
- Modify: `src/entrypoints/app/routes/catalog/walkthrough.tsx`
- Modify: `test/catalog-walkthrough.test.ts`

- [ ] **Step 1: Write failing test for sidebar**

Add to `test/catalog-walkthrough.test.ts`:

```typescript
it('shows walkthrough link in catalog sidebar', async () => {
  const res = await app.request('/catalog')
  const body = await res.text()
  expect(body).toContain('Walkthrough')
  expect(body).toContain('/catalog/walkthrough')
})

it('shows contextual sidebar on walkthrough pages', async () => {
  const res = await app.request('/catalog/walkthrough/01-the-problem')
  const body = await res.text()
  expect(body).toContain('← Back to Catalog')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: FAIL (sidebar doesn't include walkthrough entries)

- [ ] **Step 3: Add walkthrough to getCatalogSidebar**

In `src/entrypoints/app/routes/catalog/sidebar.ts`, add a new section to the `getCatalogSidebar` function. Add this object to the returned array, after the "The System" section and before "The Work" section:

```typescript
{
  title: 'Presentation',
  items: [
    {
      label: 'Walkthrough',
      href: resolveUrl('/catalog/walkthrough'),
      current: currentPath === '/catalog/walkthrough',
    },
  ],
},
```

- [ ] **Step 4: Add getWalkthroughSidebar function**

In `src/entrypoints/app/routes/catalog/sidebar.ts`, add the import for WalkthroughPage and the new sidebar function:

```typescript
import type { Decision, Story, WalkthroughPage } from '../../../../services/content/types'
```

```typescript
export function getWalkthroughSidebar(
  pages: WalkthroughPage[],
  currentPath?: string,
) {
  return [
    {
      title: 'Walkthrough',
      items: [
        {
          label: '← Back to Catalog',
          href: resolveUrl('/catalog'),
          current: false,
        },
        {
          label: 'Overview',
          href: resolveUrl('/catalog/walkthrough'),
          current: currentPath === '/catalog/walkthrough',
        },
        ...pages.map((p, i) => ({
          label: `${i + 1}. ${p.title}`,
          href: resolveUrl(`/catalog/walkthrough/${p.slug}`),
          current: currentPath === `/catalog/walkthrough/${p.slug}`,
        })),
      ],
    },
  ]
}
```

- [ ] **Step 5: Use contextual sidebar in walkthrough routes**

In `src/entrypoints/app/routes/catalog/walkthrough.tsx`, add the import:

```typescript
import { getCatalogSidebar, getWalkthroughSidebar } from './sidebar'
```

(Replace the existing `import { getCatalogSidebar } from './sidebar'`)

Update the index handler to use the walkthrough sidebar:

Replace `const sidebarData = getCatalogSidebar('/catalog/walkthrough')` with:
```typescript
const sidebarData = getWalkthroughSidebar(pages, '/catalog/walkthrough')
```

Update the page detail handler similarly. Replace `const sidebarData = getCatalogSidebar('/catalog/walkthrough')` with:
```typescript
const sidebarData = getWalkthroughSidebar(pages, `/catalog/walkthrough/${slug}`)
```

Also update the 404 handler in the page detail route to use the walkthrough sidebar (load pages before the 404 check — they're already loaded).

- [ ] **Step 6: Add walkthrough card to catalog landing page**

In `src/entrypoints/app/routes/catalog/index.tsx`, add a new section in the landing page JSX. Add this before the "The System" section:

```tsx
<section>
  <p class="catalog-group-label">Presentation</p>
  <div class="l-grid" style="--grid-min: 280px">
    <ContentCard
      title="Walkthrough"
      href={resolveUrl('/catalog/walkthrough')}
      description="Guided tour of the project — problem, approach, LLM integration, and demo"
    />
  </div>
</section>
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: All PASS

- [ ] **Step 8: Run full test suite**

Run: `bun test`
Expected: All PASS (no regressions)

- [ ] **Step 9: Commit**

```bash
git add src/entrypoints/app/routes/catalog/sidebar.ts src/entrypoints/app/routes/catalog/index.tsx src/entrypoints/app/routes/catalog/walkthrough.tsx test/catalog-walkthrough.test.ts
git commit -m "feat(walkthrough): add sidebar integration and catalog landing card"
```

---

## Task 5: Present Mode

**Files:**
- Create: `src/design-system/components/flex-present-layout/index.tsx`
- Create: `src/design-system/components/flex-present-layout/styles.css`
- Modify: `src/entrypoints/app/routes/catalog/walkthrough.tsx`
- Modify: `src/entrypoints/app/public/styles.css`
- Modify: `test/catalog-walkthrough.test.ts`

- [ ] **Step 1: Write failing tests for present mode**

Add to `test/catalog-walkthrough.test.ts`:

```typescript
describe('Present mode', () => {
  it('returns 200 for walkthrough page in present mode', async () => {
    const res = await app.request(
      '/catalog/walkthrough/01-the-problem?present',
    )
    expect(res.status).toBe(200)
  })

  it('does not render catalog header in present mode', async () => {
    const res = await app.request(
      '/catalog/walkthrough/01-the-problem?present',
    )
    const body = await res.text()
    expect(body).not.toContain('flex-header')
    expect(body).toContain('flex-present-layout')
    expect(body).toContain('The Problem')
  })

  it('includes keyboard navigation script in present mode', async () => {
    const res = await app.request(
      '/catalog/walkthrough/01-the-problem?present',
    )
    const body = await res.text()
    expect(body).toContain('ArrowRight')
  })

  it('renders index as title slide in present mode', async () => {
    const res = await app.request('/catalog/walkthrough?present')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('flex-present-layout')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: FAIL (present mode not implemented)

- [ ] **Step 3: Create PresentLayout component**

Create `src/design-system/components/flex-present-layout/index.tsx`:

```tsx
import type { Child, FC, PropsWithChildren } from 'hono/jsx'
import { resolveUrl } from '../../../shared/base-path'

interface PresentLayoutProps {
  title?: string
  nav?: Child
}

export const PresentLayout: FC<PropsWithChildren<PresentLayoutProps>> = (
  props,
) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'

  return (
    <html lang="en" data-theme="auto">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'||t==='dark'||t==='auto')document.documentElement.setAttribute('data-theme',t)})()`,
          }}
        />
        <link rel="stylesheet" href={resolveUrl('/static/styles.css')} />
      </head>
      <body>
        <main class="flex-present-layout">
          <div class="flex-present-layout__content">{props.children}</div>
          {props.nav && (
            <div class="flex-present-layout__nav">{props.nav}</div>
          )}
        </main>
        <script
          type="module"
          src={resolveUrl('/static/components.js')}
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Create PresentLayout styles**

Create `src/design-system/components/flex-present-layout/styles.css`:

```css
.flex-present-layout {
  display: flex;
  flex-direction: column;
  min-block-size: 100vh;
  min-block-size: 100dvh;
  padding: var(--flex-space-xl) var(--flex-space-lg);
}

.flex-present-layout__content {
  flex: 1;
  max-inline-size: 50rem;
  margin-inline: auto;
  inline-size: 100%;
}

.flex-present-layout__content .prose {
  font-size: var(--flex-text-lg);
  line-height: 1.6;
}

.flex-present-layout__content .prose h1 {
  font-size: var(--flex-text-3xl);
  margin-block-end: var(--flex-space-lg);
}

.flex-present-layout__content .prose h2 {
  font-size: var(--flex-text-2xl);
  margin-block-start: var(--flex-space-xl);
}

.flex-present-layout__content .prose a {
  text-decoration: underline;
}

.flex-present-layout__nav {
  max-inline-size: 50rem;
  margin-inline: auto;
  inline-size: 100%;
}

.flex-present-layout .flex-walkthrough-nav {
  border-block-start: none;
  margin-block-start: 0;
}
```

- [ ] **Step 5: Add stylesheet imports**

In `src/entrypoints/app/public/styles.css`, add before the `/* Utility */` comment:

```css
@import "../../../design-system/components/flex-present-layout/styles.css" layer(block);
```

- [ ] **Step 6: Add present mode to walkthrough routes**

In `src/entrypoints/app/routes/catalog/walkthrough.tsx`, add the PresentLayout import:

```typescript
import { PresentLayout } from '../../../../design-system/components/flex-present-layout'
```

Update the page detail handler. Replace the existing `walkthrough.get('/:slug', ...)` handler with a version that checks for `?present`:

After computing `page`, `prevPage`, `nextPage`, and before the sidebar logic, add:

```tsx
const isPresent = c.req.query('present') !== undefined

if (isPresent) {
  const prevUrl = prevPage
    ? resolveUrl(`/catalog/walkthrough/${prevPage.slug}?present`)
    : null
  const nextUrl = nextPage
    ? resolveUrl(`/catalog/walkthrough/${nextPage.slug}?present`)
    : null

  return c.html(
    <PresentLayout
      title={page.title}
      nav={
        <WalkthroughNav
          currentPage={pageIndex + 1}
          totalPages={pages.length}
          prevUrl={prevUrl}
          nextUrl={nextUrl}
        />
      }
    >
      <Prose html={renderMarkdown(page.content)} />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var prev=${prevUrl ? `"${prevUrl}"` : 'null'};
            var next=${nextUrl ? `"${nextUrl}"` : 'null'};
            document.addEventListener('keydown',function(e){
              if(e.key==='ArrowRight'||e.key===' '){if(next){e.preventDefault();location.href=next}}
              if(e.key==='ArrowLeft'){if(prev){e.preventDefault();location.href=prev}}
              if(e.key==='Escape'){location.href='${resolveUrl('/catalog/walkthrough')}'}
            });
            document.querySelectorAll('.prose a').forEach(function(a){
              if(!a.getAttribute('href').startsWith('#'))a.setAttribute('target','_blank')
            });
          }())`,
        }}
      />
    </PresentLayout>,
  )
}
```

Also update the index handler to support present mode. After computing `pages`, `coveredAreas`, `totalMinutes`, and `firstPage`, add:

```tsx
const isPresent = c.req.query('present') !== undefined

if (isPresent) {
  const firstUrl = firstPage
    ? resolveUrl(`/catalog/walkthrough/${firstPage.slug}?present`)
    : null

  return c.html(
    <PresentLayout title="Walkthrough">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center">
        <h1 style="font-size:var(--flex-text-3xl);margin-block-end:var(--flex-space-md)">
          Forms Lab
        </h1>
        <p style="font-size:var(--flex-text-xl);color:var(--flex-color-text-muted);margin-block-end:var(--flex-space-xl)">
          LLM-Assisted Forms Platform for Government
        </p>
        {firstUrl && (
          <a href={firstUrl} class="flex-button" data-size="big">
            Begin →
          </a>
        )}
        <p style="font-size:var(--flex-text-sm);color:var(--flex-color-text-muted);margin-block-start:var(--flex-space-lg)">
          Press → or click to begin
        </p>
      </div>
      {firstUrl && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();location.href='${firstUrl}'}})`,
          }}
        />
      )}
    </PresentLayout>,
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add src/design-system/components/flex-present-layout/ src/entrypoints/app/routes/catalog/walkthrough.tsx src/entrypoints/app/public/styles.css test/catalog-walkthrough.test.ts
git commit -m "feat(walkthrough): add presentation mode with keyboard navigation"
```

---

## Task 6: Remaining Walkthrough Content

**Files:**
- Create: `catalog/walkthrough/02-our-approach.md`
- Create: `catalog/walkthrough/03-llm-assisted-extraction.md`
- Create: `catalog/walkthrough/04-evaluation-and-experimentation.md`
- Create: `catalog/walkthrough/05-production-infrastructure.md`
- Create: `catalog/walkthrough/06-inference-pipeline.md`
- Create: `catalog/walkthrough/07-live-demo.md`
- Create: `catalog/walkthrough/08-whats-next.md`
- Modify: `test/catalog-walkthrough.test.ts`

- [ ] **Step 1: Write failing test for all pages**

Add to `test/catalog-walkthrough.test.ts`:

```typescript
describe('All walkthrough pages render', () => {
  const slugs = [
    '01-the-problem',
    '02-our-approach',
    '03-llm-assisted-extraction',
    '04-evaluation-and-experimentation',
    '05-production-infrastructure',
    '06-inference-pipeline',
    '07-live-demo',
    '08-whats-next',
  ]

  for (const slug of slugs) {
    it(`renders ${slug}`, async () => {
      const res = await app.request(`/catalog/walkthrough/${slug}`)
      expect(res.status).toBe(200)
    })
  }

  it('shows correct total page count in navigation', async () => {
    const res = await app.request('/catalog/walkthrough/01-the-problem')
    const body = await res.text()
    expect(body).toContain('1 of 8')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: FAIL (only page 01 exists, others 404)

- [ ] **Step 3: Create walkthrough page 02**

Create `catalog/walkthrough/02-our-approach.md`:

```markdown
---
title: "Our Approach"
order: 2
rubric: [innovation]
timing: "2 min"
audience: [evaluator, general]
---

# An LLM-Native Forms Platform

Rather than bolting LLM features onto an existing forms product, Forms Lab was designed from the ground up around LLM capabilities.

## The Core Insight

Government forms are structured documents. They encode a **data collection specification** — what information to gather, in what format, under what conditions. An LLM can extract this structure directly from a PDF.

## Architecture

The system separates three concerns:

- **DataCollectionSpec** — What to collect: fields, types, constraints, conditions, sensitivity classifications
- **FormSpec** — How to present it: pages, sections, delivery modes, visual layout
- **Submission** — Collected data, linked to the exact spec version

This separation means the LLM extraction produces a DataCollectionSpec, and the system can generate multiple presentation formats from the same underlying data model.

## What Makes This Different

- **Not just chat**: The LLM does structured extraction, not conversational interaction
- **Systematic evaluation**: Every extraction is scored against ground truth with quantitative metrics
- **Production-grade**: Full deployment pipeline, not a notebook demo
- **Standards-compliant**: Output meets USWDS accessibility and design standards

See: [Architecture](/catalog/architecture) | [Data Model](/catalog/architecture/data-model) | [Design Decisions](/catalog/decisions)
```

- [ ] **Step 4: Create walkthrough page 03**

Create `catalog/walkthrough/03-llm-assisted-extraction.md`:

```markdown
---
title: "LLM-Assisted Extraction"
order: 3
rubric: [model-functionality, innovation]
timing: "3 min"
audience: [evaluator, general]
---

# From PDF to Structured Data

The core LLM integration: given a government PDF form, extract a complete DataCollectionSpec — fields, types, grouping, conditions, and sensitivity classifications.

## How It Works

1. **Upload**: Maya (form creator persona) uploads a PDF form
2. **Extract**: The system sends the PDF to Claude via Amazon Bedrock
3. **Structure**: Claude returns a structured DataCollectionSpec with fields, types, groups, conditions
4. **Review**: Maya reviews the extracted spec in the catalog browser

## The Prompt

The extraction prompt asks Claude to identify:

- **Fields**: Name, label, type (text, number, date, boolean, select), help text
- **Groups**: Logical grouping of related fields (e.g., "Personal Information")
- **Conditions**: When a field should appear based on other field values
- **Sensitivity**: PII classification (name, SSN, address, etc.)

## Strategy Pattern

The extractor uses a strategy pattern (`PdfExtractor` interface) so implementations can be swapped for experimentation:

- `ApiPdfExtractor` — Current implementation using Claude via Bedrock
- Future: alternative models, different prompting strategies, chunking approaches

## Test Form

The primary evaluation form is a 24-page DOJ Pardon Application — a complex, real-world government form with conditional logic, multiple sections, and various field types.

See: [Experiments](/catalog/experiments) | [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs)
```

- [ ] **Step 5: Create walkthrough page 04**

Create `catalog/walkthrough/04-evaluation-and-experimentation.md`:

```markdown
---
title: "Evaluation & Experimentation"
order: 4
rubric: [model-functionality]
timing: "3 min"
audience: [evaluator]
---

# Systematic Model Evaluation

Evaluation is not an afterthought — it is built into the development workflow.

## Evaluation Framework

Every extraction is scored against a manually-created ground truth using quantitative metrics:

| Metric | What It Measures |
|---|---|
| Field Recall | Did we find all the fields? |
| Field Precision | Did we only find real fields (no hallucinations)? |
| Type Accuracy | Did we assign correct types (text, number, date, etc.)? |
| Group Accuracy | Did we group related fields correctly? |
| Sensitivity Accuracy | Did we classify PII correctly? |

## Model Comparison

The evaluation harness runs the same test suite across different models:

| Model | Field Recall | Field Precision | Type Accuracy |
|---|---|---|---|
| Opus (baseline) | 100% | 100% | 100% |
| Sonnet | Evaluated | Evaluated | Evaluated |
| Haiku | Evaluated | Evaluated | Evaluated |

## Scoring Methods

Two complementary approaches:

1. **Deterministic scoring** — Exact fieldName + normalized label match. Fast, reproducible, but undercounts synonyms and naming variations.
2. **LLM-as-Judge** — Uses a separate LLM call to semantically match extracted fields against ground truth. Handles synonyms, prefixes, and structural variations.

The LLM-as-Judge approach itself is a significant LLM integration point — using one model to evaluate another model's output.

See: [Experiment Suite](/catalog/experiments/pdf-field-extraction) | [Evaluation Decisions](/catalog/decisions)
```

- [ ] **Step 6: Create walkthrough page 05**

Create `catalog/walkthrough/05-production-infrastructure.md`:

```markdown
---
title: "Production Infrastructure"
order: 5
rubric: [environment-setup]
timing: "2 min"
audience: [evaluator]
---

# Deployment Architecture

Forms Lab runs in a production environment on AWS, provisioned and managed through infrastructure-as-code.

## Stack

- **Compute**: EC2 instance provisioned via Pulumi (TypeScript)
- **OS**: NixOS — declarative, reproducible system configuration
- **Reverse proxy**: Caddy with automatic TLS
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **LLM API**: Claude via Amazon Bedrock (cross-account SSO)

## Branch-Per-Deployment Model

Every git branch gets its own deployment:

- Push to any branch → GitHub webhook triggers deployment
- Each branch runs as a separate process on an assigned port
- Caddy routes `/<branch>/*` to the correct process
- Push to `main` also restarts the homepage dashboard

This means reviewers can visit any branch's deployment directly by URL.

## Infrastructure as Code

- **Pulumi**: Provisions EC2, security groups, IAM roles
- **NixOS flake**: Defines system packages, services, Caddy config, deploy scripts
- **GitHub webhook**: Receives push events, triggers `deploy.sh`

See: [Deployment Architecture](/catalog/architecture/deployment) | [Infrastructure Decisions](/catalog/decisions/infrastructure)
```

- [ ] **Step 7: Create walkthrough page 06**

Create `catalog/walkthrough/06-inference-pipeline.md`:

```markdown
---
title: "Inference Pipeline"
order: 6
rubric: [inference-pipeline]
timing: "2 min"
audience: [evaluator]
---

# Inference Pipeline Design

The inference pipeline handles communication between the Forms Lab application and Claude via Amazon Bedrock.

## Pipeline Architecture

```
PDF Upload → PdfExtractor (strategy) → Bedrock API → Parse Response → DataCollectionSpec
```

The pipeline follows a strategy pattern:

- **Interface**: `PdfExtractor` defines the extraction contract
- **Implementation**: `ApiPdfExtractor` calls Claude via Bedrock
- **Configuration**: Model ID, sampling parameters, and system prompt are configurable

## Bedrock Integration

- **Service**: Amazon Bedrock (managed LLM inference)
- **Authentication**: Cross-account SSO via AWS IAM roles
- **Models available**: Claude Opus, Sonnet, Haiku — all accessible through the same endpoint
- **Region**: us-east-1

## Sampling and Parameters

The extraction prompt uses structured output to ensure reliable JSON parsing:

- **Temperature**: Low (precise extraction, not creative generation)
- **Max tokens**: Scaled to form complexity
- **System prompt**: Defines the extraction schema and domain rules

## Error Handling

- Bedrock API errors are caught and surfaced to the user
- Malformed extraction results are validated against the DataCollectionSpec schema
- Extraction confidence is tracked per-field for review

See: [Story #3](/catalog/stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs) | [Extraction Experiments](/catalog/experiments/pdf-field-extraction)
```

- [ ] **Step 8: Create walkthrough page 07**

Create `catalog/walkthrough/07-live-demo.md`:

```markdown
---
title: "Live Demo"
order: 7
rubric: [demo-presentation]
timing: "2 min"
audience: [evaluator, general]
---

# See It In Action

Forms Lab is a working application. Here are the key paths to explore:

## Upload and Extract

1. [Sign in](/auth/signin) with GitHub
2. Navigate to [Projects](/projects)
3. Upload a PDF form
4. Watch the LLM extract a structured DataCollectionSpec
5. Review the extracted fields, types, groups, and conditions

## Fill a Form

1. Visit the [Forms](/forms) index
2. Select an available form
3. Walk through the multi-page form experience
4. See conditional fields appear based on your answers
5. Review your submission on the summary page

## Explore the Catalog

The [Catalog](/catalog) is the project's self-documenting system:

- [Personas](/catalog/personas) — Who the system serves
- [Architecture](/catalog/architecture) — How it's built
- [Decisions](/catalog/decisions) — Why we made each choice
- [Experiments](/catalog/experiments) — What we tested and learned
- [Design System](/catalog/design-system) — Visual language and components

## Deployment Dashboard

The [Homepage](/) shows all active deployments with health status, branch names, and commit hashes.
```

- [ ] **Step 9: Create walkthrough page 08**

Create `catalog/walkthrough/08-whats-next.md`:

```markdown
---
title: "What's Next"
order: 8
rubric: []
timing: "1 min"
audience: [evaluator, general]
---

# What's Next

Forms Lab demonstrates the foundation. Here's where it goes from here:

## Planned Capabilities

- **Conversational form filling** — Carlos completes complex sections through dialogue with an LLM agent (Story #9)
- **LLM-assisted refinement** — Maya uses conversation to iteratively improve the data model (Story #8)
- **Advanced evaluation** — LLM-as-Judge scoring for richer, semantic evaluation of extraction quality
- **Form shaping** — Maya customizes delivery modes, page flow, and visual presentation (Story #4)
- **PDF generation** — Complete the round-trip: PDF in, web form, PDF out with filled data (Story #7)

## Open Questions

- How well does extraction generalize across form types (tax forms, benefit applications, regulatory filings)?
- What's the right balance between automatic extraction and human refinement?
- Can the evaluation framework itself be used to improve extraction prompts automatically?

## The Bigger Picture

Government forms represent one of the highest-volume, highest-impact touchpoints between agencies and the public. Making these forms easier to create, more accessible to fill out, and more reliable to process is a meaningful application of LLM technology.

See: [All Stories](/catalog/stories) | [Architecture](/catalog/architecture/system-overview)
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `bun test test/catalog-walkthrough.test.ts`
Expected: All PASS

- [ ] **Step 11: Run full test suite**

Run: `bun test`
Expected: All PASS

- [ ] **Step 12: Commit**

```bash
git add catalog/walkthrough/ test/catalog-walkthrough.test.ts
git commit -m "feat(walkthrough): add initial walkthrough content covering project to date"
```

---

## Task 7: Final Verification and Cleanup

**Files:**
- Possibly modify: any files with issues found during verification

- [ ] **Step 1: Run full checks**

Run: `bun run check`
Expected: Lint, type check, and all tests pass

- [ ] **Step 2: Start dev server and verify in browser**

Run: `bun run dev`

Verify manually:
1. Visit `/catalog` — walkthrough card appears in landing page
2. Visit `/catalog/walkthrough` — index shows all 8 sections, rubric coverage, total timing
3. Click "Start walkthrough" — navigates to page 1
4. Click through all pages using prev/next navigation
5. Verify progress indicator updates ("1 of 8", "2 of 8", etc.)
6. Verify sidebar shows all walkthrough pages with current page highlighted
7. Visit `/catalog/walkthrough?present` — title slide with "Begin →" button
8. Click through all pages in present mode — no header, footer, or sidebar
9. Test keyboard navigation: → advances, ← goes back, Escape exits to index
10. Verify links in present mode open in new tabs
11. Verify breadcrumbs work in normal mode

- [ ] **Step 3: Fix any issues found**

Address any visual, functional, or accessibility issues discovered during browser testing.

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix(walkthrough): address issues from browser verification"
```

- [ ] **Step 5: Run checks one final time**

Run: `bun run check`
Expected: All pass
