# Slice 0 PR 1: Complete Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the forms-lab skeleton into a complete application with design system, all catalog content types, CLI with story sync, ADRs, and meta-knowledge-base integration.

**Architecture:** Hono on Bun, server-rendered JSX. Design system uses two-tier CSS tokens ported from class repo with cascade layers. Catalog routes per content type read markdown files from disk. CLI dispatcher with commands in `src/commands/`. GitHub API client for story sync uses raw `fetch` with interface for testing.

**Tech Stack:** Bun 1.x, Hono 4.x, TypeScript 5.x, markdown-it, stylelint, Biome

**Target Repository:** `/home/daniel/src/forms-lab` on branch `slice-0/skeleton`

**Existing Code:** Server with health check and root page, data model types, 5 persona markdown files, single catalog route file for personas, Layout component with inline CSS, markdown reader utility, tests for server and catalog personas, CI workflow, CLAUDE.md, README.

---

## File Structure

**New files to create:**

```
src/
├── cli.ts                          # CLI dispatcher entry point
├── commands/
│   └── sync-stories.ts             # sync-stories command
├── services/
│   └── github.ts                   # GitHub API client interface + implementation
├── routes/catalog/
│   ├── index.tsx                   # /catalog landing page
│   ├── personas.tsx                # /catalog/personas/* (extracted from existing)
│   ├── decisions.tsx               # /catalog/decisions/*
│   ├── architecture.tsx            # /catalog/architecture/*
│   ├── stories.tsx                 # /catalog/stories/*
│   └── experiments.tsx             # /catalog/experiments/*
├── components/
│   ├── StatusBadge.tsx             # lifecycle status badge
│   ├── ContentCard.tsx             # reusable listing card
│   ├── TagList.tsx                 # tag array display
│   └── Prose.tsx                   # markdown HTML wrapper
├── public/
│   ├── styles.css                  # master cascade layers
│   ├── tokens.css                  # two-tier token architecture
│   ├── reset.css                   # browser normalization
│   ├── base.css                    # base element + class styles
│   ├── font-normalize.css          # font optical sizing
│   ├── compositions.css            # layout primitives
│   ├── utilities.css               # utility classes
│   └── components/
│       ├── nav.css                 # header/navigation
│       ├── badge.css               # status badges and tags
│       ├── card.css                # content cards
│       └── prose.css               # markdown/prose typography
```

```
catalog/
├── decisions/
│   ├── architecture/
│   │   ├── hono-on-bun.md
│   │   ├── git-as-persistence.md
│   │   └── github-issues-for-stories.md
│   ├── infrastructure/
│   │   ├── ec2-with-pulumi.md
│   │   ├── caddy-reverse-proxy.md
│   │   ├── subpath-routing.md
│   │   ├── nix-built-processes.md
│   │   └── github-webhook-deploys.md
│   └── design-system/
│       ├── selective-uswds-adoption.md
│       ├── two-tier-token-architecture.md
│       ├── cascade-layers.md
│       ├── css-build-and-delivery.md
│       └── markdown-rendering.md
├── architecture/
│   ├── system-overview.md
│   └── data-model.md
```

```
test/
├── catalog-decisions.test.ts       # decision route tests
├── catalog-architecture.test.ts    # architecture route tests
├── catalog-stories.test.ts         # story route tests
├── catalog-landing.test.ts         # landing page tests
├── cli.test.ts                     # CLI dispatcher tests
├── sync-stories.test.ts            # sync command tests
└── markdown.test.ts                # markdown parsing tests
```

```
(root)
├── knowledge-base.yaml
├── .stylelintrc.json
├── notes/
│   └── 2026-04-07-bootstrapping.md
```

**Files to modify:**

- `src/server.ts` — add serveStatic, mount new catalog routes, add CSS build route for dev
- `src/components/Layout.tsx` — replace inline CSS with design system classes
- `src/lib/markdown.ts` — add markdown-it rendering function
- `src/types/models.ts` — add types for Decision, ArchitectureDoc, Story, Experiment
- `test/catalog.test.ts` — rename to catalog-personas.test.ts, update for new route mount
- `package.json` — add dependencies and scripts
- `biome.json` — ignore dist/ and CSS files
- `.gitignore` — add dist/
- `CLAUDE.md` — update with new commands and conventions

**Files to delete:**

- `src/routes/catalog.tsx` — replaced by `src/routes/catalog/` directory

---

### Task 1: Add Dependencies and Configuration

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `biome.json`
- Create: `.stylelintrc.json`

- [ ] **Step 1: Add new dependencies**

```bash
cd /home/daniel/src/forms-lab && bun add markdown-it && bun add -d @types/markdown-it stylelint stylelint-config-standard stylelint-declaration-strict-value
```

Expected: Dependencies installed, bun.lock updated

- [ ] **Step 2: Add scripts to package.json**

In `/home/daniel/src/forms-lab/package.json`, add to the `"scripts"` object:

```json
"cli": "bun run src/cli.ts",
"build:css": "bun run scripts/build-css.ts",
"lint:css": "bunx stylelint 'src/public/**/*.css'"
```

Expected: Three new scripts added

- [ ] **Step 3: Create CSS build script**

Create `/home/daniel/src/forms-lab/scripts/build-css.ts`:

```typescript
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const entrypoint = resolve(import.meta.dir, '../src/public/styles.css')
const outdir = resolve(import.meta.dir, '../dist')

await mkdir(outdir, { recursive: true })

const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  naming: 'styles.css',
  minify: false,
})

if (!result.success) {
  console.error('CSS build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('CSS built to dist/styles.css')
```

Expected: File created

- [ ] **Step 4: Add dist/ to .gitignore**

Append to `/home/daniel/src/forms-lab/.gitignore`:

```
# Build output
dist/
```

Expected: dist/ ignored

- [ ] **Step 5: Create .stylelintrc.json**

Create `/home/daniel/src/forms-lab/.stylelintrc.json`:

```json
{
  "extends": ["stylelint-config-standard"],
  "ignoreFiles": ["src/public/font-normalize.css", "dist/**"],
  "plugins": ["stylelint-declaration-strict-value"],
  "rules": {
    "scale-unlimited/declaration-strict-value": [
      [
        "/color$/", "background", "background-color", "border-color", "outline-color",
        "font-family",
        "font-size"
      ],
      {
        "ignoreValues": [
          "inherit", "initial", "transparent", "currentColor", "none", "white",
          "/^var\\(/", "/^color-mix\\(/", "0", "50%",
          "/^\\d+(\\.\\d+)?em$/",
          "/^local\\(/", "/^\\d+(\\.\\d+)?%$/"
        ],
        "disableFix": true,
        "message": "Use a design token (--flex-*, --font-*, --text-*) instead of a hard-coded value"
      }
    ],
    "at-rule-no-unknown": [true, {
      "ignoreAtRules": ["layer", "property"]
    }],
    "import-notation": null,
    "no-descending-specificity": null,
    "custom-property-no-missing-var-function": true
  }
}
```

Expected: stylelint configured

- [ ] **Step 6: Update biome.json to ignore CSS and dist**

In `/home/daniel/src/forms-lab/biome.json`, add a `"files"` section after `"$schema"`:

```json
"files": {
  "ignore": ["dist/**", "*.css"]
},
```

Expected: Biome won't lint CSS files or dist/

- [ ] **Step 7: Commit**

```bash
cd /home/daniel/src/forms-lab
git add package.json bun.lock .gitignore .stylelintrc.json biome.json scripts/build-css.ts
git commit -m "chore: add dependencies and build configuration

- Add markdown-it for markdown rendering
- Add stylelint with token enforcement rules
- Add CSS build script using Bun.build()
- Add CLI and lint:css scripts to package.json
- Configure Biome to ignore CSS and dist/"
```

Expected: Committed

---

### Task 2: Port Design System CSS Foundation

**Files:**
- Create: `src/public/styles.css`
- Create: `src/public/tokens.css`
- Create: `src/public/reset.css`
- Create: `src/public/base.css`
- Create: `src/public/font-normalize.css`
- Create: `src/public/compositions.css`
- Create: `src/public/utilities.css`

**Note to implementer:** The CSS files below are ported from `/home/daniel/src/llm-class-2026-winter-cohort/web/src/public/`. The tokens.css file is ~84KB and should be copied in full from that source. The other files are shown here with the exact content needed.

- [ ] **Step 1: Create master styles.css with cascade layers**

Create `/home/daniel/src/forms-lab/src/public/styles.css`:

```css
/* Cascade layer order — specificity is controlled by declaration order here */
@layer reset, tokens, composition, base, block, utility;

/* Reset */
@import './reset.css' layer(reset);
@import './font-normalize.css' layer(reset);

/* Tokens */
@import './tokens.css' layer(tokens);

/* Compositions */
@import './compositions.css' layer(composition);

/* Base */
@import './base.css' layer(base);

/* Block — component styles */
@import './components/nav.css' layer(block);
@import './components/badge.css' layer(block);
@import './components/card.css' layer(block);
@import './components/prose.css' layer(block);

/* Utility */
@import './utilities.css' layer(utility);
```

Expected: Master CSS file created

- [ ] **Step 2: Copy tokens.css from class repo**

```bash
cp /home/daniel/src/llm-class-2026-winter-cohort/web/src/public/tokens.css /home/daniel/src/forms-lab/src/public/tokens.css
```

Expected: Full two-tier token file copied (~84KB)

- [ ] **Step 3: Create reset.css**

Create `/home/daniel/src/forms-lab/src/public/reset.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}
```

Expected: Reset file created

- [ ] **Step 4: Create font-normalize.css**

Create `/home/daniel/src/forms-lab/src/public/font-normalize.css`:

```css
/* Optical sizing normalization via @font-face size-adjust */
/* Formula: size-adjust = (base-cap-height / font-cap-height) * 100% */
/* Base cap height: 362px (USWDS reference) */

@font-face {
  font-family: 'Source Sans Pro Normalized';
  src: local('Source Sans 3'), local('Source Sans Pro');
  size-adjust: 106.47%; /* cap height 340px */
}

@font-face {
  font-family: 'Source Sans Pro Normalized';
  src: local('Source Sans 3'), local('Source Sans Pro');
  font-weight: bold;
  size-adjust: 106.47%;
}
```

Expected: Font normalization file created

- [ ] **Step 5: Create base.css**

Create `/home/daniel/src/forms-lab/src/public/base.css`:

```css
:root {
  color-scheme: light dark;
}

body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-base);
  color: var(--flex-color-text);
  background: var(--flex-color-bg);
}

main {
  flex: 1;
}

h1,
h2,
h3 {
  font-weight: 600;
}

h2 {
  font-size: 1.2em;
}

h3 {
  font-size: 1em;
}

:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Base classes */
.flex-control,
.flex-input,
.flex-select,
.flex-textarea {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-base);
  color: var(--flex-color-text);
  border: var(--flex-control-border);
  padding: var(--flex-control-padding);
  max-width: var(--flex-control-max-width);
  width: 100%;
  border-radius: var(--flex-radius-sm);
  background: var(--flex-color-surface);
}

.flex-control:focus-visible,
.flex-input:focus-visible,
.flex-select:focus-visible,
.flex-textarea:focus-visible {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

.flex-control:disabled,
.flex-input:disabled,
.flex-select:disabled,
.flex-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flex-label {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-base);
  font-weight: 600;
  line-height: 1.3;
  color: var(--flex-color-text);
}

.flex-error-message {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-sm);
  color: var(--flex-color-error);
  font-weight: 600;
}
```

Expected: Base styles created

- [ ] **Step 6: Create compositions.css**

Create `/home/daniel/src/forms-lab/src/public/compositions.css`:

```css
.l-stack {
  display: flex;
  flex-direction: column;
  gap: var(--stack-space, var(--flex-space-md));
}

.l-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cluster-space, var(--flex-space-sm));
  align-items: center;
}

.l-center {
  max-width: 960px;
  margin-inline: auto;
  padding-inline: var(--flex-space-md);
  padding-block: var(--flex-space-lg);
}

.l-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--flex-space-lg);
}

.l-sidebar > :first-child {
  flex-basis: 20rem;
  flex-grow: 1;
}

.l-sidebar > :last-child {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: 50%;
}

.l-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(var(--grid-min, 250px), 100%), 1fr));
  gap: var(--grid-space, var(--flex-space-md));
}
```

Expected: Composition primitives created

- [ ] **Step 7: Create utilities.css**

Create `/home/daniel/src/forms-lab/src/public/utilities.css`:

```css
.u-visually-hidden {
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.u-text-muted {
  color: var(--flex-color-text-muted);
}

.flex-mono {
  font-family: var(--flex-font-mono);
  font-size: var(--flex-text-xs);
  color: var(--flex-color-text-muted);
}

.flex-empty {
  color: var(--flex-color-text-muted);
  font-style: italic;
}
```

Expected: Utilities created

- [ ] **Step 8: Create component CSS files**

Create `/home/daniel/src/forms-lab/src/public/components/nav.css`:

```css
.site-header {
  background: var(--flex-color-surface);
  border-bottom: 1px solid var(--flex-color-border);
  padding: var(--flex-space-md) var(--flex-space-lg);
}

.site-header h1 {
  font-family: var(--flex-font-sans);
  font-size: 1.5em;
  font-weight: 700;
  color: var(--flex-color-text);
}

.site-header p {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-sm);
  color: var(--flex-color-text-muted);
}

.site-nav {
  display: flex;
  gap: var(--flex-space-md);
  margin-top: var(--flex-space-sm);
}

.site-nav a {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-base);
  color: var(--flex-color-accent);
  text-decoration: none;
  font-weight: 500;
}

.site-nav a:hover {
  text-decoration: underline;
}
```

Create `/home/daniel/src/forms-lab/src/public/components/badge.css`:

```css
.badge {
  display: inline-block;
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-tag);
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: var(--flex-radius-bubble);
  line-height: 1.4;
}

.badge[data-status="draft"] {
  background: var(--flex-color-warning-lighter);
  color: var(--flex-color-text);
}

.badge[data-status="working"] {
  background: var(--flex-color-info-lighter);
  color: var(--flex-color-text);
}

.badge[data-status="stable"] {
  background: var(--flex-color-success-lighter);
  color: var(--flex-color-text);
}

.badge[data-status="deprecated"] {
  background: var(--flex-color-error-lighter);
  color: var(--flex-color-text);
}

.badge[data-variant="tag"] {
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-border);
  color: var(--flex-color-text-muted);
  font-weight: 400;
}

.badge[data-variant="milestone"] {
  background: var(--flex-color-info-lighter);
  color: var(--flex-color-text);
  font-weight: 500;
}

.badge[data-state="open"] {
  background: var(--flex-color-success-lighter);
  color: var(--flex-color-text);
}

.badge[data-state="closed"] {
  background: var(--flex-color-error-lighter);
  color: var(--flex-color-text);
}
```

Create `/home/daniel/src/forms-lab/src/public/components/card.css`:

```css
.content-card {
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-border);
  border-radius: var(--flex-radius-md);
  padding: var(--flex-space-lg);
}

.content-card h2 {
  font-family: var(--flex-font-sans);
  font-size: 1.1em;
  font-weight: 600;
  color: var(--flex-color-text);
  margin-bottom: var(--flex-space-xs);
}

.content-card h2 a {
  color: var(--flex-color-accent);
  text-decoration: none;
}

.content-card h2 a:hover {
  text-decoration: underline;
}

.content-card p {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-base);
  color: var(--flex-color-text-muted);
  line-height: 1.5;
}

.content-card .card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--flex-space-xs);
  margin-top: var(--flex-space-sm);
}
```

Create `/home/daniel/src/forms-lab/src/public/components/prose.css`:

```css
.prose {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-base);
  color: var(--flex-color-text);
  line-height: 1.6;
}

.prose h1 {
  font-size: 1.5em;
  font-weight: 700;
  margin-top: var(--flex-space-xl);
  margin-bottom: var(--flex-space-md);
}

.prose h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: var(--flex-space-lg);
  margin-bottom: var(--flex-space-sm);
}

.prose h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin-top: var(--flex-space-lg);
  margin-bottom: var(--flex-space-sm);
}

.prose p {
  margin-bottom: var(--flex-space-md);
}

.prose ul,
.prose ol {
  margin-left: var(--flex-space-lg);
  margin-bottom: var(--flex-space-md);
}

.prose li {
  margin-bottom: var(--flex-space-xs);
}

.prose code {
  font-family: var(--flex-font-mono);
  font-size: var(--flex-text-sm);
  background: var(--flex-color-bg);
  padding: 0.125rem 0.375rem;
  border-radius: var(--flex-radius-sm);
}

.prose pre {
  background: var(--flex-color-bg);
  padding: var(--flex-space-md);
  border-radius: var(--flex-radius-md);
  overflow-x: auto;
  margin-bottom: var(--flex-space-md);
}

.prose pre code {
  background: none;
  padding: 0;
}

.prose a {
  color: var(--flex-color-accent);
  text-decoration: none;
}

.prose a:hover {
  text-decoration: underline;
}

.prose strong {
  font-weight: 600;
}

.prose hr {
  border: none;
  border-top: 1px solid var(--flex-color-border);
  margin: var(--flex-space-lg) 0;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--flex-space-md);
}

.prose th {
  background: var(--flex-color-table-header);
  font-weight: 600;
  text-align: left;
  padding: var(--flex-space-sm);
  border: 1px solid var(--flex-color-border);
}

.prose td {
  padding: var(--flex-space-sm);
  border: 1px solid var(--flex-color-border);
}
```

Expected: Four component CSS files created

- [ ] **Step 9: Verify CSS build**

```bash
cd /home/daniel/src/forms-lab && mkdir -p src/public/components && bun run build:css
```

Expected: `dist/styles.css` created successfully

- [ ] **Step 10: Verify stylelint**

```bash
cd /home/daniel/src/forms-lab && bun run lint:css
```

Expected: No errors (all values use tokens or allowed exceptions)

- [ ] **Step 11: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/public/ dist/
git add -f src/public/tokens.css
git commit -m "feat: port design system CSS foundation from class repo

- Two-tier token architecture (palette + semantic) from USWDS 3.13
- Cascade layers: reset → tokens → composition → base → block → utility
- Layout compositions: l-stack, l-cluster, l-center, l-sidebar, l-grid
- Component CSS: nav, badge, card, prose
- Dark mode support via semantic token overrides
- Font normalization for Source Sans Pro"
```

Expected: Committed

---

### Task 3: Add Markdown Rendering and Update Types

**Files:**
- Modify: `src/lib/markdown.ts`
- Modify: `src/types/models.ts`
- Create: `test/markdown.test.ts`

- [ ] **Step 1: Write failing tests for markdown rendering**

Create `/home/daniel/src/forms-lab/test/markdown.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { parseMarkdown, readMarkdownDir, renderMarkdown } from '../src/lib/markdown'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('# Hello\n\nA paragraph.')
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('<p>A paragraph.</p>')
  })

  it('does not pass through raw HTML', () => {
    const html = renderMarkdown('<script>alert("xss")</script>')
    expect(html).not.toContain('<script>')
  })

  it('renders GFM-style tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })
})

describe('parseMarkdown', () => {
  it('strips surrounding quotes from frontmatter values', async () => {
    const dir = join(import.meta.dir, '__fixtures__')
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'quoted.md')
    await writeFile(file, '---\nrole: "Form Creator (Program Officer)"\n---\n\nContent here.')

    const result = await parseMarkdown(file)
    expect(result.frontmatter.role).toBe('Form Creator (Program Officer)')

    await rm(dir, { recursive: true })
  })

  it('returns empty frontmatter when none present', async () => {
    const dir = join(import.meta.dir, '__fixtures__')
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'no-frontmatter.md')
    await writeFile(file, '# Just Content\n\nNo frontmatter.')

    const result = await parseMarkdown(file)
    expect(result.frontmatter).toEqual({})
    expect(result.content).toContain('Just Content')

    await rm(dir, { recursive: true })
  })
})
```

Expected: Test file created

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab && bun test test/markdown.test.ts
```

Expected: FAIL — `renderMarkdown` is not exported

- [ ] **Step 3: Add renderMarkdown to markdown.ts**

Add to the end of `/home/daniel/src/forms-lab/src/lib/markdown.ts`:

```typescript
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

/**
 * Render markdown string to HTML
 */
export function renderMarkdown(input: string): string {
  return md.render(input)
}
```

Also update the import at the top of the file — add `MarkdownIt` import (already shown above; the existing imports for `readdir`, `readFile`, `join` stay as-is).

Expected: renderMarkdown function added

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab && bun test test/markdown.test.ts
```

Expected: PASS — all markdown tests pass

- [ ] **Step 5: Add catalog content types to models.ts**

Add to the end of `/home/daniel/src/forms-lab/src/types/models.ts`:

```typescript
/**
 * Decision - Architectural decision record
 */
export interface Decision {
  slug: string
  group: string
  title: string
  status: string
  tags: string[]
  decided: string
  content: string
}

/**
 * ArchitectureDoc - System architecture documentation
 */
export interface ArchitectureDoc {
  slug: string
  title: string
  status: string
  tags: string[]
  content: string
}

/**
 * Story - User story synced from GitHub Issues
 */
export interface Story {
  slug: string
  issue: number
  title: string
  milestone: string
  labels: string[]
  state: string
  syncedAt: string
  content: string
}
```

Expected: New types added

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/lib/markdown.ts src/types/models.ts test/markdown.test.ts
git commit -m "feat: add markdown-it rendering and catalog content types

- Add renderMarkdown() using markdown-it with HTML disabled
- Add Decision, ArchitectureDoc, Story types
- Tests for rendering, HTML safety, frontmatter parsing"
```

Expected: Committed

---

### Task 4: Shared Components

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/ContentCard.tsx`
- Create: `src/components/TagList.tsx`
- Create: `src/components/Prose.tsx`

- [ ] **Step 1: Create StatusBadge component**

Create `/home/daniel/src/forms-lab/src/components/StatusBadge.tsx`:

```tsx
import type { FC } from 'hono/jsx'

interface StatusBadgeProps {
  status: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  return <span class="badge" data-status={status}>{status}</span>
}
```

Expected: File created

- [ ] **Step 2: Create TagList component**

Create `/home/daniel/src/forms-lab/src/components/TagList.tsx`:

```tsx
import type { FC } from 'hono/jsx'

interface TagListProps {
  tags: string[]
  variant?: string
}

export const TagList: FC<TagListProps> = ({ tags, variant = 'tag' }) => {
  if (tags.length === 0) return null
  return (
    <div class="l-cluster">
      {tags.map((tag) => (
        <span key={tag} class="badge" data-variant={variant}>
          {tag}
        </span>
      ))}
    </div>
  )
}
```

Expected: File created

- [ ] **Step 3: Create ContentCard component**

Create `/home/daniel/src/forms-lab/src/components/ContentCard.tsx`:

```tsx
import type { FC } from 'hono/jsx'

interface ContentCardProps {
  title: string
  href: string
  description?: string
  metadata?: { label: string; value: string }[]
  children?: any
}

export const ContentCard: FC<ContentCardProps> = ({
  title,
  href,
  description,
  children,
}) => {
  return (
    <div class="content-card">
      <h2>
        <a href={href}>{title}</a>
      </h2>
      {description && <p>{description}</p>}
      {children && <div class="card-meta">{children}</div>}
    </div>
  )
}
```

Expected: File created

- [ ] **Step 4: Create Prose component**

Create `/home/daniel/src/forms-lab/src/components/Prose.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import { renderMarkdown } from '../lib/markdown'

interface ProseProps {
  content: string
}

export const Prose: FC<ProseProps> = ({ content }) => {
  const html = renderMarkdown(content)
  return <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
```

Expected: File created

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/components/StatusBadge.tsx src/components/ContentCard.tsx src/components/TagList.tsx src/components/Prose.tsx
git commit -m "feat: add shared catalog components

- StatusBadge: lifecycle status display (draft/working/stable/deprecated)
- TagList: tag array rendered as badges
- ContentCard: reusable card for listing content types
- Prose: markdown rendering wrapper using markdown-it"
```

Expected: Committed

---

### Task 5: Update Layout and Server for Design System

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/server.ts`

- [ ] **Step 1: Rewrite Layout.tsx to use design system classes**

Replace the entire contents of `/home/daniel/src/forms-lab/src/components/Layout.tsx` with:

```tsx
import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const title = props.title ? `${props.title} | Forms Lab` : 'Forms Lab'

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <header class="site-header">
          <h1>Forms Lab</h1>
          <p>LLM-Assisted Forms Platform</p>
          <nav class="site-nav">
            <a href="/">Home</a>
            <a href="/catalog">Catalog</a>
            <a href="/catalog/personas">Personas</a>
            <a href="/catalog/decisions">Decisions</a>
            <a href="/catalog/architecture">Architecture</a>
            <a href="/catalog/stories">Stories</a>
          </nav>
        </header>
        <main class="l-center">
          <div class="l-stack">{props.children}</div>
        </main>
      </body>
    </html>
  )
}
```

Expected: Layout uses design system CSS classes instead of inline styles

- [ ] **Step 2: Update server.ts with serveStatic and new route mounting**

Replace the entire contents of `/home/daniel/src/forms-lab/src/server.ts` with:

```typescript
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import catalog from './routes/catalog/index'

const app = new Hono()

// Static assets (CSS build output)
app.use('/static/*', serveStatic({ root: './dist', rewriteRequestPath: (path) => path.replace('/static', '') }))

// Mount catalog routes
app.route('/catalog', catalog)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Root page
app.get('/', (c) => {
  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forms Lab</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <header class="site-header">
    <h1>Forms Lab</h1>
    <p>LLM-Assisted Forms Platform</p>
    <nav class="site-nav">
      <a href="/catalog">Catalog</a>
    </nav>
  </header>
  <main class="l-center">
    <div class="l-stack">
      <p>LLM-Assisted Forms Platform for government forms.</p>
    </div>
  </main>
</body>
</html>`,
  )
})

// Start server when run directly
if (import.meta.main) {
  // Build CSS on startup in dev mode
  await Bun.build({
    entrypoints: ['./src/public/styles.css'],
    outdir: './dist',
    naming: 'styles.css',
    minify: false,
  })

  Bun.serve({
    port: process.env.PORT || 3000,
    fetch: app.fetch,
  })
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`)
}

export default app
```

Expected: Server updated with serveStatic and CSS build on startup

- [ ] **Step 3: Do NOT commit yet** — Task 6 creates the catalog route files that server.ts imports. Commit after Task 6.

---

### Task 6: Split Catalog Routes by Content Type

**Files:**
- Delete: `src/routes/catalog.tsx`
- Create: `src/routes/catalog/index.tsx`
- Create: `src/routes/catalog/personas.tsx`
- Create: `src/routes/catalog/decisions.tsx`
- Create: `src/routes/catalog/architecture.tsx`
- Create: `src/routes/catalog/stories.tsx`
- Create: `src/routes/catalog/experiments.tsx`

- [ ] **Step 1: Create catalog index (landing page + router)**

Create `/home/daniel/src/forms-lab/src/routes/catalog/index.tsx`:

```tsx
import { Hono } from 'hono'
import { join } from 'node:path'
import { Layout } from '../../components/Layout'
import { readMarkdownDir } from '../../lib/markdown'
import personas from './personas'
import decisions from './decisions'
import architecture from './architecture'
import stories from './stories'
import experiments from './experiments'

const catalog = new Hono()

// Mount sub-routes
catalog.route('/personas', personas)
catalog.route('/decisions', decisions)
catalog.route('/architecture', architecture)
catalog.route('/stories', stories)
catalog.route('/experiments', experiments)

// Catalog landing page
catalog.get('/', async (c) => {
  const catalogDir = join(process.cwd(), 'catalog')

  const [personaFiles, storyFiles, architectureFiles] = await Promise.all([
    readMarkdownDir(join(catalogDir, 'personas')).catch(() => []),
    readMarkdownDir(join(catalogDir, 'stories')).catch(() => []),
    readMarkdownDir(join(catalogDir, 'architecture')).catch(() => []),
  ])

  // Count decisions across subdirectories
  const { readdir } = await import('node:fs/promises')
  let decisionCount = 0
  try {
    const groups = await readdir(join(catalogDir, 'decisions'), { withFileTypes: true })
    for (const group of groups) {
      if (group.isDirectory()) {
        const files = await readMarkdownDir(join(catalogDir, 'decisions', group.name))
        decisionCount += files.length
      }
    }
  } catch {
    // decisions directory may not exist yet
  }

  return c.html(
    <Layout title="Catalog">
      <h1>Catalog</h1>
      <p>
        The catalog is the system's self-documentation: personas, stories,
        architecture, decisions, and experiments.
      </p>
      <div class="l-grid">
        <div class="content-card">
          <h2><a href="/catalog/personas">Personas</a></h2>
          <p>{personaFiles.length} personas</p>
        </div>
        <div class="content-card">
          <h2><a href="/catalog/decisions">Decisions</a></h2>
          <p>{decisionCount} decisions</p>
        </div>
        <div class="content-card">
          <h2><a href="/catalog/architecture">Architecture</a></h2>
          <p>{architectureFiles.length} documents</p>
        </div>
        <div class="content-card">
          <h2><a href="/catalog/stories">Stories</a></h2>
          <p>{storyFiles.length} stories</p>
        </div>
        <div class="content-card">
          <h2><a href="/catalog/experiments">Experiments</a></h2>
          <p>Coming soon</p>
        </div>
      </div>
    </Layout>,
  )
})

export default catalog
```

Expected: Catalog landing page and router created

- [ ] **Step 2: Create personas route**

Create `/home/daniel/src/forms-lab/src/routes/catalog/personas.tsx`:

```tsx
import { Hono } from 'hono'
import { join } from 'node:path'
import { Layout } from '../../components/Layout'
import { ContentCard } from '../../components/ContentCard'
import { Prose } from '../../components/Prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'

const personas = new Hono()

personas.get('/', async (c) => {
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const files = await readMarkdownDir(personasDir)

  return c.html(
    <Layout title="Personas">
      <h1>Personas</h1>
      <p>
        Five personas span the full lifecycle of the Forms Lab platform: create
        → fill → operate → build → evaluate.
      </p>
      <div class="l-stack">
        {files.map((file) => (
          <ContentCard
            key={file.filename}
            title={file.frontmatter.name || file.filename}
            href={`/catalog/personas/${file.frontmatter.id || file.filename}`}
            description={file.frontmatter.role || ''}
          />
        ))}
      </div>
    </Layout>,
  )
})

personas.get('/:id', async (c) => {
  const id = c.req.param('id')
  const filePath = join(process.cwd(), 'catalog', 'personas', `${id}.md`)

  try {
    const file = await parseMarkdown(filePath)
    const name = file.frontmatter.name || id

    return c.html(
      <Layout title={name}>
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Persona Not Found</h1>
        <p>The persona "{id}" does not exist.</p>
        <p>
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default personas
```

Expected: Personas route extracted and updated

- [ ] **Step 3: Create decisions route**

Create `/home/daniel/src/forms-lab/src/routes/catalog/decisions.tsx`:

```tsx
import { Hono } from 'hono'
import { join } from 'node:path'
import { readdir } from 'node:fs/promises'
import { Layout } from '../../components/Layout'
import { ContentCard } from '../../components/ContentCard'
import { StatusBadge } from '../../components/StatusBadge'
import { TagList } from '../../components/TagList'
import { Prose } from '../../components/Prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'
import type { Decision } from '../../types/models'

const decisions = new Hono()

async function loadDecisions(): Promise<Record<string, Decision[]>> {
  const decisionsDir = join(process.cwd(), 'catalog', 'decisions')
  const groups: Record<string, Decision[]> = {}

  try {
    const entries = await readdir(decisionsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const files = await readMarkdownDir(join(decisionsDir, entry.name))
      groups[entry.name] = files.map((file) => ({
        slug: file.filename,
        group: entry.name,
        title: file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename,
        status: file.frontmatter.status || 'draft',
        tags: file.frontmatter.tags?.split(',').map((t: string) => t.trim().replace(/[\[\]]/g, '')) || [],
        decided: file.frontmatter.decided || '',
        content: file.content,
      }))
    }
  } catch {
    // decisions directory may not exist
  }

  return groups
}

decisions.get('/', async (c) => {
  const groups = await loadDecisions()

  return c.html(
    <Layout title="Decisions">
      <h1>Architectural Decisions</h1>
      <p>
        Decisions document what we chose, why, and what alternatives we
        considered. Organized by domain.
      </p>
      <div class="l-stack">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <h2>{group}</h2>
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              {items.map((decision) => (
                <ContentCard
                  key={decision.slug}
                  title={decision.title}
                  href={`/catalog/decisions/${decision.group}/${decision.slug}`}
                >
                  <StatusBadge status={decision.status} />
                  <TagList tags={decision.tags} />
                </ContentCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>,
  )
})

decisions.get('/:group/:slug', async (c) => {
  const { group, slug } = c.req.param()
  const filePath = join(process.cwd(), 'catalog', 'decisions', group, `${slug}.md`)

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug
    const status = file.frontmatter.status || 'draft'
    const tags = file.frontmatter.tags?.split(',').map((t: string) => t.trim().replace(/[\[\]]/g, '')) || []
    const decided = file.frontmatter.decided || ''

    return c.html(
      <Layout title={title}>
        <div class="l-cluster">
          <StatusBadge status={status} />
          <TagList tags={tags} />
          {decided && <span class="u-text-muted">Decided: {decided}</span>}
        </div>
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/decisions">← Back to Decisions</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Decision Not Found</h1>
        <p>
          <a href="/catalog/decisions">← Back to Decisions</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default decisions
```

Expected: Decisions route with grouped listing and detail pages

- [ ] **Step 4: Create architecture route**

Create `/home/daniel/src/forms-lab/src/routes/catalog/architecture.tsx`:

```tsx
import { Hono } from 'hono'
import { join } from 'node:path'
import { Layout } from '../../components/Layout'
import { ContentCard } from '../../components/ContentCard'
import { StatusBadge } from '../../components/StatusBadge'
import { Prose } from '../../components/Prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'

const architecture = new Hono()

architecture.get('/', async (c) => {
  const archDir = join(process.cwd(), 'catalog', 'architecture')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(archDir)
  } catch {
    // directory may not exist
  }

  return c.html(
    <Layout title="Architecture">
      <h1>Architecture</h1>
      <p>System documentation describing how Forms Lab works.</p>
      <div class="l-stack">
        {files.map((file) => {
          const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename
          const status = file.frontmatter.status || 'draft'
          return (
            <ContentCard
              key={file.filename}
              title={title}
              href={`/catalog/architecture/${file.filename}`}
            >
              <StatusBadge status={status} />
            </ContentCard>
          )
        })}
        {files.length === 0 && (
          <p class="flex-empty">No architecture documents yet.</p>
        )}
      </div>
    </Layout>,
  )
})

architecture.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'architecture', `${slug}.md`)

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug

    return c.html(
      <Layout title={title}>
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/architecture">← Back to Architecture</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Document Not Found</h1>
        <p>
          <a href="/catalog/architecture">← Back to Architecture</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default architecture
```

Expected: Architecture route created

- [ ] **Step 5: Create stories route**

Create `/home/daniel/src/forms-lab/src/routes/catalog/stories.tsx`:

```tsx
import { Hono } from 'hono'
import { join } from 'node:path'
import { Layout } from '../../components/Layout'
import { ContentCard } from '../../components/ContentCard'
import { StatusBadge } from '../../components/StatusBadge'
import { TagList } from '../../components/TagList'
import { Prose } from '../../components/Prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'
import type { Story } from '../../types/models'

const stories = new Hono()

function parseStory(file: { frontmatter: Record<string, string>; content: string; filename: string }): Story {
  const labels = file.frontmatter.labels?.replace(/[\[\]]/g, '').split(',').map((l: string) => l.trim()).filter(Boolean) || []
  return {
    slug: file.filename,
    issue: parseInt(file.frontmatter.issue || '0', 10),
    title: file.frontmatter.title || file.filename,
    milestone: file.frontmatter.milestone || '',
    labels,
    state: file.frontmatter.state || 'open',
    syncedAt: file.frontmatter.synced_at || '',
    content: file.content,
  }
}

stories.get('/', async (c) => {
  const storiesDir = join(process.cwd(), 'catalog', 'stories')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(storiesDir)
  } catch {
    // directory may not exist or be empty
  }

  const allStories = files.map(parseStory)

  // Group by milestone
  const byMilestone: Record<string, Story[]> = {}
  for (const story of allStories) {
    const key = story.milestone || 'Unassigned'
    if (!byMilestone[key]) byMilestone[key] = []
    byMilestone[key].push(story)
  }

  return c.html(
    <Layout title="Stories">
      <h1>User Stories</h1>
      <p>
        Stories are synced from{' '}
        <a href="https://github.com/flexion/forms-lab/issues?q=label%3Auser-story">
          GitHub Issues
        </a>
        . Run <code>bun run cli sync-stories</code> to update.
      </p>
      <div class="l-stack">
        {Object.entries(byMilestone).map(([milestone, items]) => (
          <div key={milestone}>
            <h2>
              <span class="badge" data-variant="milestone">{milestone}</span>
            </h2>
            <div class="l-stack" style="--stack-space: var(--flex-space-sm);">
              {items.map((story) => (
                <ContentCard
                  key={story.slug}
                  title={`#${story.issue} ${story.title}`}
                  href={`/catalog/stories/${story.slug}`}
                >
                  <StatusBadge status={story.state} />
                  <TagList tags={story.labels.filter((l) => l !== 'user-story')} />
                </ContentCard>
              ))}
            </div>
          </div>
        ))}
        {allStories.length === 0 && (
          <p class="flex-empty">
            No stories synced yet. Run <code>bun run cli sync-stories</code> to
            pull from GitHub.
          </p>
        )}
      </div>
    </Layout>,
  )
})

stories.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'stories', `${slug}.md`)

  try {
    const file = await parseMarkdown(filePath)
    const story = parseStory({ ...file, filename: slug })

    return c.html(
      <Layout title={story.title}>
        <div class="l-cluster">
          <StatusBadge status={story.state} />
          {story.milestone && (
            <span class="badge" data-variant="milestone">{story.milestone}</span>
          )}
          <TagList tags={story.labels.filter((l) => l !== 'user-story')} />
          {story.issue > 0 && (
            <a href={`https://github.com/flexion/forms-lab/issues/${story.issue}`} class="u-text-muted">
              GitHub #{story.issue}
            </a>
          )}
        </div>
        <Prose content={story.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/stories">← Back to Stories</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Story Not Found</h1>
        <p>
          <a href="/catalog/stories">← Back to Stories</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default stories
```

Expected: Stories route with milestone grouping

- [ ] **Step 6: Create experiments route**

Create `/home/daniel/src/forms-lab/src/routes/catalog/experiments.tsx`:

```tsx
import { Hono } from 'hono'
import { join } from 'node:path'
import { Layout } from '../../components/Layout'
import { ContentCard } from '../../components/ContentCard'
import { StatusBadge } from '../../components/StatusBadge'
import { Prose } from '../../components/Prose'
import { parseMarkdown, readMarkdownDir } from '../../lib/markdown'

const experiments = new Hono()

experiments.get('/', async (c) => {
  const expDir = join(process.cwd(), 'catalog', 'experiments')
  let files: Awaited<ReturnType<typeof readMarkdownDir>> = []
  try {
    files = await readMarkdownDir(expDir)
  } catch {
    // directory may not exist
  }

  return c.html(
    <Layout title="Experiments">
      <h1>Experiments</h1>
      <p>
        LLM experiments comparing baseline and alternative approaches with
        evaluation metrics.
      </p>
      <div class="l-stack">
        {files.map((file) => {
          const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || file.filename
          const status = file.frontmatter.status || 'draft'
          return (
            <ContentCard
              key={file.filename}
              title={title}
              href={`/catalog/experiments/${file.filename}`}
            >
              <StatusBadge status={status} />
            </ContentCard>
          )
        })}
        {files.length === 0 && (
          <p class="flex-empty">No experiments yet. Experiments will be added starting with Slice 2.</p>
        )}
      </div>
    </Layout>,
  )
})

experiments.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const filePath = join(process.cwd(), 'catalog', 'experiments', `${slug}.md`)

  try {
    const file = await parseMarkdown(filePath)
    const title = file.content.split('\n')[0]?.replace(/^#\s+/, '') || slug

    return c.html(
      <Layout title={title}>
        <Prose content={file.content} />
        <p style="margin-top: var(--flex-space-lg);">
          <a href="/catalog/experiments">← Back to Experiments</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Experiment Not Found</h1>
        <p>
          <a href="/catalog/experiments">← Back to Experiments</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default experiments
```

Expected: Experiments route created (empty content for now)

- [ ] **Step 7: Delete old catalog.tsx**

```bash
cd /home/daniel/src/forms-lab && rm src/routes/catalog.tsx
```

Expected: Old monolithic route file removed

- [ ] **Step 8: Run type checking**

```bash
cd /home/daniel/src/forms-lab && bun run --no-warnings tsc --noEmit
```

Expected: No TypeScript errors

- [ ] **Step 9: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/routes/ src/server.ts src/components/Layout.tsx
git rm src/routes/catalog.tsx
git commit -m "feat: split catalog routes by content type, add design system

- Catalog landing page at /catalog with content type counts
- Separate route files: personas, decisions, architecture, stories, experiments
- Layout uses design system CSS via serveStatic
- Decisions grouped by subdirectory with status badges
- Stories grouped by milestone
- Server builds CSS on startup in dev mode"
```

Expected: Committed

---

### Task 7: Update and Add Tests for All Catalog Routes

**Files:**
- Modify: `test/catalog.test.ts` (rename to `test/catalog-personas.test.ts`)
- Create: `test/catalog-decisions.test.ts`
- Create: `test/catalog-architecture.test.ts`
- Create: `test/catalog-stories.test.ts`
- Create: `test/catalog-landing.test.ts`

- [ ] **Step 1: Rename existing catalog test**

```bash
cd /home/daniel/src/forms-lab && mv test/catalog.test.ts test/catalog-personas.test.ts
```

Expected: File renamed

- [ ] **Step 2: Update persona tests for new route structure**

The tests in `test/catalog-personas.test.ts` should still work since the routes are at the same paths. Run them to verify:

```bash
cd /home/daniel/src/forms-lab && bun test test/catalog-personas.test.ts
```

Expected: PASS — existing tests still work with new route structure

- [ ] **Step 3: Write catalog landing page test**

Create `/home/daniel/src/forms-lab/test/catalog-landing.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('GET /catalog', () => {
  it('returns 200 and shows content type overview', async () => {
    const res = await app.request('/catalog')
    expect(res.status).toBe(200)

    const body = await res.text()
    expect(body).toContain('Catalog')
    expect(body).toContain('Personas')
    expect(body).toContain('Decisions')
    expect(body).toContain('Architecture')
    expect(body).toContain('Stories')
    expect(body).toContain('Experiments')
  })
})
```

Expected: Test file created

- [ ] **Step 4: Write decision route tests**

Create `/home/daniel/src/forms-lab/test/catalog-decisions.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('Catalog Decisions', () => {
  describe('GET /catalog/decisions', () => {
    it('returns 200 and lists decision groups', async () => {
      const res = await app.request('/catalog/decisions')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Architectural Decisions')
      expect(body).toContain('architecture')
      expect(body).toContain('infrastructure')
      expect(body).toContain('design-system')
    })
  })

  describe('GET /catalog/decisions/:group/:slug', () => {
    it('returns 200 for a known decision', async () => {
      const res = await app.request('/catalog/decisions/architecture/hono-on-bun')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Hono')
      expect(body).toContain('stable')
    })

    it('returns 404 for unknown decision', async () => {
      const res = await app.request('/catalog/decisions/architecture/nonexistent')
      expect(res.status).toBe(404)
    })
  })
})
```

Expected: Test file created

- [ ] **Step 5: Write architecture route tests**

Create `/home/daniel/src/forms-lab/test/catalog-architecture.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('Catalog Architecture', () => {
  describe('GET /catalog/architecture', () => {
    it('returns 200 and lists architecture docs', async () => {
      const res = await app.request('/catalog/architecture')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Architecture')
      expect(body).toContain('System Overview')
      expect(body).toContain('Data Model')
    })
  })

  describe('GET /catalog/architecture/:slug', () => {
    it('returns 200 for system overview', async () => {
      const res = await app.request('/catalog/architecture/system-overview')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('System Overview')
    })

    it('returns 404 for unknown doc', async () => {
      const res = await app.request('/catalog/architecture/nonexistent')
      expect(res.status).toBe(404)
    })
  })
})
```

Expected: Test file created

- [ ] **Step 6: Write story route tests**

Create `/home/daniel/src/forms-lab/test/catalog-stories.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('Catalog Stories', () => {
  describe('GET /catalog/stories', () => {
    it('returns 200', async () => {
      const res = await app.request('/catalog/stories')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('User Stories')
    })
  })
})
```

Expected: Test file created

- [ ] **Step 7: Run all tests**

```bash
cd /home/daniel/src/forms-lab && bun test
```

Expected: All tests pass (existing server tests + new catalog tests)

- [ ] **Step 8: Commit**

```bash
cd /home/daniel/src/forms-lab
git add test/
git rm test/catalog.test.ts 2>/dev/null; true
git commit -m "test: add tests for all catalog content types

- Catalog landing page test
- Decision listing and detail tests
- Architecture listing and detail tests
- Story listing test
- Rename persona test file for consistency"
```

Expected: Committed

---

### Task 8: Write ADR Content

**Files:**
- Create: 13 decision files in `catalog/decisions/`
- Create: 2 architecture docs in `catalog/architecture/`

**Note to implementer:** Each ADR follows the format: frontmatter (status, tags, decided) then markdown with Context, Decision, Alternatives considered, Consequences, and Sources sections. The content below captures the actual decisions made during project design. Sources reference the class repo design doc and brainstorming session.

- [ ] **Step 1: Create decision directory structure**

```bash
cd /home/daniel/src/forms-lab
mkdir -p catalog/decisions/{architecture,infrastructure,design-system}
mkdir -p catalog/architecture
```

Expected: Directories created

- [ ] **Step 2: Create architecture decisions**

Create `/home/daniel/src/forms-lab/catalog/decisions/architecture/hono-on-bun.md`:

```markdown
---
status: stable
tags: [architecture, runtime, framework]
decided: 2026-04-07
---

# Hono on Bun

We use the Hono web framework running on the Bun runtime with server-rendered JSX for the Forms Lab platform.

## Context

We needed a lightweight, TypeScript-native web framework for a server-rendered application. The project is a class final project with a two-week timeline, so developer velocity matters. Prior art exists in the class homework repo using the same stack.

## Decision

Hono on Bun with server-rendered JSX. No client-side JavaScript framework — pages are rendered entirely on the server and sent as HTML.

Key characteristics:
- Hono provides routing, middleware, and JSX support out of the box
- Bun provides fast startup, built-in TypeScript, and a test runner
- Server-rendered JSX means components return HTML strings, no hydration needed
- `serveStatic` middleware for serving built CSS assets

## Alternatives considered

- **Express + Node.js** — more ecosystem support but heavier, requires separate TypeScript compilation, no built-in JSX
- **Next.js / Remix** — full-featured SSR frameworks but bring significant complexity (bundler config, client hydration, routing conventions) beyond what this project needs
- **Fastify** — good performance but less ergonomic JSX support compared to Hono

## Consequences

- Fast development iteration due to Bun's built-in TypeScript and test runner
- No client-side interactivity without adding islands architecture (HonoX + Vite) later
- Hono's ecosystem is smaller than Express, but sufficient for our needs
- Bun's test runner replaces Jest/Vitest — slightly different API but simpler setup

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Class repo Hono app](https://github.com/flexion/llm-class-2026-winter-cohort/tree/main/web) — prior art
```

Create `/home/daniel/src/forms-lab/catalog/decisions/architecture/git-as-persistence.md`:

```markdown
---
status: stable
tags: [architecture, persistence, data]
decided: 2026-04-07
---

# Git as Persistence Layer

Form definitions, catalog content, and project assets are stored as files in git repositories rather than in a database.

## Context

The platform manages structured data (DataCollectionSpec, FormSpec) and content (personas, decisions, stories). We needed a persistence strategy that supports versioning, branching, and review workflows.

## Decision

Git is the persistence layer. Form specs are JSON files, catalog content is markdown with YAML frontmatter, and assets (source PDFs) are stored alongside specs in project directories.

Key characteristics:
- Every change is versioned with full history
- Branching enables proposal/draft workflows (Maya edits on a branch, reviews via diff, merges to publish)
- Submissions link to exact spec versions via git SHA
- The catalog reads directly from the filesystem — no database queries

## Alternatives considered

- **PostgreSQL / SQLite** — traditional database provides querying, indexing, and ACID transactions but loses the branching/versioning model that's central to the form authoring workflow
- **Headless CMS** — provides content management but adds external dependency and doesn't support the spec versioning model
- **Git + database hybrid** — specs in git, submissions in database. This is likely the eventual architecture but premature for the skeleton

## Consequences

- No database to provision or manage
- File reads are fast for the scale we're operating at (single-digit projects)
- Complex queries (e.g., "all submissions for this spec") require filesystem traversal, not SQL
- Submissions should eventually move to a database when scale matters
- The catalog's performance depends on filesystem read speed, which is fine for markdown files

## Sources

- [Design spec: Data Model](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
```

Create `/home/daniel/src/forms-lab/catalog/decisions/architecture/github-issues-for-stories.md`:

```markdown
---
status: stable
tags: [architecture, project-management]
decided: 2026-04-07
---

# GitHub Issues for Stories

User stories are managed as GitHub Issues with a sync job that pulls them into the repository as markdown files.

## Context

We needed a system for tracking user stories that integrates with our development workflow. Stories need to be visible to the development team, linked to milestones, and available as context for Claude Code when implementing features.

## Decision

GitHub Issues are the source of truth for user stories. Issues labeled `user-story` are assigned to milestones corresponding to slices. A CLI command (`bun run cli sync-stories`) pulls issues via the GitHub API and writes them as markdown files to `catalog/stories/`.

Key characteristics:
- Stories created and discussed in GitHub's native interface
- Milestones group stories by slice
- Synced markdown copies give Claude Code local context
- Catalog renders stories from the synced files

## Alternatives considered

- **Stories as repo-only markdown** — simpler (no sync needed) but loses GitHub's discussion, assignment, and project tracking features
- **Linear / Jira** — full project management tools but overkill for a solo class project
- **GitHub Projects** — provides kanban boards but still backed by issues; adds a layer of indirection without clear benefit for our scale

## Consequences

- GitHub Issues provide a familiar interface for story management
- The sync job adds a manual step (`bun run cli sync-stories`) that must be run to update local copies
- Story state in the repo can be stale if sync hasn't been run recently
- Multiple PRs can reference the same issue — story tracks capability completion, not individual PRs

## Sources

- [Design spec: Project Management](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
```

Expected: 3 architecture decision files created

- [ ] **Step 3: Create infrastructure decisions**

Create the following 5 files in `/home/daniel/src/forms-lab/catalog/decisions/infrastructure/`. Each follows the same format — frontmatter with `status: stable`, `tags: [infrastructure, ...]`, `decided: 2026-04-07`, then Context, Decision, Alternatives considered, Consequences, Sources sections.

**`ec2-with-pulumi.md`:** Single EC2 instance managed by Pulumi (TypeScript). Context: need reproducible infrastructure. Decision: Pulumi over Terraform because TypeScript-native matches our stack. Alternatives: Terraform (HCL, not TypeScript), manual AWS console (not reproducible), Fly.io (simpler but less control). Consequences: infrastructure as code, Pulumi state to manage, EC2 costs money but class project scale is minimal.

**`caddy-reverse-proxy.md`:** Caddy for reverse proxy. Context: need to route requests to branch processes on a single EC2 instance. Decision: Caddy for atomic config reloads via admin API, auto-HTTPS, simple config format. Alternatives: Nginx (more verbose config, less graceful reloads), Traefik (heavier, container-oriented), no proxy (reinventing routing). Consequences: one extra process on EC2, webhook listener can update Caddy config programmatically.

**`subpath-routing.md`:** Branch-per-subpath routing with app-aware base path. Context: need unique URLs per branch deployment. Decision: subpaths (`/main/`, `/slice-1/`) instead of subdomains. App sets `BASE_PATH` env var, Hono's `app.basePath()` makes routes prefix-aware. Alternatives: subdomain routing (requires wildcard DNS), port-based routing (not URL-friendly). Consequences: app code must be base-path-aware, simpler DNS (single A record), no wildcard certificates needed.

**`nix-built-processes.md`:** Nix-built bare processes, no containers. Context: each branch deployment needs an isolated process. Decision: Nix builds the application, systemd or NixOS services manage processes. No Docker containers. Alternatives: Docker containers (better isolation but unnecessary overhead for trusted code), PM2 (Node-ecosystem process manager, adds dependency). Consequences: deterministic builds via Nix, lighter resource usage than containers, processes run directly on host.

**`github-webhook-deploys.md`:** GitHub webhook triggers deploys. Context: need automated deployment when code is pushed. Decision: GitHub sends webhook to EC2 on push, a lightweight Bun listener receives it, pulls the branch, builds with Nix, restarts the process, updates Caddy config. Alternatives: SSH-based deploy from CI (requires managing SSH keys in GitHub), polling (wasteful, delayed). Consequences: EC2 must be reachable from GitHub's webhook IPs, webhook listener is a small service to maintain.

**Note to implementer:** Write each file with the full ADR format shown in Step 2. Keep each decision to 3-5 paragraphs total. Sources should reference the design spec and PR #10 brainstorming discussion.

Expected: 5 infrastructure decision files created

- [ ] **Step 4: Create design system decisions**

Create the following 5 files in `/home/daniel/src/forms-lab/catalog/decisions/design-system/`. Same format as above.

**`selective-uswds-adoption.md`:** Selective adoption from class repo with full USWDS fidelity per component. Context: class repo has 30+ components but catalog doesn't need all of them. Decision: bring in foundation (tokens, compositions, base) immediately, adopt components as needed, each audited against full USWDS 3.13 spec. Alternatives: port everything (carries unused code), start from scratch (loses proven patterns), use USWDS directly (heavy dependency, less control). Consequences: leaner codebase, each component is explicitly chosen and verified, may need to add components for future slices.

**`two-tier-token-architecture.md`:** Palette + semantic token layers. Context: need a theming system that's USWDS-conformant but independently maintained. Decision: Tier 1 palette tokens (~140 USWDS colors, never used directly), Tier 2 semantic tokens (role-based, used by all components). Retheme by remapping semantic tokens only. Alternatives: single-tier tokens (no abstraction, harder to theme), CSS custom properties without structure (no naming convention). Consequences: dark mode via semantic token overrides, USWDS visual conformance maintained, ~84KB token file (acceptable for single build).

**`cascade-layers.md`:** CSS cascade layers for specificity management. Context: CSS specificity wars are a common source of bugs. Decision: six cascade layers in strict order (reset → tokens → composition → base → block → utility) using CSS `@layer`. Alternatives: BEM naming convention (relies on discipline, no enforcement), CSS modules (adds build complexity), Tailwind (utility-first conflicts with USWDS component model). Consequences: specificity is deterministic, no `!important` needed, all CSS must be assigned to a layer.

**`css-build-and-delivery.md`:** Bun.build() at build time, serveStatic for delivery. Context: CSS files use `@import` for organization but need to be served as a single file. Decision: `bun run build:css` resolves imports into `dist/styles.css`, Hono's `serveStatic` serves it. Dev mode builds on startup. Alternatives: per-request Bun.build() (class repo pattern, not idiomatic), Vite (premature, adds complexity), Hono css helper (CSS-in-JS, doesn't suit standalone CSS files). Consequences: fast serving via static files, clear build step, `dist/` is gitignored.

**`markdown-rendering.md`:** markdown-it with HTML disabled by default. Context: catalog renders markdown content for all content types. Decision: markdown-it library with `html: false` (raw HTML is escaped, not passed through). Alternatives: marked (HTML enabled by default, requires separate sanitizer), micromark (lower-level, requires extension assembly), unified/remark (overkill AST-based). Consequences: safe by default for all content including synced GitHub issues, GFM features available via plugins.

**Note to implementer:** Same format as Step 2 and 3. Write full ADR content, not summaries.

Expected: 5 design system decision files created

- [ ] **Step 5: Create architecture documents**

Create `/home/daniel/src/forms-lab/catalog/architecture/system-overview.md`:

```markdown
---
status: working
tags: [architecture, overview]
---

# System Overview

Forms Lab is a PDF-in, form-experience, PDF-out platform for government forms. Upload a government PDF form, the system extracts structured specs, delivers a form-filling experience (web form or conversational agent), and produces a completed PDF.

## Components

### Catalog

The system's self-documentation layer. Serves as the entry point for all stakeholders — developers browse architecture docs, evaluators review project progress, form creators understand capabilities.

Content types: personas, decisions, architecture docs, user stories, experiments. Each is stored as markdown with YAML frontmatter in the `catalog/` directory and rendered as HTML by dedicated Hono routes.

The catalog is a **computed view** over structured content — it reads from the filesystem and renders, never storing separate state. Git is the system of record.

### Data Model

Three-tier separation:
- **DataCollectionSpec** — what data to collect (fields, types, constraints, conditions, sensitivity)
- **FormSpec** — how to present it (pages, sections, delivery modes)
- **Submission** — collected data linked to exact spec version

See [Data Model](data-model.md) for details.

### Form Projects

A `projects/` directory contains form project directories, each with specs, form definitions, and source assets (PDFs, policy docs). Each project is a unit of collaboration.

### CLI

Operational commands via `bun run cli <command>`. Currently: `sync-stories` to pull GitHub Issues into local markdown files.

### Infrastructure

Single EC2 instance with Caddy reverse proxy. Branch-per-subpath deployment: each branch gets a unique URL path. GitHub webhook triggers deploys. See infrastructure decisions for details.

## Data Flow

1. Maya uploads PDF → LLM extracts DataCollectionSpec + default FormSpec
2. Maya shapes FormSpec (page flow, delivery modes) via authoring UI
3. Maya reviews changes via semantic diff, approves to publish
4. Carlos fills published form → Submission captured against spec version
5. Maya downloads completed PDF with submission data mapped to template

## Technology

- **Runtime:** Bun
- **Framework:** Hono with server-rendered JSX
- **Persistence:** Git (file-based)
- **Styling:** Two-tier CSS tokens, cascade layers, USWDS visual conformance
- **CI:** GitHub Actions (tests, type check, lint)
- **Deploy:** Pulumi (EC2), Caddy, Nix-built processes, GitHub webhook

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
```

Create `/home/daniel/src/forms-lab/catalog/architecture/data-model.md`:

```markdown
---
status: working
tags: [architecture, data-model]
---

# Data Model

The data model separates **what to collect** from **how to present it** from **what was collected**.

## DataCollectionSpec

The business domain model. Describes data requirements independent of any UI or delivery mechanism.

- **RequirementGroups** organize related fields (e.g., "Personal Information", "Employment History")
- **DataRequirements** define individual fields: type, validation, conditions, sensitivity level
- **Field types:** text, email, phone, url, number, currency, date, boolean, choice, longText
- **Conditions** make fields appear/hide based on other field values
- **Sensitivity levels** (low, medium, high, pii) inform how data is handled and displayed

A DataCollectionSpec is portable — the same spec can drive a static web form, a conversational agent, or a PDF mapping.

## FormSpec

The UX/delivery layer. Describes how to present a DataCollectionSpec as a form experience.

- **Pages** group requirement groups into a multi-step flow
- **Delivery modes** per page: static (traditional form), conversational (chat agent), hybrid (mix)
- References the DataCollectionSpec by ID — one spec can have multiple FormSpecs for different experiences

Maya shapes the FormSpec through the authoring UI. The LLM suggests delivery modes based on section complexity.

## Submission

Immutable collected data. Links to the exact DataCollectionSpec version (git SHA) used at collection time, ensuring data interpretation is unambiguous even if the spec evolves.

- **Status:** draft → submitted → processed
- **Data:** key-value pairs where keys are DataRequirement field names

## FormProject

A directory in git containing a DataCollectionSpec, one or more FormSpecs, and associated assets (source PDF, policy docs). The unit of collaboration.

Located in `projects/<project-slug>/`:
- `spec.json` — DataCollectionSpec
- `form.json` — Default FormSpec
- `source.pdf` — Original uploaded PDF
- Additional FormSpecs and assets as needed

## Type Definitions

All types are defined in `src/types/models.ts`.

## Sources

- [Design spec: Data Model](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
```

Expected: 2 architecture documents created

- [ ] **Step 6: Run tests to make sure decision and architecture routes work**

```bash
cd /home/daniel/src/forms-lab && bun test
```

Expected: All tests pass including the decision and architecture route tests from Task 7

- [ ] **Step 7: Commit**

```bash
cd /home/daniel/src/forms-lab
git add catalog/decisions/ catalog/architecture/
git commit -m "docs: add initial ADRs and architecture documentation

13 architectural decisions across 3 domains:
- architecture/: hono-on-bun, git-as-persistence, github-issues-for-stories
- infrastructure/: ec2-with-pulumi, caddy-reverse-proxy, subpath-routing,
  nix-built-processes, github-webhook-deploys
- design-system/: selective-uswds-adoption, two-tier-token-architecture,
  cascade-layers, css-build-and-delivery, markdown-rendering

2 architecture documents:
- system-overview: platform components, data flow, technology
- data-model: DataCollectionSpec, FormSpec, Submission relationships"
```

Expected: Committed

---

### Task 9: CLI Dispatcher and sync-stories Command

**Files:**
- Create: `src/cli.ts`
- Create: `src/commands/sync-stories.ts`
- Create: `src/services/github.ts`
- Create: `test/cli.test.ts`
- Create: `test/sync-stories.test.ts`

- [ ] **Step 1: Write failing CLI dispatcher tests**

Create `/home/daniel/src/forms-lab/test/cli.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { parseArgs, getCommand } from '../src/cli'

describe('CLI', () => {
  describe('parseArgs', () => {
    it('extracts command name from args', () => {
      const result = parseArgs(['sync-stories'])
      expect(result.command).toBe('sync-stories')
    })

    it('returns help for --help flag', () => {
      const result = parseArgs(['--help'])
      expect(result.command).toBe('help')
    })

    it('returns help for no args', () => {
      const result = parseArgs([])
      expect(result.command).toBe('help')
    })
  })

  describe('getCommand', () => {
    it('returns sync-stories command', () => {
      const cmd = getCommand('sync-stories')
      expect(cmd).toBeDefined()
      expect(cmd!.name).toBe('sync-stories')
      expect(cmd!.description).toBe('Sync user stories from GitHub Issues')
    })

    it('returns undefined for unknown command', () => {
      const cmd = getCommand('nonexistent')
      expect(cmd).toBeUndefined()
    })
  })
})
```

Expected: Test file created

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab && bun test test/cli.test.ts
```

Expected: FAIL — `parseArgs` and `getCommand` not found

- [ ] **Step 3: Create CLI dispatcher**

Create `/home/daniel/src/forms-lab/src/cli.ts`:

```typescript
import { syncStories } from './commands/sync-stories'

export interface ParsedArgs {
  command: string
  args: string[]
}

export interface Command {
  name: string
  description: string
  run: (args: string[]) => Promise<number>
}

const commands: Command[] = [
  {
    name: 'sync-stories',
    description: 'Sync user stories from GitHub Issues',
    run: syncStories,
  },
]

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { command: 'help', args: [] }
  }
  return { command: argv[0], args: argv.slice(1) }
}

export function getCommand(name: string): Command | undefined {
  return commands.find((c) => c.name === name)
}

function printHelp(): void {
  console.log('Usage: bun run cli <command>\n')
  console.log('Commands:')
  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`)
  }
}

// Main entry point
if (import.meta.main) {
  const { command, args } = parseArgs(process.argv.slice(2))

  if (command === 'help') {
    printHelp()
    process.exit(0)
  }

  const cmd = getCommand(command)
  if (!cmd) {
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
  }

  const exitCode = await cmd.run(args)
  process.exit(exitCode)
}
```

Expected: CLI dispatcher created

- [ ] **Step 4: Run CLI tests to verify they pass**

```bash
cd /home/daniel/src/forms-lab && bun test test/cli.test.ts
```

Expected: PASS — CLI dispatcher tests pass

- [ ] **Step 5: Write failing sync-stories tests**

Create `/home/daniel/src/forms-lab/test/sync-stories.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { syncStoriesFromIssues } from '../src/commands/sync-stories'
import type { GitHubIssue } from '../src/services/github'

const testDir = join(import.meta.dir, '__fixtures__', 'stories')

const fakeIssues: GitHubIssue[] = [
  {
    number: 2,
    title: 'Maya signs in to access form authoring',
    body: '## User Story\n\nAs a form creator...',
    state: 'open',
    labels: [{ name: 'user-story' }, { name: 'authentication' }],
    milestone: { title: 'Slice 1: Maya Signs In' },
  },
  {
    number: 3,
    title: 'Maya uploads a PDF and reviews the extracted specs',
    body: '## User Story\n\nAs a form creator...',
    state: 'open',
    labels: [{ name: 'user-story' }, { name: 'llm-integration' }],
    milestone: { title: 'Slice 2: Maya Uploads PDF' },
  },
]

describe('syncStoriesFromIssues', () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true })
  })

  it('writes story files from issues', async () => {
    await syncStoriesFromIssues(fakeIssues, testDir)

    const files = await readdir(testDir)
    expect(files).toContain('2-maya-signs-in-to-access-form-authoring.md')
    expect(files).toContain('3-maya-uploads-a-pdf-and-reviews-the-extracted-specs.md')
  })

  it('includes correct frontmatter', async () => {
    await syncStoriesFromIssues(fakeIssues, testDir)

    const content = await readFile(
      join(testDir, '2-maya-signs-in-to-access-form-authoring.md'),
      'utf-8',
    )
    expect(content).toContain('issue: 2')
    expect(content).toContain('title: Maya signs in to access form authoring')
    expect(content).toContain('milestone: "Slice 1: Maya Signs In"')
    expect(content).toContain('state: open')
    expect(content).toContain('labels: [user-story, authentication]')
  })

  it('includes issue body as content', async () => {
    await syncStoriesFromIssues(fakeIssues, testDir)

    const content = await readFile(
      join(testDir, '2-maya-signs-in-to-access-form-authoring.md'),
      'utf-8',
    )
    expect(content).toContain('As a form creator...')
  })

  it('removes files for issues no longer matching', async () => {
    // Write an old file that shouldn't exist after sync
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(testDir, '99-old-story.md'), 'old content')

    await syncStoriesFromIssues(fakeIssues, testDir)

    const files = await readdir(testDir)
    expect(files).not.toContain('99-old-story.md')
  })
})
```

Expected: Test file created

- [ ] **Step 6: Run tests to verify they fail**

```bash
cd /home/daniel/src/forms-lab && bun test test/sync-stories.test.ts
```

Expected: FAIL — `syncStoriesFromIssues` not found

- [ ] **Step 7: Create GitHub service interface**

Create `/home/daniel/src/forms-lab/src/services/github.ts`:

```typescript
export interface GitHubIssue {
  number: number
  title: string
  body: string | null
  state: string
  labels: Array<{ name: string }>
  milestone: { title: string } | null
}

export interface GitHubClient {
  listIssues(owner: string, repo: string, labels: string): Promise<GitHubIssue[]>
}

export function createGitHubClient(token?: string): GitHubClient {
  return {
    async listIssues(owner, repo, labels) {
      const url = `https://api.github.com/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(labels)}&state=all&per_page=100`
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
      }

      return res.json() as Promise<GitHubIssue[]>
    },
  }
}

export async function getGitHubToken(): Promise<string | undefined> {
  // Try env var first
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN
  }

  // Fall back to gh CLI
  try {
    const proc = Bun.spawn(['gh', 'auth', 'token'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const output = await new Response(proc.stdout).text()
    return output.trim() || undefined
  } catch {
    return undefined
  }
}
```

Expected: GitHub client interface and implementation created

- [ ] **Step 8: Create sync-stories command**

Create `/home/daniel/src/forms-lab/src/commands/sync-stories.ts`:

```typescript
import { join } from 'node:path'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { createGitHubClient, getGitHubToken } from '../services/github'
import type { GitHubIssue } from '../services/github'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function issueToMarkdown(issue: GitHubIssue): string {
  const labels = issue.labels.map((l) => l.name).join(', ')
  const milestone = issue.milestone?.title || ''

  let frontmatter = '---\n'
  frontmatter += `issue: ${issue.number}\n`
  frontmatter += `title: ${issue.title}\n`
  frontmatter += `milestone: "${milestone}"\n`
  frontmatter += `labels: [${labels}]\n`
  frontmatter += `state: ${issue.state}\n`
  frontmatter += `synced_at: ${new Date().toISOString()}\n`
  frontmatter += '---\n\n'

  return frontmatter + (issue.body || '')
}

export async function syncStoriesFromIssues(
  issues: GitHubIssue[],
  storiesDir: string,
): Promise<void> {
  await mkdir(storiesDir, { recursive: true })

  // Determine which files should exist
  const expectedFiles = new Set<string>()
  for (const issue of issues) {
    const slug = slugify(issue.title)
    const filename = `${issue.number}-${slug}.md`
    expectedFiles.add(filename)
    await writeFile(join(storiesDir, filename), issueToMarkdown(issue))
  }

  // Remove files that no longer match
  const existingFiles = await readdir(storiesDir)
  for (const file of existingFiles) {
    if (file.endsWith('.md') && !expectedFiles.has(file)) {
      await rm(join(storiesDir, file))
    }
  }
}

export async function syncStories(): Promise<number> {
  const owner = 'flexion'
  const repo = 'forms-lab'
  const label = 'user-story'
  const storiesDir = join(process.cwd(), 'catalog', 'stories')

  console.log(`Syncing stories from ${owner}/${repo}...`)

  const token = await getGitHubToken()
  if (!token) {
    console.warn('Warning: No GitHub token found. API rate limits may apply.')
  }

  const client = createGitHubClient(token)

  try {
    const issues = await client.listIssues(owner, repo, label)
    await syncStoriesFromIssues(issues, storiesDir)
    console.log(`Synced ${issues.length} stories to ${storiesDir}`)
    return 0
  } catch (err) {
    console.error('Failed to sync stories:', err)
    return 1
  }
}
```

Expected: sync-stories command created

- [ ] **Step 9: Run sync-stories tests**

```bash
cd /home/daniel/src/forms-lab && bun test test/sync-stories.test.ts
```

Expected: PASS — all sync-stories tests pass

- [ ] **Step 10: Run all tests**

```bash
cd /home/daniel/src/forms-lab && bun test
```

Expected: All tests pass

- [ ] **Step 11: Commit**

```bash
cd /home/daniel/src/forms-lab
git add src/cli.ts src/commands/ src/services/ test/cli.test.ts test/sync-stories.test.ts
git commit -m "feat: add CLI dispatcher and sync-stories command

- CLI entry point at src/cli.ts with command discovery
- sync-stories pulls GitHub Issues labeled 'user-story'
- Writes markdown files with frontmatter to catalog/stories/
- Removes stale story files on sync
- GitHub client uses raw fetch with token auth
- Tests use fake issues, verify file output and cleanup"
```

Expected: Committed

---

### Task 10: meta-knowledge-base Integration and Configuration

**Files:**
- Create: `knowledge-base.yaml`
- Create: `notes/2026-04-07-bootstrapping.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create knowledge-base.yaml**

Create `/home/daniel/src/forms-lab/knowledge-base.yaml`:

```yaml
apiVersion: kb/v1
name: forms-lab
description: "LLM-Assisted Forms Platform"

entrypoints:
  human: README.md
  agent: CLAUDE.md

paths:
  docs: catalog
  notes: notes

rules:
  lifecycle:
    statuses: ["draft", "working", "stable", "deprecated"]
  provenance:
    requiredFor: ["decisions", "architecture"]
  writes:
    allow: ["catalog/**", "src/**", "test/**", "notes/**", "scripts/**"]
    deny: ["infrastructure/secrets/**"]

metadata:
  schema:
    decisions:
      required: ["status", "tags", "decided"]
      status: ["draft", "working", "stable", "deprecated"]
    personas:
      required: ["id", "name", "role"]
    architecture:
      required: ["status", "tags"]
      status: ["draft", "working", "stable", "deprecated"]
    stories:
      required: ["issue", "title", "milestone", "state"]
```

Expected: knowledge-base.yaml created

- [ ] **Step 2: Create bootstrapping session log**

Create `/home/daniel/src/forms-lab/notes/2026-04-07-bootstrapping.md`:

```markdown
# Bootstrapping Session — 2026-04-07

Session log for the initial forms-lab repository setup. Decisions made during this session are documented as ADRs in `catalog/decisions/`.

## What happened

1. Created repository skeleton: Hono server, data model types, persona files, catalog routes, CI
2. Designed expanded Slice 0 scope: design system, all catalog content types, CLI, ADRs, deployment
3. Cloned meta-knowledge-base for documentation governance
4. Ported design system foundation from class repo (tokens, compositions, base styles)
5. Split catalog routes by content type (personas, decisions, architecture, stories, experiments)
6. Created CLI dispatcher with sync-stories command
7. Wrote 13 ADRs and 2 architecture documents
8. Configured knowledge-base.yaml for documentation governance

## Key decisions made

- [Hono on Bun](../catalog/decisions/architecture/hono-on-bun.md)
- [Git as persistence](../catalog/decisions/architecture/git-as-persistence.md)
- [GitHub Issues for stories](../catalog/decisions/architecture/github-issues-for-stories.md)
- [EC2 with Pulumi](../catalog/decisions/infrastructure/ec2-with-pulumi.md)
- [Caddy reverse proxy](../catalog/decisions/infrastructure/caddy-reverse-proxy.md)
- [Subpath routing](../catalog/decisions/infrastructure/subpath-routing.md)
- [Nix-built processes](../catalog/decisions/infrastructure/nix-built-processes.md)
- [GitHub webhook deploys](../catalog/decisions/infrastructure/github-webhook-deploys.md)
- [Selective USWDS adoption](../catalog/decisions/design-system/selective-uswds-adoption.md)
- [Two-tier token architecture](../catalog/decisions/design-system/two-tier-token-architecture.md)
- [Cascade layers](../catalog/decisions/design-system/cascade-layers.md)
- [CSS build and delivery](../catalog/decisions/design-system/css-build-and-delivery.md)
- [Markdown rendering](../catalog/decisions/design-system/markdown-rendering.md)

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Skeleton plan](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-skeleton-plan.md)
- [PR 1 design](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-slice0-pr1-design.md)
```

Expected: Bootstrapping log created

- [ ] **Step 3: Update CLAUDE.md**

Replace the contents of `/home/daniel/src/forms-lab/CLAUDE.md` with:

```markdown
# Forms Lab

LLM-Assisted Forms Platform for government forms.

## Quick Reference

```bash
bun test                                # Run tests
bun run dev                             # Dev server with watch
bun run build:css                       # Build CSS bundle
bun run cli sync-stories                # Sync stories from GitHub Issues
bun run --no-warnings tsc --noEmit      # Type check
bunx @biomejs/biome check .             # Lint + format check
bunx @biomejs/biome check --write .     # Lint + format fix
bun run lint:css                        # Stylelint CSS token enforcement
```

## Conventions

- **Code is canonical** — when in doubt, follow existing patterns
- **Tests required** — new functionality needs tests in `test/`
- **Server-rendered JSX** — Hono JSX components return HTML strings, no client runtime
- **TDD** — write failing test first, then implementation
- **Vertical slicing** — each story delivers complete user value through all layers
- **Design tokens** — all colors, spacing, fonts use `--flex-*` tokens, enforced by stylelint
- **Cascade layers** — CSS uses `@layer` (reset → tokens → composition → base → block → utility)

## Architecture

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX)
- **Data Model:** DataCollectionSpec (what to collect) → FormSpec (how to present) → Submission (collected data)
- **Persistence:** Git-based — specs and catalog content are markdown/JSON files in the repo
- **Catalog:** Self-documenting system at `/catalog` — personas, stories, architecture, decisions, experiments
- **CLI:** `bun run cli <command>` for operational tasks
- **CSS:** Two-tier tokens (USWDS 3.13), cascade layers, Bun.build() at build time, serveStatic

## Documentation Governance

Follows [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base) conventions:
- Lifecycle statuses in frontmatter: draft → working → stable → deprecated
- Provenance via `## Sources` sections in decisions and architecture docs
- Intent-revealing file and directory names
- Catalog as computed views over structured content
- See `knowledge-base.yaml` for configuration

## Project Structure

- `src/` — Application code (routes, services, components, types, lib)
- `src/public/` — Design system CSS source files
- `catalog/` — Catalog content (personas, stories, decisions, architecture, experiments)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files
- `scripts/` — Build scripts
- `notes/` — Session logs and exploration notes
- `dist/` — Built assets (gitignored)

## Related

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Skeleton plan](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-skeleton-plan.md)
- [PR 1 design](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-slice0-pr1-design.md)
- [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base)
```

Expected: CLAUDE.md updated with all new commands and conventions

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab
git add knowledge-base.yaml notes/ CLAUDE.md
git commit -m "docs: add knowledge-base config, bootstrapping log, update CLAUDE.md

- knowledge-base.yaml configures documentation governance
- Bootstrapping session log with decision links
- CLAUDE.md updated with CLI commands, design system conventions,
  documentation governance, and project structure"
```

Expected: Committed

---

### Task 11: Sync Stories and Final Verification

**Files:**
- No new files — this task runs the sync and verifies everything works end-to-end

- [ ] **Step 1: Run sync-stories to populate catalog**

```bash
cd /home/daniel/src/forms-lab && bun run cli sync-stories
```

Expected: Stories synced from GitHub to `catalog/stories/`

- [ ] **Step 2: Verify synced story files exist**

```bash
cd /home/daniel/src/forms-lab && ls catalog/stories/
```

Expected: 8-9 markdown files (one per GitHub issue labeled `user-story`)

- [ ] **Step 3: Build CSS**

```bash
cd /home/daniel/src/forms-lab && bun run build:css
```

Expected: `dist/styles.css` produced

- [ ] **Step 4: Run all tests**

```bash
cd /home/daniel/src/forms-lab && bun test
```

Expected: All tests pass

- [ ] **Step 5: Run type checking**

```bash
cd /home/daniel/src/forms-lab && bun run --no-warnings tsc --noEmit
```

Expected: No TypeScript errors

- [ ] **Step 6: Run Biome**

```bash
cd /home/daniel/src/forms-lab && bunx @biomejs/biome check .
```

Expected: No errors

- [ ] **Step 7: Run stylelint**

```bash
cd /home/daniel/src/forms-lab && bun run lint:css
```

Expected: No errors

- [ ] **Step 8: Manual smoke test**

```bash
cd /home/daniel/src/forms-lab && bun run dev &
sleep 2
curl -s http://localhost:3000/health | head -1
curl -s http://localhost:3000/catalog | grep -q "Catalog" && echo "✓ Catalog landing"
curl -s http://localhost:3000/catalog/personas | grep -q "Maya" && echo "✓ Personas"
curl -s http://localhost:3000/catalog/decisions | grep -q "architecture" && echo "✓ Decisions"
curl -s http://localhost:3000/catalog/architecture | grep -q "System Overview" && echo "✓ Architecture"
curl -s http://localhost:3000/catalog/stories | grep -q "Stories" && echo "✓ Stories"
curl -s http://localhost:3000/catalog/experiments | grep -q "Experiments" && echo "✓ Experiments"
kill %1
```

Expected: All checks pass

- [ ] **Step 9: Commit synced stories**

```bash
cd /home/daniel/src/forms-lab
git add catalog/stories/
git commit -m "docs: sync user stories from GitHub Issues

Stories synced via 'bun run cli sync-stories' from flexion/forms-lab issues."
```

Expected: Committed

- [ ] **Step 10: Push and update PR**

```bash
cd /home/daniel/src/forms-lab && git push
```

Expected: Branch updated, PR #10 reflects all new commits

---

## Self-Review

**1. Spec Coverage:**

From design spec:
- ✓ Design system foundation (tokens, layers, compositions, components) — Task 2
- ✓ CSS build and delivery via serveStatic — Tasks 1, 5
- ✓ markdown-it rendering — Task 3
- ✓ Shared components (StatusBadge, ContentCard, TagList, Prose) — Task 4
- ✓ Layout migration to design system — Task 5
- ✓ Catalog routes for all content types — Task 6
- ✓ Tests for all route types — Task 7
- ✓ 13 ADRs across 3 groups — Task 8
- ✓ 2 architecture documents — Task 8
- ✓ CLI dispatcher — Task 9
- ✓ sync-stories command — Task 9
- ✓ GitHub client interface — Task 9
- ✓ knowledge-base.yaml — Task 10
- ✓ Bootstrapping session log — Task 10
- ✓ CLAUDE.md update — Task 10
- ✓ stylelint configuration — Task 1
- ✓ End-to-end verification — Task 11

**2. Placeholder Scan:**

Task 8 Steps 3-4 use summary descriptions for ADR content rather than full markdown. This is intentional — each ADR should be 3-5 paragraphs using the format shown in Step 2, with the specific context provided in the summary. The implementer writes the full content following the template.

All other tasks have complete code in every step. No TBD, TODO, or "implement later" found.

**3. Type Consistency:**

- `Decision`, `ArchitectureDoc`, `Story` types defined in Task 3, used consistently in route files (Task 6)
- `GitHubIssue` interface defined in Task 9 Step 7, used in sync-stories (Step 8) and tests (Step 5)
- `parseArgs`, `getCommand` exported from `cli.ts` (Task 9 Step 3), tested in Step 1
- `syncStoriesFromIssues` exported from `sync-stories.ts` (Task 9 Step 8), tested in Step 5
- `renderMarkdown` exported from `markdown.ts` (Task 3 Step 3), used in `Prose.tsx` (Task 4 Step 4)
- `parseMarkdown`, `readMarkdownDir` already exist in `markdown.ts`, used consistently in all route files

**Gap found:** The `.claude/settings.json` reference to meta-knowledge-base mentioned in the design spec is not covered by a task. This integration depends on what `.claude/settings.json` supports — adding it would require exploring Claude Code's project-level configuration options. This should be handled as a follow-up once the exact mechanism is determined.

---

## Execution Handoff

Plan complete and saved to `notes/final-project/2026-04-07-slice0-pr1-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
