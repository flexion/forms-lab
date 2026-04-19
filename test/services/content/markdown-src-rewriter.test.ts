import { describe, expect, it } from 'bun:test'
import { renderMarkdown } from '../../../src/services/content/markdown'
import type { BuildInfo } from '../../../src/shared/build-info'

const build: BuildInfo = {
  gitRef: 'abc1234',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: false,
}

describe('renderMarkdown with src: URL rewriter', () => {
  it('rewrites a src: link with no fragment', () => {
    const html = renderMarkdown('[x](src:src/services/forms/index.ts)', {
      build,
    })
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts"',
    )
  })

  it('rewrites a src: link with a line range', () => {
    const html = renderMarkdown(
      '[x](src:src/services/forms/index.ts#L42-L88)',
      { build },
    )
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts#L42-L88"',
    )
  })

  it('rewrites a src: link with a single line', () => {
    const html = renderMarkdown('[x](src:src/shared/build-info.ts#L10)', {
      build,
    })
    expect(html).toContain(
      'href="https://github.com/flexion/forms-lab/blob/abc1234/src/shared/build-info.ts#L10"',
    )
  })

  it('passes through non-src links untouched', () => {
    const html = renderMarkdown('[x](https://example.com/foo)', { build })
    expect(html).toContain('href="https://example.com/foo"')
  })

  it('passes through relative links untouched', () => {
    const html = renderMarkdown('[x](./other.md)', { build })
    expect(html).toContain('href="./other.md"')
  })
})
