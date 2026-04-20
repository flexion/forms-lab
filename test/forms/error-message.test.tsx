import { describe, expect, it } from 'bun:test'
import { ErrorMessage } from '../../src/design-system/components/flex-error-message'

function render(props: { id?: string; children: string }): string {
  return (
    (<ErrorMessage id={props.id}>{props.children}</ErrorMessage>) as string
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
