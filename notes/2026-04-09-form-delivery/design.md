# Form Delivery Design — Story 6

Carlos fills out a published form. Static delivery mode, server-rendered, multi-page wizard with review and submission.

## Scope

Build the form rendering and filling system as an isolated vertical slice. Wired routes, in-memory persistence, full test coverage. Integration with permanent persistence and other stories happens later via rebase.

Out of scope: conversational/hybrid delivery modes, compound field patterns (address, SSN), git-based persistence, authentication.

## Data Types

### DataCollectionSpec (what to collect)

```typescript
interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
}

interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
  condition?: FieldCondition
}

interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  validation?: ValidationRule[]
  condition?: FieldCondition
}

type FieldType =
  | 'text' | 'email' | 'phone' | 'url'
  | 'number' | 'currency' | 'date'
  | 'boolean' | 'choice' | 'longText'

interface ValidationRule {
  type: 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength'
  value: string | number
  message?: string
}

interface FieldCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}
```

### FormSpec (how to present)

```typescript
interface FormSpec {
  id: string
  specId: string  // references DataCollectionSpec.id
  title: string
  description?: string
  pages: FormPage[]
}

interface FormPage {
  id: string
  title: string
  description?: string
  groups: string[]            // RequirementGroup IDs
  condition?: FieldCondition  // skip page when not met
}
```

FormSpec references DataCollectionSpec by ID. A resolution layer joins them at render time. FormSpec is intentionally thin — it owns flow and presentation, not field semantics.

### Session & Submission

```typescript
interface FormSession {
  id: string
  specId: string
  formSpecId: string
  fields: Record<string, FieldEntry>
  status: 'active' | 'submitted'
  createdAt: string
}

interface FieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}

interface Submission {
  id: string
  specId: string
  formSpecId: string
  data: Record<string, unknown>
  submittedAt: string
}
```

## Persistence Gateway

In-memory implementations, swappable later.

```typescript
interface FormSessionGateway {
  createSession(specId: string, formSpecId: string): FormSession
  getSession(id: string): FormSession | null
  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void
  submit(sessionId: string): Submission
}

interface SubmissionGateway {
  getSubmission(id: string): Submission | null
}
```

- `writeFields` takes a batch (all fields from a page POST).
- `submit()` transitions session to submitted and returns a Submission.
- Two separate gateways — sessions and submissions have different lifecycles.

## Resolution Layer

```typescript
interface ResolvedForm {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
  pages: ResolvedPage[]
}

interface ResolvedPage {
  page: FormPage
  groups: RequirementGroup[]
}

function resolveFormSpec(
  formSpec: FormSpec,
  dataSpec: DataCollectionSpec
): ResolvedForm
```

Looks up each page's group IDs in the DataCollectionSpec. Throws if a group ID doesn't exist.

### Condition Evaluation

```typescript
function evaluateCondition(
  condition: FieldCondition | undefined,
  fields: Record<string, FieldEntry>
): boolean
```

Returns true if no condition or condition is met. Used at three levels: page skipping, group visibility, field visibility. The renderer calls it — resolution is structural, condition evaluation is runtime.

## Routes

```
GET  /forms/:specId                                        → landing page
POST /forms/:specId/sessions                               → create session, redirect
GET  /forms/:specId/sessions/:sessionId/pages/:pageIndex   → render page
POST /forms/:specId/sessions/:sessionId/pages/:pageIndex   → validate & save, redirect
GET  /forms/:specId/sessions/:sessionId/review              → review all answers
POST /forms/:specId/sessions/:sessionId/submit              → finalize, redirect
GET  /forms/:specId/sessions/:sessionId/confirmation        → thank you
```

## Renderer

Server-rendered JSX via Hono. Each route handler resolves the form, evaluates conditions against session state, and renders.

### Field Type Mapping

| FieldType | Component | Notes |
|-----------|-----------|-------|
| text | flex-text-input | |
| email | flex-text-input | type="email" |
| phone | flex-text-input | type="tel" |
| url | flex-text-input | type="url" |
| number | flex-text-input | type="number" |
| currency | flex-text-input | type="number", with input prefix |
| date | flex-date-picker | |
| boolean | flex-checkbox | |
| choice | flex-radio / flex-select | radio when <=7 choices, select otherwise |
| longText | flex-textarea | |

### Page Navigation

- After page POST: validate fields, write to session, find next visible page (skip pages whose conditions aren't met).
- Previous works the same in reverse.
- If all remaining pages are skipped, redirect to review.

### Validation

Server-side only. Each page POST validates submitted fields against DataRequirement rules (required, validation rules). Errors written to FieldEntry.errors, page re-renders with error states.

### Review Page

All filled fields organized by group, read-only. Each group section links back to its page for editing.

## File Structure

```
src/types/models.ts                 — revised type definitions
src/routes/forms/index.tsx          — route handlers
src/services/form-session.ts        — in-memory session gateway
src/services/submission.ts          — in-memory submission gateway
src/services/form-resolver.ts       — resolveFormSpec + evaluateCondition
src/components/flex-form-page/      — page renderer (walks groups/fields)
src/components/flex-form-review/    — review page renderer
test/forms/                         — all form-related tests
```

## Test Strategy

### Unit Tests (Bun test)

- `resolveFormSpec()` — correct joining, missing group ID throws
- `evaluateCondition()` — each operator, undefined condition, missing field
- Validation — required fields, each validation rule type
- Session gateway — create, write, submit lifecycle
- Page navigation — next/previous with condition skipping

### Route Integration Tests (Bun test, `app.request()`)

- Full request/response cycle for each route
- Create session, fill pages, review, submit, confirmation
- Validation errors re-render page with errors
- Conditional page skipping produces correct redirects
- Invalid session ID returns 404

### Renderer Tests (Bun test)

- Each field type maps to correct HTML element
- Error states render with correct ARIA attributes
- Review page shows all submitted data
- Conditional fields/groups hidden when conditions not met

### Test Data

Realistic fixtures derived from homework repo specs. Simple multi-group form exercising all field types and conditions.

## Design Principles

- All decisions are easily reversible. Types are simple, layers are thin, nothing is over-abstracted.
- The spec is a data format, not a program. No expression languages, no embedded logic.
- Complexity lives in the renderer (JSX components), not the spec.
- In-memory persistence gateway is a stand-in. The interface is the contract; the implementation is throwaway.
