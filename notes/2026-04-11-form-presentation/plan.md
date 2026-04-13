# Form Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a civic forms UX treatment across all four form flow stages (landing, form page, review, confirmation) using GOV.UK interaction patterns with USWDS-conformant flex components.

**Architecture:** Fix `flex-form` to match USWDS, then work through the form flow in order. Each task produces a self-contained improvement with tests. New components: `flex-form-error-summary` (error summary panel), `flex-form-step-text` (page progress caption). Modified components: `flex-form`, `flex-label`, `flex-error-message`, `flex-form-field`, `flex-form-page`, `flex-form-landing`, `flex-form-review`, `flex-form-confirmation`.

**Tech Stack:** Hono JSX (server-rendered), CSS cascade layers, Bun test runner, Playwright conformance tests

---

## File Map

**New files:**
- `src/app/components/flex-form-error-summary/index.tsx` — error summary component
- `src/app/components/flex-form-error-summary/styles.css` — error summary styles
- `src/app/components/flex-form-step-text/index.tsx` — page progress caption
- `src/app/components/flex-form-step-text/styles.css` — step text styles
- `test/forms/error-summary.test.tsx` — error summary unit tests
- `test/forms/step-text.test.tsx` — step text unit tests

**Modified files:**
- `src/app/components/flex-form/styles.css` — fix max-widths
- `src/app/components/flex-form/conformance-spec.tsx` — update fixtures, add fieldset/legend/error fixtures
- `src/app/components/flex-label/index.tsx` — add `optional` prop, remove asterisk
- `src/app/components/flex-label/styles.css` — optional label styles
- `src/app/components/flex-error-message/index.tsx` — add visually-hidden "Error:" prefix
- `src/app/components/flex-form-field/index.tsx` — form-group wrapper, field widths, optional labels, spacing fix
- `src/app/components/flex-form-page/index.tsx` — full recomposition
- `src/app/components/flex-form-landing/index.tsx` — form wrapper, prose, copy
- `src/app/components/flex-form-review/index.tsx` — summary list, change links, a11y
- `src/app/components/flex-form-confirmation/index.tsx` — success alert, formatted date
- `src/app/routes/forms/index.tsx` — error summary data, title prefix, progress props
- `src/app/public/styles.css` — import new component stylesheets
- `src/types/models.ts` — add `displayWidth` to `DataRequirement`
- `test/forms/field-renderer.test.tsx` — update for form-group wrapper, optional labels
- `test/forms/form-page.test.tsx` — update for new composition
- `test/forms/form-review.test.tsx` — update for summary list pattern
- `test/forms/routes.test.ts` — update for error summary, title prefix, progress

---

### Task 1: Fix `flex-form` max-widths and conformance

**Files:**
- Modify: `src/app/components/flex-form/styles.css`
- Modify: `src/app/components/flex-form/conformance-spec.tsx`

- [ ] **Step 1: Update `flex-form` styles to match USWDS**

In `src/app/components/flex-form/styles.css`, change:

```css
/* flex-form — USWDS Form conformance
   Base: max-width 32em (usa-form), proper child spacing
   Large variant: data-size="large" — max-width 46rem (usa-form--large) */

.flex-form {
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-uswds);
  line-height: 1.3;
  max-width: 32em;
}

.flex-form[data-size="large"] {
  max-width: 46rem;
}
```

Leave all other rules unchanged.

- [ ] **Step 2: Update conformance spec with accurate fixtures**

In `src/app/components/flex-form/conformance-spec.tsx`, update the conformance spec to verify max-width values and add fieldset/legend and error-group fixtures:

```tsx
/** @jsxImportSource hono/jsx */
import type { ConformanceSpec } from '../conformance-types'

const formContent = (prefix: string) => (
  <>
    <label class={`${prefix}-label`} for="input-1">
      Name
    </label>
    <input
      class={`${prefix}-input`}
      id="input-1"
      name="input-1"
      type="text"
    />
  </>
)

const fieldsetContent = (prefix: string) => (
  <fieldset>
    <legend class={prefix === 'usa' ? 'usa-legend usa-legend--large' : undefined}>
      Personal Information
    </legend>
    <label class={`${prefix}-label`} for="fs-input">
      Name
    </label>
    <input
      class={`${prefix}-input`}
      id="fs-input"
      name="fs-input"
      type="text"
    />
  </fieldset>
)

function formFixture(name: string, size?: string) {
  return {
    name,
    uswds: (
      <div>
        <form
          class={`usa-form${size ? ` usa-form--${size}` : ''}`}
          data-testid="target"
        >
          {formContent('usa')}
        </form>
      </div>
    ).toString(),
    flex: (
      <div>
        <form class="flex-form" data-size={size} data-testid="target">
          {formContent('flex')}
        </form>
      </div>
    ).toString(),
  }
}

function fieldsetFixture() {
  return {
    name: 'form with fieldset and legend',
    uswds: (
      <div>
        <form class="usa-form usa-form--large" data-testid="target">
          {fieldsetContent('usa')}
        </form>
      </div>
    ).toString(),
    flex: (
      <div>
        <form class="flex-form" data-size="large" data-testid="target">
          {fieldsetContent('flex')}
        </form>
      </div>
    ).toString(),
  }
}

function errorGroupFixture() {
  return {
    name: 'form group with error state',
    uswds: (
      <div>
        <form class="usa-form usa-form--large" data-testid="target">
          <div class="usa-form-group usa-form-group--error">
            <label class="usa-label" for="err-input">
              Name
            </label>
            <span class="usa-error-message" role="alert">
              Enter your name
            </span>
            <input
              class="usa-input usa-input--error"
              id="err-input"
              name="err-input"
              type="text"
            />
          </div>
        </form>
      </div>
    ).toString(),
    flex: (
      <div>
        <form class="flex-form" data-size="large" data-testid="target">
          <div class="flex-form-group" data-state="error">
            <label class="flex-label" for="err-input">
              Name
            </label>
            <span class="flex-error-message" role="alert">
              Enter your name
            </span>
            <input
              class="flex-input"
              data-state="error"
              id="err-input"
              name="err-input"
              type="text"
            />
          </div>
        </form>
      </div>
    ).toString(),
  }
}

export const spec: ConformanceSpec = {
  component: 'flex-form',
  reference: 'https://designsystem.digital.gov/components/form/',
  mapping: [
    {
      uswds: 'usa-form',
      flex: '.flex-form',
      notes: 'Base form class with max-width: 32em',
    },
    {
      uswds: 'usa-form--large',
      flex: 'data-size="large"',
      notes: 'Wider form variant (46rem)',
    },
    {
      uswds: 'usa-form-group--error',
      flex: '.flex-form-group[data-state="error"]',
      notes: 'Error state with left red border',
    },
  ],
  verified: [
    'max-width',
    'font-family',
    'font-size',
    'line-height',
    'fieldset border/margin/padding',
    'legend font-size/font-weight',
  ],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [
    formFixture('default form matches usa-form'),
    formFixture('large form matches usa-form--large', 'large'),
    fieldsetFixture(),
    errorGroupFixture(),
  ],
  accessibilityFixtureHtml: `<main>
    <h1>Form Test</h1>
    <form class="flex-form">
      <label class="flex-label" for="name">Name</label>
      <input class="flex-input" id="name" name="name" type="text">
    </form>
  </main>`,
  behavior: [],
}
```

- [ ] **Step 3: Run conformance tests**

Run: `bunx playwright test src/app/components/flex-form/conformance.test.ts`

Verify the max-width values match between USWDS and flex for both default and large variants.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-form/styles.css src/app/components/flex-form/conformance-spec.tsx
git commit -m "fix(flex-form): correct max-widths to match USWDS (32em default, 46rem large)

Add fieldset/legend and error-group conformance fixtures."
```

---

### Task 2: Add `displayWidth` to `DataRequirement` type

**Files:**
- Modify: `src/types/models.ts:22-31`

- [ ] **Step 1: Add `displayWidth` to the type**

In `src/types/models.ts`, add `displayWidth` to `DataRequirement`:

```typescript
export interface DataRequirement {
  id: string
  fieldName: string
  label: string
  fieldType: FieldType
  required: boolean
  helpText?: string
  choices?: string[]
  validation?: ValidationRule[]
  condition?: FieldCondition
  displayWidth?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}
```

- [ ] **Step 2: Run type check**

Run: `bun run --no-warnings tsc --noEmit`
Expected: clean (additive change, nothing references it yet)

- [ ] **Step 3: Commit**

```bash
git add src/types/models.ts
git commit -m "feat(types): add displayWidth to DataRequirement for field sizing hints"
```

---

### Task 3: Update `flex-label` — optional marking instead of required asterisk

**Files:**
- Modify: `src/app/components/flex-label/index.tsx`
- Modify: `src/app/components/flex-label/styles.css`

- [ ] **Step 1: Write the failing test**

Create `test/forms/label.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { Label } from '../../src/app/components/flex-label'

function render(props: {
  htmlFor?: string
  required?: boolean
  optional?: boolean
  children: string
}): string {
  return (
    (
      <Label
        htmlFor={props.htmlFor}
        required={props.required}
        optional={props.optional}
      >
        {props.children}
      </Label>
    ) as any
  ).toString()
}

describe('Label', () => {
  it('renders basic label', () => {
    const html = render({ children: 'Full Name' })
    expect(html).toContain('Full Name')
    expect(html).toContain('class="flex-label"')
  })

  it('does not show asterisk for required fields', () => {
    const html = render({ children: 'Full Name', required: true })
    expect(html).not.toContain('*')
    expect(html).not.toContain('flex-label__required')
  })

  it('shows (optional) suffix when optional is true', () => {
    const html = render({ children: 'Phone', optional: true })
    expect(html).toContain('(optional)')
    expect(html).toContain('flex-label__optional')
  })

  it('does not show (optional) when optional is false', () => {
    const html = render({ children: 'Full Name' })
    expect(html).not.toContain('(optional)')
  })

  it('sets for attribute', () => {
    const html = render({ htmlFor: 'name', children: 'Name' })
    expect(html).toContain('for="name"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/label.test.tsx`
Expected: FAIL — `optional` prop doesn't exist yet, asterisk still renders for required

- [ ] **Step 3: Update Label component**

Replace `src/app/components/flex-label/index.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx'

interface LabelProps {
  htmlFor?: string
  required?: boolean
  optional?: boolean
  children: Child
}

export const Label: FC<LabelProps> = ({ htmlFor, optional, children }) => {
  return (
    <label class="flex-label" for={htmlFor}>
      {children}
      {optional && (
        <span class="flex-label__optional"> (optional)</span>
      )}
    </label>
  )
}
```

- [ ] **Step 4: Update Label styles**

In `src/app/components/flex-label/styles.css`, replace `__required` with `__optional`:

```css
/* flex-label — USWDS Label conformance
   Extends: Typography Base (base-classes.css#typography) */
.flex-label {
  font-weight: normal;
  display: block;
  margin-top: 1.5rem;
  max-width: var(--flex-control-max-width);
}

.flex-label__optional {
  color: var(--flex-color-text-muted);
  font-weight: normal;
  font-style: normal;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/forms/label.test.tsx`
Expected: PASS — all 5 tests

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flex-label/index.tsx src/app/components/flex-label/styles.css test/forms/label.test.tsx
git commit -m "feat(flex-label): replace required asterisk with optional marking

GOV.UK pattern: mark optional fields instead of required ones.
Most civic form fields are required, so marking exceptions reduces noise."
```

---

### Task 4: Update `flex-error-message` — visually-hidden "Error:" prefix

**Files:**
- Modify: `src/app/components/flex-error-message/index.tsx`

- [ ] **Step 1: Write the failing test**

Create `test/forms/error-message.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { ErrorMessage } from '../../src/app/components/flex-error-message'

function render(props: { id?: string; children: string }): string {
  return (
    (<ErrorMessage id={props.id}>{props.children}</ErrorMessage>) as any
  ).toString()
}

describe('ErrorMessage', () => {
  it('renders error text with visually-hidden prefix', () => {
    const html = render({ children: 'Enter your full name' })
    expect(html).toContain('u-visually-hidden')
    expect(html).toContain('Error:')
    expect(html).toContain('Enter your full name')
  })

  it('has alert role', () => {
    const html = render({ children: 'Required' })
    expect(html).toContain('role="alert"')
  })

  it('sets id attribute', () => {
    const html = render({ id: 'name-error', children: 'Required' })
    expect(html).toContain('id="name-error"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/error-message.test.tsx`
Expected: FAIL — no visually-hidden prefix yet

- [ ] **Step 3: Update ErrorMessage component**

Replace `src/app/components/flex-error-message/index.tsx`:

```tsx
import type { Child, FC } from 'hono/jsx'

interface ErrorMessageProps {
  id?: string
  children: Child
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ id, children }) => {
  return (
    <span class="flex-error-message" id={id} role="alert">
      <span class="u-visually-hidden">Error: </span>
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/forms/error-message.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-error-message/index.tsx test/forms/error-message.test.tsx
git commit -m "feat(flex-error-message): add visually-hidden Error prefix for screen readers

GOV.UK accessibility pattern: prefix inline errors so screen readers
announce 'Error: Enter your full name' instead of just the message."
```

---

### Task 5: Create `flex-form-error-summary` component

**Files:**
- Create: `src/app/components/flex-form-error-summary/index.tsx`
- Create: `src/app/components/flex-form-error-summary/styles.css`
- Create: `test/forms/error-summary.test.tsx`
- Modify: `src/app/public/styles.css`

- [ ] **Step 1: Write the failing test**

Create `test/forms/error-summary.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { FormErrorSummary } from '../../src/app/components/flex-form-error-summary'

interface ErrorItem {
  fieldId: string
  message: string
}

function render(errors: ErrorItem[]): string {
  return ((<FormErrorSummary errors={errors} />) as any).toString()
}

describe('FormErrorSummary', () => {
  it('renders nothing when errors is empty', () => {
    const html = render([])
    expect(html).toBe('')
  })

  it('renders error summary with heading', () => {
    const html = render([{ fieldId: 'fullName', message: 'Enter your full name' }])
    expect(html).toContain('There is a problem')
    expect(html).toContain('role="alert"')
  })

  it('renders anchor links to fields', () => {
    const html = render([
      { fieldId: 'fullName', message: 'Enter your full name' },
      { fieldId: 'email', message: 'Enter your email address' },
    ])
    expect(html).toContain('href="#fullName"')
    expect(html).toContain('Enter your full name')
    expect(html).toContain('href="#email"')
    expect(html).toContain('Enter your email address')
  })

  it('has tabindex for programmatic focus', () => {
    const html = render([{ fieldId: 'x', message: 'Required' }])
    expect(html).toContain('tabindex="-1"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/error-summary.test.tsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Create the component**

Create `src/app/components/flex-form-error-summary/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'

export interface FormError {
  fieldId: string
  message: string
}

interface FormErrorSummaryProps {
  errors: FormError[]
}

export const FormErrorSummary: FC<FormErrorSummaryProps> = ({ errors }) => {
  if (errors.length === 0) return <></>

  return (
    <div class="flex-form-error-summary" role="alert" tabindex={-1}>
      <h2>There is a problem</h2>
      <ul>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Create styles**

Create `src/app/components/flex-form-error-summary/styles.css`:

```css
/* flex-form-error-summary — GOV.UK error summary pattern */
.flex-form-error-summary {
  border-left: 0.25rem solid var(--flex-color-error);
  padding: var(--flex-space-lg);
  margin-bottom: var(--flex-space-lg);
}

.flex-form-error-summary:focus {
  outline: var(--flex-focus-ring);
  outline-offset: var(--flex-focus-offset);
}

.flex-form-error-summary h2 {
  font-size: 1.17rem;
  font-weight: 700;
  margin: 0 0 var(--flex-space-sm) 0;
}

.flex-form-error-summary ul {
  margin: 0;
  padding-left: 1.25rem;
}

.flex-form-error-summary li {
  margin-bottom: var(--flex-space-xs);
}

.flex-form-error-summary a {
  color: var(--flex-color-error);
  font-weight: 700;
}
```

- [ ] **Step 5: Add stylesheet import**

In `src/app/public/styles.css`, add after the `flex-form` import (line 48):

```css
@import "../components/flex-form-error-summary/styles.css" layer(block);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test test/forms/error-summary.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/components/flex-form-error-summary/ test/forms/error-summary.test.tsx src/app/public/styles.css
git commit -m "feat: add flex-form-error-summary component

GOV.UK error summary pattern: alert role, anchor links to fields,
tabindex for programmatic focus, red left border."
```

---

### Task 6: Create `flex-form-step-text` component

**Files:**
- Create: `src/app/components/flex-form-step-text/index.tsx`
- Create: `src/app/components/flex-form-step-text/styles.css`
- Create: `test/forms/step-text.test.tsx`
- Modify: `src/app/public/styles.css`

- [ ] **Step 1: Write the failing test**

Create `test/forms/step-text.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { FormStepText } from '../../src/app/components/flex-form-step-text'

function render(current: number, total: number): string {
  return (
    (<FormStepText current={current} total={total} />) as any
  ).toString()
}

describe('FormStepText', () => {
  it('renders page count text', () => {
    const html = render(1, 3)
    expect(html).toContain('Page 1 of 3')
  })

  it('renders with correct class', () => {
    const html = render(2, 5)
    expect(html).toContain('flex-form-step-text')
  })

  it('updates numbers correctly', () => {
    const html = render(3, 3)
    expect(html).toContain('Page 3 of 3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/step-text.test.tsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Create the component**

Create `src/app/components/flex-form-step-text/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'

interface FormStepTextProps {
  current: number
  total: number
}

export const FormStepText: FC<FormStepTextProps> = ({ current, total }) => {
  return (
    <span class="flex-form-step-text">
      Page {current} of {total}
    </span>
  )
}
```

- [ ] **Step 4: Create styles**

Create `src/app/components/flex-form-step-text/styles.css`:

```css
/* flex-form-step-text — page progress caption
   Modeled after USWDS usa-step-indicator__heading-counter */
.flex-form-step-text {
  display: block;
  font-family: var(--flex-font-sans);
  font-size: var(--flex-text-sm);
  color: var(--flex-color-text-muted);
  font-weight: normal;
  margin-bottom: var(--flex-space-xs);
}
```

- [ ] **Step 5: Add stylesheet import**

In `src/app/public/styles.css`, add after the `flex-form-error-summary` import:

```css
@import "../components/flex-form-step-text/styles.css" layer(block);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test test/forms/step-text.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/components/flex-form-step-text/ test/forms/step-text.test.tsx src/app/public/styles.css
git commit -m "feat: add flex-form-step-text component

Simple 'Page X of Y' caption for form wizard progress.
Adapts to conditional page skipping unlike fixed step indicators."
```

---

### Task 7: Update `flex-form-field` — form-group wrapper, spacing, field widths, optional labels

**Files:**
- Modify: `src/app/components/flex-form-field/index.tsx`
- Modify: `test/forms/field-renderer.test.tsx`

- [ ] **Step 1: Update field-renderer tests**

Rewrite `test/forms/field-renderer.test.tsx` to verify the new behavior. Key changes: form-group wrapper with error state, optional label instead of required asterisk, field width props, fixed spacing token.

```tsx
import { describe, expect, it } from 'bun:test'
import { FormField } from '../../src/app/components/flex-form-field'
import type { DataRequirement, FieldEntry } from '../../src/types/models'

describe('FormField', () => {
  const baseReq: DataRequirement = {
    id: 'name',
    fieldName: 'fullName',
    label: 'Full Name',
    fieldType: 'text',
    required: true,
  }

  function render(req: DataRequirement, entry?: FieldEntry): string {
    return ((<FormField requirement={req} entry={entry} />) as any).toString()
  }

  it('renders a text input with label', () => {
    const html = render(baseReq)
    expect(html).toContain('Full Name')
    expect(html).toContain('name="fullName"')
  })

  it('wraps field in flex-form-group', () => {
    const html = render(baseReq)
    expect(html).toContain('class="flex-form-group"')
  })

  it('sets error state on form-group when field has errors', () => {
    const html = render(baseReq, { value: '', errors: ['Required'] })
    expect(html).toContain('data-state="error"')
  })

  it('does not show asterisk for required fields', () => {
    const html = render(baseReq)
    expect(html).not.toContain('*')
    expect(html).not.toContain('flex-label__required')
  })

  it('shows (optional) for non-required fields', () => {
    const html = render({ ...baseReq, required: false })
    expect(html).toContain('(optional)')
  })

  it('uses spacing token --flex-space-xs', () => {
    const html = render(baseReq)
    expect(html).toContain('--flex-space-xs')
    expect(html).not.toContain('--flex-spacing-1')
  })

  it('renders email input with xl width', () => {
    const html = render({ ...baseReq, fieldType: 'email', fieldName: 'email' })
    expect(html).toContain('data-width="xl"')
  })

  it('renders phone input with md width', () => {
    const html = render({ ...baseReq, fieldType: 'phone', fieldName: 'phone' })
    expect(html).toContain('data-width="md"')
  })

  it('renders number input with sm width', () => {
    const html = render({ ...baseReq, fieldType: 'number', fieldName: 'count' })
    expect(html).toContain('data-width="sm"')
  })

  it('respects displayWidth override', () => {
    const html = render({ ...baseReq, displayWidth: '2xl' })
    expect(html).toContain('data-width="2xl"')
  })

  it('renders currency with md width', () => {
    const html = render({
      ...baseReq,
      fieldType: 'currency',
      fieldName: 'income',
    })
    expect(html).toContain('type="number"')
  })

  it('renders checkbox for boolean', () => {
    const html = render({
      ...baseReq,
      fieldType: 'boolean',
      fieldName: 'agree',
      label: 'I agree',
    })
    expect(html).toContain('type="checkbox"')
  })

  it('renders radio buttons for choice with few options', () => {
    const html = render({
      ...baseReq,
      fieldType: 'choice',
      fieldName: 'color',
      choices: ['Red', 'Blue'],
    })
    expect(html).toContain('type="radio"')
  })

  it('renders select for choice with many options', () => {
    const html = render({
      ...baseReq,
      fieldType: 'choice',
      fieldName: 'state',
      choices: Array.from({ length: 8 }, (_, i) => `Option ${i}`),
    })
    expect(html).toContain('class="flex-select"')
  })

  it('renders textarea for longText', () => {
    const html = render({
      ...baseReq,
      fieldType: 'longText',
      fieldName: 'notes',
    })
    expect(html).toContain('class="flex-textarea"')
  })

  it('shows help text when provided', () => {
    const html = render({ ...baseReq, helpText: 'Enter your full legal name' })
    expect(html).toContain('Enter your full legal name')
    expect(html).toContain('flex-hint')
  })

  it('shows error message when entry has errors', () => {
    const html = render(baseReq, {
      value: '',
      errors: ['Full Name is required'],
    })
    expect(html).toContain('Full Name is required')
    expect(html).toContain('flex-error-message')
  })

  it('populates value from entry', () => {
    const html = render(baseReq, { value: 'Alice' })
    expect(html).toContain('value="Alice"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/forms/field-renderer.test.tsx`
Expected: FAIL — form-group wrapper missing, optional label missing, width props missing

- [ ] **Step 3: Rewrite FormField component**

Replace `src/app/components/flex-form-field/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { DataRequirement, FieldEntry } from '../../../types/models'
import { Checkbox } from '../flex-checkbox'
import { DatePicker } from '../flex-date-picker'
import { ErrorMessage } from '../flex-error-message'
import { InputGroup } from '../flex-input-prefix-suffix'
import { Label } from '../flex-label'
import { Radio } from '../flex-radio'
import { Select } from '../flex-select'
import { TextInput } from '../flex-text-input'
import { Textarea } from '../flex-textarea'

const CHOICE_RADIO_THRESHOLD = 7

const DEFAULT_WIDTHS: Partial<
  Record<DataRequirement['fieldType'], DataRequirement['displayWidth']>
> = {
  email: 'xl',
  phone: 'md',
  number: 'sm',
  currency: 'md',
}

interface FormFieldProps {
  requirement: DataRequirement
  entry?: FieldEntry
}

export const FormField: FC<FormFieldProps> = ({ requirement, entry }) => {
  const {
    fieldName,
    label,
    fieldType,
    required,
    helpText,
    choices,
    displayWidth,
  } = requirement
  const hasError = entry?.errors && entry.errors.length > 0
  const errorId = `${fieldName}-error`
  const helpId = `${fieldName}-help`
  const describedBy =
    [hasError ? errorId : null, helpText ? helpId : null]
      .filter(Boolean)
      .join(' ') || undefined
  const value = entry?.value
  const width = displayWidth ?? DEFAULT_WIDTHS[fieldType]

  return (
    <div
      class="flex-form-group"
      data-state={hasError ? 'error' : undefined}
    >
      <div class="l-stack" style="--stack-space: var(--flex-space-xs)">
        {fieldType !== 'boolean' && fieldType !== 'date' && (
          <Label htmlFor={fieldName} optional={!required}>
            {label}
          </Label>
        )}
        {helpText && (
          <span class="flex-hint" id={helpId}>
            {helpText}
          </span>
        )}
        {hasError && entry?.errors && (
          <ErrorMessage id={errorId}>{entry.errors.join('. ')}</ErrorMessage>
        )}
        {renderInput(
          fieldType,
          fieldName,
          value,
          hasError,
          describedBy,
          choices,
          label,
          required,
          width,
        )}
      </div>
    </div>
  )
}

function renderInput(
  fieldType: DataRequirement['fieldType'],
  name: string,
  value: string | number | boolean | null | undefined,
  hasError: boolean | undefined,
  describedBy: string | undefined,
  choices: string[] | undefined,
  label: string,
  required: boolean,
  width: DataRequirement['displayWidth'],
) {
  const state = hasError ? ('error' as const) : undefined
  const strValue = value != null && value !== false ? String(value) : undefined

  switch (fieldType) {
    case 'text':
      return (
        <TextInput
          id={name}
          name={name}
          type="text"
          value={strValue}
          width={width}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'email':
      return (
        <TextInput
          id={name}
          name={name}
          type="email"
          value={strValue}
          width={width}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'phone':
      return (
        <TextInput
          id={name}
          name={name}
          type="tel"
          value={strValue}
          width={width}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'url':
      return (
        <TextInput
          id={name}
          name={name}
          type="url"
          value={strValue}
          width={width}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'number':
      return (
        <TextInput
          id={name}
          name={name}
          type="number"
          value={strValue}
          width={width}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'currency':
      return (
        <InputGroup prefix="$" state={state}>
          <TextInput
            id={name}
            name={name}
            type="number"
            value={strValue}
            width={width}
            state={state}
            required={required}
            ariaDescribedby={describedBy}
          />
        </InputGroup>
      )
    case 'longText':
      return (
        <Textarea
          id={name}
          name={name}
          defaultValue={strValue}
          state={state}
          required={required}
          ariaDescribedby={describedBy}
        />
      )
    case 'boolean':
      return (
        <Checkbox
          id={name}
          name={name}
          value="on"
          label={label}
          checked={value === true}
          required={required}
          state={state}
          ariaDescribedby={describedBy}
        />
      )
    case 'date':
      return (
        <DatePicker
          id={name}
          name={name}
          label={label}
          defaultValue={strValue}
          required={required}
        />
      )
    case 'choice': {
      if (!choices) return null
      if (choices.length <= CHOICE_RADIO_THRESHOLD) {
        return (
          <fieldset>
            {choices.map((choice) => (
              <Radio
                key={choice}
                id={`${name}-${choice}`}
                name={name}
                value={choice}
                label={choice}
                checked={value === choice}
              />
            ))}
          </fieldset>
        )
      }
      return (
        <Select
          id={name}
          name={name}
          state={hasError ? 'error' : undefined}
          value={strValue}
          ariaDescribedby={describedBy}
          options={choices.map((c) => ({ value: c, label: c }))}
        />
      )
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/field-renderer.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `bun test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flex-form-field/index.tsx test/forms/field-renderer.test.tsx
git commit -m "feat(flex-form-field): form-group wrapper, field widths, optional labels, spacing fix

- Wrap each field in flex-form-group with error state
- Fix broken --flex-spacing-1 token to --flex-space-xs
- Pass width prop based on fieldType defaults + displayWidth override
- Use optional label marking instead of required asterisk"
```

---

### Task 8: Recompose `flex-form-page` — full civic forms treatment

**Files:**
- Modify: `src/app/components/flex-form-page/index.tsx`
- Modify: `test/forms/form-page.test.tsx`

- [ ] **Step 1: Update form page tests**

Replace `test/forms/form-page.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { FormPageView } from '../../src/app/components/flex-form-page'
import { resolveFormSpec } from '../../src/services/form-resolver'
import type { FieldEntry, ResolvedPage } from '../../src/types/models'
import type { FormError } from '../../src/app/components/flex-form-error-summary'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormPageView', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function render(
    resolvedPage: ResolvedPage,
    props: {
      actionUrl: string
      currentPage: number
      totalPages: number
      fields?: Record<string, FieldEntry>
      errors?: FormError[]
      prevUrl?: string | null
      titlePrefix?: string
    },
  ): string {
    return (
      (
        <FormPageView
          resolvedPage={resolvedPage}
          actionUrl={props.actionUrl}
          currentPage={props.currentPage}
          totalPages={props.totalPages}
          fields={props.fields ?? {}}
          errors={props.errors ?? []}
          prevUrl={props.prevUrl ?? null}
          titlePrefix={props.titlePrefix}
        />
      ) as any
    ).toString()
  }

  it('renders page title', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('Personal Information')
  })

  it('renders step text', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('Page 1 of 3')
  })

  it('wraps in flex-form with large size', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('class="flex-form"')
    expect(html).toContain('data-size="large"')
  })

  it('adds novalidate to form', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('novalidate')
  })

  it('renders error summary when errors present', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
      errors: [{ fieldId: 'fullName', message: 'Enter your full name' }],
    })
    expect(html).toContain('There is a problem')
    expect(html).toContain('href="#fullName"')
  })

  it('does not render error summary when no errors', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
      errors: [],
    })
    expect(html).not.toContain('There is a problem')
  })

  it('renders Back link instead of Previous', () => {
    const html = render(resolved.pages[1], {
      actionUrl: '/test',
      currentPage: 2,
      totalPages: 3,
      prevUrl: '/prev',
    })
    expect(html).toContain('href="/prev"')
    expect(html).toContain('Back')
    expect(html).not.toContain('Previous')
  })

  it('renders Continue button', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('Continue')
    expect(html).toContain('type="submit"')
  })

  it('renders fields for the group', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('name="fullName"')
    expect(html).toContain('name="email"')
  })

  it('renders form with POST method and action URL', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/submit-here',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('method="post"')
    expect(html).toContain('action="/submit-here"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/forms/form-page.test.tsx`
Expected: FAIL — new props don't exist yet

- [ ] **Step 3: Rewrite FormPageView component**

Replace `src/app/components/flex-form-page/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import { evaluateCondition } from '../../../services/form-resolver'
import type { FieldEntry, ResolvedPage } from '../../../types/models'
import type { FormError } from '../flex-form-error-summary'
import { FormErrorSummary } from '../flex-form-error-summary'
import { Form } from '../flex-form'
import { FormField } from '../flex-form-field'
import { FormStepText } from '../flex-form-step-text'

interface FormPageViewProps {
  resolvedPage: ResolvedPage
  actionUrl: string
  currentPage: number
  totalPages: number
  fields: Record<string, FieldEntry>
  errors: FormError[]
  prevUrl: string | null
  titlePrefix?: string
}

export const FormPageView: FC<FormPageViewProps> = ({
  resolvedPage,
  actionUrl,
  currentPage,
  totalPages,
  fields,
  errors,
  prevUrl,
}) => {
  const { page, groups } = resolvedPage

  return (
    <Form size="large">
      <FormStepText current={currentPage} total={totalPages} />
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      <FormErrorSummary errors={errors} />
      <form method="post" action={actionUrl} novalidate>
        {groups.map((group) => {
          if (!evaluateCondition(group.condition, fields)) return null
          return (
            <fieldset key={group.id}>
              <legend>{group.title}</legend>
              {group.description && <p>{group.description}</p>}
              {group.requirements.map((req) => {
                if (!evaluateCondition(req.condition, fields)) return null
                return (
                  <FormField
                    key={req.id}
                    requirement={req}
                    entry={fields[req.fieldName]}
                  />
                )
              })}
            </fieldset>
          )
        })}
        <div class="l-cluster">
          {prevUrl && <a href={prevUrl}>Back</a>}
          <button type="submit" class="flex-button">
            Continue
          </button>
        </div>
      </form>
    </Form>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/form-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `bun test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flex-form-page/index.tsx test/forms/form-page.test.tsx
git commit -m "feat(flex-form-page): full civic forms composition

- Wrap in Form size=large for width constraint
- Add step text progress caption
- Add error summary slot
- Add novalidate on form element
- Back link instead of Previous
- Fieldsets styled by flex-form (reset, legend)"
```

---

### Task 9: Update routes — error summary data, title prefix, progress props

**Files:**
- Modify: `src/app/routes/forms/index.tsx`
- Modify: `src/services/form-navigation.ts`
- Modify: `test/forms/routes.test.ts`

- [ ] **Step 1: Add `countVisiblePages` to form-navigation**

In `src/services/form-navigation.ts`, add:

```typescript
export function countVisiblePages(
  resolved: ResolvedForm,
  fields: Record<string, FieldEntry>,
): number {
  return resolved.pages.filter((p) =>
    evaluateCondition(p.page.condition, fields),
  ).length
}

export function visiblePageNumber(
  resolved: ResolvedForm,
  pageIndex: number,
  fields: Record<string, FieldEntry>,
): number {
  let count = 0
  for (let i = 0; i <= pageIndex; i++) {
    if (evaluateCondition(resolved.pages[i].page.condition, fields)) {
      count++
    }
  }
  return count
}
```

- [ ] **Step 2: Update route handler to pass new props**

In `src/app/routes/forms/index.tsx`, update imports and the render/validate page handlers.

Update imports to add:

```typescript
import type { FormError } from '../../components/flex-form-error-summary'
import { countVisiblePages, visiblePageNumber } from '../../../services/form-navigation'
```

Update the GET page handler (around line 73) to pass new props:

```tsx
return c.html(
  <Layout title={resolved.pages[pageIndex].page.title} currentPath="/forms">
    <FormPageView
      resolvedPage={resolved.pages[pageIndex]}
      actionUrl={resolveUrl(
        `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`,
      )}
      currentPage={visiblePageNumber(resolved, pageIndex, session.fields)}
      totalPages={countVisiblePages(resolved, session.fields)}
      fields={session.fields}
      errors={[]}
      prevUrl={prevUrl}
    />
  </Layout>,
)
```

Update the POST validation-error path (around line 120) to build error summary and set title prefix:

```tsx
if (hasErrors) {
  const mergedFields = { ...session.fields, ...validated }
  const prev = findPrevPage(resolved, pageIndex, mergedFields)
  const prevUrl =
    prev !== null
      ? resolveUrl(
          `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`,
        )
      : null
  const errors: FormError[] = Object.entries(validated)
    .filter(([, entry]) => entry.errors && entry.errors.length > 0)
    .map(([fieldId, entry]) => ({
      fieldId,
      message: entry.errors![0],
    }))
  return c.html(
    <Layout
      title={`Error: ${resolvedPage.page.title}`}
      currentPath="/forms"
    >
      <FormPageView
        resolvedPage={resolvedPage}
        actionUrl={resolveUrl(
          `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`,
        )}
        currentPage={visiblePageNumber(resolved, pageIndex, mergedFields)}
        totalPages={countVisiblePages(resolved, mergedFields)}
        fields={mergedFields}
        errors={errors}
        prevUrl={prevUrl}
      />
    </Layout>,
  )
}
```

- [ ] **Step 3: Add error focus inline script to Layout or form page**

In `src/app/components/flex-form-page/index.tsx`, add an inline script at the bottom of the component, just before the closing `</Form>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){var s=document.querySelector('.flex-form-error-summary');if(s)s.focus()})()`,
  }}
/>
```

- [ ] **Step 4: Update route tests**

In `test/forms/routes.test.ts`, add a test for error summary rendering and update the validation test:

Add this test after the existing "validation errors re-render the page" test:

```typescript
it('validation errors show error summary with links', async () => {
  const app = createTestApp()
  const createRes = await app.request('/forms/benefits-app/sessions', {
    method: 'POST',
  })
  const location = createRes.headers.get('Location')
  const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
  const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

  const res = await app.request(`${baseUrl}/pages/0`, {
    method: 'POST',
    body: new URLSearchParams({}),
  })
  const html = await res.text()
  expect(html).toContain('There is a problem')
  expect(html).toContain('href="#fullName"')
  expect(html).toContain('href="#email"')
})

it('validation errors prefix page title with Error:', async () => {
  const app = createTestApp()
  const createRes = await app.request('/forms/benefits-app/sessions', {
    method: 'POST',
  })
  const location = createRes.headers.get('Location')
  const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
  const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

  const res = await app.request(`${baseUrl}/pages/0`, {
    method: 'POST',
    body: new URLSearchParams({}),
  })
  const html = await res.text()
  expect(html).toContain('<title>Error: Personal Information</title>')
})

it('renders step text on form pages', async () => {
  const app = createTestApp()
  const createRes = await app.request('/forms/benefits-app/sessions', {
    method: 'POST',
  })
  const location = createRes.headers.get('Location')
  const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
  const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

  const res = await app.request(`${baseUrl}/pages/0`)
  const html = await res.text()
  expect(html).toContain('Page 1 of 3')
})
```

- [ ] **Step 5: Run tests**

Run: `bun test test/forms/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/routes/forms/index.tsx src/services/form-navigation.ts src/app/components/flex-form-page/index.tsx test/forms/routes.test.ts
git commit -m "feat(routes): wire error summary, title prefix, and step progress

- Build FormError[] from validation results for error summary
- Prefix page title with 'Error:' on validation failure
- Compute visible page number and total for step text
- Add inline script for error summary focus management"
```

---

### Task 10: Update `flex-form-landing`

**Files:**
- Modify: `src/app/components/flex-form-landing/index.tsx`

- [ ] **Step 1: Write test for new landing page**

Add to `test/forms/routes.test.ts`:

```typescript
it('GET /forms/benefits-app renders landing with Start now button', async () => {
  const app = createTestApp()
  const res = await app.request('/forms/benefits-app')
  expect(res.status).toBe(200)
  const html = await res.text()
  expect(html).toContain('Benefits Application Form')
  expect(html).toContain('Start now')
  expect(html).toContain('class="flex-form"')
  expect(html).toContain('3 sections')
})
```

Update the existing landing page test to expect "Start now" instead of "Start Form".

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/routes.test.ts`
Expected: FAIL — still says "Start Form", no flex-form wrapper

- [ ] **Step 3: Update FormLanding component**

Replace `src/app/components/flex-form-landing/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { FormSpec } from '../../../types/models'
import { Form } from '../flex-form'

interface FormLandingProps {
  formSpec: FormSpec
  startUrl: string
}

export const FormLanding: FC<FormLandingProps> = ({ formSpec, startUrl }) => {
  return (
    <Form size="large">
      <h1>{formSpec.title}</h1>
      {formSpec.description && (
        <p class="flex-prose">{formSpec.description}</p>
      )}
      <p>
        This form has {formSpec.pages.length} sections.
      </p>
      <form method="post" action={startUrl}>
        <button type="submit" class="flex-button">
          Start now
        </button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-form-landing/index.tsx test/forms/routes.test.ts
git commit -m "feat(flex-form-landing): Form wrapper, improved copy, Start now button"
```

---

### Task 11: Update `flex-form-review` — summary list, Change links, a11y

**Files:**
- Modify: `src/app/components/flex-form-review/index.tsx`
- Modify: `test/forms/form-review.test.tsx`

- [ ] **Step 1: Update review tests**

Replace `test/forms/form-review.test.tsx`:

```tsx
import { describe, expect, it } from 'bun:test'
import { FormReview } from '../../src/app/components/flex-form-review'
import { resolveFormSpec } from '../../src/services/form-resolver'
import type { FieldEntry, ResolvedForm } from '../../src/types/models'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormReview', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function render(
    fields: Record<string, FieldEntry>,
    resolvedForm?: ResolvedForm,
  ): string {
    const r = resolvedForm ?? resolved
    return (
      (
        <FormReview
          resolved={r}
          fields={fields}
          submitUrl="/submit"
          editBaseUrl="/forms/benefits-app/sessions/s1/pages"
        />
      ) as any
    ).toString()
  }

  it('renders review heading', () => {
    const html = render({})
    expect(html).toContain('Review your answers')
  })

  it('wraps in flex-form with large size', () => {
    const html = render({})
    expect(html).toContain('class="flex-form"')
    expect(html).toContain('data-size="large"')
  })

  it('renders Change links with visually-hidden context', () => {
    const html = render({})
    expect(html).toContain('Change')
    expect(html).toContain('u-visually-hidden')
  })

  it('renders Submit button', () => {
    const html = render({})
    expect(html).toContain('Submit')
    expect(html).toContain('type="submit"')
  })

  it('shows field values', () => {
    const html = render({
      fullName: { value: 'Alice Johnson' },
      email: { value: 'alice@example.com' },
    })
    expect(html).toContain('Alice Johnson')
    expect(html).toContain('alice@example.com')
  })

  it('shows Not provided for empty fields', () => {
    const html = render({
      fullName: { value: null },
    })
    expect(html).toContain('Not provided')
  })

  it('renders definition list structure', () => {
    const html = render({ fullName: { value: 'Alice' } })
    expect(html).toContain('<dt')
    expect(html).toContain('<dd')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test test/forms/form-review.test.tsx`
Expected: FAIL — new structure, "Change" instead of "Edit", Form wrapper

- [ ] **Step 3: Rewrite FormReview component**

Replace `src/app/components/flex-form-review/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import { evaluateCondition } from '../../../services/form-resolver'
import type { FieldEntry, ResolvedForm } from '../../../types/models'
import { Form } from '../flex-form'

interface FormReviewProps {
  resolved: ResolvedForm
  fields: Record<string, FieldEntry>
  submitUrl: string
  editBaseUrl: string
}

export const FormReview: FC<FormReviewProps> = ({
  resolved,
  fields,
  submitUrl,
  editBaseUrl,
}) => {
  return (
    <Form size="large">
      <h1>Review your answers</h1>
      <p>Check your answers before submitting.</p>
      {resolved.pages.map((resolvedPage, pageIndex) => {
        if (!evaluateCondition(resolvedPage.page.condition, fields)) return null
        return (
          <section key={resolvedPage.page.id}>
            <div class="l-cluster" style="justify-content: space-between">
              <h2>{resolvedPage.page.title}</h2>
              <a href={`${editBaseUrl}/${pageIndex}`}>
                Change
                <span class="u-visually-hidden">
                  {' '}
                  {resolvedPage.page.title}
                </span>
              </a>
            </div>
            {resolvedPage.groups.map((group) => {
              if (!evaluateCondition(group.condition, fields)) return null
              return (
                <dl key={group.id} class="flex-summary-list">
                  {group.requirements.map((req) => {
                    if (!evaluateCondition(req.condition, fields)) return null
                    const entry = fields[req.fieldName]
                    const displayValue = formatValue(entry?.value)
                    return (
                      <div key={req.id} class="flex-summary-list__row">
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
              )
            })}
          </section>
        )
      })}
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

- [ ] **Step 4: Add summary list styles**

Create `src/app/components/flex-form-review/styles.css`:

```css
/* flex-summary-list — review page answer rows */
.flex-summary-list {
  margin: 0;
  padding: 0;
}

.flex-summary-list__row {
  display: flex;
  justify-content: space-between;
  gap: var(--flex-space-md);
  padding: var(--flex-space-sm) 0;
  border-bottom: 1px solid var(--flex-color-border);
}

.flex-summary-list__key {
  font-weight: 700;
  flex: 0 0 auto;
  max-width: 50%;
}

.flex-summary-list__value {
  text-align: right;
  margin: 0;
}
```

Add the import in `src/app/public/styles.css` after the form-related imports:

```css
@import "../components/flex-form-review/styles.css" layer(block);
```

- [ ] **Step 5: Run tests**

Run: `bun test test/forms/form-review.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flex-form-review/ test/forms/form-review.test.tsx src/app/public/styles.css
git commit -m "feat(flex-form-review): summary list pattern, Change links with a11y context

- Wrap in Form size=large
- Summary list rows with bottom borders
- 'Change' links with visually-hidden page title for screen readers
- 'Not provided' in muted text for empty fields
- Submit button (distinct from Continue)"
```

---

### Task 12: Update `flex-form-confirmation` — success alert, formatted date

**Files:**
- Modify: `src/app/components/flex-form-confirmation/index.tsx`

- [ ] **Step 1: Write test for confirmation page**

Add to `test/forms/routes.test.ts` or create a dedicated test. Add this assertion to the existing full-flow test's confirmation section:

In `test/forms/routes.test.ts`, update the full-flow test's confirmation assertions:

```typescript
// In the existing full-flow test, update the confirmation check:
const confirmHtml = await confirmRes.text()
expect(confirmHtml).toContain('Your form has been submitted')
expect(confirmHtml).toContain('flex-alert')
expect(confirmHtml).toContain('data-variant="success"')
expect(confirmHtml).toContain('class="flex-form"')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/forms/routes.test.ts`
Expected: FAIL — no alert, no flex-form wrapper

- [ ] **Step 3: Rewrite FormConfirmation component**

Replace `src/app/components/flex-form-confirmation/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { Submission } from '../../../types/models'
import { Alert } from '../flex-alert'
import { Form } from '../flex-form'

interface FormConfirmationProps {
  submission: Submission
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const FormConfirmation: FC<FormConfirmationProps> = ({ submission }) => {
  return (
    <Form size="large">
      <Alert variant="success" heading="Your form has been submitted">
        Your reference number is <strong>{submission.id}</strong>
      </Alert>
      <h2>What happens next</h2>
      <p>
        We have received your submission. You do not need to do anything else at
        this time.
      </p>
      <dl class="flex-summary-list">
        <div class="flex-summary-list__row">
          <dt class="flex-summary-list__key">Submitted</dt>
          <dd class="flex-summary-list__value">
            {formatDate(submission.submittedAt)}
          </dd>
        </div>
      </dl>
      <p>
        <a href="/">Return to home</a>
      </p>
    </Form>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `bun test test/forms/routes.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `bun test`
Expected: all pass

- [ ] **Step 6: Run type check**

Run: `bun run --no-warnings tsc --noEmit`
Expected: clean

- [ ] **Step 7: Commit**

```bash
git add src/app/components/flex-form-confirmation/index.tsx test/forms/routes.test.ts
git commit -m "feat(flex-form-confirmation): success alert, formatted date, next steps

- Wrap in Form size=large
- Success alert with reference number
- Human-readable date formatting
- 'What happens next' section
- 'Return to home' link"
```

---

### Task 13: Update `flex-form` spacing — label margin, fieldset separation

**Files:**
- Modify: `src/app/components/flex-form/styles.css`

- [ ] **Step 1: Update flex-form styles for spacing tiers**

In `src/app/components/flex-form/styles.css`, add spacing rules:

```css
/* Zero out label margin-top within form — stack gap handles between-field spacing */
.flex-form .flex-label {
  margin-top: 0;
}

/* Fieldset separation — generous spacing between sections */
.flex-form fieldset + fieldset {
  margin-top: var(--flex-space-xl);
}
```

- [ ] **Step 2: Verify visually by running dev server**

Run: `bun run dev`
Visit: http://localhost:3000/forms/benefits-app

Check:
- Labels sit tight above their inputs (no extra 1.5rem gap)
- Fields within a group have moderate spacing
- Fieldset sections have clear visual separation
- Legend is bold and sized appropriately

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `bun test`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-form/styles.css
git commit -m "fix(flex-form): three-tier spacing — tight within fields, generous between sections

Zero label margin-top in forms (stack gap handles spacing).
Add fieldset+fieldset margin for section separation."
```

---

### Task 14: Final integration — full check and CSS build

- [ ] **Step 1: Build CSS**

Run: `bun run build:css`
Expected: clean build

- [ ] **Step 2: Run full check**

Run: `bun run check`
Expected: lint clean (or only pre-existing warnings), tsc clean, all tests pass

- [ ] **Step 3: Fix any biome formatting issues**

Run: `bunx @biomejs/biome check --write .`

- [ ] **Step 4: Run full check again**

Run: `bun run check`
Expected: clean

- [ ] **Step 5: Commit any formatting fixes**

```bash
git add -A
git commit -m "style: fix formatting from biome check"
```

(Only if there were formatting changes. Skip if clean.)

- [ ] **Step 6: Push**

```bash
git push
```
