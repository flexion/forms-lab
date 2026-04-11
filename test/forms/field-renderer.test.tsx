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

  // --- Form-group wrapper ---

  it('wraps in flex-form-group class', () => {
    const html = render(baseReq)
    expect(html).toContain('class="flex-form-group"')
  })

  it('sets data-state="error" when field has errors', () => {
    const entry: FieldEntry = { value: '', errors: ['Required'] }
    const html = render(baseReq, entry)
    expect(html).toContain('class="flex-form-group"')
    expect(html).toContain('data-state="error"')
  })

  it('does not set data-state when no errors', () => {
    const html = render(baseReq)
    // The flex-form-group div should not have data-state
    expect(html).not.toMatch(/flex-form-group[^>]*data-state/)
  })

  // --- Spacing token ---

  it('uses --flex-space-xs token (not --flex-spacing-1)', () => {
    const html = render(baseReq)
    expect(html).toContain('--flex-space-xs')
    expect(html).not.toContain('--flex-spacing-1')
  })

  // --- Optional / required labels ---

  it('shows (optional) for non-required fields', () => {
    const html = render({ ...baseReq, required: false })
    expect(html).toContain('optional')
  })

  it('does NOT show asterisk for required fields', () => {
    const html = render(baseReq)
    expect(html).not.toContain('*')
  })

  // --- Field width defaults ---

  it('renders email with data-width="xl"', () => {
    const html = render({
      ...baseReq,
      fieldType: 'email',
      fieldName: 'email',
    })
    expect(html).toContain('data-width="xl"')
  })

  it('renders phone with data-width="md"', () => {
    const html = render({
      ...baseReq,
      fieldType: 'phone',
      fieldName: 'phone',
    })
    expect(html).toContain('data-width="md"')
  })

  it('renders number with data-width="sm"', () => {
    const html = render({
      ...baseReq,
      fieldType: 'number',
      fieldName: 'count',
    })
    expect(html).toContain('data-width="sm"')
  })

  it('respects displayWidth override from requirement', () => {
    const html = render({
      ...baseReq,
      fieldType: 'email',
      fieldName: 'email',
      displayWidth: '2xs',
    })
    expect(html).toContain('data-width="2xs"')
    expect(html).not.toContain('data-width="xl"')
  })

  // --- Field type rendering ---

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
    const html = render({
      ...baseReq,
      fieldType: 'currency',
      fieldName: 'amount',
    })
    expect(html).toContain('$')
    expect(html).toContain('type="number"')
  })

  it('renders textarea for longText', () => {
    const html = render({
      ...baseReq,
      fieldType: 'longText',
      fieldName: 'notes',
    })
    expect(html).toContain('textarea')
  })

  it('renders checkbox for boolean', () => {
    const html = render({
      ...baseReq,
      fieldType: 'boolean',
      fieldName: 'agree',
    })
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
    const html = render({
      ...baseReq,
      fieldType: 'date',
      fieldName: 'startDate',
    })
    expect(html).toContain('flex-date-picker')
  })

  // --- Help text and error messages ---

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
