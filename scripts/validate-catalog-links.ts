/**
 * Validate internal catalog links.
 *
 * Checks three classes of reference:
 *
 *   1. `/catalog/...` URLs in TSX routes and markdown — must resolve
 *      against the Hono routes in `src/entrypoints/app/routes/catalog/`
 *      and the files under `catalog/`.
 *
 *   2. Relative markdown links (`./file`, `../dir/file`, `file.md`)
 *      inside any file under `catalog/` — must resolve to a file or
 *      directory on disk.
 *
 *   3. `href={resolveUrl('/catalog/...')}` calls inside TSX — same
 *      resolution rules as (1).
 *
 * Exits non-zero when any reference does not resolve. Meant to run
 * as part of pre-push / CI; safe to run locally as
 * `bun run scripts/validate-catalog-links.ts`.
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Glob } from 'bun'

const repoRoot = resolve(import.meta.dir, '..')
const catalogDir = join(repoRoot, 'catalog')

interface LinkRef {
  file: string
  line: number
  href: string
  context: string
}

interface BadLink extends LinkRef {
  reason: string
}

const bad: BadLink[] = []

/** A /catalog/... URL resolves if we can identify its target file/dir. */
function resolveCatalogUrl(url: string): string | null {
  // Strip query + hash.
  const clean = url.split(/[?#]/)[0]
  // Strip trailing slash (except root).
  const trimmed = clean.length > 1 ? clean.replace(/\/$/, '') : clean

  // Routes handled by code rather than file lookup.
  const codeRoutes = new Set([
    '/catalog',
    '/catalog/',
    '/catalog/personas',
    '/catalog/decisions',
    '/catalog/architecture',
    '/catalog/stories',
    '/catalog/experiments',
    '/catalog/design-system',
    '/catalog/walkthrough',
  ])
  if (codeRoutes.has(trimmed)) return trimmed

  // /catalog/design-system/<slug> is dispatched by a single code
  // route. Accept any slug that matches a known doc slug or a
  // component directory under src/design-system/components/.
  if (trimmed.startsWith('/catalog/design-system/')) {
    const slug = trimmed.slice('/catalog/design-system/'.length)
    const knownDocSlugs = new Set([
      'typography',
      'tokens',
      'compositions',
      'rules',
      'base-classes',
      'data-visualizations',
      'layout',
    ])
    if (knownDocSlugs.has(slug)) return trimmed
    const componentDir = resolve(repoRoot, 'src/design-system/components', slug)
    if (existsSync(componentDir)) return trimmed
    return null
  }

  // /catalog/<kind>/<file> — map to catalog/<kind>/<file>.md.
  // Also handle /catalog/references/<file>.
  const segments = trimmed.split('/').filter(Boolean)
  if (segments[0] !== 'catalog') return null

  // Walk segments and try to find a matching markdown file or directory.
  // Also tolerate the top-level "_file" -> "/catalog/<section>/file"
  // remapping the experiments route performs.
  const attempts: string[] = []
  const rest = segments.slice(1)
  const tail = rest.join('/')

  if (rest.length === 0) return trimmed // /catalog

  // Direct file hit.
  attempts.push(join(catalogDir, `${tail}.md`))
  // _prefixed file (e.g. _suite.md).
  const last = rest[rest.length - 1]
  const prefix = rest.slice(0, -1).join('/')
  attempts.push(
    prefix
      ? join(catalogDir, prefix, `_${last}.md`)
      : join(catalogDir, `_${last}.md`),
  )
  // Directory (handled by suite/kind route).
  attempts.push(join(catalogDir, tail))
  // Architecture files live under catalog/architecture/ with a .md
  // but the route also accepts non-.md subpaths that map to the
  // markdown file. Same for decisions.
  attempts.push(join(catalogDir, `${tail}/index.md`))
  attempts.push(join(catalogDir, `${tail}/_suite.md`))

  for (const attempt of attempts) {
    if (!existsSync(attempt)) continue
    try {
      const s = statSync(attempt)
      if (s.isFile() || s.isDirectory()) return attempt
    } catch {
      /* ignore */
    }
  }
  return null
}

function resolveRelative(fromFile: string, href: string): string | null {
  // Strip query + hash.
  const clean = href.split(/[?#]/)[0]
  if (clean.length === 0) return null

  const fromDir = resolve(fromFile, '..')
  const attempts = [
    resolve(fromDir, clean),
    resolve(fromDir, `${clean}.md`),
    resolve(fromDir, clean, 'index.md'),
    resolve(fromDir, clean, '_suite.md'),
  ]
  for (const attempt of attempts) {
    if (existsSync(attempt)) return attempt
  }
  return null
}

function scanMarkdown(file: string): LinkRef[] {
  const text = readFileSync(file, 'utf-8')
  const refs: LinkRef[] = []
  const lines = text.split('\n')
  const linkPattern = /\[([^\]]*)\]\(([^)\s]+)\)/g
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m: RegExpExecArray | null
    linkPattern.lastIndex = 0
    m = linkPattern.exec(line)
    while (m !== null) {
      const href = m[2]
      // Skip external + anchor-only + mailto + custom protocols
      // (e.g. `src:src/...` rendered by the github-permalink content
      // service).
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('src:') ||
        href.includes('://')
      ) {
        m = linkPattern.exec(line)
        continue
      }
      refs.push({
        file,
        line: i + 1,
        href,
        context: m[0],
      })
      m = linkPattern.exec(line)
    }
  }
  return refs
}

function scanTsx(file: string): LinkRef[] {
  const text = readFileSync(file, 'utf-8')
  const refs: LinkRef[] = []
  const lines = text.split('\n')
  // Catch resolveUrl('/catalog/...'), href="/catalog/...", and plain
  // "/catalog/..." strings in JSX attributes.
  const urlPattern = /(['"`])(\/catalog\/[^'"`)\s]*)\1/g
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m: RegExpExecArray | null
    urlPattern.lastIndex = 0
    m = urlPattern.exec(line)
    while (m !== null) {
      const href = m[2]
      // Skip dynamic template literals — can't resolve statically.
      if (href.includes('${')) {
        m = urlPattern.exec(line)
        continue
      }
      refs.push({ file, line: i + 1, href, context: m[0] })
      m = urlPattern.exec(line)
    }
  }
  return refs
}

// --- scan ------------------------------------------------------------

const mdGlob = new Glob('**/*.md')
const catalogMdFiles: string[] = []
for await (const match of mdGlob.scan({ cwd: catalogDir, dot: false })) {
  catalogMdFiles.push(join(catalogDir, match))
}

const tsxGlob = new Glob('src/entrypoints/app/routes/catalog/**/*.tsx')
const tsxFiles: string[] = []
for await (const match of tsxGlob.scan({ cwd: repoRoot, dot: false })) {
  tsxFiles.push(join(repoRoot, match))
}

let totalRefs = 0

for (const file of catalogMdFiles) {
  const refs = scanMarkdown(file)
  for (const ref of refs) {
    totalRefs++
    if (ref.href.startsWith('/catalog')) {
      if (!resolveCatalogUrl(ref.href)) {
        bad.push({ ...ref, reason: `absolute /catalog URL did not resolve` })
      }
    } else if (ref.href.startsWith('/')) {
    } else {
      // Relative reference.
      if (!resolveRelative(file, ref.href)) {
        bad.push({ ...ref, reason: `relative link did not resolve` })
      }
    }
  }
}

for (const file of tsxFiles) {
  const refs = scanTsx(file)
  for (const ref of refs) {
    totalRefs++
    if (!resolveCatalogUrl(ref.href)) {
      bad.push({ ...ref, reason: `resolveUrl target did not resolve` })
    }
  }
}

console.log(
  `Checked ${totalRefs} references across ${catalogMdFiles.length} markdown files and ${tsxFiles.length} TSX files.\n`,
)

if (bad.length > 0) {
  for (const b of bad) {
    const rel = b.file.replace(`${repoRoot}/`, '')
    console.error(`  ${rel}:${b.line}  ${b.context}`)
    console.error(`    ${b.reason}`)
  }
  console.error(`\n${bad.length} broken link(s). Failing.`)
  process.exit(1)
}

console.log('All catalog links resolve.')
