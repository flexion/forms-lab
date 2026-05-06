# Story #117: Resolve UX Inconsistencies — Design

## Goal

Unify navigation patterns across the application so users always know where they are and how to get back. Anchor the design on the GitHub repo-as-container model: every meaningful action happens within a project context.

## Approach

Repo-centric navigation (Approach B from brainstorming). Move forms under project scope, add a global projects directory, unify breadcrumbs on one component, and add a "Forms" tab to the existing repo nav.

## Design

### 1. Route Restructuring

Forms move under project scope. The project is the universal container.

| Current Route | New Route | Notes |
|---------------|-----------|-------|
| `GET /forms` | `GET /forms` | Stays — becomes cross-project form directory |
| `GET /forms/sessions` | `GET /forms/sessions` | Stays — "my sessions" across all projects |
| `GET /forms/:specId` | `GET /:owner/:slug/forms` | Form landing page, scoped to project |
| `POST /forms/:specId/sessions` | `POST /:owner/:slug/forms/sessions` | Create session |
| `GET /forms/:specId/sessions/:sid/pages/:p` | `GET /:owner/:slug/forms/sessions/:sid/pages/:p` | Form page |
| `POST /forms/:specId/sessions/:sid/pages/:p` | `POST /:owner/:slug/forms/sessions/:sid/pages/:p` | Submit page |
| `GET /forms/:specId/sessions/:sid/review` | `GET /:owner/:slug/forms/sessions/:sid/review` | Review |
| `POST /forms/:specId/sessions/:sid/submit` | `POST /:owner/:slug/forms/sessions/:sid/submit` | Submit form |
| `GET /forms/:specId/sessions/:sid/confirmation` | `GET /:owner/:slug/forms/sessions/:sid/confirmation` | Confirmation |
| `GET /forms/:specId/submissions/:subId/pdf` | `GET /:owner/:slug/forms/submissions/:subId/pdf` | PDF download |
| `GET /forms/sessions/:sid/submission` | `GET /forms/sessions/:sid/submission` | Read-only submission (stays top-level) |

**Branch-qualified variants** follow the same pattern with `/branches/:branch/` inserted after `/forms/`:
- `GET /:owner/:slug/forms/branches/:branch/sessions/:sid/pages/:p`
- etc.

**Chat routes** follow the same pattern with `/chat` appended to page routes.

**Key decisions:**
- `:specId` drops from URLs — a project has one form spec (`forms/default/`), so `/:owner/:slug/forms` is unambiguous.
- The `specIdIndex` cache continues resolving `specId → (owner, slug)` internally. No schema migration for sessions.
- No redirects from old URLs — clean break (this is a lab, not production).

### 2. Breadcrumb Model

**One component everywhere.** The existing `flex-breadcrumb` design system component replaces all custom breadcrumb HTML. The custom implementation in `owner/components.tsx` gets removed.

**Breadcrumb patterns by context:**

```
Project browsing:
  daniel / snap-application / tree / main / src
  daniel / snap-application / commits
  daniel / snap-application / settings

Form filling (under project):
  daniel / snap-application / forms / Page 2 of 5
  daniel / snap-application / forms / Review
  daniel / snap-application / forms / Confirmation

Form directory (top-level):
  Forms

My sessions (top-level):
  Forms / My Sessions

Catalog:
  Catalog / Architecture / Software Architecture
  Catalog / Stories / #117 Resolve UX inconsistencies

Projects directory:
  Projects

User profile:
  daniel
```

**Rules:**
- Every page except the home page has a breadcrumb.
- When there are multiple segments, every segment except the last is a link.
- The last segment is the current page (not a link).
- Single-segment breadcrumbs (e.g., just "Projects") serve as a page title indicator — not a link.
- Project-scoped pages always start with `owner / project-slug`.

### 3. Global Projects Directory

**New route: `GET /projects`** — simple listing of all projects on the instance.

**Content:**
- All projects with status "ready".
- Each entry shows: project name (linked to project overview), owner (linked to `/:owner` profile).
- Flat list sorted by most recently updated.
- No search, filtering, or pagination.

**Header nav update:**
- Current: `Home | Forms | Projects (→ /:user) | Catalog`
- New: `Home | Forms | Projects (→ /projects) | Catalog`
- Dashboard (`/`) still shows your recent projects as quick-access.
- User profile (`/:owner`) still shows that user's projects, reachable from the directory.

### 4. Repo Nav "Forms" Tab

The existing `RepoNav` component gains a "Forms" tab:

```
Overview | Forms | Pull Requests | History | Files
```

- Links to `/:owner/:slug/forms`.
- Shows as `current` on all form-filling pages within that project.
- Form-filling pages render `RepoNav` so users can always jump between project sections.
- The `RepoTab` type adds `'forms'` to its union.

### 5. Header Nav "Current" Indicator

Replace path-based prefix matching with an explicit `currentSection` prop on Layout:

- `"home"` — dashboard
- `"forms"` — `/forms` directory and all project-scoped form-filling pages
- `"projects"` — `/projects` directory, `/:owner`, `/:owner/:slug`, and all project browsing
- `"catalog"` — `/catalog/*`

Each route sets this explicitly when rendering the layout.

### 6. `/forms` Directory Page

The top-level `/forms` route changes from a standalone listing to a cross-project directory:

- Lists all available forms across all projects.
- Each entry shows: form title, project name + owner (linked to project), and a "Start" action linking to `/:owner/:slug/forms`.
- Links go into project-scoped URLs, establishing project context immediately.

### 7. "My Sessions" Page

`/forms/sessions` stays top-level since sessions span projects. Each session entry shows:

- Form title
- Project context (owner/slug, linked)
- Session status and date
- Link into the project-scoped session URL (`/:owner/:slug/forms/sessions/:sid/...`)

## Out of Scope

- **Component contract completeness** (AC 3) — separate story for writing `meta.ts`/`contract.tsx` for the 24 unregistered components.
- **Sidebar nav for project pages** — only catalog keeps its sidebar.
- **Search or filtering** on directories.
- **Form step indicator redesign** — current step indicator in FormPageView stays as-is.
- **Redirects from old `/forms/:specId/...` URLs** — clean break.
- **`flex-in-page-nav`** — exists unused, leave it for now.
- **Form edit routes** (`/:owner/:slug/edit/...`) — already project-scoped, no changes needed.

## Acceptance Criteria Mapping

| AC | Addressed By |
|----|-------------|
| All navigable pages include consistent breadcrumb trails | Section 2: unified breadcrumb component on every page |
| Navigation patterns are unified | Sections 1, 3, 4, 5: repo-centric model, projects directory, repo tabs, consistent current indicator |
| Design system components have complete contracts | Out of scope — separate story |
| Walkthrough shows no jarring transitions | Sections 1-6 together: consistent chrome from landing → project → form → back |
