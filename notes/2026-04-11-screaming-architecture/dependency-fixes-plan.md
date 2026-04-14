# Dependency Rule Violation Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all dependency rule violations so that `shared/` depends on nothing internal, `design-system/` depends only on `shared/`, and `services/` depends only on `shared/`.

**Architecture:** Components define their own prop types instead of importing from services. Domain logic (condition evaluation, markdown rendering) moves from components into routes. Test infrastructure that only serves the design system moves into `design-system/`.

**Tech Stack:** Bun, Hono JSX, TypeScript

**Working directory:** `/home/daniel/src/forms-lab/.worktrees/screaming-architecture`

---

## Task Sequence

Tasks are ordered to minimize intermediate breakage. Test infrastructure moves first (independent), then component decoupling from leaves (no dependents) to the most-connected components last.

---

### Task 1: Move test infrastructure into design-system

**Files:**
- Move: `src/shared/test-helpers/` → `src/design-system/test-helpers/`
- Move: `src/shared/visual-descriptor/` → `src/design-system/visual-descriptor/`
- Update: all 44 conformance test files (import paths)

- [ ] **Step 1: Move directories**

```bash
git mv src/shared/test-helpers src/design-system/test-helpers
git mv src/shared/visual-descriptor src/design-system/visual-descriptor
```

- [ ] **Step 2: Update internal imports within moved files**

In `src/design-system/test-helpers/conformance-runner.ts`, the import of conformance types changes from `../../design-system/conformance/types` to `../conformance/types`:

```typescript
import type {
  ConformanceSpec,
  FixtureInteraction,
} from '../conformance/types'
```

In `src/design-system/test-helpers/assertions.ts`, the import of visual-descriptor changes from `../visual-descriptor` to `../visual-descriptor`:

No change needed — the relative path is the same since both directories moved together.

- [ ] **Step 3: Update all conformance test imports**

All 44 conformance test files in `src/design-system/components/flex-*/conformance.test.ts` import from `../../../shared/test-helpers/conformance-runner` and/or `../../../shared/test-helpers/render`. Update to `../../../test-helpers/conformance-runner` and `../../../test-helpers/render`.

Use:
```bash
grep -rn "shared/test-helpers" src/design-system/ --include="*.ts" --include="*.tsx" -l
```
to find all files, then update each import path.

Similarly, check for any imports of `shared/visual-descriptor`:
```bash
grep -rn "shared/visual-descriptor" src/ --include="*.ts" --include="*.tsx"
```

The `token-conformance.test.ts` file is in `test-helpers/` and moved with it — its internal imports should still work.

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: all 365 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(design-system): move test infrastructure into design-system/

Move test-helpers/ and visual-descriptor/ from shared/ into design-system/.
These are consumed exclusively by design-system conformance tests.
Eliminates the shared/ -> design-system/ dependency rule violation.
"
```

---

### Task 2: Decouple flex-prose — accept pre-rendered HTML

**Files:**
- Modify: `src/design-system/components/flex-prose/index.tsx`
- Modify: `src/entrypoints/app/routes/catalog/architecture.tsx`
- Modify: `src/entrypoints/app/routes/catalog/decisions.tsx`
- Modify: `src/entrypoints/app/routes/catalog/experiments.tsx`
- Modify: `src/entrypoints/app/routes/catalog/personas.tsx`
- Modify: `src/entrypoints/app/routes/catalog/stories.tsx`
- Modify: `src/entrypoints/app/routes/catalog/design-system.tsx`

- [ ] **Step 1: Update flex-prose component**

Replace the entire contents of `src/design-system/components/flex-prose/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'

interface ProseProps {
  html: string
}

export const Prose: FC<ProseProps> = ({ html }) => {
  return <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
```

This removes the `renderMarkdown` import from services/content/markdown.

- [ ] **Step 2: Update catalog route callers**

Each catalog route that uses `<Prose content={...} />` must change to `<Prose html={renderMarkdown(...)} />`. All of these routes already import or can import `renderMarkdown` from `../../../../services/content/markdown`.

**architecture.tsx** — currently has no `renderMarkdown` import, add it:
```typescript
import { renderMarkdown } from '../../../../services/content/markdown'
```
Change:
```tsx
<Prose content={file.content} />
```
to:
```tsx
<Prose html={renderMarkdown(file.content)} />
```

**decisions.tsx** — same pattern. Add import if missing, change `content={...}` to `html={renderMarkdown(...)}`.

**experiments.tsx** — same pattern.

**personas.tsx** — same pattern.

**stories.tsx** — same pattern.

**design-system.tsx** — this file already imports from content/markdown for other purposes. Find the `<Prose content={...} />` usage and change to `<Prose html={renderMarkdown(...)} />`. Check exact usage with:
```bash
grep -n 'Prose' src/entrypoints/app/routes/catalog/design-system.tsx
```

- [ ] **Step 3: Run checks**

```bash
bun run check
```

Expected: all tests pass. The conformance test for flex-prose tests raw HTML fixtures, not the `Prose` component's rendering — it is unaffected.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(flex-prose): accept pre-rendered HTML instead of markdown

Change Prose prop from content (markdown string) to html (pre-rendered).
Callers now call renderMarkdown themselves before passing to the component.
Eliminates design-system/ -> services/content/ dependency.
"
```

---

### Task 3: Decouple flex-layout — local UserInfo type

**Files:**
- Modify: `src/design-system/components/flex-layout/index.tsx`

- [ ] **Step 1: Update flex-layout component**

In `src/design-system/components/flex-layout/index.tsx`, replace the import:

```typescript
import type { SessionUser } from '../../../services/auth/session'
```

with a local type definition. Add this interface before `LayoutProps`:

```typescript
interface UserInfo {
  name: string | null
  avatarUrl: string
}
```

Update `LayoutProps`:

```typescript
interface LayoutProps {
  title?: string
  sidebar?: Child
  currentPath?: string
  user?: UserInfo | null
}
```

No caller changes needed — `SessionUser` has `name` and `avatarUrl` fields, so it satisfies `UserInfo` structurally.

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(flex-layout): define local UserInfo type

Replace SessionUser import from services/auth with a component-local
UserInfo type containing only the fields the layout renders.
Eliminates design-system/ -> services/auth/ dependency.
"
```

---

### Task 4: Decouple flex-form-field — local prop types

**Files:**
- Modify: `src/design-system/components/flex-form-field/index.tsx`

- [ ] **Step 1: Update flex-form-field component**

In `src/design-system/components/flex-form-field/index.tsx`, replace the service imports:

```typescript
import type { DataRequirement } from '../../../services/data-collection/types'
import type { FieldEntry } from '../../../services/forms/types'
```

with local type definitions. Add these before `FormFieldProps`:

```typescript
export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'choice'
  | 'longText'

export interface FormFieldRequirement {
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export interface FormFieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}
```

Note: these are `export`ed because `flex-form-page` and `flex-form-review` will import them in later tasks.

Update `FormFieldProps` and the `DEFAULT_WIDTHS` and `renderInput` references:

```typescript
interface FormFieldProps {
  requirement: FormFieldRequirement
  entry?: FormFieldEntry
}
```

Update `DEFAULT_WIDTHS` type:
```typescript
const DEFAULT_WIDTHS: Partial<
  Record<FormFieldRequirement['fieldType'], FormFieldRequirement['displayWidth']>
> = {
```

Update `renderInput` signature parameters that reference `DataRequirement`:
```typescript
function renderInput(
  fieldType: FormFieldRequirement['fieldType'],
  name: string,
  value: string | number | boolean | null | undefined,
  hasError: boolean | undefined,
  describedBy: string | undefined,
  choices: string[] | undefined,
  label: string,
  required: boolean,
  width: FormFieldRequirement['displayWidth'],
) {
```

No caller changes needed — `DataRequirement` is structurally compatible with `FormFieldRequirement` (it has all the same fields plus extras like `id`, `condition`, `validation` that the component never uses).

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(flex-form-field): define local prop types

Replace DataRequirement and FieldEntry imports from services with
component-owned FormFieldRequirement and FormFieldEntry types.
Exports types for use by sibling form components.
Eliminates design-system/ -> services/data-collection/ and forms/ deps.
"
```

---

### Task 5: Decouple flex-form-landing and flex-form-confirmation — local prop types

**Files:**
- Modify: `src/design-system/components/flex-form-landing/index.tsx`
- Modify: `src/design-system/components/flex-form-confirmation/index.tsx`

- [ ] **Step 1: Update flex-form-landing**

In `src/design-system/components/flex-form-landing/index.tsx`, replace:

```typescript
import type { FormSpec } from '../../../services/forms/types'
```

with a local type:

```typescript
interface FormLandingSpec {
  title: string
  description?: string
  pages: { length: number }
}
```

Update `FormLandingProps`:

```typescript
interface FormLandingProps {
  formSpec: FormLandingSpec
  startUrl: string
}
```

No caller changes — `FormSpec` satisfies `FormLandingSpec` structurally.

- [ ] **Step 2: Update flex-form-confirmation**

In `src/design-system/components/flex-form-confirmation/index.tsx`, replace:

```typescript
import type { Submission } from '../../../services/forms/types'
```

with a local type:

```typescript
interface FormSubmissionSummary {
  id: string
  submittedAt: string
}
```

Update `FormConfirmationProps`:

```typescript
interface FormConfirmationProps {
  submission: FormSubmissionSummary
}
```

No caller changes — `Submission` satisfies `FormSubmissionSummary` structurally.

- [ ] **Step 3: Run checks**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(flex-form): define local prop types for landing and confirmation

Replace FormSpec and Submission imports with component-local types
containing only the fields each component renders.
"
```

---

### Task 6: Decouple flex-form-page — local types, pre-evaluate conditions

This is the most complex task. The component currently imports `evaluateCondition` and domain types. We replace domain types with local types and move condition evaluation into the route.

**Files:**
- Modify: `src/design-system/components/flex-form-page/index.tsx`
- Modify: `src/entrypoints/app/routes/forms/index.tsx`
- Modify: `test/forms/form-page.test.tsx`

- [ ] **Step 1: Update flex-form-page component**

Replace the full contents of `src/design-system/components/flex-form-page/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type {
  FormFieldEntry,
  FormFieldRequirement,
} from '../flex-form-field'
import { FormField } from '../flex-form-field'
import { Form } from '../flex-form'
import type { FormError } from '../flex-form-error-summary'
import { FormErrorSummary } from '../flex-form-error-summary'
import { FormStepText } from '../flex-form-step-text'

interface FormPageGroup {
  id: string
  title: string
  description?: string
  requirements: FormFieldRequirement[]
}

interface FormPageData {
  title: string
  description?: string
  groups: FormPageGroup[]
}

interface FormPageViewProps {
  page: FormPageData
  actionUrl: string
  currentPage: number
  totalPages: number
  fields: Record<string, FormFieldEntry>
  errors: FormError[]
  prevUrl: string | null
}

export const FormPageView: FC<FormPageViewProps> = ({
  page,
  actionUrl,
  currentPage,
  totalPages,
  fields,
  errors,
  prevUrl,
}) => {
  return (
    <Form size="large">
      <FormStepText current={currentPage} total={totalPages} />
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      <FormErrorSummary errors={errors} />
      <form method="post" action={actionUrl} novalidate>
        {page.groups.map((group) => (
          <fieldset key={group.id}>
            <legend>{group.title}</legend>
            {group.description && <p>{group.description}</p>}
            {group.requirements.map((req) => (
              <FormField
                key={req.fieldName}
                requirement={req}
                entry={fields[req.fieldName]}
              />
            ))}
          </fieldset>
        ))}
        <div class="l-cluster">
          {prevUrl && <a href={prevUrl}>Back</a>}
          <button type="submit" class="flex-button">
            Continue
          </button>
        </div>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var s=document.querySelector('.flex-form-error-summary');if(s)s.focus()})()`,
        }}
      />
    </Form>
  )
}
```

Key changes:
- Removed `evaluateCondition` import
- Replaced `ResolvedPage` with local `FormPageData` type
- Prop renamed from `resolvedPage` to `page`
- Component renders all groups and requirements it receives — no filtering
- Uses `req.fieldName` as the key instead of `req.id` (since `FormFieldRequirement` doesn't have `id`)

- [ ] **Step 2: Add `filterVisibleGroups` helper to the forms route**

In `src/entrypoints/app/routes/forms/index.tsx`, add an import of `evaluateCondition` (if not already present) and a helper function after the imports:

```typescript
import { evaluateCondition, resolveFormSpec } from '../../../../services/forms/resolver'
```

Add this helper function before `createFormRouter`:

```typescript
function filterVisibleGroups(
  groups: { id: string; title: string; description?: string; requirements: { fieldName: string; label: string; fieldType: string; required: boolean; helpText?: string; choices?: string[]; displayWidth?: string; condition?: { field: string; operator: string; value: string | number | boolean } }[]; condition?: { field: string; operator: string; value: string | number | boolean } }[],
  fields: Record<string, { value: string | number | boolean | null; errors?: string[] }>,
) {
  return groups
    .filter((g) => evaluateCondition(g.condition, fields))
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) =>
        evaluateCondition(r.condition, fields),
      ),
    }))
}
```

Actually, since the route already imports the domain types, use them directly for a cleaner signature:

```typescript
import type { FieldEntry } from '../../../../services/forms/types'
import type { RequirementGroup } from '../../../../services/data-collection/types'

function filterVisibleGroups(
  groups: RequirementGroup[],
  fields: Record<string, FieldEntry>,
): RequirementGroup[] {
  return groups
    .filter((g) => evaluateCondition(g.condition, fields))
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) =>
        evaluateCondition(r.condition, fields),
      ),
    }))
}
```

- [ ] **Step 3: Update FormPageView call sites in the route**

There are two places the route renders `<FormPageView>`. Both pass `resolvedPage={resolved.pages[pageIndex]}`. Change both to pass a pre-filtered `page` prop.

**GET page render (around line 201):**

Change:
```tsx
<FormPageView
  resolvedPage={resolved.pages[pageIndex]}
  actionUrl={...}
  currentPage={...}
  totalPages={...}
  fields={session.fields}
  errors={[]}
  prevUrl={prevUrl}
/>
```

to:
```tsx
<FormPageView
  page={{
    title: resolved.pages[pageIndex].page.title,
    description: resolved.pages[pageIndex].page.description,
    groups: filterVisibleGroups(resolved.pages[pageIndex].groups, session.fields),
  }}
  actionUrl={...}
  currentPage={...}
  totalPages={...}
  fields={session.fields}
  errors={[]}
  prevUrl={prevUrl}
/>
```

**POST validation error re-render (around line 264):**

Same pattern — change `resolvedPage={resolvedPage}` to the pre-filtered `page` prop, using `mergedFields` for filtering:

```tsx
<FormPageView
  page={{
    title: resolvedPage.page.title,
    description: resolvedPage.page.description,
    groups: filterVisibleGroups(resolvedPage.groups, mergedFields),
  }}
  actionUrl={...}
  currentPage={...}
  totalPages={...}
  fields={mergedFields}
  errors={errors}
  prevUrl={prevUrl}
/>
```

- [ ] **Step 4: Update form-page test**

In `test/forms/form-page.test.tsx`, the test creates a `ResolvedPage` via `resolveFormSpec` and passes it to `FormPageView`. Update to pass the new `page` prop shape.

Replace the imports and render function:

```tsx
import { describe, expect, it } from 'bun:test'
import type { FormError } from '../../src/design-system/components/flex-form-error-summary'
import { FormPageView } from '../../src/design-system/components/flex-form-page'
import type { FormFieldEntry } from '../../src/design-system/components/flex-form-field'
import { evaluateCondition, resolveFormSpec } from '../../src/services/forms/resolver'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormPageView', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function filterVisibleGroups(
    groups: typeof resolved.pages[0]['groups'],
    fields: Record<string, FormFieldEntry>,
  ) {
    return groups
      .filter((g) => evaluateCondition(g.condition, fields))
      .map((g) => ({
        ...g,
        requirements: g.requirements.filter((r) =>
          evaluateCondition(r.condition, fields),
        ),
      }))
  }

  function render(
    pageIndex: number,
    props: {
      actionUrl: string
      currentPage: number
      totalPages: number
      fields?: Record<string, FormFieldEntry>
      errors?: FormError[]
      prevUrl?: string | null
    },
  ): string {
    const fields = props.fields ?? {}
    const resolvedPage = resolved.pages[pageIndex]
    return (
      (
        <FormPageView
          page={{
            title: resolvedPage.page.title,
            description: resolvedPage.page.description,
            groups: filterVisibleGroups(resolvedPage.groups, fields),
          }}
          actionUrl={props.actionUrl}
          currentPage={props.currentPage}
          totalPages={props.totalPages}
          fields={fields}
          errors={props.errors ?? []}
          prevUrl={props.prevUrl ?? null}
        />
      ) as any
    ).toString()
  }
```

Update test calls: change `render(resolved.pages[0], { ... })` to `render(0, { ... })`, and `render(resolved.pages[1], { ... })` to `render(1, { ... })`, etc. Check each test case and adjust.

- [ ] **Step 5: Run checks**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(flex-form-page): pre-evaluate conditions in route

Define local FormPageData type. Route filters visible groups and
requirements before passing to component. Component renders everything
it receives. Eliminates evaluateCondition import from design-system.
"
```

---

### Task 7: Decouple flex-form-review — local types, pre-evaluate conditions

**Files:**
- Modify: `src/design-system/components/flex-form-review/index.tsx`
- Modify: `src/entrypoints/app/routes/forms/index.tsx`
- Modify: `test/forms/form-review.test.tsx`

- [ ] **Step 1: Update flex-form-review component**

Replace the full contents of `src/design-system/components/flex-form-review/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { FormFieldEntry } from '../flex-form-field'
import { Form } from '../flex-form'

interface ReviewRequirement {
  fieldName: string
  label: string
}

interface ReviewGroup {
  id: string
  requirements: ReviewRequirement[]
}

interface ReviewPage {
  id: string
  title: string
  groups: ReviewGroup[]
}

interface FormReviewProps {
  pages: ReviewPage[]
  fields: Record<string, FormFieldEntry>
  submitUrl: string
  editBaseUrl: string
}

export const FormReview: FC<FormReviewProps> = ({
  pages,
  fields,
  submitUrl,
  editBaseUrl,
}) => {
  return (
    <Form size="large">
      <h1>Review your answers</h1>
      <p>Check your answers before submitting.</p>
      {pages.map((page, pageIndex) => (
        <section key={page.id}>
          <div class="l-cluster" style="justify-content: space-between">
            <h2>{page.title}</h2>
            <a href={`${editBaseUrl}/${pageIndex}`}>
              Change
              <span class="u-visually-hidden"> {page.title}</span>
            </a>
          </div>
          {page.groups.map((group) => (
            <dl key={group.id} class="flex-summary-list">
              {group.requirements.map((req) => {
                const entry = fields[req.fieldName]
                const displayValue = formatValue(entry?.value)
                return (
                  <div key={req.fieldName} class="flex-summary-list__row">
                    <dt class="flex-summary-list__key">{req.label}</dt>
                    <dd class="flex-summary-list__value">
                      {displayValue === 'Not provided' ? (
                        <span class="u-text-muted">{displayValue}</span>
                      ) : (
                        displayValue
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          ))}
        </section>
      ))}
      <form method="post" action={submitUrl}>
        <button type="submit" class="flex-button">
          Submit
        </button>
      </form>
    </Form>
  )
}

function formatValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return 'Not provided'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
```

Key changes:
- Removed `evaluateCondition` import and all condition checks
- Replaced `ResolvedForm` with local `ReviewPage[]`
- Prop changed from `resolved: ResolvedForm` to `pages: ReviewPage[]`
- Component renders all pages, groups, and requirements it receives

- [ ] **Step 2: Update FormReview call site in the route**

In `src/entrypoints/app/routes/forms/index.tsx`, the review route (GET `/:specId/sessions/:sessionId/review`) currently passes:

```tsx
<FormReview
  resolved={resolved}
  fields={session.fields}
  submitUrl={...}
  editBaseUrl={...}
/>
```

Add a helper to build the pre-filtered review pages. Add this after `filterVisibleGroups`:

```typescript
function buildReviewPages(
  resolved: ReturnType<typeof resolveFormSpec>,
  fields: Record<string, FieldEntry>,
) {
  return resolved.pages
    .filter((rp) => evaluateCondition(rp.page.condition, fields))
    .map((rp) => ({
      id: rp.page.id,
      title: rp.page.title,
      groups: filterVisibleGroups(rp.groups, fields).map((g) => ({
        id: g.id,
        requirements: g.requirements.map((r) => ({
          fieldName: r.fieldName,
          label: r.label,
        })),
      })),
    }))
}
```

Change the review route to:

```tsx
<FormReview
  pages={buildReviewPages(resolved, session.fields)}
  fields={session.fields}
  submitUrl={...}
  editBaseUrl={...}
/>
```

- [ ] **Step 3: Update form-review test**

In `test/forms/form-review.test.tsx`, update imports and render function to build pre-filtered review pages:

```tsx
import { describe, expect, it } from 'bun:test'
import { FormReview } from '../../src/design-system/components/flex-form-review'
import type { FormFieldEntry } from '../../src/design-system/components/flex-form-field'
import { evaluateCondition, resolveFormSpec } from '../../src/services/forms/resolver'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormReview', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function buildReviewPages(
    fields: Record<string, FormFieldEntry>,
    resolvedForm = resolved,
  ) {
    return resolvedForm.pages
      .filter((rp) => evaluateCondition(rp.page.condition, fields))
      .map((rp) => ({
        id: rp.page.id,
        title: rp.page.title,
        groups: rp.groups
          .filter((g) => evaluateCondition(g.condition, fields))
          .map((g) => ({
            id: g.id,
            requirements: g.requirements
              .filter((r) => evaluateCondition(r.condition, fields))
              .map((r) => ({
                fieldName: r.fieldName,
                label: r.label,
              })),
          })),
      }))
  }

  function render(
    fields: Record<string, FormFieldEntry>,
    resolvedForm = resolved,
  ): string {
    return (
      (
        <FormReview
          pages={buildReviewPages(fields, resolvedForm)}
          fields={fields}
          submitUrl="/submit"
          editBaseUrl="/forms/benefits-app/sessions/s1/pages"
        />
      ) as any
    ).toString()
  }
```

The existing test assertions should pass unchanged since the rendered HTML is identical.

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(flex-form-review): pre-evaluate conditions in route

Define local ReviewPage type. Route builds pre-filtered review pages
before passing to component. Eliminates evaluateCondition and domain
type imports from design-system.
"
```

---

### Task 8: Verify dependency rule and clean up

**Files:**
- Modify: `notes/2026-04-11-screaming-architecture/design.md` — remove Known Dependency Rule Violations section
- Modify: `notes/2026-04-11-screaming-architecture/dependency-fixes-design.md` — update status

- [ ] **Step 1: Verify the dependency rule**

```bash
# shared/ should not import from services/, design-system/, or entrypoints/
grep -rn "from '.*services/\|from '.*design-system/\|from '.*entrypoints/" src/shared/ && echo "VIOLATION" || echo "OK: shared/"

# design-system/ should not import from services/ or entrypoints/
grep -rn "from '.*services/\|from '.*entrypoints/" src/design-system/ && echo "VIOLATION" || echo "OK: design-system/"

# services/ should not import from entrypoints/ or design-system/
grep -rn "from '.*entrypoints/\|from '.*design-system/" src/services/ && echo "VIOLATION" || echo "OK: services/"
```

Expected: all three report OK.

- [ ] **Step 2: Run full check suite**

```bash
bun run check
```

Expected: all 365 tests pass.

- [ ] **Step 3: Update design documents**

In `notes/2026-04-11-screaming-architecture/design.md`, remove the "Known Dependency Rule Violations" section entirely.

In `notes/2026-04-11-screaming-architecture/dependency-fixes-design.md`, change status from `draft` to `working`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(arch): dependency rule fully enforced

All violations resolved. shared/ has no internal deps,
design-system/ depends only on shared/, services/ depends
only on shared/. Remove Known Violations section from design doc.
"
```
