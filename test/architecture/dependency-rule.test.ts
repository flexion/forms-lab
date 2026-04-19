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
 * Browser client files (`client.ts`) within design-system components are browser
 * entry points compiled by build-components.ts into a single browser bundle. They
 * follow entrypoint-level import rules, because at bundle time all layers are
 * included — the P2 rule governs server-side module resolution, not browser bundles.
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
  if (top === 'shared' || top === 'services' || top === 'entrypoints') {
    return top
  }
  if (top === 'design-system') {
    // Browser client files (client.ts) are entry points for the browser bundle.
    // They have entrypoint-level import permissions because build-components.ts
    // compiles them (and their transitive deps) into a single browser JS file.
    if (rel.endsWith('/client.ts')) return 'entrypoints'
    return 'design-system'
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

/**
 * Returns the service name if the file is under `src/services/<name>/...`,
 * else null. Note: files directly under `src/services/` (e.g. `storage.ts`)
 * return null — they are not inside a named service subdirectory.
 */
function getServiceName(absolutePath: string): string | null {
  const rel = relative(SRC_ROOT, absolutePath)
  const parts = rel.split('/')
  if (parts[0] !== 'services') return null
  if (parts.length < 3) return null
  return parts[1]
}

interface CrossServiceViolation {
  file: string
  line: number
  fromService: string | null
  toService: string
  importPath: string
  resolved: string
  suggestion: string
}

/**
 * Parse all imports, including type-only imports. The public-interface rule
 * treats type-only imports as just as much a part of the interface as runtime
 * imports — the concern is intent visibility, not runtime coupling alone.
 */
function parseAllImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = []
  const lines = content.split('\n')
  const importPattern = /\bfrom\s+['"]([^'"]+)['"]/
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(importPattern)
    if (match) {
      imports.push({ line: i + 1, source: match[1] })
    }
  }
  return imports
}

/**
 * Truncate the import path so it ends at `services/<toService>` — the
 * suggested replacement for a deep cross-service import.
 */
function computeSuggestion(importPath: string, toService: string): string {
  const marker = `services/${toService}`
  const idx = importPath.indexOf(marker)
  if (idx < 0) return importPath
  return importPath.slice(0, idx + marker.length)
}

async function findCrossServiceViolations(): Promise<CrossServiceViolation[]> {
  const violations: CrossServiceViolation[] = []
  for await (const file of walk(SRC_ROOT)) {
    const fromLayer = getLayer(file)
    if (!fromLayer) continue
    // shared/ importing services/ is already blocked by the P2 test;
    // skip to avoid double-reporting.
    if (fromLayer === 'shared') continue
    // design-system/ client.ts files are browser bundle entry points.
    // A service barrel re-exports server-only modules (bun:sqlite, AWS SDK,
    // etc.); when a client.ts imports from services/<B>, Bun.build()'s
    // browser target errors on those imports before tree-shaking can drop
    // them. client.ts files are already classified as entrypoint-level by
    // the P2 rule for the same physical reason, so they may deep-import
    // to narrow the browser-bundle graph to server-safe modules.
    if (file.endsWith('/client.ts')) continue
    const content = await readFile(file, 'utf-8')
    const imports = parseAllImports(content)
    for (const imp of imports) {
      const resolved = resolveImport(file, imp.source)
      if (!resolved) continue
      if (!resolved.startsWith(SRC_ROOT)) continue
      const servicesRoot = `${SRC_ROOT}/services/`
      if (!resolved.startsWith(servicesRoot)) continue

      const toService = getServiceName(resolved)
      if (!toService) continue

      const fromService = getServiceName(file)
      if (fromService === toService) continue

      const allowedRoot = `${SRC_ROOT}/services/${toService}`
      const allowedIndex = `${SRC_ROOT}/services/${toService}/index`
      if (resolved === allowedRoot || resolved === allowedIndex) continue

      violations.push({
        file: relative(process.cwd(), file),
        line: imp.line,
        fromService,
        toService,
        importPath: imp.source,
        resolved,
        suggestion: computeSuggestion(imp.source, toService),
      })
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

describe('service public interface rule', () => {
  it('forbids deep cross-service imports (importer must go through index.ts)', async () => {
    const violations = await findCrossServiceViolations()
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — deep import '${v.importPath}' from services/${v.fromService ?? '<outside services>'} into services/${v.toService}; use '${v.suggestion}' instead`,
        )
        .join('\n')
      throw new Error(`service public interface violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })
})
