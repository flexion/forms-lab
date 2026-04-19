import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'

import type { BuildInfo } from '../../shared/build-info'
import { githubPermalink } from './github-permalink'
import type { MarkdownFile } from './types'

export type { MarkdownFile }

export interface RenderOptions {
  build: BuildInfo
}

/**
 * Parse markdown file with YAML frontmatter
 */
export async function parseMarkdown(filePath: string): Promise<MarkdownFile> {
  const raw = await readFile(filePath, 'utf-8')

  // Check for frontmatter
  if (!raw.startsWith('---\n')) {
    return {
      frontmatter: {},
      content: raw,
    }
  }

  // Find end of frontmatter
  const endIndex = raw.indexOf('\n---\n', 4)
  if (endIndex === -1) {
    return {
      frontmatter: {},
      content: raw,
    }
  }

  // Parse frontmatter as simple key: value pairs
  const frontmatterText = raw.slice(4, endIndex)
  const frontmatter: Record<string, string> = {}

  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }

  // Content is everything after frontmatter
  const content = raw.slice(endIndex + 5).trim()

  return { frontmatter, content }
}

/**
 * Read all markdown files from a directory
 */
export async function readMarkdownDir(
  dirPath: string,
): Promise<Array<MarkdownFile & { filename: string }>> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md'))

  const results = await Promise.all(
    files.map(async (file) => {
      const filePath = join(dirPath, file.name)
      const parsed = await parseMarkdown(filePath)
      return {
        ...parsed,
        filename: file.name.replace('.md', ''),
      }
    }),
  )

  return results
}

/**
 * Render markdown string to HTML. Rewrites `src:` links to GitHub permalinks
 * pinned to the current build's git ref.
 */
export function renderMarkdown(content: string, opts: RenderOptions): string {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
  })
    .use(taskLists)
    .use(srcUrlPlugin(opts.build))
  return md.render(content)
}

function srcUrlPlugin(build: BuildInfo) {
  return (md: MarkdownIt) => {
    const defaultLinkOpen =
      md.renderer.rules.link_open ??
      ((tokens, idx, options, _env, self) =>
        self.renderToken(tokens, idx, options))

    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const hrefIdx = token.attrIndex('href')
      if (hrefIdx >= 0) {
        const href = token.attrs?.[hrefIdx][1] ?? ''
        const rewritten = rewriteSrcHref(href, build)
        if (rewritten !== href && token.attrs) {
          token.attrs[hrefIdx][1] = rewritten
        }
      }
      return defaultLinkOpen(tokens, idx, options, env, self)
    }
  }
}

function rewriteSrcHref(href: string, build: BuildInfo): string {
  if (!href.startsWith('src:')) return href
  const rest = href.slice(4)
  const hashIdx = rest.indexOf('#')
  const path = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest
  const fragment = hashIdx >= 0 ? rest.slice(hashIdx + 1) : ''
  const lines = parseLineFragment(fragment)
  return githubPermalink({ path, lines }, build)
}

function parseLineFragment(
  fragment: string,
): number | [number, number] | undefined {
  if (!fragment) return undefined
  const range = fragment.match(/^L(\d+)-L(\d+)$/)
  if (range) return [Number(range[1]), Number(range[2])]
  const single = fragment.match(/^L(\d+)$/)
  if (single) return Number(single[1])
  return undefined
}
