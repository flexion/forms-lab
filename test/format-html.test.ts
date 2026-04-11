import { describe, expect, it } from 'bun:test'
import { formatHtml } from '../src/shared/format-html'

describe('formatHtml', () => {
  it('indents nested tags', () => {
    const input = '<div><p>Hello</p></div>'
    const output = formatHtml(input)
    expect(output).toBe('<div>\n  <p>Hello</p>\n</div>')
  })

  it('handles self-closing tags', () => {
    const input = '<div><input type="text" /><span>Label</span></div>'
    const output = formatHtml(input)
    expect(output).toBe(
      '<div>\n  <input type="text" />\n  <span>Label</span>\n</div>',
    )
  })

  it('handles multiple attributes', () => {
    const input =
      '<button class="flex-button" data-variant="secondary">Click</button>'
    const output = formatHtml(input)
    expect(output).toBe(
      '<button class="flex-button" data-variant="secondary">Click</button>',
    )
  })

  it('handles deeply nested markup', () => {
    const input = '<div><ul><li>One</li><li>Two</li></ul></div>'
    const output = formatHtml(input)
    expect(output).toBe(
      '<div>\n  <ul>\n    <li>One</li>\n    <li>Two</li>\n  </ul>\n</div>',
    )
  })

  it('preserves inline content without adding newlines', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    const output = formatHtml(input)
    expect(output).toBe('<p>Hello <strong>world</strong></p>')
  })

  it('keeps element-only inline children on one line when text is present', () => {
    // <span> is inline; "word" is the text node that qualifies this as inline-keepable
    const input = '<p><span>word</span></p>'
    const output = formatHtml(input)
    expect(output).toBe('<p><span>word</span></p>')
  })

  it('handles empty input', () => {
    expect(formatHtml('')).toBe('')
  })
})
