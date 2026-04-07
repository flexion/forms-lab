import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Parse frontmatter and content from a markdown file
 */
export interface MarkdownFile {
  frontmatter: Record<string, string>
  content: string
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
