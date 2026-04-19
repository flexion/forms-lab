import { describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseMarkdown, renderMarkdown } from '../src/services/content/markdown'
import type { BuildInfo } from '../src/shared/build-info'

const build: BuildInfo = {
  gitRef: 'test-ref',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: false,
}

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('# Hello\n\nA paragraph.', { build })
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('<p>A paragraph.</p>')
  })

  it('does not pass through raw HTML', () => {
    const html = renderMarkdown('<script>alert("xss")</script>', { build })
    expect(html).not.toContain('<script>')
  })

  it('renders task list checkboxes', () => {
    const html = renderMarkdown('- [ ] Todo\n- [x] Done', { build })
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked')
  })

  it('renders GFM-style tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md, { build })
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })
})

describe('parseMarkdown', () => {
  it('strips surrounding quotes from frontmatter values', async () => {
    const dir = join(import.meta.dir, '__fixtures__')
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'quoted.md')
    await writeFile(
      file,
      '---\nrole: "Form Creator (Program Officer)"\n---\n\nContent here.',
    )

    const result = await parseMarkdown(file)
    expect(result.frontmatter.role).toBe('Form Creator (Program Officer)')

    await rm(dir, { recursive: true })
  })

  it('returns empty frontmatter when none present', async () => {
    const dir = join(import.meta.dir, '__fixtures__')
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'no-frontmatter.md')
    await writeFile(file, '# Just Content\n\nNo frontmatter.')

    const result = await parseMarkdown(file)
    expect(result.frontmatter).toEqual({})
    expect(result.content).toContain('Just Content')

    await rm(dir, { recursive: true })
  })
})
