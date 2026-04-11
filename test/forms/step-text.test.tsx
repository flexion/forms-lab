import { describe, expect, it } from 'bun:test'
import { FormStepText } from '../../src/app/components/flex-form-step-text'

function render(current: number, total: number): string {
  return ((<FormStepText current={current} total={total} />) as any).toString()
}

describe('FormStepText', () => {
  it('renders page count text', () => {
    const html = render(1, 3)
    expect(html).toContain('Page 1 of 3')
  })

  it('renders with correct class', () => {
    const html = render(2, 5)
    expect(html).toContain('flex-form-step-text')
  })

  it('updates numbers correctly', () => {
    const html = render(3, 3)
    expect(html).toContain('Page 3 of 3')
  })
})
