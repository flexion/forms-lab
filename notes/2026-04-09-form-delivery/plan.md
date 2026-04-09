# Form Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the form rendering and filling system — routes, session management, validation, multi-page navigation, review, and submission — as an isolated vertical slice with in-memory persistence.

**Architecture:** FormSpec references DataCollectionSpec by ID. A resolution layer joins them at render time. Server-rendered JSX via Hono handles all pages. In-memory gateways back sessions and submissions; gateway interfaces are the contract for later persistence implementations. All work is in the `story-6/form-delivery` branch worktree at `.worktrees/story-6-forms`.

**Tech Stack:** Bun, Hono (server-rendered JSX), TypeScript, Bun test

---

## File Structure

```
src/types/models.ts                          — add FieldCondition, FormSession, FieldEntry, gateway interfaces, resolved types
test/forms/fixtures.ts                       — realistic DataCollectionSpec + FormSpec test data
src/services/form-resolver.ts                — resolveFormSpec() + evaluateCondition()
test/forms/resolver.test.ts                  — resolver + condition evaluator tests
src/services/form-validation.ts              — validateFields()
test/forms/validation.test.ts                — validation tests
src/services/form-session.ts                 — InMemoryFormSessionGateway
src/services/submission.ts                   — InMemorySubmissionGateway
test/forms/gateways.test.ts                  — gateway tests
src/services/form-navigation.ts              — findNextPage(), findPrevPage()
test/forms/navigation.test.ts                — navigation tests
src/components/flex-form-field/index.tsx      — renderField() maps FieldType → flex-* components
test/forms/field-renderer.test.tsx           — field renderer tests
src/components/flex-form-page/index.tsx       — full form page (groups, fields, nav buttons)
test/forms/form-page.test.tsx                — form page component tests
src/components/flex-form-review/index.tsx     — read-only review of all answers
src/components/flex-form-landing/index.tsx    — form landing page
src/components/flex-form-confirmation/index.tsx — submission confirmation page
src/routes/forms/index.tsx                   — all form route handlers
src/server.tsx                               — mount form routes
test/forms/routes.test.ts                    — route integration tests
```

---

### Task 1: Revise Type Definitions

**Files:**
- Modify: `src/types/models.ts`

- [ ] **Step 1: Update models.ts with revised form types**

Replace the form-related type definitions in `src/types/models.ts`. Keep the catalog types (Persona, Decision, ArchitectureDoc, Story, FormProject) unchanged. Replace everything from the top of the file through the `SubmissionStatus` type with:

```typescript
/**
 * Core data model types for the Forms Lab platform
 */

// --- Data Collection Layer (what to collect) ---

export interface DataCollectionSpec {
  id: string
  title: string
  description: string
  groups: RequirementGroup[]
}

export interface RequirementGroup {
  id: string
  title: string
  description?: string
  requirements: DataRequirement[]
  condition?: FieldCondition
}

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
}

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

export interface ValidationRule {
  type: 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength'
  value: string | number
  message?: string
}

export interface FieldCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string | number | boolean
}

// --- Form Spec Layer (how to present) ---

export interface FormSpec {
  id: string
  specId: string
  title: string
  description?: string
  pages: FormPage[]
}

export interface FormPage {
  id: string
  title: string
  description?: string
  groups: string[]
  condition?: FieldCondition
}

// --- Resolution Layer ---

export interface ResolvedForm {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
  pages: ResolvedPage[]
}

export interface ResolvedPage {
  page: FormPage
  groups: RequirementGroup[]
}

// --- Session & Submission ---

export interface FormSession {
  id: string
  specId: string
  formSpecId: string
  fields: Record<string, FieldEntry>
  status: 'active' | 'submitted'
  createdAt: string
}

export interface FieldEntry {
  value: string | number | boolean | null
  errors?: string[]
}

export interface Submission {
  id: string
  specId: string
  formSpecId: string
  data: Record<string, unknown>
  submittedAt: string
}

// --- Persistence Gateways ---

export interface FormSessionGateway {
  createSession(specId: string, formSpecId: string): FormSession
  getSession(id: string): FormSession | null
  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void
  submit(sessionId: string): Submission
}

export interface SubmissionGateway {
  save(submission: Submission): void
  getSubmission(id: string): Submission | null
}
```

- [ ] **Step 2: Run type check**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun run --no-warnings tsc --noEmit`
Expected: No errors (catalog imports only use Persona, Decision, ArchitectureDoc, Story — all unchanged)

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/types/models.ts
git commit -m "refactor: revise form types for Story 6 form delivery"
```

---

### Task 2: Test Fixtures

**Files:**
- Create: `test/forms/fixtures.ts`

- [ ] **Step 1: Create test fixture file**

```typescript
import type {
  DataCollectionSpec,
  FormSpec,
} from '../../src/types/models'

/**
 * A benefits application spec exercising all 10 field types,
 * conditional groups, and conditional fields.
 */
export const testDataSpec: DataCollectionSpec = {
  id: 'benefits-app',
  title: 'Benefits Application',
  description: 'Apply for housing benefits',
  groups: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Basic contact details',
      requirements: [
        {
          id: 'full-name',
          fieldName: 'fullName',
          label: 'Full Name',
          fieldType: 'text',
          required: true,
          validation: [
            { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
          ],
        },
        {
          id: 'email',
          fieldName: 'email',
          label: 'Email Address',
          fieldType: 'email',
          required: true,
          helpText: 'We will use this to contact you about your application',
        },
        {
          id: 'phone',
          fieldName: 'phone',
          label: 'Phone Number',
          fieldType: 'phone',
          required: false,
        },
      ],
    },
    {
      id: 'employment',
      title: 'Employment Status',
      requirements: [
        {
          id: 'employed',
          fieldName: 'employed',
          label: 'Are you currently employed?',
          fieldType: 'choice',
          required: true,
          choices: ['Yes', 'No'],
        },
        {
          id: 'employment-type',
          fieldName: 'employmentType',
          label: 'Employment Type',
          fieldType: 'choice',
          required: true,
          choices: ['Full-time', 'Part-time', 'Contract', 'Self-employed'],
          condition: { field: 'employed', operator: 'equals', value: 'Yes' },
        },
      ],
    },
    {
      id: 'income',
      title: 'Income Details',
      condition: { field: 'employed', operator: 'equals', value: 'Yes' },
      requirements: [
        {
          id: 'monthly-income',
          fieldName: 'monthlyIncome',
          label: 'Monthly Income',
          fieldType: 'currency',
          required: true,
          validation: [{ type: 'min', value: 0 }],
        },
      ],
    },
    {
      id: 'additional',
      title: 'Additional Information',
      requirements: [
        {
          id: 'start-date',
          fieldName: 'startDate',
          label: 'Desired Start Date',
          fieldType: 'date',
          required: true,
        },
        {
          id: 'website',
          fieldName: 'website',
          label: 'Personal Website',
          fieldType: 'url',
          required: false,
        },
        {
          id: 'notes',
          fieldName: 'notes',
          label: 'Additional Notes',
          fieldType: 'longText',
          required: false,
          helpText: 'Any additional information you would like to provide',
        },
        {
          id: 'dependents',
          fieldName: 'dependents',
          label: 'Number of Dependents',
          fieldType: 'number',
          required: true,
          validation: [
            { type: 'min', value: 0 },
            { type: 'max', value: 20 },
          ],
        },
        {
          id: 'agree-terms',
          fieldName: 'agreeTerms',
          label: 'I agree to the terms and conditions',
          fieldType: 'boolean',
          required: true,
        },
      ],
    },
  ],
}

/**
 * A FormSpec referencing testDataSpec.
 * 3 pages: personal info, employment + income, additional details.
 */
export const testFormSpec: FormSpec = {
  id: 'benefits-form',
  specId: 'benefits-app',
  title: 'Benefits Application Form',
  description: 'Complete this form to apply for housing benefits.',
  pages: [
    {
      id: 'page-1',
      title: 'Personal Information',
      description: 'Please provide your contact details.',
      groups: ['personal-info'],
    },
    {
      id: 'page-2',
      title: 'Employment',
      groups: ['employment', 'income'],
    },
    {
      id: 'page-3',
      title: 'Additional Details',
      groups: ['additional'],
    },
  ],
}

/**
 * A FormSpec with a conditional page for testing page-skip logic.
 */
export const conditionalPageFormSpec: FormSpec = {
  id: 'conditional-form',
  specId: 'benefits-app',
  title: 'Conditional Form',
  pages: [
    {
      id: 'page-1',
      title: 'Employment',
      groups: ['employment'],
    },
    {
      id: 'page-2',
      title: 'Income',
      groups: ['income'],
      condition: { field: 'employed', operator: 'equals', value: 'Yes' },
    },
    {
      id: 'page-3',
      title: 'Additional Details',
      groups: ['additional'],
    },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add test/forms/fixtures.ts
git commit -m "test: add form delivery test fixtures"
```

---

### Task 3: Condition Evaluator

**Files:**
- Create: `test/forms/resolver.test.ts`
- Create: `src/services/form-resolver.ts`

- [ ] **Step 1: Write failing tests for evaluateCondition**

```typescript
import { describe, expect, it } from 'bun:test'
import type { FieldCondition, FieldEntry } from '../../src/types/models'
import { evaluateCondition } from '../../src/services/form-resolver'

describe('evaluateCondition', () => {
  const fields: Record<string, FieldEntry> = {
    employed: { value: 'Yes' },
    age: { value: 25 },
    name: { value: 'Alice Johnson' },
  }

  it('returns true when condition is undefined', () => {
    expect(evaluateCondition(undefined, fields)).toBe(true)
  })

  it('equals: returns true when field matches', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'equals', value: 'Yes' }
    expect(evaluateCondition(cond, fields)).toBe(true)
  })

  it('equals: returns false when field does not match', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'equals', value: 'No' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('notEquals: returns true when field differs', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'notEquals', value: 'No' }
    expect(evaluateCondition(cond, fields)).toBe(true)
  })

  it('notEquals: returns false when field matches', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'notEquals', value: 'Yes' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('contains: returns true when string contains value', () => {
    const cond: FieldCondition = { field: 'name', operator: 'contains', value: 'Alice' }
    expect(evaluateCondition(cond, fields)).toBe(true)
  })

  it('contains: returns false when string does not contain value', () => {
    const cond: FieldCondition = { field: 'name', operator: 'contains', value: 'Bob' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('contains: returns false for non-string field values', () => {
    const cond: FieldCondition = { field: 'age', operator: 'contains', value: '25' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('returns true when referenced field does not exist (condition cannot be evaluated)', () => {
    const cond: FieldCondition = { field: 'missing', operator: 'equals', value: 'x' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('handles null field values', () => {
    const fieldsWithNull: Record<string, FieldEntry> = { status: { value: null } }
    const cond: FieldCondition = { field: 'status', operator: 'equals', value: 'active' }
    expect(evaluateCondition(cond, fieldsWithNull)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/resolver.test.ts`
Expected: FAIL — `evaluateCondition` is not exported / module not found

- [ ] **Step 3: Implement evaluateCondition**

Create `src/services/form-resolver.ts`:

```typescript
import type {
  DataCollectionSpec,
  FieldCondition,
  FieldEntry,
  FormSpec,
  ResolvedForm,
} from '../types/models'

export function evaluateCondition(
  condition: FieldCondition | undefined,
  fields: Record<string, FieldEntry>,
): boolean {
  if (!condition) return true
  const entry = fields[condition.field]
  const fieldValue = entry?.value ?? null
  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'notEquals':
      return fieldValue !== condition.value
    case 'contains':
      return (
        typeof fieldValue === 'string' &&
        fieldValue.includes(String(condition.value))
      )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/resolver.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/services/form-resolver.ts test/forms/resolver.test.ts
git commit -m "feat: add condition evaluator with tests"
```

---

### Task 4: Form Resolver

**Files:**
- Modify: `test/forms/resolver.test.ts`
- Modify: `src/services/form-resolver.ts`

- [ ] **Step 1: Write failing tests for resolveFormSpec**

Append to `test/forms/resolver.test.ts`:

```typescript
import { resolveFormSpec } from '../../src/services/form-resolver'
import { testDataSpec, testFormSpec } from './fixtures'

describe('resolveFormSpec', () => {
  it('resolves all pages with their groups', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(resolved.formSpec).toBe(testFormSpec)
    expect(resolved.dataSpec).toBe(testDataSpec)
    expect(resolved.pages).toHaveLength(3)
  })

  it('page 1 contains the personal-info group', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(resolved.pages[0].groups).toHaveLength(1)
    expect(resolved.pages[0].groups[0].id).toBe('personal-info')
  })

  it('page 2 contains employment and income groups', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(resolved.pages[1].groups).toHaveLength(2)
    expect(resolved.pages[1].groups[0].id).toBe('employment')
    expect(resolved.pages[1].groups[1].id).toBe('income')
  })

  it('throws when a group ID is not found', () => {
    const badFormSpec = {
      ...testFormSpec,
      pages: [{ id: 'p1', title: 'Bad', groups: ['nonexistent'] }],
    }
    expect(() => resolveFormSpec(badFormSpec, testDataSpec)).toThrow(
      'RequirementGroup "nonexistent" not found',
    )
  })
})
```

- [ ] **Step 2: Run tests to verify the new tests fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/resolver.test.ts`
Expected: New tests FAIL — `resolveFormSpec` not yet exported

- [ ] **Step 3: Implement resolveFormSpec**

Add to `src/services/form-resolver.ts`:

```typescript
export function resolveFormSpec(
  formSpec: FormSpec,
  dataSpec: DataCollectionSpec,
): ResolvedForm {
  const groupMap = new Map(dataSpec.groups.map((g) => [g.id, g]))
  const pages = formSpec.pages.map((page) => {
    const groups = page.groups.map((groupId) => {
      const group = groupMap.get(groupId)
      if (!group) {
        throw new Error(
          `RequirementGroup "${groupId}" not found in DataCollectionSpec "${dataSpec.id}"`,
        )
      }
      return group
    })
    return { page, groups }
  })
  return { formSpec, dataSpec, pages }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/resolver.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/services/form-resolver.ts test/forms/resolver.test.ts
git commit -m "feat: add form spec resolver with tests"
```

---

### Task 5: Field Validation

**Files:**
- Create: `test/forms/validation.test.ts`
- Create: `src/services/form-validation.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from 'bun:test'
import type { DataRequirement, FieldEntry } from '../../src/types/models'
import { validateFields } from '../../src/services/form-validation'

describe('validateFields', () => {
  const textReq: DataRequirement = {
    id: 'name',
    fieldName: 'fullName',
    label: 'Full Name',
    fieldType: 'text',
    required: true,
    validation: [
      { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
    ],
  }

  const emailReq: DataRequirement = {
    id: 'email',
    fieldName: 'email',
    label: 'Email',
    fieldType: 'email',
    required: true,
  }

  const numberReq: DataRequirement = {
    id: 'dep',
    fieldName: 'dependents',
    label: 'Dependents',
    fieldType: 'number',
    required: true,
    validation: [
      { type: 'min', value: 0 },
      { type: 'max', value: 20, message: 'Maximum 20 dependents' },
    ],
  }

  const currencyReq: DataRequirement = {
    id: 'income',
    fieldName: 'monthlyIncome',
    label: 'Monthly Income',
    fieldType: 'currency',
    required: true,
    validation: [{ type: 'min', value: 0 }],
  }

  const boolReq: DataRequirement = {
    id: 'agree',
    fieldName: 'agreeTerms',
    label: 'I agree',
    fieldType: 'boolean',
    required: true,
  }

  const conditionalReq: DataRequirement = {
    id: 'emp-type',
    fieldName: 'employmentType',
    label: 'Employment Type',
    fieldType: 'choice',
    required: true,
    choices: ['Full-time', 'Part-time'],
    condition: { field: 'employed', operator: 'equals', value: 'Yes' },
  }

  const patternReq: DataRequirement = {
    id: 'zip',
    fieldName: 'zipCode',
    label: 'Zip Code',
    fieldType: 'text',
    required: false,
    validation: [
      { type: 'pattern', value: '^\\d{5}$', message: 'Must be a 5-digit zip code' },
    ],
  }

  it('validates required text field with valid input', () => {
    const result = validateFields({ fullName: 'Alice' }, [textReq], {})
    expect(result.fullName.value).toBe('Alice')
    expect(result.fullName.errors).toBeUndefined()
  })

  it('errors on missing required text field', () => {
    const result = validateFields({}, [textReq], {})
    expect(result.fullName.value).toBeNull()
    expect(result.fullName.errors).toContain('Full Name is required')
  })

  it('applies minLength validation', () => {
    const result = validateFields({ fullName: 'A' }, [textReq], {})
    expect(result.fullName.errors).toContain('Name must be at least 2 characters')
  })

  it('validates number fields with coercion', () => {
    const result = validateFields({ dependents: '3' }, [numberReq], {})
    expect(result.dependents.value).toBe(3)
    expect(result.dependents.errors).toBeUndefined()
  })

  it('errors on non-numeric number field', () => {
    const result = validateFields({ dependents: 'abc' }, [numberReq], {})
    expect(result.dependents.errors).toContain('Must be a number')
  })

  it('applies min/max validation on numbers', () => {
    const result = validateFields({ dependents: '25' }, [numberReq], {})
    expect(result.dependents.errors).toContain('Maximum 20 dependents')
  })

  it('validates currency fields as numbers', () => {
    const result = validateFields({ monthlyIncome: '5000' }, [currencyReq], {})
    expect(result.monthlyIncome.value).toBe(5000)
    expect(result.monthlyIncome.errors).toBeUndefined()
  })

  it('validates boolean fields — checked', () => {
    const result = validateFields({ agreeTerms: 'on' }, [boolReq], {})
    expect(result.agreeTerms.value).toBe(true)
    expect(result.agreeTerms.errors).toBeUndefined()
  })

  it('errors on required boolean when unchecked', () => {
    const result = validateFields({}, [boolReq], {})
    expect(result.agreeTerms.value).toBe(false)
    expect(result.agreeTerms.errors).toContain('I agree is required')
  })

  it('skips fields whose condition is not met', () => {
    const sessionFields: Record<string, FieldEntry> = {
      employed: { value: 'No' },
    }
    const result = validateFields({}, [conditionalReq], sessionFields)
    expect(result.employmentType).toBeUndefined()
  })

  it('validates fields whose condition is met', () => {
    const sessionFields: Record<string, FieldEntry> = {
      employed: { value: 'Yes' },
    }
    const result = validateFields({}, [conditionalReq], sessionFields)
    expect(result.employmentType.errors).toContain('Employment Type is required')
  })

  it('applies pattern validation', () => {
    const result = validateFields({ zipCode: '1234' }, [patternReq], {})
    expect(result.zipCode.errors).toContain('Must be a 5-digit zip code')
  })

  it('passes pattern validation with valid input', () => {
    const result = validateFields({ zipCode: '12345' }, [patternReq], {})
    expect(result.zipCode.errors).toBeUndefined()
  })

  it('skips validation rules when field is empty and not required', () => {
    const result = validateFields({}, [patternReq], {})
    expect(result.zipCode.value).toBeNull()
    expect(result.zipCode.errors).toBeUndefined()
  })

  it('applies maxLength validation', () => {
    const req: DataRequirement = {
      id: 'short',
      fieldName: 'short',
      label: 'Short',
      fieldType: 'text',
      required: false,
      validation: [{ type: 'maxLength', value: 5 }],
    }
    const result = validateFields({ short: 'toolong' }, [req], {})
    expect(result.short.errors?.[0]).toContain('at most 5')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/validation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validateFields**

Create `src/services/form-validation.ts`:

```typescript
import type { DataRequirement, FieldEntry } from '../types/models'
import { evaluateCondition } from './form-resolver'

export function validateFields(
  formData: Record<string, string>,
  requirements: DataRequirement[],
  sessionFields: Record<string, FieldEntry>,
): Record<string, FieldEntry> {
  const result: Record<string, FieldEntry> = {}

  for (const req of requirements) {
    if (!evaluateCondition(req.condition, sessionFields)) continue

    const rawValue = formData[req.fieldName] ?? ''
    const errors: string[] = []
    let value: string | number | boolean | null

    if (req.fieldType === 'boolean') {
      value = rawValue === 'on' || rawValue === 'true'
    } else if (req.fieldType === 'number' || req.fieldType === 'currency') {
      if (rawValue === '') {
        value = null
      } else {
        const num = Number(rawValue)
        if (Number.isNaN(num)) {
          errors.push('Must be a number')
          value = null
        } else {
          value = num
        }
      }
    } else {
      value = rawValue || null
    }

    if (req.required) {
      if (value === null || value === '' || (req.fieldType === 'boolean' && value === false)) {
        errors.push(`${req.label} is required`)
      }
    }

    if (value !== null && value !== '' && req.validation) {
      for (const rule of req.validation) {
        switch (rule.type) {
          case 'minLength':
            if (typeof value === 'string' && value.length < Number(rule.value)) {
              errors.push(rule.message ?? `Must be at least ${rule.value} characters`)
            }
            break
          case 'maxLength':
            if (typeof value === 'string' && value.length > Number(rule.value)) {
              errors.push(rule.message ?? `Must be at most ${rule.value} characters`)
            }
            break
          case 'min':
            if (typeof value === 'number' && value < Number(rule.value)) {
              errors.push(rule.message ?? `Must be at least ${rule.value}`)
            }
            break
          case 'max':
            if (typeof value === 'number' && value > Number(rule.value)) {
              errors.push(rule.message ?? `Must be at most ${rule.value}`)
            }
            break
          case 'pattern':
            if (typeof value === 'string' && !new RegExp(String(rule.value)).test(value)) {
              errors.push(rule.message ?? `Invalid format`)
            }
            break
        }
      }
    }

    result[req.fieldName] = {
      value,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/validation.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/services/form-validation.ts test/forms/validation.test.ts
git commit -m "feat: add field validation with tests"
```

---

### Task 6: Session & Submission Gateways

**Files:**
- Create: `test/forms/gateways.test.ts`
- Create: `src/services/form-session.ts`
- Create: `src/services/submission.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it, beforeEach } from 'bun:test'
import { InMemoryFormSessionGateway } from '../../src/services/form-session'
import { InMemorySubmissionGateway } from '../../src/services/submission'

describe('InMemoryFormSessionGateway', () => {
  let gateway: InMemoryFormSessionGateway

  beforeEach(() => {
    gateway = new InMemoryFormSessionGateway()
  })

  it('creates a session with a unique ID', () => {
    const session = gateway.createSession('spec-1', 'form-1')
    expect(session.id).toBeTruthy()
    expect(session.specId).toBe('spec-1')
    expect(session.formSpecId).toBe('form-1')
    expect(session.status).toBe('active')
    expect(session.fields).toEqual({})
  })

  it('retrieves a session by ID', () => {
    const session = gateway.createSession('spec-1', 'form-1')
    const retrieved = gateway.getSession(session.id)
    expect(retrieved).toEqual(session)
  })

  it('returns null for unknown session ID', () => {
    expect(gateway.getSession('nonexistent')).toBeNull()
  })

  it('writes fields to a session', () => {
    const session = gateway.createSession('spec-1', 'form-1')
    gateway.writeFields(session.id, {
      fullName: { value: 'Alice' },
      email: { value: 'alice@example.com' },
    })
    const updated = gateway.getSession(session.id)
    expect(updated?.fields.fullName.value).toBe('Alice')
    expect(updated?.fields.email.value).toBe('alice@example.com')
  })

  it('merges fields across multiple writes', () => {
    const session = gateway.createSession('spec-1', 'form-1')
    gateway.writeFields(session.id, { fullName: { value: 'Alice' } })
    gateway.writeFields(session.id, { email: { value: 'alice@example.com' } })
    const updated = gateway.getSession(session.id)
    expect(updated?.fields.fullName.value).toBe('Alice')
    expect(updated?.fields.email.value).toBe('alice@example.com')
  })

  it('submits a session and returns a submission', () => {
    const session = gateway.createSession('spec-1', 'form-1')
    gateway.writeFields(session.id, {
      fullName: { value: 'Alice' },
    })
    const submission = gateway.submit(session.id)
    expect(submission.id).toBeTruthy()
    expect(submission.specId).toBe('spec-1')
    expect(submission.formSpecId).toBe('form-1')
    expect(submission.data).toEqual({ fullName: 'Alice' })
    expect(submission.submittedAt).toBeTruthy()
  })

  it('marks session as submitted after submit', () => {
    const session = gateway.createSession('spec-1', 'form-1')
    gateway.submit(session.id)
    const updated = gateway.getSession(session.id)
    expect(updated?.status).toBe('submitted')
  })

  it('throws when submitting unknown session', () => {
    expect(() => gateway.submit('nonexistent')).toThrow()
  })
})

describe('InMemorySubmissionGateway', () => {
  it('stores and retrieves a submission', () => {
    const gateway = new InMemorySubmissionGateway()
    const submission = {
      id: 'sub-1',
      specId: 'spec-1',
      formSpecId: 'form-1',
      data: { fullName: 'Alice' },
      submittedAt: new Date().toISOString(),
    }
    gateway.save(submission)
    expect(gateway.getSubmission('sub-1')).toEqual(submission)
  })

  it('returns null for unknown submission ID', () => {
    const gateway = new InMemorySubmissionGateway()
    expect(gateway.getSubmission('nonexistent')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/gateways.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement InMemoryFormSessionGateway**

Create `src/services/form-session.ts`:

```typescript
import type {
  FieldEntry,
  FormSession,
  FormSessionGateway,
  Submission,
} from '../types/models'

export class InMemoryFormSessionGateway implements FormSessionGateway {
  private sessions = new Map<string, FormSession>()

  createSession(specId: string, formSpecId: string): FormSession {
    const session: FormSession = {
      id: crypto.randomUUID(),
      specId,
      formSpecId,
      fields: {},
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    this.sessions.set(session.id, session)
    return session
  }

  getSession(id: string): FormSession | null {
    return this.sessions.get(id) ?? null
  }

  writeFields(sessionId: string, fields: Record<string, FieldEntry>): void {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    session.fields = { ...session.fields, ...fields }
  }

  submit(sessionId: string): Submission {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session "${sessionId}" not found`)
    session.status = 'submitted'
    const data: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(session.fields)) {
      if (entry.value !== null) {
        data[key] = entry.value
      }
    }
    const submission: Submission = {
      id: crypto.randomUUID(),
      specId: session.specId,
      formSpecId: session.formSpecId,
      data,
      submittedAt: new Date().toISOString(),
    }
    return submission
  }
}
```

- [ ] **Step 4: Implement InMemorySubmissionGateway**

Create `src/services/submission.ts`:

```typescript
import type { Submission, SubmissionGateway } from '../types/models'

export class InMemorySubmissionGateway implements SubmissionGateway {
  private submissions = new Map<string, Submission>()

  save(submission: Submission): void {
    this.submissions.set(submission.id, submission)
  }

  getSubmission(id: string): Submission | null {
    return this.submissions.get(id) ?? null
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/gateways.test.ts`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/services/form-session.ts src/services/submission.ts test/forms/gateways.test.ts
git commit -m "feat: add in-memory session and submission gateways with tests"
```

---

### Task 7: Page Navigation

**Files:**
- Create: `test/forms/navigation.test.ts`
- Create: `src/services/form-navigation.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from 'bun:test'
import type { FieldEntry, ResolvedForm } from '../../src/types/models'
import { resolveFormSpec } from '../../src/services/form-resolver'
import { findNextPage, findPrevPage } from '../../src/services/form-navigation'
import { testDataSpec, testFormSpec, conditionalPageFormSpec } from './fixtures'

describe('findNextPage', () => {
  it('returns next page index in linear form', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findNextPage(resolved, 0, {})).toBe(1)
    expect(findNextPage(resolved, 1, {})).toBe(2)
  })

  it('returns null after last page', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findNextPage(resolved, 2, {})).toBeNull()
  })

  it('skips pages whose condition is not met', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    const fields: Record<string, FieldEntry> = {
      employed: { value: 'No' },
    }
    // From page 0 (employment), should skip page 1 (income, condition not met) to page 2
    expect(findNextPage(resolved, 0, fields)).toBe(2)
  })

  it('does not skip pages whose condition is met', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    const fields: Record<string, FieldEntry> = {
      employed: { value: 'Yes' },
    }
    expect(findNextPage(resolved, 0, fields)).toBe(1)
  })

  it('returns null when all remaining pages are skipped', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    // If we're on page 1 and page 2 had a condition that wasn't met, null would be returned
    // With our fixtures, page 2 (additional) has no condition, so it's always shown
    expect(findNextPage(resolved, 1, {})).toBe(2)
  })
})

describe('findPrevPage', () => {
  it('returns previous page index', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findPrevPage(resolved, 2, {})).toBe(1)
    expect(findPrevPage(resolved, 1, {})).toBe(0)
  })

  it('returns null before first page', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findPrevPage(resolved, 0, {})).toBeNull()
  })

  it('skips pages whose condition is not met', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    const fields: Record<string, FieldEntry> = {
      employed: { value: 'No' },
    }
    // From page 2, should skip page 1 (income, condition not met) back to page 0
    expect(findPrevPage(resolved, 2, fields)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/navigation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement findNextPage and findPrevPage**

Create `src/services/form-navigation.ts`:

```typescript
import type { FieldEntry, ResolvedForm } from '../types/models'
import { evaluateCondition } from './form-resolver'

export function findNextPage(
  resolved: ResolvedForm,
  currentIndex: number,
  fields: Record<string, FieldEntry>,
): number | null {
  for (let i = currentIndex + 1; i < resolved.pages.length; i++) {
    if (evaluateCondition(resolved.pages[i].page.condition, fields)) {
      return i
    }
  }
  return null
}

export function findPrevPage(
  resolved: ResolvedForm,
  currentIndex: number,
  fields: Record<string, FieldEntry>,
): number | null {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (evaluateCondition(resolved.pages[i].page.condition, fields)) {
      return i
    }
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/navigation.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/services/form-navigation.ts test/forms/navigation.test.ts
git commit -m "feat: add page navigation with condition skipping"
```

---

### Task 8: Field Renderer Component

**Files:**
- Create: `test/forms/field-renderer.test.tsx`
- Create: `src/components/flex-form-field/index.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { describe, expect, it } from 'bun:test'
import type { DataRequirement, FieldEntry } from '../../src/types/models'
import { FormField } from '../../src/components/flex-form-field'

describe('FormField', () => {
  const baseReq: DataRequirement = {
    id: 'name',
    fieldName: 'fullName',
    label: 'Full Name',
    fieldType: 'text',
    required: true,
  }

  function render(req: DataRequirement, entry?: FieldEntry): string {
    return (<FormField requirement={req} entry={entry} /> as any).toString()
  }

  it('renders a text input with label', () => {
    const html = render(baseReq)
    expect(html).toContain('Full Name')
    expect(html).toContain('name="fullName"')
    expect(html).toContain('type="text"')
  })

  it('renders email input', () => {
    const html = render({ ...baseReq, fieldType: 'email', fieldName: 'email' })
    expect(html).toContain('type="email"')
  })

  it('renders phone input', () => {
    const html = render({ ...baseReq, fieldType: 'phone', fieldName: 'phone' })
    expect(html).toContain('type="tel"')
  })

  it('renders url input', () => {
    const html = render({ ...baseReq, fieldType: 'url', fieldName: 'website' })
    expect(html).toContain('type="url"')
  })

  it('renders number input', () => {
    const html = render({ ...baseReq, fieldType: 'number', fieldName: 'count' })
    expect(html).toContain('type="number"')
  })

  it('renders currency with dollar prefix', () => {
    const html = render({ ...baseReq, fieldType: 'currency', fieldName: 'amount' })
    expect(html).toContain('$')
    expect(html).toContain('type="number"')
  })

  it('renders textarea for longText', () => {
    const html = render({ ...baseReq, fieldType: 'longText', fieldName: 'notes' })
    expect(html).toContain('textarea')
  })

  it('renders checkbox for boolean', () => {
    const html = render({ ...baseReq, fieldType: 'boolean', fieldName: 'agree' })
    expect(html).toContain('type="checkbox"')
  })

  it('renders radio buttons for choice with few options', () => {
    const req: DataRequirement = {
      ...baseReq,
      fieldType: 'choice',
      fieldName: 'type',
      choices: ['A', 'B', 'C'],
    }
    const html = render(req)
    expect(html).toContain('type="radio"')
    expect(html).toContain('value="A"')
    expect(html).toContain('value="B"')
    expect(html).toContain('value="C"')
  })

  it('renders select for choice with many options', () => {
    const req: DataRequirement = {
      ...baseReq,
      fieldType: 'choice',
      fieldName: 'state',
      choices: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE'],
    }
    const html = render(req)
    expect(html).toContain('<select')
    expect(html).toContain('value="AL"')
  })

  it('renders date picker', () => {
    const html = render({ ...baseReq, fieldType: 'date', fieldName: 'startDate' })
    expect(html).toContain('flex-date-picker')
  })

  it('shows help text when provided', () => {
    const html = render({ ...baseReq, helpText: 'Enter your full legal name' })
    expect(html).toContain('Enter your full legal name')
  })

  it('shows error message when entry has errors', () => {
    const entry: FieldEntry = { value: '', errors: ['Full Name is required'] }
    const html = render(baseReq, entry)
    expect(html).toContain('Full Name is required')
    expect(html).toContain('data-state="error"')
  })

  it('populates value from entry', () => {
    const entry: FieldEntry = { value: 'Alice' }
    const html = render(baseReq, entry)
    expect(html).toContain('value="Alice"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/field-renderer.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FormField component**

Create `src/components/flex-form-field/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { DataRequirement, FieldEntry } from '../../types/models'
import { TextInput } from '../flex-text-input'
import { Textarea } from '../flex-textarea'
import { Checkbox } from '../flex-checkbox'
import { Radio } from '../flex-radio'
import { Select } from '../flex-select'
import { DatePicker } from '../flex-date-picker'
import { Label } from '../flex-label'
import { ErrorMessage } from '../flex-error-message'
import { InputGroup } from '../flex-input-prefix-suffix'

const CHOICE_RADIO_THRESHOLD = 7

interface FormFieldProps {
  requirement: DataRequirement
  entry?: FieldEntry
}

export const FormField: FC<FormFieldProps> = ({ requirement, entry }) => {
  const { id, fieldName, label, fieldType, required, helpText, choices } = requirement
  const hasError = entry?.errors && entry.errors.length > 0
  const errorId = `${fieldName}-error`
  const helpId = `${fieldName}-help`
  const describedBy = [
    hasError ? errorId : null,
    helpText ? helpId : null,
  ].filter(Boolean).join(' ') || undefined
  const value = entry?.value

  return (
    <div class="l-stack" style="--stack-space: var(--flex-spacing-1)">
      {fieldType !== 'boolean' && fieldType !== 'date' && (
        <Label htmlFor={fieldName} required={required}>
          {label}
        </Label>
      )}
      {helpText && (
        <span class="flex-hint" id={helpId}>
          {helpText}
        </span>
      )}
      {hasError && (
        <ErrorMessage id={errorId}>
          {entry.errors.join('. ')}
        </ErrorMessage>
      )}
      {renderInput(fieldType, fieldName, value, hasError, describedBy, choices, label, required)}
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
) {
  const state = hasError ? 'error' as const : undefined
  const strValue = value != null && value !== false ? String(value) : undefined

  switch (fieldType) {
    case 'text':
      return <TextInput id={name} name={name} type="text" value={strValue} state={state} required={required} ariaDescribedby={describedBy} />
    case 'email':
      return <TextInput id={name} name={name} type="email" value={strValue} state={state} required={required} ariaDescribedby={describedBy} />
    case 'phone':
      return <TextInput id={name} name={name} type="tel" value={strValue} state={state} required={required} ariaDescribedby={describedBy} />
    case 'url':
      return <TextInput id={name} name={name} type="url" value={strValue} state={state} required={required} ariaDescribedby={describedBy} />
    case 'number':
      return <TextInput id={name} name={name} type="number" value={strValue} state={state} required={required} ariaDescribedby={describedBy} />
    case 'currency':
      return (
        <InputGroup prefix="$" state={state}>
          <TextInput id={name} name={name} type="number" value={strValue} state={state} required={required} ariaDescribedby={describedBy} />
        </InputGroup>
      )
    case 'longText':
      return <Textarea id={name} name={name} state={state} required={required} ariaDescribedby={describedBy} />
    case 'boolean':
      return <Checkbox id={name} name={name} value="on" label={label} checked={value === true} />
    case 'date':
      return <DatePicker id={name} name={name} label={label} defaultValue={strValue} required={required} />
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
          options={choices.map((c) => ({ value: c, label: c }))}
        />
      )
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/field-renderer.test.tsx`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/components/flex-form-field/index.tsx test/forms/field-renderer.test.tsx
git commit -m "feat: add FormField component mapping field types to flex-* components"
```

---

### Task 9: Form Page Component

**Files:**
- Create: `test/forms/form-page.test.tsx`
- Create: `src/components/flex-form-page/index.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { describe, expect, it } from 'bun:test'
import type { FieldEntry, ResolvedPage } from '../../src/types/models'
import { resolveFormSpec } from '../../src/services/form-resolver'
import { FormPageView } from '../../src/components/flex-form-page'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormPageView', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function render(
    resolvedPage: ResolvedPage,
    props: {
      pageIndex: number
      actionUrl: string
      fields?: Record<string, FieldEntry>
      prevUrl?: string | null
    },
  ): string {
    return (
      <FormPageView
        resolvedPage={resolvedPage}
        pageIndex={props.pageIndex}
        actionUrl={props.actionUrl}
        fields={props.fields ?? {}}
        prevUrl={props.prevUrl ?? null}
      /> as any
    ).toString()
  }

  it('renders page title', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/forms/test/sessions/s1/pages/0' })
    expect(html).toContain('Personal Information')
  })

  it('renders page description when present', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/test' })
    expect(html).toContain('Please provide your contact details.')
  })

  it('renders group title as fieldset legend', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/test' })
    expect(html).toContain('Personal Information')
  })

  it('renders fields for the group', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/test' })
    expect(html).toContain('name="fullName"')
    expect(html).toContain('name="email"')
    expect(html).toContain('name="phone"')
  })

  it('renders a submit button', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/test' })
    expect(html).toContain('type="submit"')
  })

  it('renders previous link when prevUrl is provided', () => {
    const html = render(resolved.pages[1], { pageIndex: 1, actionUrl: '/test', prevUrl: '/prev' })
    expect(html).toContain('href="/prev"')
    expect(html).toContain('Previous')
  })

  it('does not render previous link on first page', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/test', prevUrl: null })
    expect(html).not.toContain('Previous')
  })

  it('renders form with POST method and action URL', () => {
    const html = render(resolved.pages[0], { pageIndex: 0, actionUrl: '/submit-here' })
    expect(html).toContain('method="post"')
    expect(html).toContain('action="/submit-here"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/form-page.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FormPageView component**

Create `src/components/flex-form-page/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { FieldEntry, ResolvedPage } from '../../types/models'
import { evaluateCondition } from '../../services/form-resolver'
import { FormField } from '../flex-form-field'

interface FormPageViewProps {
  resolvedPage: ResolvedPage
  pageIndex: number
  actionUrl: string
  fields: Record<string, FieldEntry>
  prevUrl: string | null
}

export const FormPageView: FC<FormPageViewProps> = ({
  resolvedPage,
  pageIndex,
  actionUrl,
  fields,
  prevUrl,
}) => {
  const { page, groups } = resolvedPage

  return (
    <div class="l-stack">
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      <form method="post" action={actionUrl}>
        {groups.map((group) => {
          if (!evaluateCondition(group.condition, fields)) return null
          return (
            <fieldset key={group.id} class="l-stack">
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
          {prevUrl && (
            <a href={prevUrl}>Previous</a>
          )}
          <button type="submit" class="flex-button">
            Continue
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/form-page.test.tsx`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/components/flex-form-page/index.tsx test/forms/form-page.test.tsx
git commit -m "feat: add FormPageView component"
```

---

### Task 10: Review, Landing & Confirmation Components

**Files:**
- Create: `test/forms/form-review.test.tsx`
- Create: `src/components/flex-form-review/index.tsx`
- Create: `src/components/flex-form-landing/index.tsx`
- Create: `src/components/flex-form-confirmation/index.tsx`

- [ ] **Step 1: Write failing tests for FormReview**

```tsx
import { describe, expect, it } from 'bun:test'
import type { FieldEntry } from '../../src/types/models'
import { resolveFormSpec } from '../../src/services/form-resolver'
import { FormReview } from '../../src/components/flex-form-review'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormReview', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)
  const fields: Record<string, FieldEntry> = {
    fullName: { value: 'Alice Johnson' },
    email: { value: 'alice@example.com' },
    employed: { value: 'Yes' },
    employmentType: { value: 'Full-time' },
    monthlyIncome: { value: 5000 },
    startDate: { value: '2026-05-01' },
    dependents: { value: 2 },
    agreeTerms: { value: true },
  }

  function render(): string {
    return (
      <FormReview
        resolved={resolved}
        fields={fields}
        submitUrl="/forms/benefits-app/sessions/s1/submit"
        editBaseUrl="/forms/benefits-app/sessions/s1/pages"
      /> as any
    ).toString()
  }

  it('renders all field values', () => {
    const html = render()
    expect(html).toContain('Alice Johnson')
    expect(html).toContain('alice@example.com')
    expect(html).toContain('Full-time')
    expect(html).toContain('5000')
  })

  it('renders group headings', () => {
    const html = render()
    expect(html).toContain('Personal Information')
    expect(html).toContain('Employment Status')
  })

  it('renders edit links for each page', () => {
    const html = render()
    expect(html).toContain('/forms/benefits-app/sessions/s1/pages/0')
    expect(html).toContain('/forms/benefits-app/sessions/s1/pages/1')
  })

  it('renders submit form', () => {
    const html = render()
    expect(html).toContain('action="/forms/benefits-app/sessions/s1/submit"')
    expect(html).toContain('method="post"')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/form-review.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FormReview**

Create `src/components/flex-form-review/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { FieldEntry, ResolvedForm } from '../../types/models'
import { evaluateCondition } from '../../services/form-resolver'

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
    <div class="l-stack">
      <h1>Review Your Answers</h1>
      <p>Please review your answers before submitting.</p>
      {resolved.pages.map((resolvedPage, pageIndex) => {
        if (!evaluateCondition(resolvedPage.page.condition, fields)) return null
        return (
          <section key={resolvedPage.page.id} class="l-stack">
            <div class="l-cluster" style="justify-content: space-between">
              <h2>{resolvedPage.page.title}</h2>
              <a href={`${editBaseUrl}/${pageIndex}`}>Edit</a>
            </div>
            {resolvedPage.groups.map((group) => {
              if (!evaluateCondition(group.condition, fields)) return null
              return (
                <div key={group.id} class="l-stack">
                  <h3>{group.title}</h3>
                  <dl>
                    {group.requirements.map((req) => {
                      if (!evaluateCondition(req.condition, fields)) return null
                      const entry = fields[req.fieldName]
                      const displayValue = formatValue(entry?.value)
                      return (
                        <div key={req.id}>
                          <dt>{req.label}</dt>
                          <dd>{displayValue}</dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
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
    </div>
  )
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
```

- [ ] **Step 4: Implement FormLanding**

Create `src/components/flex-form-landing/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { FormSpec } from '../../types/models'

interface FormLandingProps {
  formSpec: FormSpec
  startUrl: string
}

export const FormLanding: FC<FormLandingProps> = ({ formSpec, startUrl }) => {
  return (
    <div class="l-stack">
      <h1>{formSpec.title}</h1>
      {formSpec.description && <p>{formSpec.description}</p>}
      <p>{formSpec.pages.length} pages</p>
      <form method="post" action={startUrl}>
        <button type="submit" class="flex-button">
          Start Form
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Implement FormConfirmation**

Create `src/components/flex-form-confirmation/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import type { Submission } from '../../types/models'

interface FormConfirmationProps {
  submission: Submission
}

export const FormConfirmation: FC<FormConfirmationProps> = ({ submission }) => {
  return (
    <div class="l-stack">
      <h1>Submission Received</h1>
      <p>Thank you. Your form has been submitted successfully.</p>
      <dl>
        <dt>Submission ID</dt>
        <dd>{submission.id}</dd>
        <dt>Submitted at</dt>
        <dd>{submission.submittedAt}</dd>
      </dl>
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/form-review.test.tsx`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/components/flex-form-review/index.tsx src/components/flex-form-landing/index.tsx src/components/flex-form-confirmation/index.tsx test/forms/form-review.test.tsx
git commit -m "feat: add review, landing, and confirmation components"
```

---

### Task 11: Form Routes

**Files:**
- Create: `src/routes/forms/index.tsx`
- Modify: `src/server.tsx`

- [ ] **Step 1: Create form route handlers**

Create `src/routes/forms/index.tsx`:

```tsx
import { Hono } from 'hono'
import { Layout } from '../../components/flex-layout'
import { FormLanding } from '../../components/flex-form-landing'
import { FormPageView } from '../../components/flex-form-page'
import { FormReview } from '../../components/flex-form-review'
import { FormConfirmation } from '../../components/flex-form-confirmation'
import { resolveFormSpec } from '../../services/form-resolver'
import { validateFields } from '../../services/form-validation'
import { findNextPage, findPrevPage } from '../../services/form-navigation'
import type {
  DataCollectionSpec,
  FieldEntry,
  FormSpec,
  FormSessionGateway,
  SubmissionGateway,
} from '../../types/models'

interface FormRouterDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  getSpecs: (specId: string) => { dataSpec: DataCollectionSpec; formSpec: FormSpec } | null
}

export function createFormRouter(deps: FormRouterDeps) {
  const { sessionGateway, submissionGateway, getSpecs } = deps
  const forms = new Hono()

  // Landing page
  forms.get('/:specId', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    return c.html(
      <Layout title={specs.formSpec.title} currentPath="/forms">
        <FormLanding
          formSpec={specs.formSpec}
          startUrl={`/forms/${specs.dataSpec.id}/sessions`}
        />
      </Layout>,
    )
  })

  // Create session
  forms.post('/:specId/sessions', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.createSession(specs.dataSpec.id, specs.formSpec.id)
    return c.redirect(`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/0`)
  })

  // Render page
  forms.get('/:specId/sessions/:sessionId/pages/:pageIndex', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const prev = findPrevPage(resolved, pageIndex, session.fields)
    const prevUrl = prev !== null
      ? `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`
      : null
    return c.html(
      <Layout title={resolved.pages[pageIndex].page.title} currentPath="/forms">
        <FormPageView
          resolvedPage={resolved.pages[pageIndex]}
          pageIndex={pageIndex}
          actionUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`}
          fields={session.fields}
          prevUrl={prevUrl}
        />
      </Layout>,
    )
  })

  // Submit page
  forms.post('/:specId/sessions/:sessionId/pages/:pageIndex', async (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const pageIndex = Number(c.req.param('pageIndex'))
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    if (pageIndex < 0 || pageIndex >= resolved.pages.length) return c.notFound()
    const resolvedPage = resolved.pages[pageIndex]

    // Collect all requirements for this page
    const requirements = resolvedPage.groups.flatMap((g) => g.requirements)

    // Parse form body
    const body = await c.req.parseBody()
    const formData: Record<string, string> = {}
    for (const [key, val] of Object.entries(body)) {
      if (typeof val === 'string') formData[key] = val
    }

    // Validate
    const validated = validateFields(formData, requirements, session.fields)
    const hasErrors = Object.values(validated).some((e) => e.errors && e.errors.length > 0)

    if (hasErrors) {
      // Merge validated into session fields for display, then re-render
      const mergedFields = { ...session.fields, ...validated }
      const prev = findPrevPage(resolved, pageIndex, mergedFields)
      const prevUrl = prev !== null
        ? `/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${prev}`
        : null
      return c.html(
        <Layout title={resolvedPage.page.title} currentPath="/forms">
          <FormPageView
            resolvedPage={resolvedPage}
            pageIndex={pageIndex}
            actionUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${pageIndex}`}
            fields={mergedFields}
            prevUrl={prevUrl}
          />
        </Layout>,
      )
    }

    // Write valid fields to session
    sessionGateway.writeFields(session.id, validated)

    // Navigate to next page or review
    const updatedSession = sessionGateway.getSession(session.id)!
    const next = findNextPage(resolved, pageIndex, updatedSession.fields)
    if (next !== null) {
      return c.redirect(`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages/${next}`)
    }
    return c.redirect(`/forms/${specs.dataSpec.id}/sessions/${session.id}/review`)
  })

  // Review page
  forms.get('/:specId/sessions/:sessionId/review', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const resolved = resolveFormSpec(specs.formSpec, specs.dataSpec)
    return c.html(
      <Layout title="Review" currentPath="/forms">
        <FormReview
          resolved={resolved}
          fields={session.fields}
          submitUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/submit`}
          editBaseUrl={`/forms/${specs.dataSpec.id}/sessions/${session.id}/pages`}
        />
      </Layout>,
    )
  })

  // Submit
  forms.post('/:specId/sessions/:sessionId/submit', (c) => {
    const specs = getSpecs(c.req.param('specId'))
    if (!specs) return c.notFound()
    const session = sessionGateway.getSession(c.req.param('sessionId'))
    if (!session) return c.notFound()
    const submission = sessionGateway.submit(session.id)
    submissionGateway.save(submission)
    return c.redirect(
      `/forms/${specs.dataSpec.id}/sessions/${session.id}/confirmation?submissionId=${submission.id}`,
    )
  })

  // Confirmation
  forms.get('/:specId/sessions/:sessionId/confirmation', (c) => {
    const submissionId = c.req.query('submissionId')
    if (!submissionId) return c.notFound()
    const submission = submissionGateway.getSubmission(submissionId)
    if (!submission) return c.notFound()
    return c.html(
      <Layout title="Confirmation" currentPath="/forms">
        <FormConfirmation submission={submission} />
      </Layout>,
    )
  })

  return forms
}
```

- [ ] **Step 2: Mount form routes in server.tsx**

Add to `src/server.tsx` after the catalog import:

```typescript
import { createFormRouter } from './routes/forms/index'
import { InMemoryFormSessionGateway } from './services/form-session'
import { InMemorySubmissionGateway } from './services/submission'
import { testDataSpec, testFormSpec } from '../test/forms/fixtures'
```

Add after the catalog route mount:

```typescript
// Form delivery routes (in-memory, using test fixtures for now)
const sessionGateway = new InMemoryFormSessionGateway()
const submissionGateway = new InMemorySubmissionGateway()

const specRegistry = new Map([
  [testDataSpec.id, { dataSpec: testDataSpec, formSpec: testFormSpec }],
])

const forms = createFormRouter({
  sessionGateway,
  submissionGateway,
  getSpecs: (specId) => specRegistry.get(specId) ?? null,
})

app.route('/forms', forms)
```

- [ ] **Step 3: Run type check**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun run --no-warnings tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add src/routes/forms/index.tsx src/server.tsx
git commit -m "feat: add form delivery routes"
```

---

### Task 12: Route Integration Tests

**Files:**
- Create: `test/forms/routes.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
import { describe, expect, it, beforeEach } from 'bun:test'
import app from '../../src/server'

describe('Form routes', () => {
  it('GET /forms/benefits-app returns landing page', async () => {
    const res = await app.request('/forms/benefits-app')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Benefits Application Form')
    expect(html).toContain('Start Form')
  })

  it('GET /forms/nonexistent returns 404', async () => {
    const res = await app.request('/forms/nonexistent')
    expect(res.status).toBe(404)
  })

  it('POST /forms/benefits-app/sessions creates session and redirects', async () => {
    const res = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toMatch(/\/forms\/benefits-app\/sessions\/[\w-]+\/pages\/0/)
  })

  it('full flow: create session, fill pages, review, submit', async () => {
    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')!
    const sessionId = location.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // GET page 0
    const page0Get = await app.request(`${baseUrl}/pages/0`)
    expect(page0Get.status).toBe(200)
    const page0Html = await page0Get.text()
    expect(page0Html).toContain('Personal Information')

    // POST page 0 with valid data
    const page0Post = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-1234',
      }),
    })
    expect(page0Post.status).toBe(302)
    expect(page0Post.headers.get('Location')).toBe(`${baseUrl}/pages/1`)

    // POST page 1 with employment data
    const page1Post = await app.request(`${baseUrl}/pages/1`, {
      method: 'POST',
      body: new URLSearchParams({
        employed: 'Yes',
        employmentType: 'Full-time',
        monthlyIncome: '5000',
      }),
    })
    expect(page1Post.status).toBe(302)
    expect(page1Post.headers.get('Location')).toBe(`${baseUrl}/pages/2`)

    // POST page 2 with additional info
    const page2Post = await app.request(`${baseUrl}/pages/2`, {
      method: 'POST',
      body: new URLSearchParams({
        startDate: '2026-05-01',
        dependents: '2',
        agreeTerms: 'on',
      }),
    })
    expect(page2Post.status).toBe(302)
    expect(page2Post.headers.get('Location')).toBe(`${baseUrl}/review`)

    // GET review page
    const reviewGet = await app.request(`${baseUrl}/review`)
    expect(reviewGet.status).toBe(200)
    const reviewHtml = await reviewGet.text()
    expect(reviewHtml).toContain('Alice Johnson')
    expect(reviewHtml).toContain('alice@example.com')
    expect(reviewHtml).toContain('Full-time')

    // POST submit
    const submitRes = await app.request(`${baseUrl}/submit`, {
      method: 'POST',
    })
    expect(submitRes.status).toBe(302)
    const confirmLocation = submitRes.headers.get('Location')!
    expect(confirmLocation).toContain('confirmation')
    expect(confirmLocation).toContain('submissionId=')

    // GET confirmation
    const confirmRes = await app.request(confirmLocation)
    expect(confirmRes.status).toBe(200)
    const confirmHtml = await confirmRes.text()
    expect(confirmHtml).toContain('Submission Received')
  })

  it('validation errors re-render the page', async () => {
    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')!
    const sessionId = location.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // POST page 0 with missing required fields
    const res = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({}),
    })
    // Should re-render (200) not redirect (302)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('is required')
  })

  it('returns 404 for invalid session ID', async () => {
    const res = await app.request('/forms/benefits-app/sessions/bad-id/pages/0')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run integration tests**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test test/forms/routes.test.ts`
Expected: All pass

- [ ] **Step 3: Run full test suite**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bun test`
Expected: All tests pass (existing + new)

- [ ] **Step 4: Run lint and type check**

Run: `cd /home/daniel/src/forms-lab/.worktrees/story-6-forms && bunx @biomejs/biome check . && bun run --no-warnings tsc --noEmit`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab/.worktrees/story-6-forms
git add test/forms/routes.test.ts
git commit -m "test: add form delivery integration tests"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `bun test` — all tests pass
- [ ] `bun run --no-warnings tsc --noEmit` — no type errors
- [ ] `bunx @biomejs/biome check .` — lint clean
- [ ] `bun run dev` — dev server starts, `/forms/benefits-app` loads landing page
- [ ] Manual walkthrough: start form, fill all pages, review, submit, see confirmation
