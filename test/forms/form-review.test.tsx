import { describe, expect, it } from 'bun:test'
import { FormReview } from '../../src/app/components/flex-form-review'
import { resolveFormSpec } from '../../src/services/form-resolver'
import type { FieldEntry } from '../../src/types/models'
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
      (
        <FormReview
          resolved={resolved}
          fields={fields}
          submitUrl="/forms/benefits-app/sessions/s1/submit"
          editBaseUrl="/forms/benefits-app/sessions/s1/pages"
        />
      ) as any
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
