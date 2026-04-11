import { describe, expect, it } from 'bun:test'
import type { FormFieldEntry } from '../../src/design-system/components/flex-form-field'
import { FormReview } from '../../src/design-system/components/flex-form-review'
import {
  evaluateCondition,
  resolveFormSpec,
} from '../../src/services/forms/resolver'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormReview', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function render(
    fields: Record<string, FormFieldEntry>,
    resolvedForm = resolved,
  ): string {
    const reviewPages = resolvedForm.pages
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
              .map((r) => ({ fieldName: r.fieldName, label: r.label })),
          })),
      }))
    return (
      (
        <FormReview
          pages={reviewPages}
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

  it('renders summary list rows', () => {
    const html = render({ fullName: { value: 'Alice' } })
    expect(html).toContain('flex-summary-list__row')
  })
})
