import { describe, expect, it } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

/**
 * Enforces P2 (dependency flows one way) from the architecture principles.
 *
 * Rule:
 *   shared/        -> may import from: (none internal)
 *   services/      -> may import from: shared/, services/
 *   design-system/ -> may import from: shared/, design-system/
 *   entrypoints/   -> may import from: shared/, services/, design-system/, entrypoints/
 *
 * See catalog/architecture/software-architecture.md for rationale.
 * See catalog/decisions/architecture/architecture-principles.md for provenance.
 *
 * Violations fail the test with a specific file:line reference so the
 * offending site can be fixed directly.
 */

type Layer = 'shared' | 'services' | 'design-system' | 'entrypoints'

const LAYER_ALLOWED: Record<Layer, Layer[]> = {
  shared: ['shared'],
  services: ['shared', 'services'],
  'design-system': ['shared', 'design-system'],
  entrypoints: ['shared', 'services', 'design-system', 'entrypoints'],
}

const SRC_ROOT = join(process.cwd(), 'src')

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(fullPath)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield fullPath
    }
  }
}

function getLayer(absolutePath: string): Layer | null {
  const rel = relative(SRC_ROOT, absolutePath)
  const top = rel.split('/')[0]
  if (
    top === 'shared' ||
    top === 'services' ||
    top === 'design-system' ||
    top === 'entrypoints'
  ) {
    return top
  }
  return null
}

interface ParsedImport {
  line: number
  source: string
}

function parseImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = []
  const lines = content.split('\n')
  const importPattern = /\bfrom\s+['"]([^'"]+)['"]/
  // Type-only imports (`import type ... from`) are erased at compile time
  // and carry no runtime coupling — they describe shape, not behavior —
  // so they are excluded from the dependency rule.
  const typeOnlyPattern = /^\s*import\s+type\b/
  for (let i = 0; i < lines.length; i++) {
    if (typeOnlyPattern.test(lines[i])) continue
    const match = lines[i].match(importPattern)
    if (match) {
      imports.push({ line: i + 1, source: match[1] })
    }
  }
  return imports
}

/**
 * Resolve a relative import from `fromFile` to an absolute path within src/.
 * Returns null for external packages or non-src imports.
 */
function resolveImport(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null
  const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'))
  const parts = fromDir.split('/')
  const importParts = importPath.split('/')
  for (const part of importParts) {
    if (part === '.') continue
    if (part === '..') {
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return parts.join('/')
}

function getImportedLayer(fromFile: string, importPath: string): Layer | null {
  const resolved = resolveImport(fromFile, importPath)
  if (!resolved) return null
  if (!resolved.startsWith(SRC_ROOT)) return null
  return getLayer(resolved)
}

interface Violation {
  file: string
  line: number
  fromLayer: Layer
  toLayer: Layer
  importPath: string
}

async function findViolations(): Promise<Violation[]> {
  const violations: Violation[] = []
  for await (const file of walk(SRC_ROOT)) {
    const fromLayer = getLayer(file)
    if (!fromLayer) continue
    const content = await readFile(file, 'utf-8')
    const imports = parseImports(content)
    for (const imp of imports) {
      const toLayer = getImportedLayer(file, imp.source)
      if (!toLayer) continue
      if (!LAYER_ALLOWED[fromLayer].includes(toLayer)) {
        violations.push({
          file: relative(process.cwd(), file),
          line: imp.line,
          fromLayer,
          toLayer,
          importPath: imp.source,
        })
      }
    }
  }
  return violations
}

describe('dependency rule (P2)', () => {
  it('shared/ imports only from shared/', async () => {
    const violations = (await findViolations()).filter(
      (v) => v.fromLayer === 'shared',
    )
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — shared/ imports from ${v.toLayer}/: ${v.importPath}`,
        )
        .join('\n')
      throw new Error(`shared/ dependency rule violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })

  it('services/ imports only from shared/ or services/', async () => {
    const violations = (await findViolations()).filter(
      (v) => v.fromLayer === 'services',
    )
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — services/ imports from ${v.toLayer}/: ${v.importPath}`,
        )
        .join('\n')
      throw new Error(`services/ dependency rule violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })

  it('design-system/ imports only from shared/ or design-system/', async () => {
    const violations = (await findViolations()).filter(
      (v) => v.fromLayer === 'design-system',
    )
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — design-system/ imports from ${v.toLayer}/: ${v.importPath}`,
        )
        .join('\n')
      throw new Error(`design-system/ dependency rule violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })
})
