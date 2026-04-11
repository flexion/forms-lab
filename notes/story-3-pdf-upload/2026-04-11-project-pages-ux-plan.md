# Project Pages UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish all project pages — navigation, list table, detail page layout, conditional fields, form layout section, and accessibility — so they meet civic tech UX standards.

**Architecture:** Fix-in-place approach across existing components. New CSS file for project-specific styles. Add delete route and ProjectStore.delete method. Replace inline styles with design token classes.

**Tech Stack:** Hono JSX, CSS cascade layers, `flex-table`/`badge` design system components, `bun:test`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `src/app/components/flex-layout/index.tsx` | Layout shell with nav | Modify: add Projects nav item |
| `src/app/components/flex-table/styles.css` | Table component styles | Modify: add `width: 100%` |
| `src/app/components/flex-badge/styles.css` | Badge component styles | Modify: add project status variants |
| `src/app/routes/projects/components.tsx` | All project page components | Modify: rewrite ProjectList, ReadyView, FormSpecViewer |
| `src/app/routes/projects/styles.css` | Project-specific styles | Create: summary bar, form layout cards, condition badges |
| `src/app/routes/projects/index.tsx` | Project routes | Modify: add DELETE route |
| `src/app/public/styles.css` | CSS import chain | Modify: add project styles import |
| `src/services/database.ts` | ProjectStore | Modify: add delete method |
| `test/projects-routes.test.ts` | Route integration tests | Modify: add tests for new features |

---

### Task 1: Add Projects to navigation

**Files:**
- Modify: `src/app/components/flex-layout/index.tsx`

- [ ] **Step 1: Write the failing test**

Add to `test/server.test.ts`:

```typescript
it('shows Projects link in nav for authenticated users', async () => {
  const secret = 'test-secret-key-32-bytes-long!'
  process.env.SESSION_SECRET = secret

  const sessionCookie = await encryptSession(
    {
      login: 'testuser',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    },
    secret,
  )

  const res = await app.request('/', {
    headers: {
      Cookie: `${COOKIE_NAME}=${sessionCookie}`,
    },
  })

  expect(res.status).toBe(200)
  const html = await res.text()
  expect(html).toContain('Projects</a>')
})

it('does not show Projects link for unauthenticated users', async () => {
  const res = await app.request('/')
  const html = await res.text()
  expect(html).not.toContain('Projects</a>')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/server.test.ts`
Expected: FAIL — "Projects" not in nav

- [ ] **Step 3: Add Projects nav item to Layout**

In `src/app/components/flex-layout/index.tsx`, add a `HeaderNavItem` for Projects inside the `{props.user ? (` block, before the user avatar `<li>`:

```tsx
{props.user ? (
  <>
    <HeaderNavItem
      href={resolveUrl('/projects')}
      label="Projects"
      current={props.currentPath?.startsWith('/projects') ?? false}
    />
    <li class="flex-header__nav-item">
```

Also add Projects to the footer nav `<ul>`, after Catalog:

```tsx
<li>
  <a
    class="flex-footer__primary-link"
    href={resolveUrl('/projects')}
  >
    Projects
  </a>
</li>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-layout/index.tsx test/server.test.ts
git commit -m "feat: add Projects nav item for authenticated users"
```

---

### Task 2: Fix table width and add project status badge styles

**Files:**
- Modify: `src/app/components/flex-table/styles.css`
- Modify: `src/app/components/flex-badge/styles.css`

- [ ] **Step 1: Add `width: 100%` to flex-table**

In `src/app/components/flex-table/styles.css`, add `width: 100%;` to the `.flex-table` rule:

```css
.flex-table {
  font-family: var(--flex-font-sans);
  font-size: 1.06rem;
  line-height: 1.5;
  border-collapse: collapse;
  border-spacing: 0;
  color: var(--flex-color-text);
  margin: 1.25rem 0;
  text-align: left;
  width: 100%;
}
```

- [ ] **Step 2: Add project status badge variants**

In `src/app/components/flex-badge/styles.css`, add after the existing `data-state` rules:

```css
/* Project status badges */
.badge[data-status="ready"] {
  background: var(--flex-color-success-lighter);
  color: var(--flex-color-text);
}

.badge[data-status="extracting"] {
  background: var(--flex-color-info-lighter);
  color: var(--flex-color-text);
}

.badge[data-status="error"] {
  background: var(--flex-color-error-lighter);
  color: var(--flex-color-text);
}

/* Delivery mode badges */
.badge[data-delivery="static"] {
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-border);
  color: var(--flex-color-text-muted);
}

.badge[data-delivery="conversational"] {
  background: var(--flex-color-info-lighter);
  color: var(--flex-color-text);
}

.badge[data-delivery="hybrid"] {
  background: var(--flex-color-warning-lighter);
  color: var(--flex-color-text);
}
```

- [ ] **Step 3: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS (CSS-only changes, no test breakage)

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-table/styles.css src/app/components/flex-badge/styles.css
git commit -m "style: add table full-width and project/delivery badge variants"
```

---

### Task 3: Create project-specific styles

**Files:**
- Create: `src/app/routes/projects/styles.css`
- Modify: `src/app/public/styles.css`

- [ ] **Step 1: Create project styles file**

Create `src/app/routes/projects/styles.css`:

```css
/* Project pages — summary bar, form layout cards, condition indicators */

.project-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--flex-space-lg);
  padding-block: var(--flex-space-sm);
  border-bottom: 1px solid var(--flex-color-border);
  color: var(--flex-color-text-muted);
  font-size: var(--flex-text-sm);
}

.project-summary strong {
  color: var(--flex-color-text);
}

.project-back-link {
  font-size: var(--flex-text-sm);
  color: var(--flex-color-link);
  text-decoration: none;
}

.project-back-link:hover {
  text-decoration: underline;
}

/* Form layout page cards */
.form-page-list {
  display: flex;
  flex-direction: column;
  gap: var(--flex-space-xs);
  list-style: none;
  padding: 0;
  margin: 0;
}

.form-page-card {
  display: flex;
  align-items: baseline;
  gap: var(--flex-space-md);
  padding: var(--flex-space-sm);
  border: 1px solid var(--flex-color-border);
  border-radius: var(--flex-radius-sm);
}

.form-page-card__number {
  color: var(--flex-color-text-muted);
  font-size: var(--flex-text-sm);
  min-width: 1.5rem;
}

.form-page-card__body {
  flex: 1;
}

.form-page-card__title {
  font-weight: 700;
}

.form-page-card__groups {
  color: var(--flex-color-text-muted);
  font-size: var(--flex-text-sm);
  margin-top: var(--flex-space-3xs);
}

/* Condition indicator in spec tables */
.condition-tag {
  font-size: var(--flex-text-sm);
  color: var(--flex-color-text-muted);
  background: var(--flex-color-surface);
  border: 1px solid var(--flex-color-border);
  padding: 0.125rem 0.375rem;
  border-radius: var(--flex-radius-sm);
  white-space: nowrap;
}

/* Delete confirmation */
.delete-confirm {
  display: inline-flex;
  gap: var(--flex-space-xs);
  align-items: center;
}

.delete-confirm__trigger {
  color: var(--flex-color-error);
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  font-size: var(--flex-text-sm);
  padding: 0;
  text-decoration: underline;
}

.delete-confirm__trigger:hover {
  color: var(--flex-color-error-dark);
}
```

- [ ] **Step 2: Import in styles.css**

In `src/app/public/styles.css`, add before the utility layer import:

```css
@import "../routes/projects/styles.css" layer(block);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/routes/projects/styles.css src/app/public/styles.css
git commit -m "style: add project page styles for summary, cards, conditions"
```

---

### Task 4: Add ProjectStore.delete and DELETE route

**Files:**
- Modify: `src/services/database.ts`
- Modify: `src/app/routes/projects/index.tsx`
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Write the failing test for ProjectStore.delete**

Add to `test/database.test.ts`:

```typescript
it('deletes a project', () => {
  const store = createProjectStore(':memory:')
  const project = store.create({
    name: 'Delete Me',
    description: 'Test',
    sourcePdf: Buffer.from('pdf'),
    createdBy: 'testuser',
  })
  expect(store.get(project.id)).not.toBeNull()
  store.delete(project.id)
  expect(store.get(project.id)).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/database.test.ts`
Expected: FAIL — `store.delete is not a function`

- [ ] **Step 3: Add delete to ProjectStore interface and implementation**

In `src/services/database.ts`, add to the `ProjectStore` interface:

```typescript
export interface ProjectStore {
  create(project: NewProject): StoredProject
  get(id: string): StoredProject | null
  list(userId?: string): StoredProject[]
  update(
    id: string,
    changes: Partial<
      Pick<
        StoredProject,
        'status' | 'spec' | 'formSpec' | 'confidence' | 'error'
      >
    >,
  ): StoredProject
  delete(id: string): void
}
```

Add to the returned object in `createProjectStore`:

```typescript
    delete(id: string): void {
      db.run('DELETE FROM projects WHERE id = ?', [id])
    },
```

- [ ] **Step 4: Run database test to verify it passes**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/database.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for DELETE route**

Add to `test/projects-routes.test.ts`:

```typescript
describe('POST /projects/:id/delete', () => {
  it('deletes project and redirects to list', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Delete Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    expect(projectStore.get(project.id)).not.toBeNull()

    const res = await app.request(`/projects/${project.id}/delete`, {
      method: 'POST',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/projects')
    expect(projectStore.get(project.id)).toBeNull()
  })

  it('returns 404 for missing project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/nonexistent/delete', {
      method: 'POST',
    })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: FAIL — route not found (405 or 404)

- [ ] **Step 7: Add DELETE route**

In `src/app/routes/projects/index.tsx`, add before the `return projects` line:

```tsx
  projects.post('/:id/delete', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    projectStore.delete(project.id)
    return c.redirect(resolveUrl('/projects'))
  })
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/services/database.ts src/app/routes/projects/index.tsx test/database.test.ts test/projects-routes.test.ts
git commit -m "feat: add project delete route and ProjectStore.delete"
```

---

### Task 5: Rewrite ProjectList as table with actions

**Files:**
- Modify: `src/app/routes/projects/components.tsx`
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Update the existing "lists existing projects" test in `test/projects-routes.test.ts`:

```typescript
it('lists existing projects in a table', async () => {
  const { app, projectStore } = createTestApp()
  projectStore.create({
    name: 'Pardon App',
    description: 'Test',
    sourcePdf: Buffer.from('pdf'),
    createdBy: 'testuser',
  })
  const res = await app.request('/projects')
  const html = await res.text()
  expect(html).toContain('Pardon App')
  expect(html).toContain('flex-table')
  expect(html).toContain('View')
  expect(html).toContain('Delete')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: FAIL — html does not contain `flex-table`

- [ ] **Step 3: Rewrite ProjectList component**

Replace the `ProjectList` component in `src/app/routes/projects/components.tsx`:

```tsx
export const ProjectList: FC<{ projects: StoredProject[] }> = ({
  projects,
}) => (
  <div class="l-stack">
    <div class="l-cluster" style="justify-content: space-between;">
      <h1>My Projects</h1>
      <a href={resolveUrl('/projects/new')} class="flex-button">
        New Project
      </a>
    </div>
    {projects.length === 0 ? (
      <p>No projects yet. Create one to get started.</p>
    ) : (
      <table class="flex-table" data-variant="borderless" data-stacked>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const fieldCount =
              p.spec?.groups.reduce(
                (sum, g) => sum + g.requirements.length,
                0,
              ) ?? 0
            const created = new Date(p.createdAt * 1000).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' },
            )
            return (
              <tr key={p.id}>
                <td data-label="Name">
                  <a href={resolveUrl(`/projects/${p.id}`)}>
                    <strong>{p.name}</strong>
                  </a>
                  <div class="text-muted text-sm">
                    {p.status === 'ready'
                      ? `${p.spec?.groups.length ?? 0} groups, ${fieldCount} fields`
                      : p.status === 'extracting'
                        ? 'Extracting form structure...'
                        : p.description}
                  </div>
                </td>
                <td data-label="Status">
                  <span class="badge" data-status={p.status}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </td>
                <td data-label="Created" class="text-muted text-sm">
                  {created}
                </td>
                <td data-label="Actions">
                  {p.status !== 'extracting' && (
                    <div class="l-cluster">
                      <a
                        href={resolveUrl(`/projects/${p.id}`)}
                        aria-label={`View ${p.name}`}
                      >
                        View
                      </a>
                      <form
                        method="post"
                        action={resolveUrl(`/projects/${p.id}/delete`)}
                        onsubmit="return confirm('Delete this project?')"
                      >
                        <button
                          type="submit"
                          class="delete-confirm__trigger"
                          aria-label={`Delete ${p.name}`}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )}
  </div>
)
```

- [ ] **Step 4: Add utility classes for text-muted and text-sm**

In `src/app/public/utilities.css`, add (if not already present):

```css
.text-muted { color: var(--flex-color-text-muted); }
.text-sm { font-size: var(--flex-text-sm); }
```

Check if these exist first — if they do, skip this step.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/routes/projects/components.tsx src/app/public/utilities.css
git commit -m "feat: replace project list cards with table and actions"
```

---

### Task 6: Rewrite ReadyView with summary bar, back link, and conditions column

**Files:**
- Modify: `src/app/routes/projects/components.tsx`
- Modify: `test/projects-routes.test.ts`

- [ ] **Step 1: Write the failing test for summary bar**

Add to `test/projects-routes.test.ts`:

```typescript
describe('Project detail - ready state', () => {
  function createReadyProject() {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Summary Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'ready',
      spec: {
        id: 'spec-1',
        title: 'Test',
        description: 'A test form',
        groups: [
          {
            id: 'g1',
            title: 'Personal Info',
            requirements: [
              {
                id: 'f1',
                fieldName: 'firstName',
                label: 'First name',
                fieldType: 'text',
                required: true,
              },
              {
                id: 'f2',
                fieldName: 'maidenName',
                label: 'Maiden name',
                fieldType: 'text',
                required: false,
                condition: {
                  field: 'marital-status',
                  operator: 'equals',
                  value: 'married',
                },
              },
            ],
          },
        ],
      },
      formSpec: {
        id: 'form-1',
        specId: 'spec-1',
        title: 'Test',
        pages: [
          {
            id: 'page-1',
            title: 'Personal Information',
            groups: ['g1'],
            deliveryMode: 'conversational',
          },
        ],
        createdAt: '2026-04-11',
        updatedAt: '2026-04-11',
      },
      confidence: [
        { fieldId: 'f1', confidence: 0.95 },
        { fieldId: 'f2', confidence: 0.6, flags: ['conditional-logic-unclear'] },
      ],
    })
    return { app, project }
  }

  it('shows summary bar with counts', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('project-summary')
    expect(html).toContain('1')  // 1 group
    expect(html).toContain('2')  // 2 fields
  })

  it('shows back link', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Back to projects')
  })

  it('shows condition for conditional fields', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('marital-status')
    expect(html).toContain('equals')
  })

  it('shows form layout with resolved group names', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('form-page-card')
    expect(html).toContain('Personal Information')
    expect(html).toContain('Personal Info')  // resolved group title
    expect(html).toContain('Conversational')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: FAIL — missing summary bar, back link, conditions, form page cards

- [ ] **Step 3: Rewrite ReadyView**

Replace the `ReadyView` component in `src/app/routes/projects/components.tsx`:

```tsx
const ReadyView: FC<{ project: StoredProject }> = ({ project }) => {
  const groupCount = project.spec?.groups.length ?? 0
  const fieldCount =
    project.spec?.groups.reduce(
      (sum, g) => sum + g.requirements.length,
      0,
    ) ?? 0
  const pageCount = project.formSpec?.pages.length ?? 0
  const lowConfCount =
    project.confidence?.filter((c) => c.confidence < 0.8).length ?? 0

  return (
    <div class="l-stack">
      <a href={resolveUrl('/projects')} class="project-back-link">
        &larr; Back to projects
      </a>
      <h1>{project.name}</h1>
      <div class="project-summary">
        <span>
          <strong>{groupCount}</strong> groups
        </span>
        <span>
          <strong>{fieldCount}</strong> fields
        </span>
        <span>
          <strong>{pageCount}</strong> pages
        </span>
        <span>
          <strong>{lowConfCount}</strong> low confidence
        </span>
      </div>
      {project.spec && (
        <SpecViewer
          spec={project.spec}
          confidence={project.confidence ?? []}
        />
      )}
      {project.formSpec && project.spec && (
        <FormSpecViewer
          formSpec={project.formSpec}
          spec={project.spec}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rewrite SpecViewer with Conditions column**

Replace the `SpecViewer` component:

```tsx
const SpecViewer: FC<{
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}> = ({ spec, confidence }) => {
  const confidenceMap = new Map(confidence.map((c) => [c.fieldId, c]))
  return (
    <section class="l-stack">
      <h2>Extracted Data Requirements</h2>
      <p class="text-muted">{spec.description}</p>
      {spec.groups.map((group) => (
        <div key={group.id} class="l-stack">
          <h3>{group.title}</h3>
          {group.description && <p class="text-muted">{group.description}</p>}
          <table class="flex-table" data-variant="borderless" data-stacked>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Type</th>
                <th scope="col">Required</th>
                <th scope="col">Conditions</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.requirements.map((req) => {
                const conf = confidenceMap.get(req.id)
                return (
                  <tr key={req.id}>
                    <td data-label="Field">
                      <strong>{req.label}</strong>
                      {req.helpText && (
                        <div class="text-muted text-sm">{req.helpText}</div>
                      )}
                    </td>
                    <td data-label="Type">
                      {req.fieldType.charAt(0).toUpperCase() +
                        req.fieldType.slice(1)}
                    </td>
                    <td data-label="Required">{req.required ? 'Yes' : 'No'}</td>
                    <td data-label="Conditions">
                      {req.condition ? (
                        <span class="condition-tag">
                          When {req.condition.field} {req.condition.operator}{' '}
                          {String(req.condition.value)}
                        </span>
                      ) : (
                        <span class="text-muted">&mdash;</span>
                      )}
                    </td>
                    <td data-label="Status">
                      {conf ? (
                        <ConfidenceBadge
                          confidence={conf.confidence}
                          flags={conf.flags}
                        />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 5: Rewrite FormSpecViewer with card rows and resolved group names**

Replace the `FormSpecViewer` component. Update its props to accept the spec for group name resolution:

```tsx
const FormSpecViewer: FC<{
  formSpec: FormSpec
  spec: DataCollectionSpec
}> = ({ formSpec, spec }) => {
  const groupMap = new Map(spec.groups.map((g) => [g.id, g.title]))

  return (
    <section class="l-stack">
      <h2>Form Layout</h2>
      <p class="text-muted">
        Proposed page structure for the digital form experience.
      </p>
      <ol class="form-page-list">
        {formSpec.pages.map((page, i) => (
          <li key={page.id} class="form-page-card">
            <span class="form-page-card__number">{i + 1}.</span>
            <div class="form-page-card__body">
              <span class="form-page-card__title">{page.title}</span>
              {page.description && (
                <div class="text-muted text-sm">{page.description}</div>
              )}
              <div class="form-page-card__groups">
                {page.groups
                  .map((gId) => groupMap.get(gId) ?? gId)
                  .join(', ')}
              </div>
            </div>
            <span
              class="badge"
              data-delivery={page.deliveryMode}
            >
              {page.deliveryMode.charAt(0).toUpperCase() +
                page.deliveryMode.slice(1)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 6: Update ConfidenceBadge to use design tokens**

Replace the `ConfidenceBadge` component:

```tsx
const ConfidenceBadge: FC<{ confidence: number; flags?: string[] }> = ({
  confidence,
  flags,
}) => {
  if (confidence >= 0.8) return null
  const level = confidence >= 0.5 ? 'medium' : 'low'
  return (
    <span
      class="badge"
      data-status={level === 'low' ? 'error' : 'draft'}
      title={
        flags?.join(', ') ?? `Confidence: ${Math.round(confidence * 100)}%`
      }
    >
      {level === 'medium' ? 'Review' : 'Low confidence'}
    </span>
  )
}
```

- [ ] **Step 7: Also update ExtractingView and ErrorView to use back link**

Update `ExtractingView`:

```tsx
const ExtractingView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <meta http-equiv="refresh" content="3" />
    <a href={resolveUrl('/projects')} class="project-back-link">
      &larr; Back to projects
    </a>
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--info" role="status" aria-live="polite">
      <p>
        <strong>Extracting form structure...</strong>
      </p>
      <p>
        This may take up to a minute for large forms. This page will refresh
        automatically.
      </p>
    </div>
  </div>
)
```

Update `ErrorView`:

```tsx
const ErrorView: FC<{ project: StoredProject }> = ({ project }) => (
  <div class="l-stack">
    <a href={resolveUrl('/projects')} class="project-back-link">
      &larr; Back to projects
    </a>
    <h1>{project.name}</h1>
    <div class="flex-alert flex-alert--error" role="alert">
      <p>
        <strong>Extraction failed</strong>
      </p>
      <p>{project.error ?? 'An unknown error occurred.'}</p>
    </div>
    <form method="post" action={resolveUrl(`/projects/${project.id}/retry`)}>
      <button type="submit" class="flex-button">
        Retry Extraction
      </button>
    </form>
  </div>
)
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun test test/projects-routes.test.ts`
Expected: PASS

- [ ] **Step 9: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/app/routes/projects/components.tsx test/projects-routes.test.ts
git commit -m "feat: add summary bar, back link, conditions column, form layout cards"
```

---

### Task 7: Final accessibility pass and cleanup

**Files:**
- Modify: `src/app/routes/projects/components.tsx`

- [ ] **Step 1: Remove any remaining inline styles**

Search `components.tsx` for any remaining `style=` attributes and replace with design token classes. The rewrite in Task 5-6 should have eliminated most, but verify:

Run: `grep -n 'style=' src/app/routes/projects/components.tsx`

If any remain in `NewProjectPage`, replace with CSS classes in `src/app/routes/projects/styles.css`.

- [ ] **Step 2: Verify table accessibility attributes**

Ensure all `<th>` elements have `scope="col"`. Ensure all tables have `data-stacked` for mobile. Ensure `data-label` attributes on `<td>` elements match the column headers.

- [ ] **Step 3: Run full check**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run check`
Expected: PASS

- [ ] **Step 4: Run stylelint on new CSS**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run lint:css`
Expected: PASS — all new CSS uses design tokens

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: remove inline styles, complete accessibility cleanup"
```

---

### Task 8: Manual testing and deploy

- [ ] **Step 1: Start dev server and verify all pages**

Run: `cd /home/daniel/src/forms-lab--story-3-pdf-upload && bun run dev`

Test in browser:
- `/` — verify Projects link appears in nav after sign-in
- `/projects` — verify table layout with Name, Status, Created, Actions
- `/projects/new` — verify fixture cards and upload form still work
- `/projects/:id` (ready) — verify summary bar, back link, conditions column, form layout cards
- `/projects/:id` (extracting) — verify back link, auto-refresh
- `/projects/:id` (error) — verify back link, error display, retry

- [ ] **Step 2: Test delete flow**

Click Delete on a project, confirm the dialog, verify redirect to list.

- [ ] **Step 3: Test mobile responsiveness**

Resize browser to mobile width. Verify:
- Tables stack with labels
- Form layout cards wrap properly
- Navigation collapses to mobile menu

- [ ] **Step 4: Push and deploy**

```bash
git push --force-with-lease
```

Deploy to server and verify on the live URL.

- [ ] **Step 5: Commit any fixes found during testing**
