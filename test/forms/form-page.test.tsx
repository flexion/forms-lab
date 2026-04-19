import { describe, expect, it } from 'bun:test'
import type { FormError } from '../../src/design-system/components/flex-form-error-summary'
import type { FormFieldEntry } from '../../src/design-system/components/flex-form-field'
import { FormPageView } from '../../src/design-system/components/flex-form-page'
import { evaluateCondition, resolveFormSpec } from '../../src/services/forms'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormPageView', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

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
    const rp = resolved.pages[pageIndex]
    const visibleGroups = rp.groups
      .filter((g) => evaluateCondition(g.condition, fields))
      .map((g) => ({
        ...g,
        requirements: g.requirements.filter((r) =>
          evaluateCondition(r.condition, fields),
        ),
      }))
    return (
      (
        <FormPageView
          page={{
            title: rp.page.title,
            description: rp.page.description,
            groups: visibleGroups,
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

  it('renders page title', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('Personal Information')
  })

  it('renders step text', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('Page 1 of 3')
  })

  it('wraps in flex-form with large size', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('class="flex-form"')
    expect(html).toContain('data-size="large"')
  })

  it('adds novalidate to form', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('novalidate')
  })

  it('renders error summary when errors present', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
      errors: [{ fieldId: 'fullName', message: 'Enter your full name' }],
    })
    expect(html).toContain('There is a problem')
    expect(html).toContain('href="#fullName"')
  })

  it('does not render error summary when no errors', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
      errors: [],
    })
    expect(html).not.toContain('There is a problem')
  })

  it('renders Back link instead of Previous', () => {
    const html = render(1, {
      actionUrl: '/test',
      currentPage: 2,
      totalPages: 3,
      prevUrl: '/prev',
    })
    expect(html).toContain('href="/prev"')
    expect(html).toContain('Back')
  })

  it('renders Continue button', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('Continue')
    expect(html).toContain('type="submit"')
  })

  it('renders fields for the group', () => {
    const html = render(0, {
      actionUrl: '/test',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('name="fullName"')
    expect(html).toContain('name="email"')
  })

  it('renders form with POST method and action URL', () => {
    const html = render(0, {
      actionUrl: '/submit-here',
      currentPage: 1,
      totalPages: 3,
    })
    expect(html).toContain('method="post"')
    expect(html).toContain('action="/submit-here"')
  })
})
