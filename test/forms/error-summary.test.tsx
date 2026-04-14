import { describe, expect, it } from 'bun:test'
import { FormErrorSummary } from '../../src/design-system/components/flex-form-error-summary'

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
    const html = render([
      { fieldId: 'fullName', message: 'Enter your full name' },
    ])
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
