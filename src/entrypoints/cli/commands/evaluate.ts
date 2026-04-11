import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runEvaluation } from '../../../services/evaluation/harness'
import { pdfFieldExtractionKind } from '../../../services/evaluation/kinds/pdf-field-extraction'
import { evaluationRunSchema } from '../../../services/evaluation/schemas'
import { createExtractorRegistry } from '../../../services/extraction/registry'
import {
  createCachedPdfExtractor,
} from '../../../services/ingestion/pdf-extractor'
import { createCacheStore } from '../../../services/storage'

function printUsage(): void {
  console.log('Usage: bun run cli evaluate <subcommand>\n')
  console.log('Subcommands:')
  console.log('  strategies             List registered extraction strategies')
  console.log(
    '  ground-truth <slug>    Generate ground truth for a fixture using Opus',
  )
  console.log('  run <strategy-id>      Run a strategy against the test suite')
  console.log(
    '  compare                Run all strategies and produce comparison',
  )
  console.log(
    '  validate               Validate all fixtures and evaluation files',
  )
}

export async function evaluate(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'strategies': {
      const registry = createExtractorRegistry()
      const strategies = registry.list()
      console.log(`${strategies.length} registered strategies:\n`)
      for (const s of strategies) {
        const defaultTag = s.id === registry.getDefaultId() ? ' (default)' : ''
        console.log(`  ${s.id.padEnd(20)} [${s.metadata.status}]${defaultTag}`)
        console.log(`    ${s.metadata.description}`)
        console.log(`    Topics: ${s.metadata.courseTopics.join(', ')}`)
        console.log()
      }
      return 0
    }

    case 'ground-truth': {
      const slug = args[1]
      if (!slug) {
        console.error('Usage: evaluate ground-truth <fixture-slug>')
        return 1
      }

      const { loadFixtureForEvaluation } = await import('../../../../fixtures/index')
      const fixture = loadFixtureForEvaluation(slug)
      if (!fixture) {
        console.error(`Unknown fixture: ${slug}`)
        return 1
      }

      console.log(`Generating ground truth for: ${fixture.name}`)
      console.log('Using Opus as reference model...')

      const registry = createExtractorRegistry()
      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      mkdirSync('data', { recursive: true })
      const cacheStore = createCacheStore(cacheDbPath)
      const extractor = createCachedPdfExtractor(
        registry.get('opus-baseline'),
        cacheStore,
      )

      const start = Date.now()
      const result = await extractor.extract(fixture.pdf)
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)

      const gtPath = join('fixtures', slug, 'ground-truth.json')
      writeFileSync(gtPath, JSON.stringify(result.spec, null, 2))
      console.log(`\nGround truth written to ${gtPath} (${elapsed}s)`)
      console.log(`  Groups: ${result.spec.groups.length}`)
      const fieldCount = result.spec.groups.reduce(
        (sum, g) => sum + g.requirements.length,
        0,
      )
      console.log(`  Fields: ${fieldCount}`)

      // Update manifest
      const manifestPath = join('fixtures', slug, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      manifest.reviewed = false
      manifest.notes = `Opus extraction generated ${new Date().toISOString()}. Needs review.`
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
      console.log(
        'Manifest updated. Review ground-truth.json and set reviewed: true.',
      )

      return 0
    }

    case 'run': {
      const strategyId = args[1]
      if (!strategyId) {
        console.error('Usage: evaluate run <strategy-id>')
        return 1
      }

      const { loadAllFixturesForEvaluation } = await import(
        '../../../../fixtures/index'
      )
      const fixtures = loadAllFixturesForEvaluation()
      const withGT = fixtures.filter((f) => f.groundTruth !== undefined)

      if (withGT.length === 0) {
        console.error(
          'No fixtures with ground truth. Run: bun run cli evaluate ground-truth <slug>',
        )
        return 1
      }

      const registry = createExtractorRegistry()
      const strategyMeta = registry.list().find((s) => s.id === strategyId)
      if (!strategyMeta) {
        console.error(`Unknown strategy: ${strategyId}`)
        console.error(
          'Available:',
          registry
            .list()
            .map((s) => s.id)
            .join(', '),
        )
        return 1
      }

      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      mkdirSync('data', { recursive: true })
      const cacheStore = createCacheStore(cacheDbPath)
      const extractor = createCachedPdfExtractor(
        registry.get(strategyId),
        cacheStore,
      )

      console.log(`Running evaluation: ${strategyMeta.metadata.name}`)
      console.log(`Fixtures: ${withGT.length}`)

      const manifest = withGT[0].manifest
      const start = Date.now()
      const result = await runEvaluation({
        kind: pdfFieldExtractionKind,
        extractor,
        fixtures: withGT
          .filter(
            (
              f,
            ): f is typeof f & {
              groundTruth: NonNullable<typeof f.groundTruth>
            } => f.groundTruth !== undefined,
          )
          .map((f) => ({
            slug: f.slug,
            pdf: f.pdf,
            groundTruth: f.groundTruth,
          })),
        implementation: strategyId,
        specVersion: manifest.specVersion,
        model: strategyMeta.metadata.name,
      })
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)

      // Validate result
      evaluationRunSchema.parse(result)

      // Write results
      const outDir = join('catalog', 'experiments', 'pdf-field-extraction')
      mkdirSync(outDir, { recursive: true })

      const jsonPath = join(outDir, `${strategyId}.json`)
      writeFileSync(jsonPath, JSON.stringify(result, null, 2))

      const md = generateRunMarkdown(strategyId, strategyMeta.metadata, result)
      const mdPath = join(outDir, `${strategyId}.md`)
      writeFileSync(mdPath, md)

      console.log(`\nEvaluation complete (${elapsed}s)`)
      console.log('Summary:')
      for (const [key, value] of Object.entries(result.summary)) {
        console.log(`  ${key}: ${(value * 100).toFixed(1)}%`)
      }
      console.log(`\nResults written to ${outDir}/`)

      return 0
    }

    case 'compare': {
      const registry = createExtractorRegistry()
      const strategies = registry.list()

      console.log('Running all strategies...\n')
      for (const s of strategies) {
        console.log(`--- ${s.metadata.name} ---`)
        await evaluate(['run', s.id])
        console.log()
      }

      return 0
    }

    case 'validate': {
      const { loadAllFixturesForEvaluation } = await import(
        '../../../../fixtures/index'
      )
      const fixtures = loadAllFixturesForEvaluation()

      let errors = 0
      for (const f of fixtures) {
        console.log(`Fixture: ${f.slug}`)
        console.log(`  Manifest: valid`)
        if (f.groundTruth) {
          console.log(`  Ground truth: present`)
        } else {
          console.log(`  Ground truth: missing`)
        }
        if (!f.manifest.reviewed) {
          console.log(`  Warning: not reviewed`)
          errors++
        }
      }

      return errors > 0 ? 1 : 0
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}

function generateRunMarkdown(
  strategyId: string,
  metadata: { name: string; status: string; courseTopics: string[] },
  result: {
    summary: Record<string, number>
    cases: Array<{
      fixture: string
      metrics: Record<string, number>
      details: Record<string, unknown>
    }>
  },
): string {
  const lines: string[] = []
  lines.push('---')
  lines.push(`kind: pdf-field-extraction`)
  lines.push(`implementation: ${strategyId}`)
  lines.push(`status: current`)
  lines.push(`course-topics: [${metadata.courseTopics.join(', ')}]`)
  lines.push('---')
  lines.push('')
  lines.push(`# PDF Field Extraction: ${metadata.name}`)
  lines.push('')
  lines.push(`**Status:** ${metadata.status}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  for (const [key, value] of Object.entries(result.summary)) {
    const name = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
    lines.push(`| ${name} | ${(value * 100).toFixed(1)}% |`)
  }
  lines.push('')

  for (const c of result.cases) {
    lines.push(`## ${c.fixture}`)
    lines.push('')
    const details = c.details as Record<string, unknown>
    if (details.matched)
      lines.push(`- Matched: ${(details.matched as string[]).length} fields`)
    if (details.missed)
      lines.push(
        `- Missed: ${(details.missed as string[]).join(', ') || 'none'}`,
      )
    if (details.extra)
      lines.push(`- Extra: ${(details.extra as string[]).join(', ') || 'none'}`)
    lines.push('')
  }

  return lines.join('\n')
}
