# Story 3: Project Pages UX Polish

Design spec for the full UX pass across project pages — navigation, project list, project detail, and accessibility.

## Overview

The project pages (list, new, detail) are functionally complete but lack polish. Content doesn't fill the available width, the project list uses an unstructured list, the spec review page has layout issues, and inline styles bypass the design system. This spec addresses all six issues in a fix-in-place approach.

## 1. Navigation

Add "Projects" to the header nav, visible only when the user is authenticated. Position it between "Catalog" and the user info. Also add it to the footer nav.

**Header change in `flex-layout/index.tsx`:**

```
Home | Catalog | Projects (auth-only) | [avatar] Name | Sign out
```

The `currentPath` check uses `startsWith('/projects')` to highlight for all project sub-pages.

## 2. Layout fill

The `l-center` container (960px max-width) is the right size. The issue is children not stretching to fill the available width.

**Fixes:**
- Add `width: 100%` to `.flex-table` base styles
- The `l-stack` flexbox column layout already stretches children — any cases where content doesn't fill are due to child-level constraints (e.g., `<ol>` default padding, missing width on custom elements)

No new layout variants. All pages stay at 960px.

## 3. Project list table

Replace the `<ul>` card list with a `flex-table`.

**Columns:**
- **Name** — links to project detail. Shows summary text below: field/group counts for ready projects, "Extracting form structure..." for in-progress.
- **Status** — semantic badge: Ready (success), Extracting (info), Error (error).
- **Created** — formatted date (e.g., "Apr 11, 2026").
- **Actions** — "View" link to detail page. "Delete" as a POST form button with confirmation.

**Table attributes:** `data-variant="borderless"` and `data-stacked` for mobile responsiveness.

**Empty state:** Keep the current friendly message ("No projects yet. Create one to get started.") with a prominent "New Project" button.

**Delete flow:** POST form with inline confirmation. Not a bare link.

## 4. Project detail — summary bar

Add a summary bar below the title showing key metrics at a glance:

```
14 groups  ·  135 fields  ·  12 pages  ·  0 low confidence
```

Uses a horizontal flex layout with design token colors. Numbers in bold, labels in muted text.

## 5. Project detail — back link

Add a "Back to projects" link above the `<h1>`, styled as a small text link with a left arrow.

## 6. Project detail — spec table improvements

**Conditions column:** Add a "Conditions" column to the data requirements table. When a field has a `condition` property, display it as a readable string: "When [field label] equals [value]". Fields without conditions show an em dash.

**Borderless variant:** Use `data-variant="borderless"` on spec tables for less visual noise with the dense data.

**Scope attributes:** Add `scope="col"` to all `<th>` elements for screen reader accessibility.

## 7. Project detail — form layout section

Replace the `<ol>` with styled card rows.

Each page rendered as:

```
[number]  Page Title                                    [delivery mode badge]
          Group Name 1, Group Name 2
```

- **Number** — page sequence, styled as muted text
- **Title** — bold, primary text
- **Groups** — group IDs resolved to their actual titles from the spec. Shown as muted secondary text.
- **Delivery mode** — badge with semantic color: Static (gray), Conversational (blue), Hybrid (amber)
- **Container** — `border: 1px solid var(--flex-color-border)`, `border-radius` per design tokens

Group ID resolution: build a map from `spec.groups` by `id` to `title`, then look up each page's group references.

## 8. Accessibility and design tokens

**Inline style removal:** Replace all `style=` attributes in `components.tsx` with:
- Design system component classes (e.g., `flex-badge`, `flex-table`, `flex-alert`)
- Design token CSS custom properties via component-scoped CSS
- Layout composition classes (`l-stack`, `l-cluster`)

**Status badges:** Use a consistent `flex-badge` pattern with `data-status` attribute mapped to token-based colors via CSS:
- `data-status="ready"` — success colors
- `data-status="extracting"` — info colors
- `data-status="error"` — error colors

**Table accessibility:**
- `scope="col"` on all `<th>` elements
- `data-stacked` on tables for mobile responsiveness
- `data-label` attributes on `<td>` cells for stacked mobile labels

**Action link accessibility:**
- `aria-label` on "View" and "Delete" links/buttons to include the project name (e.g., `aria-label="View Application for Pardon"`)

**Delete confirmation:**
- POST form with a `<button>` (not a link)
- Inline confirmation: clicking "Delete" reveals "Confirm delete?" with confirm/cancel buttons
- Progressive enhancement: works without JS via a separate confirmation page

**Focus management:**
- Replace `<meta http-equiv="refresh">` with a JS polling approach that fetches project status and updates the page content without a full reload
- Keep meta-refresh as a `<noscript>` fallback
- Polling interval: 3 seconds, same as current

## Files changed

- `src/app/components/flex-layout/index.tsx` — add Projects nav item
- `src/app/components/flex-table/styles.css` — add `width: 100%`
- `src/app/routes/projects/components.tsx` — all component changes
- `src/app/routes/projects/styles.css` — new file for project-specific styles (badges, form layout cards, summary bar)
- `src/app/public/styles.css` — import the new project styles

## Out of scope

- Editing extracted specs (story 4)
- Tabbed or accordion layout for the detail page (can revisit when editing is added)
- Project search or filtering (not needed at current scale)
