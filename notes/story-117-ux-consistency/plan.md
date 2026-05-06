# UX Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify navigation across the application by moving forms under project scope, adding a global projects directory, unifying breadcrumbs on one component, and adding a "Forms" tab to the repo nav.

**Architecture:** Refactor the form router to accept owner/slug context instead of specId in URLs. Mount project-scoped form routes before the owner catch-all in server.tsx. Convert the top-level `/forms` route to a cross-project directory. Replace all custom breadcrumb HTML with the `flex-breadcrumb` design system component. Add `currentSection` prop to Layout to replace path-based nav highlighting.

**Tech Stack:** Hono (server-rendered JSX), Bun, bun:test

---

### Task 1: Add `listAllProjects` to Project Service

Add a method to list all projects regardless of owner. The store already supports `list()` with no args — we just need to expose it through the service.

**Files:**
- Modify: `src/services/projects/project-service.ts:69-87` (interface + implementation)
- Modify: `src/services/projects/index.ts` (already exports ProjectService type)
- Test: `test/projects/project-service.test.ts`

- [ ] **Step 1: Write the failing test**

Find the existing project service test file (or create one). Add a test:

```typescript
import { describe, expect, it } from 'bun:test'

describe('ProjectService.listAllProjects', () => {
  it('returns projects from all users', async () => {
    // Use the existing test setup pattern from the file.
    // Create projects for two different users, then call listAllProjects().
    const all = service.listAllProjects()
    expect(all.length).toBeGreaterThanOrEqual(2)
    const owners = new Set(all.map(p => p.createdBy))
    expect(owners.size).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/projects/project-service.test.ts`
Expected: FAIL — `listAllProjects` is not a function.

- [ ] **Step 3: Add `listAllProjects` to the `ProjectService` interface**

In `src/services/projects/project-service.ts`, add to the interface at line ~87:

```typescript
listAllProjects(): ProjectIndex[]
```

- [ ] **Step 4: Implement `listAllProjects` in the factory**

In the returned object from `createProjectService`, add:

```typescript
listAllProjects(): ProjectIndex[] {
  return store.list()
},
```

This calls `store.list()` with no userId arg, which returns all projects (the SQL is `SELECT * FROM projects ORDER BY created_at DESC`).

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/projects/project-service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/projects/project-service.ts test/projects/
git commit -m "feat(projects): add listAllProjects to project service"
```

---

### Task 2: Add `currentSection` Prop to Layout

Replace the `currentPath` string prop with a `currentSection` union prop so header nav highlighting doesn't depend on URL prefix matching.

**Files:**
- Modify: `src/design-system/components/flex-layout/index.tsx:12-18` (props) and lines ~82-123 (nav items)
- Test: `test/design-system/flex-layout.test.ts` (or existing test file)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { Layout } from '../../src/design-system/components/flex-layout'

describe('Layout currentSection', () => {
  it('marks Forms nav item as current when currentSection is "forms"', () => {
    const html = (
      <Layout currentSection="forms" user={{ login: 'alice', name: 'Alice', avatarUrl: '' }}>
        <p>content</p>
      </Layout>
    ).toString()
    // The Forms nav link should have aria-current
    expect(html).toContain('aria-current="page"')
    // Verify it's the Forms link, not another one
    expect(html).toMatch(/Forms.*aria-current|aria-current.*Forms/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/design-system/flex-layout.test.ts`
Expected: FAIL — `currentSection` is not a recognized prop.

- [ ] **Step 3: Update the LayoutProps interface**

In `src/design-system/components/flex-layout/index.tsx`, change the props:

```typescript
interface LayoutProps {
  title?: string
  sidebar?: Child
  currentSection?: 'home' | 'forms' | 'projects' | 'catalog'
  /** @deprecated Use currentSection instead */
  currentPath?: string
  user?: HeaderUser | null
  contentWidth?: 'centered' | 'full'
}
```

Keep `currentPath` temporarily so existing call sites don't break. It will be removed after all callers are migrated.

- [ ] **Step 4: Update the nav highlighting logic**

Replace the `current` prop logic in the header nav items (lines ~82-123). The new logic:

```tsx
const section = props.currentSection
// Fall back to currentPath matching during migration
const isHome = section === 'home' || (!section && props.currentPath === '/')
const isForms = section === 'forms' || (!section && props.currentPath?.startsWith('/forms'))
const isProjects = section === 'projects' || (!section && false)
const isCatalog = section === 'catalog' || (!section && props.currentPath?.startsWith('/catalog'))
```

Then use these booleans as the `current` values on each `HeaderNavItem`.

For the "Projects" link: change `href` from `resolveUrl(\`/\${props.user.login}\`)` to `resolveUrl('/projects')` and use `isProjects` for `current`.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/design-system/flex-layout.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/design-system/components/flex-layout/index.tsx test/design-system/
git commit -m "feat(layout): add currentSection prop for explicit nav highlighting"
```

---

### Task 3: Add "Forms" Tab to RepoNav

Add a "Forms" entry to the repo tab navigation. Update the `RepoTab` type and the `RepoNav` component.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/components.tsx:372-402` (RepoTab type + RepoNav component)
- Test: `test/owner/repo-nav.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { renderRepoNav } from './helpers'  // or inline

describe('RepoNav', () => {
  it('renders a Forms tab linking to /:owner/:slug/forms', () => {
    // Render RepoNav with current='forms'
    // Assert it contains a link to /alice/my-project/forms
    // Assert the Forms link has aria-current="page"
  })
})
```

Note: `RepoNav` is not exported — it's a private component inside `components.tsx`. The test should either:
- Test via a route test (render the full page and check the nav), or
- Export `RepoNav` for testing.

Prefer testing via the route: render `GET /:owner/:slug` and verify the response contains a "Forms" link.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/owner/repo-nav.test.ts`
Expected: FAIL — no "Forms" link in the rendered page.

- [ ] **Step 3: Update `RepoTab` type**

In `src/entrypoints/app/routes/owner/components.tsx` line 372:

```typescript
type RepoTab = 'overview' | 'forms' | 'pulls' | 'history' | 'files'
```

- [ ] **Step 4: Add "Forms" tab to `RepoNav`**

In the tabs array (line 380-385), add the Forms entry after Overview:

```typescript
const tabs: { id: RepoTab; label: string; href: string }[] = [
  { id: 'overview', label: 'Overview', href: base },
  { id: 'forms', label: 'Forms', href: `${base}/forms` },
  { id: 'pulls', label: 'Pull Requests', href: `${base}/pulls` },
  { id: 'history', label: 'History', href: `${base}/commits` },
  { id: 'files', label: 'Files', href: `${base}/tree/main` },
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/owner/repo-nav.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/routes/owner/components.tsx test/owner/
git commit -m "feat(nav): add Forms tab to repo navigation"
```

---

### Task 4: Create Project-Scoped Form Router

Refactor `createFormRouter` so it can work in a project-scoped context where `owner` and `slug` come from route params instead of looking up specId. The key change: `formPathPrefix` uses `/:owner/:slug/forms` instead of `/forms/:specId`.

**Files:**
- Modify: `src/entrypoints/app/routes/forms/index.tsx` — add owner/slug context support
- Test: `test/forms/project-scoped-routes.test.ts`

- [ ] **Step 1: Write the failing test for project-scoped form landing**

Create `test/forms/project-scoped-routes.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createFormRouter } from '../../src/entrypoints/app/routes/forms'

const TEST_USER = { login: 'alice', name: 'Alice', avatarUrl: '' }

// Same test fixtures as test/forms/routes.test.ts — reuse the spec registry pattern.

function createProjectScopedApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER)
    await next()
  })
  app.route(
    '/:owner/:slug/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: async (specId) => specRegistry.get(specId) ?? null,
      listSpecs: async () => [...specRegistry.values()],
      projectContext: { owner: 'alice', slug: 'my-project' },
    }),
  )
  return app
}

describe('project-scoped form routes', () => {
  it('GET /:owner/:slug/forms returns form landing', async () => {
    const app = createProjectScopedApp()
    const res = await app.request('/alice/my-project/forms')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Start now')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/project-scoped-routes.test.ts`
Expected: FAIL — `projectContext` is not a recognized option.

- [ ] **Step 3: Add `projectContext` to `FormRouterDeps`**

In `src/entrypoints/app/routes/forms/index.tsx`, extend the deps interface:

```typescript
export interface FormRouterDeps {
  // ... existing fields ...
  /** When set, the router operates in project-scoped mode. URLs use
   *  /:owner/:slug/forms instead of /forms/:specId. */
  projectContext?: {
    owner: string
    slug: string
    getOwnerSlug: (c: Context) => { owner: string; slug: string }
  } | undefined
}
```

Actually, since the router is mounted at `/:owner/:slug/forms`, the owner/slug come from route params. Better approach: add a `resolveProjectContext` function to deps:

```typescript
export interface FormRouterDeps {
  // ... existing fields ...
  /** Resolves owner/slug from route context. When provided, routes use
   *  project-scoped URL shapes (/:owner/:slug/forms/...). */
  resolveOwnerSlug?: (c: Context) => { owner: string; slug: string }
}
```

- [ ] **Step 4: Update `formPathPrefix` to support project-scoped mode**

Add a new helper alongside the existing one:

```typescript
function projectFormPathPrefix(
  owner: string,
  slug: string,
  branch: string,
): string {
  const base = `/${owner}/${slug}/forms`
  return branch === MAIN_BRANCH ? base : `${base}/branches/${branch}`
}
```

- [ ] **Step 5: Update handlers to use project context when available**

In each handler (handleLanding, handleCreateSession, handleRenderPage, etc.), detect project-scoped mode:

```typescript
async function handleLanding(c: Context) {
  const branch = readBranch(c)
  const specId = c.req.param('specId')

  // In project-scoped mode, resolve specs differently
  let specs: ResolvedSpecs | null
  let prefix: string

  if (resolveOwnerSlug) {
    const { owner, slug } = resolveOwnerSlug(c)
    // In project mode, there's one spec per project — use the first from listSpecs
    const allSpecs = await listSpecs()
    specs = allSpecs[0] ?? null
    if (!specs) return c.notFound()
    prefix = projectFormPathPrefix(owner, slug, branch)
  } else {
    if (!specId) return c.notFound()
    specs = await getSpecs(specId, branch)
    if (!specs) return c.notFound()
    prefix = formPathPrefix(specs.dataSpec.id, branch)
  }
  // ... rest of handler uses `specs` and `prefix` ...
}
```

This is repetitive across many handlers. Extract a helper:

```typescript
async function resolveFormContext(c: Context): Promise<{
  specs: ResolvedSpecs
  prefix: string
  branch: string
  owner?: string
  slug?: string
} | null> {
  const branch = readBranch(c)
  if (resolveOwnerSlug) {
    const { owner, slug } = resolveOwnerSlug(c)
    const specs = await getSpecs(c.req.param('specId') ?? '', branch)
      ?? (await listSpecs())[0]
      ?? null
    if (!specs) return null
    return {
      specs,
      prefix: projectFormPathPrefix(owner, slug, branch),
      branch,
      owner,
      slug,
    }
  }
  const specId = c.req.param('specId')
  if (!specId) return null
  const specs = await getSpecs(specId, branch)
  if (!specs) return null
  return {
    specs,
    prefix: formPathPrefix(specs.dataSpec.id, branch),
    branch,
  }
}
```

Then each handler becomes:

```typescript
async function handleLanding(c: Context) {
  const ctx = await resolveFormContext(c)
  if (!ctx) return c.notFound()
  const { specs, prefix, branch } = ctx
  // ... render as before using specs and prefix ...
}
```

- [ ] **Step 6: Register project-scoped route patterns**

When `resolveOwnerSlug` is provided, the router is mounted at `/:owner/:slug/forms`, so routes within it are relative:

```typescript
// Project-scoped: no :specId needed (project has one spec)
if (resolveOwnerSlug) {
  forms.get('/', handleLanding)
  forms.get('/branches/:branch', handleLanding)
  forms.post('/sessions', handleCreateSession)
  forms.post('/branches/:branch/sessions', handleCreateSession)
  forms.get('/sessions/:sessionId/pages/:pageIndex', handleRenderPage)
  forms.get('/branches/:branch/sessions/:sessionId/pages/:pageIndex', handleRenderPage)
  // ... etc for all routes
} else {
  // Legacy specId-based routes (existing code)
  forms.get('/:specId', handleLanding)
  // ... etc
}
```

- [ ] **Step 7: Run tests to verify everything passes**

Run: `bun test test/forms/project-scoped-routes.test.ts`
Expected: PASS

Also run existing tests to ensure no regression:
Run: `bun test test/forms/routes.test.ts`
Expected: PASS (existing specId routes still work)

- [ ] **Step 8: Commit**

```bash
git add src/entrypoints/app/routes/forms/index.tsx test/forms/project-scoped-routes.test.ts
git commit -m "feat(forms): support project-scoped form routing"
```

---

### Task 5: Mount Project-Scoped Form Routes in server.tsx

Wire up the new project-scoped form router in the server, mounting it before the owner catch-all route. Update the top-level `/forms` to be a directory page.

**Files:**
- Modify: `src/entrypoints/app/server.tsx:466-569`
- Test: `test/forms/directory.test.ts`

- [ ] **Step 1: Write the failing test for project-scoped mounting**

```typescript
describe('project-scoped form routes via server', () => {
  it('GET /:owner/:slug/forms serves the form landing', async () => {
    // Use the full app from server.tsx or a test harness
    const res = await app.request('/alice/my-project/forms')
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Create a project-scoped form router in server.tsx**

Between the existing `/forms` mount and the owner catch-all, add:

```typescript
// Mount project-scoped form routes BEFORE owner catch-all
const projectFormRouter = new Hono()
projectFormRouter.route(
  '/:owner/:slug/forms',
  createFormRouter({
    sessionGateway,
    submissionGateway,
    conversationGateway,
    fillingAgent,
    specSnapshotStore,
    resolveOwnerSlug: (c) => ({
      owner: c.req.param('owner')!,
      slug: c.req.param('slug')!,
    }),
    async getSpecs(specId, ref) {
      // This will be called with empty specId in project mode;
      // we need to resolve from the project context.
      // The resolveOwnerSlug function provides owner/slug.
      // We'll look up the project's spec directly.
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      return readProjectSpecs(project.slug, ref ?? 'main')
    },
    async listSpecs() {
      // Same as before — returns all specs
      // ... (reuse existing listSpecs logic)
    },
    getEditHref(specId, branch) {
      const entry = specIdIndex.get(specId)
      if (!entry) return null
      return resolveUrl(`/${entry.owner}/${entry.slug}/edit/${branch}`)
    },
    async getSourcePdf(specId, _specVersion) {
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      return formProjectRepo.readFile(project.slug, 'main', `source/${project.slug}.pdf`)
    },
    async getFieldMapping(specId, specVersion) {
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      const buf = await formProjectRepo.readFile(project.slug, specVersion, 'forms/default/field-mapping.json')
      if (!buf) return null
      return JSON.parse(buf.toString())
    },
  }),
)
app.route('/', projectFormRouter)
```

The `getSpecs` function in project-scoped mode resolves differently. Add a new dep `getSpecsByProject` alongside the existing `getSpecs`:

```typescript
export interface FormRouterDeps {
  // ... existing fields ...
  /** Resolves specs for a project by owner/slug. Used in project-scoped mode. */
  getSpecsByProject?: (owner: string, slug: string, ref?: string) => Promise<ResolvedSpecs | null>
}
```

In server.tsx, wire it to `readProjectSpecs`:

```typescript
async getSpecsByProject(owner, slug, ref) {
  const project = projectStore.getBySlug(slug)
  if (!project || project.createdBy !== owner) return null
  return readProjectSpecs(project.slug, ref ?? 'main')
},
```

Then `resolveFormContext` uses `getSpecsByProject` when `resolveOwnerSlug` is present, and falls back to `getSpecs(specId)` in legacy mode.

- [ ] **Step 3: Update the top-level `/forms` route to be a directory**

The existing `forms.get('/')` handler (line 140) currently lists forms with links to `/forms/:specId`. Change it to:
- Show form title, owner, project name
- Link to `/:owner/:slug/forms` instead of `/forms/:specId`

This requires `listSpecs()` to also return owner/slug info. Extend the return type or use the `specIdIndex` cache:

```typescript
forms.get('/', async (c) => {
  const allSpecs = await listSpecs()
  return c.html(
    <Layout user={c.get('user')} title="Forms" currentSection="forms">
      <div class="flex-form" data-size="large">
        <div class="l-cluster" style="justify-content: space-between; align-items: baseline;">
          <h1>Available Forms</h1>
          <a href={resolveUrl('/forms/sessions')}>My sessions</a>
        </div>
        {allSpecs.length === 0 ? (
          <p>No forms available.</p>
        ) : (
          <table class="flex-table" data-variant="borderless">
            <thead>
              <tr>
                <th scope="col">Form</th>
                <th scope="col">Project</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {allSpecs.map(({ dataSpec, formSpec }) => {
                const entry = specIdIndex.get(dataSpec.id)
                const formHref = entry
                  ? resolveUrl(`/${entry.owner}/${entry.slug}/forms`)
                  : '#'
                return (
                  <tr key={dataSpec.id}>
                    <th scope="row">
                      <a href={formHref}>{formSpec.title}</a>
                    </th>
                    <td>
                      {entry ? (
                        <a href={resolveUrl(`/${entry.owner}/${entry.slug}`)}>
                          {entry.owner}/{entry.slug}
                        </a>
                      ) : '—'}
                    </td>
                    <td>{formSpec.description ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>,
  )
})
```

Note: the `specIdIndex` is populated as a side effect of `listSpecs()`, so by the time we render, entries are available. To avoid coupling to this cache, consider having `listSpecs` return `{ dataSpec, formSpec, sha, owner, slug }` — this is cleaner. Adjust the `ResolvedSpecs` type or create a new `DirectoryEntry` type.

- [ ] **Step 4: Update "My Sessions" to use project-scoped URLs**

The sessions listing (line 182) currently links to `/forms/:specId/sessions/:sid/pages/0`. Update to use `/:owner/:slug/forms/sessions/:sid/pages/0`:

```typescript
// Resolve owner/slug for each session's specId
const projectEntries = await Promise.all(
  uniqueSpecIds.map(async (specId) => {
    const project = await findProjectBySpecId(specId)
    return [specId, project] as const
  }),
)
const projectMap = new Map(projectEntries)

// In the render:
const project = projectMap.get(s.specId)
const sessionHref = project
  ? resolveUrl(`/${project.owner}/${project.slug}/forms/sessions/${s.id}/pages/0`)
  : resolveUrl(`/forms/sessions/${s.id}/submission`)
```

Add a `resolveProjectForSpec` dep to `FormRouterDeps`:

```typescript
resolveProjectForSpec?: (specId: string) => Promise<{ owner: string; slug: string } | null>
```

In server.tsx, wire it to `findProjectBySpecId`. The "My Sessions" handler uses this to resolve project context for each session's spec.

- [ ] **Step 5: Run tests**

Run: `bun test test/forms/`
Expected: PASS for both project-scoped and directory tests.

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/server.tsx src/entrypoints/app/routes/forms/index.tsx test/forms/
git commit -m "feat(forms): mount project-scoped form routes, update /forms directory"
```

---

### Task 6: Create `/projects` Directory Route

Add a new route that lists all projects on the instance.

**Files:**
- Create: `src/entrypoints/app/routes/projects.tsx`
- Modify: `src/entrypoints/app/server.tsx` (mount the route)
- Test: `test/projects/directory-route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'bun:test'

describe('GET /projects', () => {
  it('lists all projects with links to project pages', async () => {
    const res = await app.request('/projects')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Projects')
    // Should contain project links
    expect(html).toContain('/alice/my-project')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/projects/directory-route.test.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Create the projects directory route**

Create `src/entrypoints/app/routes/projects.tsx`:

```tsx
import type { Context } from 'hono'
import type { ProjectService } from '../../../services/projects'
import { resolveUrl } from '../../../shared/base-path'
import { Layout } from '../../../design-system/components/flex-layout'
import { Breadcrumb } from '../../../design-system/components/flex-breadcrumb'

export function projectsDirectoryHandler(projectService: ProjectService) {
  return (c: Context) => {
    const user = c.get('user')
    const projects = projectService.listAllProjects()
      .filter(p => p.status === 'ready')
    return c.html(
      <Layout user={user} title="Projects" currentSection="projects">
        <Breadcrumb items={[{ label: 'Projects' }]} />
        <div class="flex-form" data-size="large">
          <h1>Projects</h1>
          {projects.length === 0 ? (
            <p>No projects yet.</p>
          ) : (
            <table class="flex-table" data-variant="borderless">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <th scope="row">
                      <a href={resolveUrl(`/${project.createdBy}/${project.slug}`)}>
                        {project.name}
                      </a>
                    </th>
                    <td>
                      <a href={resolveUrl(`/${project.createdBy}`)}>
                        {project.createdBy}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>,
    )
  }
}
```

- [ ] **Step 4: Mount the route in server.tsx**

Before the `/forms` mount, add:

```typescript
import { projectsDirectoryHandler } from './routes/projects'

app.get('/projects', projectsDirectoryHandler(projectService))
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/projects/directory-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/routes/projects.tsx src/entrypoints/app/server.tsx test/projects/directory-route.test.ts
git commit -m "feat(projects): add /projects directory page"
```

---

### Task 7: Update Header Nav "Projects" Link

Change the "Projects" header link from `/:user` to `/projects`.

**Files:**
- Modify: `src/design-system/components/flex-layout/index.tsx:82-123`

- [ ] **Step 1: Write the failing test**

```typescript
describe('Layout header nav', () => {
  it('links Projects to /projects instead of user profile', () => {
    const html = (
      <Layout currentSection="projects" user={{ login: 'alice', name: 'Alice', avatarUrl: '' }}>
        <p>content</p>
      </Layout>
    ).toString()
    expect(html).toContain('href="/projects"')
    expect(html).not.toContain('href="/alice"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — href still points to `/alice`.

- [ ] **Step 3: Update the Projects nav item**

In `src/design-system/components/flex-layout/index.tsx`, change:

```tsx
<HeaderNavItem
  href={resolveUrl('/projects')}
  label="Projects"
  current={isProjects}
/>
```

This replaces the current `href={resolveUrl(\`/\${props.user.login}\`)}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/design-system/flex-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/design-system/components/flex-layout/index.tsx test/design-system/
git commit -m "feat(nav): link Projects header nav to /projects directory"
```

---

### Task 8: Unify Breadcrumbs Across All Pages

Replace all custom breadcrumb HTML with the `flex-breadcrumb` component. Add breadcrumbs to pages that don't have them.

**Files:**
- Modify: `src/entrypoints/app/routes/owner/components.tsx` — replace custom breadcrumb HTML in ProjectOverview, PullRequestsPage, tree/blob views, commits page
- Modify: `src/entrypoints/app/routes/forms/index.tsx` — add breadcrumbs to form pages
- Modify: `src/entrypoints/app/routes/catalog/*.tsx` — verify catalog already uses the component (it does)
- Modify: `src/entrypoints/app/server.tsx` — add breadcrumbs to dashboard, settings

The `flex-breadcrumb` component API:
```typescript
interface BreadcrumbItem { label: string; href?: string }
<Breadcrumb items={items} />
```
Last item should omit `href` (rendered without a link, marked `aria-current="page"`).

- [ ] **Step 1: Write a test for breadcrumbs on form pages**

```typescript
describe('form page breadcrumbs', () => {
  it('renders project-scoped breadcrumbs on form landing', async () => {
    const res = await app.request('/alice/my-project/forms')
    const html = await res.text()
    expect(html).toContain('flex-breadcrumb')
    expect(html).toContain('alice')
    expect(html).toContain('my-project')
  })
})
```

- [ ] **Step 2: Add breadcrumbs to form router handlers**

In each handler in `src/entrypoints/app/routes/forms/index.tsx`, when rendering in project-scoped mode, add a `Breadcrumb` component:

```tsx
import { Breadcrumb } from '../../../../design-system/components/flex-breadcrumb'

// In handleLanding:
<Breadcrumb items={[
  { label: owner, href: resolveUrl(`/${owner}`) },
  { label: slug, href: resolveUrl(`/${owner}/${slug}`) },
  { label: 'Forms' },
]} />

// In handleRenderPage:
<Breadcrumb items={[
  { label: owner, href: resolveUrl(`/${owner}`) },
  { label: slug, href: resolveUrl(`/${owner}/${slug}`) },
  { label: 'Forms', href: resolveUrl(`/${owner}/${slug}/forms`) },
  { label: `Page ${pageIndex + 1} of ${pageCount}` },
]} />

// In handleReview:
<Breadcrumb items={[
  { label: owner, href: resolveUrl(`/${owner}`) },
  { label: slug, href: resolveUrl(`/${owner}/${slug}`) },
  { label: 'Forms', href: resolveUrl(`/${owner}/${slug}/forms`) },
  { label: 'Review' },
]} />
```

- [ ] **Step 3: Replace custom breadcrumbs in owner routes**

In `src/entrypoints/app/routes/owner/components.tsx`, the `ProjectOverview` component (line 214) has custom breadcrumb HTML:

```tsx
<nav class="repo-header__path" aria-label="Repository path">
  <a href={resolveUrl(`/${owner}`)}>{owner}</a>
  <span class="repo-header__path-sep" aria-hidden="true">/</span>
  <span class="repo-header__path-slug">{project.slug}</span>
</nav>
```

Replace all instances of this pattern with:

```tsx
<Breadcrumb items={[
  { label: owner, href: resolveUrl(`/${owner}`) },
  { label: project.slug },
]} />
```

Do this for every component that has a `repo-header__path` nav: ProjectOverview, PullRequestsPage, tree browser, blob viewer, commits page, settings page.

For the tree/blob views, extend the breadcrumb with path segments:

```tsx
// Tree view: daniel / my-project / tree / main / src
<Breadcrumb items={[
  { label: owner, href: resolveUrl(`/${owner}`) },
  { label: slug, href: resolveUrl(`/${owner}/${slug}`) },
  { label: 'tree' },
  { label: ref },
  ...pathSegments.map((seg, i) => ({
    label: seg,
    href: i < pathSegments.length - 1
      ? resolveUrl(`/${owner}/${slug}/tree/${ref}/${pathSegments.slice(0, i + 1).join('/')}`)
      : undefined,
  })),
]} />
```

- [ ] **Step 4: Add breadcrumbs to top-level pages**

For `/forms` directory:
```tsx
<Breadcrumb items={[{ label: 'Forms' }]} />
```

For `/forms/sessions`:
```tsx
<Breadcrumb items={[
  { label: 'Forms', href: resolveUrl('/forms') },
  { label: 'My Sessions' },
]} />
```

For `/projects`:
```tsx
<Breadcrumb items={[{ label: 'Projects' }]} />
```

For user profile `/:owner`:
```tsx
<Breadcrumb items={[{ label: owner }]} />
```

- [ ] **Step 5: Run all tests**

Run: `bun test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/app/routes/ src/design-system/
git commit -m "feat(nav): unify breadcrumbs using flex-breadcrumb component"
```

---

### Task 9: Migrate All `currentPath` Usages to `currentSection`

Now that `currentSection` is supported, update every `<Layout>` call to use it and remove the deprecated `currentPath` prop.

**Files:**
- Modify: `src/entrypoints/app/server.tsx` — dashboard, landing, error pages
- Modify: `src/entrypoints/app/routes/forms/index.tsx` — all form pages
- Modify: `src/entrypoints/app/routes/owner/index.tsx` — all owner pages
- Modify: `src/entrypoints/app/routes/catalog/*.tsx` — all catalog pages
- Modify: `src/design-system/components/flex-layout/index.tsx` — remove `currentPath` prop and fallback logic

- [ ] **Step 1: Search for all `currentPath` usages**

Run: `grep -rn 'currentPath' src/`

This will list every file and line. Update each one:
- `currentPath="/"` → `currentSection="home"`
- `currentPath="/forms"` → `currentSection="forms"`
- `currentPath="/catalog"` or startsWith catalog → `currentSection="catalog"`
- Owner/project pages → `currentSection="projects"`
- Settings → `currentSection="projects"` (settings is project-scoped)

- [ ] **Step 2: Update all Layout calls**

Go through each file and replace. Example changes:

```tsx
// server.tsx - dashboard
<Layout currentSection="home" user={user}>

// forms/index.tsx - all form pages
<Layout currentSection="forms" user={c.get('user')}>

// owner/index.tsx - project pages
<Layout currentSection="projects" user={c.get('user')}>

// catalog - all catalog pages
<Layout currentSection="catalog" user={c.get('user')}>
```

- [ ] **Step 3: Remove `currentPath` from Layout props**

Once all callers are migrated, remove `currentPath` from `LayoutProps` and the fallback logic in the nav highlighting.

- [ ] **Step 4: Run all tests**

Run: `bun test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "refactor(layout): migrate all pages from currentPath to currentSection"
```

---

### Task 10: Add RepoNav to Form Pages

Form pages rendered under `/:owner/:slug/forms/...` should include the `RepoNav` component so users can navigate between project sections.

**Files:**
- Modify: `src/entrypoints/app/routes/forms/index.tsx` — add RepoNav to project-scoped form handlers
- Modify: `src/entrypoints/app/routes/owner/components.tsx` — export RepoNav (currently private)

- [ ] **Step 1: Export RepoNav**

In `src/entrypoints/app/routes/owner/components.tsx`, change `RepoNav` from `const` to an export:

```typescript
export const RepoNav: FC<{
  owner: string
  slug: string
  current: RepoTab
}> = ({ owner, slug, current }) => {
```

Also export the `RepoTab` type:

```typescript
export type RepoTab = 'overview' | 'forms' | 'pulls' | 'history' | 'files'
```

- [ ] **Step 2: Add RepoNav to form page handlers**

In the project-scoped form handlers, after the breadcrumb, render:

```tsx
import { RepoNav } from '../owner/components'

// In handleLanding (project-scoped):
<RepoNav owner={owner} slug={slug} current="forms" />
```

Add this to: handleLanding, handleRenderPage, handleReview, handleConfirmation, handleSubmit, handleChatView.

- [ ] **Step 3: Write test**

```typescript
it('renders RepoNav on project-scoped form pages', async () => {
  const res = await app.request('/alice/my-project/forms')
  const html = await res.text()
  expect(html).toContain('repo-nav')
  expect(html).toContain('repo-nav__link--current')
})
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/routes/forms/index.tsx src/entrypoints/app/routes/owner/components.tsx test/forms/
git commit -m "feat(nav): add RepoNav to project-scoped form pages"
```

---

### Task 11: Update Existing Tests

Update all existing test files that reference old `/forms/:specId/...` URL patterns. Tests for the legacy routes should be kept working until Task 12 removes them (or updated to test the new routes).

**Files:**
- Modify: `test/forms/routes.test.ts`
- Modify: `test/forms/conversational-integration.test.ts`
- Modify: `test/forms/pdf-download.test.ts`
- Modify: Other test files in `test/forms/`

- [ ] **Step 1: Inventory all affected test files**

Run: `grep -rn "'/forms/" test/` to find all references.

- [ ] **Step 2: Update test helpers to mount project-scoped routes**

Update `createTestApp()` in each test file to mount the form router in project-scoped mode:

```typescript
function createTestApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER)
    await next()
  })
  app.route(
    '/:owner/:slug/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: async (specId) => specRegistry.get(specId) ?? null,
      listSpecs: async () => [...specRegistry.values()],
      resolveOwnerSlug: (c) => ({
        owner: c.req.param('owner')!,
        slug: c.req.param('slug')!,
      }),
    }),
  )
  return app
}
```

- [ ] **Step 3: Update test request URLs**

Change all `app.request('/forms/benefits-app/...')` to `app.request('/alice/test-project/forms/...')`.

- [ ] **Step 4: Update assertions for new URL patterns**

Any assertions checking for URLs in the response HTML (redirects, links) need updating:
- `/forms/benefits-app/sessions/` → `/alice/test-project/forms/sessions/`
- etc.

- [ ] **Step 5: Run all tests**

Run: `bun test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add test/
git commit -m "test(forms): update tests for project-scoped form routes"
```

---

### Task 12: Remove Legacy `/forms/:specId` Routes

Once project-scoped routes are working and tested, remove the legacy specId-based route registrations.

**Files:**
- Modify: `src/entrypoints/app/routes/forms/index.tsx` — remove `/:specId/*` route registrations and the `formPathPrefix` function
- Modify: `src/entrypoints/app/server.tsx` — simplify the `/forms` mount to only handle directory and sessions

- [ ] **Step 1: Remove specId route registrations**

In `createFormRouter`, remove the `else` branch that registers `/:specId` routes. Only keep the project-scoped routes (registered when `resolveOwnerSlug` is present) and the top-level `/` (directory) and `/sessions` routes.

- [ ] **Step 2: Remove `formPathPrefix` helper**

Delete the `formPathPrefix` function (lines 91-95) — it's no longer needed. Only `projectFormPathPrefix` remains.

- [ ] **Step 3: Clean up `FormRouterDeps`**

If `resolveOwnerSlug` is now always required, remove the `?` optional marker and simplify `resolveFormContext` to remove the legacy branch.

- [ ] **Step 4: Run all tests**

Run: `bun test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/app/routes/forms/index.tsx src/entrypoints/app/server.tsx
git commit -m "refactor(forms): remove legacy specId-based form routes"
```

---

### Task 13: Smoke Test — End-to-End Walkthrough

Start the dev server and manually walk through the app to verify AC 4: "A brief walkthrough of the app from landing page through form creation shows no jarring transitions."

- [ ] **Step 1: Start the dev server**

Run: `bun run dev`

- [ ] **Step 2: Walk through as an anonymous user**

1. Visit `/` — see landing page, no breadcrumbs (home page)
2. Click "Forms" in header → `/forms` — see form directory with breadcrumb "Forms"
3. Click "Projects" in header → `/projects` — see project directory with breadcrumb "Projects"
4. Click "Catalog" in header → `/catalog` — see catalog with sidebar and breadcrumb

- [ ] **Step 3: Sign in and walk through as authenticated user**

1. Visit `/` — see dashboard with recent projects
2. Click "Projects" → `/projects` — directory lists all projects. Header highlights "Projects"
3. Click a project → `/:owner/:slug` — project overview with breadcrumb `owner / slug`. RepoNav shows Overview (current), Forms, Pull Requests, History, Files
4. Click "Forms" tab → `/:owner/:slug/forms` — form landing with breadcrumb `owner / slug / Forms`. RepoNav highlights "Forms"
5. Click "Start now" → creates session, redirects to page 1. Breadcrumb: `owner / slug / Forms / Page 1 of N`
6. Fill form, advance pages — breadcrumb updates page number
7. Reach review → breadcrumb: `owner / slug / Forms / Review`
8. Submit → confirmation page → breadcrumb: `owner / slug / Forms / Confirmation`
9. Click `owner` in breadcrumb → back to user profile
10. Click `slug` in breadcrumb → back to project overview
11. RepoNav always visible on form pages — can click "Overview" to go back to project

- [ ] **Step 4: Check header nav highlighting**

Verify at each step that the correct header nav item is highlighted:
- Dashboard → "Home"
- `/forms` → "Forms"
- `/:owner/:slug/forms/...` → "Forms"
- `/projects` → "Projects"
- `/:owner`, `/:owner/:slug`, `/:owner/:slug/tree/...` → "Projects"
- `/catalog/...` → "Catalog"

- [ ] **Step 5: Run full check suite**

Run: `bun run check`
Expected: PASS (lint + type check + tests)

- [ ] **Step 6: Commit any fixes**

If the walkthrough revealed issues, fix them and commit:

```bash
git add -A
git commit -m "fix(nav): address issues found during walkthrough"
```
