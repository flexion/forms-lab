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

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PolicyChunk } from './retrieval'

interface Frontmatter {
  formSlug: string
  title: string
  source: string
}

/**
 * Metadata about an available policy corpus, surfaced to UI code
 * that needs to let the user choose a corpus or display information
 * about the corpus that grounds a project.
 */
export interface CorpusMetadata {
  /** Stable slug used in URLs, project records, and retrieval queries. */
  slug: string
  /** Corpus display name (taken from `title` in frontmatter). */
  title: string
  /** Regulatory source citation (e.g. "7 CFR 273"). */
  source: string
  /**
   * User-facing name of the form this corpus builds. May differ from
   * `title` — `title` names the corpus ("Wisconsin SNAP Application
   * Policy Excerpts"), `formName` names the resulting form
   * ("Wisconsin FoodShare (SNAP) Application"). Falls back to `title`
   * when absent.
   */
  formName: string
  /**
   * Plain-English description of the form this corpus supports.
   * Surfaced on the project overview page and the new-project
   * picker. Absent on corpora that have not yet opted into the
   * authoring flow — those are extraction-only references.
   */
  formDescription: string | null
}

const CORPUS_FILES: Array<{ path: string }> = [
  { path: 'pardon-application.md' },
  { path: 'i-9.md' },
  { path: 'w-9.md' },
  { path: 'snap-wisconsin.md' },
]

/**
 * Parse YAML frontmatter. Only handles the small subset our corpus
 * uses: simple `key: value` lines between `---` fences. Arrays and
 * nested objects are not supported because the corpus does not use
 * them.
 */
function parseFrontmatter(text: string): {
  data: Record<string, string>
  body: string
} {
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
        sections.push({
          source: current.source,
          text: current.lines.join('\n').trim(),
        })
      }
      current = { source: heading[1].trim(), lines: [] }
      continue
    }
    if (current) {
      current.lines.push(line)
    }
  }
  if (current) {
    sections.push({
      source: current.source,
      text: current.lines.join('\n').trim(),
    })
  }
  return sections
}

export interface LoadPolicyCorpusOptions {
  /** When set, only return chunks for this form slug. */
  slug?: string
  /** Override the base directory (tests, alternate layouts). */
  baseDir?: string
  /** Load corpus from project directory instead of catalog. */
  projectDir?: string
}

export interface ListCorporaOptions {
  /** Override the base directory (tests, alternate layouts). */
  baseDir?: string
  /**
   * When true, only return corpora that declare a `formDescription`
   * in their frontmatter — i.e. corpora that have opted into the
   * authoring flow. Extraction-only corpora (pardon, I-9, W-9) are
   * omitted. Defaults to false so callers that need the full list
   * (e.g. evaluation) still see every corpus.
   */
  formsOnly?: boolean
}

/**
 * List every available policy corpus under catalog/references. Used
 * by the new-project picker to render the "build from corpus" button
 * set and by the project overview page to resolve a stored
 * `corpusSlug` back to display metadata.
 */
export function listCorpora(
  options: ListCorporaOptions = {},
): CorpusMetadata[] {
  const baseDir =
    options.baseDir ?? join(process.cwd(), 'catalog', 'references')
  const corpora: CorpusMetadata[] = []

  for (const { path } of CORPUS_FILES) {
    const fullPath = join(baseDir, path)
    if (!existsSync(fullPath)) continue
    const raw = readFileSync(fullPath, 'utf-8')
    const { data } = parseFrontmatter(raw)
    if (!data.formSlug) continue
    const formDescription = data.formDescription ?? null
    if (options.formsOnly && !formDescription) continue
    corpora.push({
      slug: data.formSlug,
      title: data.title ?? data.formSlug,
      source: data.source ?? '',
      formName: data.formName ?? data.title ?? data.formSlug,
      formDescription,
    })
  }

  return corpora
}

/**
 * Look up a single corpus by slug. Returns null when the slug does
 * not match any known corpus.
 */
export function getCorpusMetadata(
  slug: string,
  options: ListCorporaOptions = {},
): CorpusMetadata | null {
  return listCorpora(options).find((c) => c.slug === slug) ?? null
}

export function loadPolicyCorpus(
  options: LoadPolicyCorpusOptions = {},
): PolicyChunk[] {
  // If projectDir is set, load from project-scoped references/
  if (options.projectDir) {
    const referencesDir = join(options.projectDir, 'references')
    if (!existsSync(referencesDir)) {
      return []
    }

    const chunks: PolicyChunk[] = []
    const files = readdirSync(referencesDir).filter((f) => f.endsWith('.md'))

    for (const file of files) {
      const raw = readFileSync(join(referencesDir, file), 'utf-8')
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

  // Otherwise, load from catalog (default behavior)
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
