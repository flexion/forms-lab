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
