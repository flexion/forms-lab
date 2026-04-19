/**
 * Policy corpus loader.
 *
 * Reads the three fixture corpus files under `catalog/references/`,
 * parses the YAML frontmatter and `## Section — <cite>` headings into
 * `PolicyChunk` objects, and returns them.
 *
 * This is a content loader, not a general markdown parser. The corpus
 * format is fixed (see any file under catalog/references/) and the
 * parser is correspondingly narrow — adding a new shape of section
 * would require a deliberate extension here.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PolicyChunk } from './retrieval'

interface Frontmatter {
  formSlug: string
  title: string
  source: string
}

const CORPUS_FILES: Array<{ path: string }> = [
  { path: 'pardon-application.md' },
  { path: 'i-9.md' },
  { path: 'w-9.md' },
]

/**
 * Parse YAML frontmatter. Only handles the small subset our corpus
 * uses: simple `key: value` lines between `---` fences. Arrays and
 * nested objects are not supported because the corpus does not use
 * them.
 */
function parseFrontmatter(text: string): { data: Record<string, string>; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    throw new Error('Corpus file missing YAML frontmatter')
  }
  const [, yaml, body] = match
  const data: Record<string, string> = {}
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (!kv) continue
    const [, key, value] = kv
    data[key] = value.trim()
  }
  return { data, body }
}

/**
 * Split a corpus body into sections keyed by the citation in the
 * heading. Expected heading shape: `## Section — 28 CFR 1.1 (title)`.
 * The text after the em-dash is the `source`; the body of the section
 * (everything before the next `## ` or end of file) is the `text`.
 */
function parseSections(body: string): Array<{ source: string; text: string }> {
  const sections: Array<{ source: string; text: string }> = []
  const lines = body.split('\n')
  let current: { source: string; lines: string[] } | null = null

  for (const line of lines) {
    const heading = line.match(/^## Section — (.+?)\s*$/)
    if (heading) {
      if (current) {
        sections.push({ source: current.source, text: current.lines.join('\n').trim() })
      }
      current = { source: heading[1].trim(), lines: [] }
      continue
    }
    if (current) {
      current.lines.push(line)
    }
  }
  if (current) {
    sections.push({ source: current.source, text: current.lines.join('\n').trim() })
  }
  return sections
}

export interface LoadPolicyCorpusOptions {
  /** When set, only return chunks for this form slug. */
  slug?: string
  /** Override the base directory (tests, alternate layouts). */
  baseDir?: string
}

export function loadPolicyCorpus(
  options: LoadPolicyCorpusOptions = {},
): PolicyChunk[] {
  const baseDir =
    options.baseDir ?? join(process.cwd(), 'catalog', 'references')
  const chunks: PolicyChunk[] = []

  for (const { path } of CORPUS_FILES) {
    const raw = readFileSync(join(baseDir, path), 'utf-8')
    const { data, body } = parseFrontmatter(raw)
    const fm: Frontmatter = {
      formSlug: data.formSlug,
      title: data.title,
      source: data.source,
    }

    if (options.slug && fm.formSlug !== options.slug) continue

    const sections = parseSections(body)
    sections.forEach((section, i) => {
      chunks.push({
        id: `${fm.formSlug}/${i + 1}`,
        source: section.source,
        title: fm.title,
        text: section.text,
        formSlug: fm.formSlug,
      })
    })
  }

  return chunks
}
