# Dependency Rule Violation Fixes

**Date:** 2026-04-11
**Status:** draft

## Problem

The screaming architecture restructuring introduced a clean dependency rule:

```
shared/          <- depends on nothing internal
services/        <- depends on shared/
design-system/   <- depends on shared/
entrypoints/     <- depends on services/, design-system/, shared/
```

Two categories of violation exist:

1. **shared/ -> design-system/**: The entire `shared/test-helpers/` and `shared/visual-descriptor/` directories are consumed exclusively by design-system conformance tests, and `conformance-runner.ts` imports `design-system/conformance/types`.

2. **design-system/ -> services/**: Seven components import domain types or runtime functions from services:
   - `flex-form-page` and `flex-form-review` import `evaluateCondition` (runtime function) from `services/forms/resolver`
   - `flex-form-field` imports `DataRequirement` and `FieldEntry` types
   - `flex-form-landing` imports `FormSpec` type
   - `flex-form-confirmation` imports `Submission` type
   - `flex-layout` imports `SessionUser` type from `services/auth/session`
   - `flex-prose` imports `renderMarkdown` function from `services/content/markdown`

## Goals

- Eliminate all dependency rule violations
- Components define their own prop types (standard design system practice)
- Components receive pre-processed, ready-to-render data
- No UX changes (server-rendered output is identical)

## Design

### Fix 1: Move test infrastructure into design-system

`shared/test-helpers/` (assertions.ts, conformance-runner.ts, index.ts, render.ts, token-conformance.test.ts) and `shared/visual-descriptor/` (diff.ts, extract.ts, index.ts, schema.ts, types.ts) are consumed exclusively by design-system conformance tests. No other code uses them.

Move both directories:
- `src/shared/test-helpers/` -> `src/design-system/test-helpers/`
- `src/shared/visual-descriptor/` -> `src/design-system/visual-descriptor/`

After this, `src/shared/` contains only `base-path.ts`, `format-html.ts`, and `types/markdown-it-task-lists.d.ts`.

### Fix 2: flex-prose — accept pre-rendered HTML

Change the prop from `content: string` (markdown) to `html: string` (pre-rendered HTML).

Before:
```tsx
interface ProseProps {
  content: string
}
export const Prose: FC<ProseProps> = ({ content }) => {
  const html = renderMarkdown(content)
  return <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
```

After:
```tsx
interface ProseProps {
  html: string
}
export const Prose: FC<ProseProps> = ({ html }) => {
  return <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
```

Callers (6 catalog routes) change from `<Prose content={x} />` to `<Prose html={renderMarkdown(x)} />`. All callers already import `renderMarkdown` or can trivially add the import.

### Fix 3: flex-layout — local UserInfo type

Replace the `SessionUser` import with a local type containing only the fields the component renders.

Before:
```tsx
import type { SessionUser } from '../../../services/auth/session'
interface LayoutProps {
  user?: SessionUser | null
}
```

After:
```tsx
interface UserInfo {
  name: string | null
  avatarUrl: string
}
interface LayoutProps {
  user?: UserInfo | null
}
```

No caller changes needed — `SessionUser` is structurally compatible with `UserInfo` (it has both fields plus `login` and `accessToken` which the layout doesn't use). TypeScript structural typing handles this automatically.

### Fix 4: flex-form-field — local prop types

Replace `DataRequirement` and `FieldEntry` imports with component-owned types.

Before:
```tsx
import type { DataRequirement } from '../../../services/data-collection/types'
import type { FieldEntry } from '../../../services/forms/types'
```

After — define locally:
```tsx
type FieldType =
  | 'text' | 'email' | 'phone' | 'url' | 'number'
  | 'currency' | 'date' | 'boolean' | 'choice' | 'longText'

interface FormFieldRequirement {
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

interface FormFieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}

interface FormFieldProps {
  requirement: FormFieldRequirement
  entry?: FormFieldEntry
}
```

The `condition` and `validation` fields from `DataRequirement` are omitted — the component never uses them. Fields with conditions are filtered by the route before reaching the component (Fix 6).

No caller changes needed — `DataRequirement` is structurally compatible with `FormFieldRequirement`.

### Fix 5: flex-form-landing and flex-form-confirmation — local prop types

**flex-form-landing** — replace `FormSpec` import:

Before:
```tsx
import type { FormSpec } from '../../../services/forms/types'
interface FormLandingProps {
  formSpec: FormSpec
  startUrl: string
}
```

After:
```tsx
interface FormLandingSpec {
  title: string
  description?: string
  pages: { length: number }
}
interface FormLandingProps {
  formSpec: FormLandingSpec
  startUrl: string
}
```

**flex-form-confirmation** — replace `Submission` import:

Before:
```tsx
import type { Submission } from '../../../services/forms/types'
```

After:
```tsx
interface FormSubmissionSummary {
  id: string
  submittedAt: string
}
interface FormConfirmationProps {
  submission: FormSubmissionSummary
}
```

No caller changes needed for either — structural compatibility.

### Fix 6: flex-form-page and flex-form-review — pre-evaluate conditions, local types

These components both import `evaluateCondition` and domain types. The fix has two parts: define local types and move condition evaluation into the route.

**flex-form-page** — local types:

```tsx
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
```

The component renders all groups and requirements it receives — no filtering. `FormFieldRequirement` and `FormFieldEntry` are imported from `../flex-form-field` — the form-field component exports its prop types for use by sibling form components.

**flex-form-review** — local types:

```tsx
interface ReviewPage {
  id: string
  title: string
  condition?: unknown
  groups: ReviewGroup[]
}

interface ReviewGroup {
  id: string
  title: string
  requirements: ReviewRequirement[]
}

interface ReviewRequirement {
  id: string
  fieldName: string
  label: string
}

interface FormReviewProps {
  pages: ReviewPage[]
  fields: Record<string, FormFieldEntry>
  submitUrl: string
  editBaseUrl: string
}
```

**Route-side condition pre-evaluation:**

The forms route (`entrypoints/app/routes/forms/index.tsx`) already calls `resolveFormSpec` which produces `ResolvedForm` with all pages and groups. Before passing to the component, the route filters:

```typescript
function filterVisibleGroups(
  groups: RequirementGroup[],
  fields: Record<string, FieldEntry>,
): RequirementGroup[] {
  return groups
    .filter(g => evaluateCondition(g.condition, fields))
    .map(g => ({
      ...g,
      requirements: g.requirements.filter(r =>
        evaluateCondition(r.condition, fields)
      ),
    }))
}
```

This produces the same HTML output. The server render is a single pass per request — filtering before or during render is equivalent.

## Scope

Mechanical refactor only. No behavior changes, no new features. All tests must pass identically. The only observable change is that `flex-prose` callers pass `html` instead of `content` — the rendered output is the same.

## Affected files

**Design-system components (type changes):**
- `src/design-system/components/flex-prose/index.tsx`
- `src/design-system/components/flex-layout/index.tsx`
- `src/design-system/components/flex-form-field/index.tsx`
- `src/design-system/components/flex-form-page/index.tsx`
- `src/design-system/components/flex-form-review/index.tsx`
- `src/design-system/components/flex-form-landing/index.tsx`
- `src/design-system/components/flex-form-confirmation/index.tsx`

**Test infrastructure (moves):**
- `src/shared/test-helpers/` -> `src/design-system/test-helpers/`
- `src/shared/visual-descriptor/` -> `src/design-system/visual-descriptor/`
- All 44 conformance test files (import path updates)

**Route-side changes:**
- `src/entrypoints/app/routes/catalog/*.tsx` (6 files — pass `html` to Prose)
- `src/entrypoints/app/routes/forms/index.tsx` (pre-evaluate conditions)

**Tests:**
- `test/forms/form-page.test.tsx` (pass pre-filtered data)
- `test/forms/form-review.test.tsx` (pass pre-filtered data)
- `test/forms/field-renderer.test.tsx` (use local types)
