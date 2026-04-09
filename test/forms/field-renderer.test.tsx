import { describe, expect, it } from 'bun:test'
import { FormField } from '../../src/components/flex-form-field'
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
