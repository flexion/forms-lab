import { describe, expect, it } from 'bun:test'
import { FormPageView } from '../../src/app/components/flex-form-page'
import { resolveFormSpec } from '../../src/services/form-resolver'
import type { FieldEntry, ResolvedPage } from '../../src/types/models'
import { testDataSpec, testFormSpec } from './fixtures'

describe('FormPageView', () => {
  const resolved = resolveFormSpec(testFormSpec, testDataSpec)

  function render(
    resolvedPage: ResolvedPage,
    props: {
      actionUrl: string
      fields?: Record<string, FieldEntry>
      prevUrl?: string | null
    },
  ): string {
    return (
      (
        <FormPageView
          resolvedPage={resolvedPage}
          actionUrl={props.actionUrl}
          fields={props.fields ?? {}}
          prevUrl={props.prevUrl ?? null}
        />
      ) as any
    ).toString()
  }

  it('renders page title', () => {
    const html = render(resolved.pages[0], { actionUrl: '/test' })
    expect(html).toContain('Personal Information')
  })

  it('renders page description when present', () => {
    const html = render(resolved.pages[0], { actionUrl: '/test' })
    expect(html).toContain('Please provide your contact details.')
  })

  it('renders fields for the group', () => {
    const html = render(resolved.pages[0], { actionUrl: '/test' })
    expect(html).toContain('name="fullName"')
    expect(html).toContain('name="email"')
    expect(html).toContain('name="phone"')
  })

  it('renders a submit button', () => {
    const html = render(resolved.pages[0], { actionUrl: '/test' })
    expect(html).toContain('type="submit"')
  })

  it('renders previous link when prevUrl is provided', () => {
    const html = render(resolved.pages[1], {
      actionUrl: '/test',
      prevUrl: '/prev',
    })
    expect(html).toContain('href="/prev"')
    expect(html).toContain('Previous')
  })

  it('does not render previous link on first page', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/test',
      prevUrl: null,
    })
    expect(html).not.toContain('Previous')
  })

  it('renders form with POST method and action URL', () => {
    const html = render(resolved.pages[0], {
      actionUrl: '/submit-here',
    })
    expect(html).toContain('method="post"')
    expect(html).toContain('action="/submit-here"')
  })
})
