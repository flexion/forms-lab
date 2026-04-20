#!/usr/bin/env bun
/**
 * Smoke-eval one extraction variant against only the W-9 fixture.
 *
 * Used for breadth experiments where the goal is "have data for the
 * catalog", not "a full comparison suite run". Writes {variant}.json and
 * {variant}.md into catalog/experiments/pdf-field-extraction/.
 *
 * Usage: bun run scripts/eval-variant-w9.ts <variant-id>
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadAllFixturesForEvaluation } from '../fixtures/index'
import {
  evaluationRunSchema,
  pdfFieldExtractionKind,
  runEvaluation,
} from '../src/services/evaluation'
import { createExtractorRegistry } from '../src/services/extraction'
import { createCachedPdfExtractor } from '../src/services/form-documents'
import { createCacheStore } from '../src/services/storage'

const variantId = process.argv[2]
if (!variantId) {
  console.error('Usage: bun run scripts/eval-variant-w9.ts <variant-id>')
  process.exit(1)
}

const registry = createExtractorRegistry()
const strategyMeta = registry.list().find((s) => s.id === variantId)
if (!strategyMeta) {
  console.error(`Unknown variant: ${variantId}`)
  console.error(
    'Available:',
    registry
      .list()
      .map((s) => s.id)
      .join(', '),
  )
  process.exit(1)
}

const fixtures = loadAllFixturesForEvaluation().filter(
  (f) => f.slug === 'w-9' && f.groundTruth !== undefined,
)
if (fixtures.length === 0) {
  console.error('W-9 fixture not found or missing ground truth')
  process.exit(1)
}

const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
mkdirSync('data', { recursive: true })
const cacheStore = createCacheStore(cacheDbPath)
const extractor = createCachedPdfExtractor(
  registry.get(variantId),
  cacheStore,
  strategyMeta.metadata.modelId,
  variantId,
)

console.log(`Smoke-eval: ${strategyMeta.metadata.name}`)
console.log('Fixture: w-9 only')

const manifest = fixtures[0].manifest
const start = Date.now()
try {
  const result = await runEvaluation({
    kind: pdfFieldExtractionKind,
    extractor,
    fixtures: fixtures
      .filter(
        (
          f,
        ): f is typeof f & { groundTruth: NonNullable<typeof f.groundTruth> } =>
          f.groundTruth !== undefined,
      )
      .map((f) => ({ slug: f.slug, pdf: f.pdf, groundTruth: f.groundTruth })),
    implementation: variantId,
    specVersion: manifest.specVersion,
    model: strategyMeta.metadata.name,
  })
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  evaluationRunSchema.parse(result)

  const outDir = join('catalog', 'experiments', 'pdf-field-extraction')
  mkdirSync(outDir, { recursive: true })
  const jsonPath = join(outDir, `${variantId}.json`)
  writeFileSync(jsonPath, JSON.stringify(result, null, 2))

  console.log(`\nSmoke-eval complete (${elapsed}s)`)
  console.log('Summary:')
  for (const [key, value] of Object.entries(result.summary)) {
    console.log(`  ${key}: ${(value * 100).toFixed(1)}%`)
  }
  console.log(`\nJSON written to ${jsonPath}`)
  process.exit(0)
} catch (err) {
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.error(`\nSmoke-eval failed after ${elapsed}s`)
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`)
    if (err.cause) {
      console.error(`Cause: ${JSON.stringify(err.cause, null, 2)}`)
    }
  }
  process.exit(1)
}
