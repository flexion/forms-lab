/**
 * Lightweight HTML pretty-printer for component example output.
 * Handles simple tag indentation — not a full parser.
 *
 * Limitation: the regex tokenizer splits on the first `>`, so `>` inside
 * attribute values (e.g. `data-value="a>b"`) will produce incorrect tokens.
 */

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const INLINE_ELEMENTS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'em',
  'i',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
])

function getTagName(token: string): string {
  return token.match(/<\/?(\w+)/)?.[1] ?? ''
}

/**
 * Starting from tokens[startIdx] (the token after an opening tag),
 * find the matching closing tag index. Returns -1 if any block-level
 * child element is found, meaning the content can't stay on one line.
 *
 * Content is considered "inline-keepable" only when it contains at least
 * one text node (mixed content) and all elements are inline.
 */
function findInlineSpan(
  tokens: string[],
  startIdx: number,
  parentTag: string,
): number {
  let depth = 0
  let hasText = false
  for (let i = startIdx; i < tokens.length; i++) {
    const t = tokens[i].trim()
    if (!t) continue
    if (t.startsWith('</')) {
      const tag = getTagName(t)
      if (tag === parentTag && depth === 0) {
        return hasText ? i : -1
      }
      depth--
    } else if (t.startsWith('<')) {
      const tag = getTagName(t)
      const selfClosing = t.endsWith('/>') || VOID_ELEMENTS.has(tag)
      // Any non-inline element (block or void) forces a line break — void
      // elements like <input> or <hr> signal form/block structure, not inline flow.
      if (!INLINE_ELEMENTS.has(tag)) return -1
      if (!selfClosing) depth++
    } else {
      hasText = true
    }
  }
  return -1
}

export function formatHtml(html: string): string {
  if (!html.trim()) return ''

  const tokens = html.match(/(<[^>]+>|[^<]+)/g)
  if (!tokens) return html

  const lines: string[] = []
  let indent = 0
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    const trimmed = token.trim()
    if (!trimmed) {
      i++
      continue
    }

    if (trimmed.startsWith('</')) {
      indent--
      lines.push('  '.repeat(Math.max(0, indent)) + trimmed)
      i++
    } else if (trimmed.startsWith('<')) {
      const tagName = getTagName(trimmed)
      const selfClosing = trimmed.endsWith('/>') || VOID_ELEMENTS.has(tagName)

      if (selfClosing) {
        lines.push('  '.repeat(indent) + trimmed)
        i++
        continue
      }

      // Check if this element's content is inline-keepable (mixed text+inline)
      const closeIdx = findInlineSpan(tokens, i + 1, tagName)
      if (closeIdx >= 0) {
        let combined = ''
        for (let j = i; j <= closeIdx; j++) {
          combined += tokens[j]
        }
        lines.push('  '.repeat(indent) + combined.trim())
        i = closeIdx + 1
      } else {
        lines.push('  '.repeat(indent) + trimmed)
        indent++
        i++
      }
    } else {
      // Text node — append to previous line
      if (lines.length > 0) {
        lines[lines.length - 1] += token
      } else {
        lines.push(token)
      }
      i++
    }
  }

  return lines.join('\n')
}
