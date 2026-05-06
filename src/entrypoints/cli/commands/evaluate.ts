import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  evaluationRunSchema,
  fixtureProjectState,
  pdfFieldExtractionKind,
  type RunResult,
  runEvaluation,
  shapingCommandsKind,
  shapingIntentFixtures,
} from '../../../services/evaluation'
import { createExtractorRegistry } from '../../../services/extraction'
import { createCachedPdfExtractor } from '../../../services/form-documents'
import type { FormShaper } from '../../../services/forms'
import { createCacheStore } from '../../../services/storage'
import type {
  StrategyMetadata,
  StrategyRegistry,
} from '../../../shared/strategy-registry'

export interface EvaluateOptions {
  /**
   * Override the shaping registry used by the `shaping` subcommand. Tests
   * pass a mock registry to avoid reaching Bedrock and to avoid polluting
   * `bun:test`'s process-global `mock.module` state, which would leak into
   * other test files that import the real registry.
   */
  shapingRegistry?: StrategyRegistry<FormShaper>
}

function printUsage(): void {
  console.log('Usage: bun run cli evaluate <subcommand>\n')
  console.log('Subcommands:')
  console.log('  strategies             List registered extraction strategies')
  console.log(
    '  ground-truth <slug>    Generate ground truth (default: Opus, --strategy <id> to override)',
  )
  console.log('  run <strategy-id>      Run a strategy against the test suite')
  console.log(
    '    --scorer <type>      Scoring method: deterministic (default) or llm-judge',
  )
  console.log(
    '  compare                Run all strategies and produce comparison',
  )
  console.log(
    '  validate               Validate all fixtures and evaluation files',
  )
  console.log(
    '  shaping <variant-id>   Run a shaping variant against the scripted intent suite',
  )
  console.log(
    '    --out-dir <path>     Override catalog output dir (for tests)',
  )
  console.log(
    '  layout <strategy-id>   Evaluate layout quality of FormSpec output',
  )
  console.log(
    '    --out-dir <path>     Override catalog output dir (for tests)',
  )
}

export async function evaluate(
  args: string[],
  options: EvaluateOptions = {},
): Promise<number> {
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
        console.error(
          'Usage: evaluate ground-truth <fixture-slug> [--strategy <id>]',
        )
        return 1
      }

      const strategyIdx = args.indexOf('--strategy')
      const strategyId =
        strategyIdx !== -1 && args[strategyIdx + 1]
          ? args[strategyIdx + 1]
          : 'opus-baseline'

      const { loadFixtureForEvaluation } = await import(
        '../../../../fixtures/index'
      )
      const fixture = loadFixtureForEvaluation(slug)
      if (!fixture) {
        console.error(`Unknown fixture: ${slug}`)
        return 1
      }

      const registry = createExtractorRegistry()
      const strategyMeta = registry.list().find((s) => s.id === strategyId)
      if (!strategyMeta) {
        console.error(`Unknown strategy: ${strategyId}`)
        return 1
      }

      console.log(`Generating ground truth for: ${fixture.name}`)
      console.log(`Using ${strategyMeta.metadata.name} as reference model...`)

      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      mkdirSync('data', { recursive: true })
      const cacheStore = createCacheStore(cacheDbPath)
      const extractor = createCachedPdfExtractor(
        registry.get(strategyId),
        cacheStore,
        strategyMeta.metadata.modelId,
        strategyId,
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
      manifest.groundTruthModel = strategyId
      manifest.reviewed = false
      manifest.notes = `${strategyMeta.metadata.name} extraction generated ${new Date().toISOString()}. Needs review.`
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

      const scorerIdx = args.indexOf('--scorer')
      const scorerType =
        scorerIdx !== -1 && args[scorerIdx + 1]
          ? args[scorerIdx + 1]
          : 'deterministic'

      if (scorerType !== 'deterministic' && scorerType !== 'llm-judge') {
        console.error(
          'Invalid scorer. Use: --scorer deterministic (default) or --scorer llm-judge',
        )
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
        strategyMeta.metadata.modelId,
        strategyId,
      )

      let kind = pdfFieldExtractionKind
      if (scorerType === 'llm-judge') {
        const { createBedrockFieldJudge } = await import(
          '../../../services/evaluation'
        )
        const { createLlmJudgeKind } = await import(
          '../../../services/evaluation'
        )
        const { OPUS_MODEL_ID } = await import('../../../services/extraction')
        const judge = createBedrockFieldJudge(OPUS_MODEL_ID)
        kind = createLlmJudgeKind(judge)
        console.log('Using LLM judge (Opus) for semantic field matching')
      }

      console.log(`Running evaluation: ${strategyMeta.metadata.name}`)
      console.log(`Fixtures: ${withGT.length}`)

      const manifest = withGT[0].manifest
      const start = Date.now()
      const result = await runEvaluation({
        kind: kind,
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
      const scorerArgs = args.filter(
        (a, i) => a === '--scorer' || (i > 0 && args[i - 1] === '--scorer'),
      )

      console.log('Running all strategies...\n')
      for (const s of strategies) {
        console.log(`--- ${s.metadata.name} ---`)
        await evaluate(['run', s.id, ...scorerArgs])
        console.log()
      }

      return 0
    }

    case 'shaping': {
      const variantId = args[1]
      if (!variantId) {
        console.error('Usage: evaluate shaping <variant-id> [--out-dir <path>]')
        return 1
      }

      const outDirIdx = args.indexOf('--out-dir')
      const outDir =
        outDirIdx !== -1 && args[outDirIdx + 1]
          ? args[outDirIdx + 1]
          : join('catalog', 'experiments', 'shaping-model-comparison')

      let registry: StrategyRegistry<FormShaper>
      if (options.shapingRegistry) {
        registry = options.shapingRegistry
      } else {
        const { createShapingRegistry } = await import(
          '../../../services/forms'
        )
        registry = createShapingRegistry()
      }
      const variantMeta = registry.list().find((v) => v.id === variantId)
      if (!variantMeta) {
        console.error(`Unknown shaping variant: ${variantId}`)
        console.error(
          'Available:',
          registry
            .list()
            .map((v) => v.id)
            .join(', '),
        )
        return 1
      }

      const shaper = registry.get(variantId)
      console.log(`Running shaping evaluation: ${variantMeta.metadata.name}`)
      console.log(`Intents: ${shapingIntentFixtures.length}`)

      const start = Date.now()
      const cases: RunResult['cases'] = []
      for (const fixture of shapingIntentFixtures) {
        try {
          const result = await shaper.shape({
            intent: fixture.intent,
            state: fixtureProjectState,
          })
          const caseMetrics = await shapingCommandsKind.score(
            { commands: result.commands, explanation: result.explanation },
            fixture.groundTruth,
          )
          cases.push({
            fixture: fixture.id,
            metrics: caseMetrics.metrics,
            details: caseMetrics.details,
          })
          console.log(
            `  ${fixture.id}: recall=${(caseMetrics.metrics.kindRecall * 100).toFixed(0)}% precision=${(caseMetrics.metrics.kindPrecision * 100).toFixed(0)}% arg=${(caseMetrics.metrics.argumentAccuracy * 100).toFixed(0)}%`,
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          cases.push({
            fixture: fixture.id,
            metrics: {
              kindRecall: 0,
              kindPrecision: 0,
              argumentAccuracy: 0,
            },
            details: { error: message },
          })
          console.log(`  ${fixture.id}: FAILED — ${message}`)
        }
      }

      const summary = shapingCommandsKind.summarize(cases)
      const result: RunResult = {
        kind: shapingCommandsKind.id,
        implementation: variantId,
        specVersion: '2026-04-19',
        status: 'current',
        timestamp: new Date().toISOString(),
        model: variantMeta.metadata.name,
        summary: summary.metrics,
        cases,
      }
      evaluationRunSchema.parse(result)

      mkdirSync(outDir, { recursive: true })
      const jsonPath = join(outDir, `${variantId}.json`)
      writeFileSync(jsonPath, JSON.stringify(result, null, 2))

      const shortId = variantId.replace(/^bedrock-/, '')
      const md = generateShapingMarkdown(
        variantId,
        variantMeta.metadata,
        result,
      )
      const mdPath = join(outDir, `${shortId}.md`)
      writeFileSync(mdPath, md)

      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`\nEvaluation complete (${elapsed}s)`)
      console.log('Summary:')
      for (const [key, value] of Object.entries(result.summary)) {
        console.log(`  ${key}: ${(value * 100).toFixed(1)}%`)
      }
      console.log(`\nResults written to ${outDir}/`)

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

    case 'layout': {
      const strategyId = args[1]
      if (!strategyId) {
        console.error('Usage: evaluate layout <strategy-id> [--out-dir <path>]')
        return 1
      }

      const outDirIdx = args.indexOf('--out-dir')
      const outDir =
        outDirIdx !== -1 && args[outDirIdx + 1]
          ? args[outDirIdx + 1]
          : join('catalog', 'experiments', 'layout-quality')

      const { loadAllFixturesForEvaluation } = await import(
        '../../../../fixtures/index'
      )
      const fixtures = loadAllFixturesForEvaluation()
      const withGT = fixtures.filter((f) => f.groundTruth !== undefined)

      if (withGT.length === 0) {
        console.error('No fixtures with ground truth found.')
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

      const { createLayoutQualityKind, createBedrockLayoutJudge } =
        await import('../../../services/evaluation')
      const { OPUS_MODEL_ID } = await import('../../../services/extraction')

      const judge = createBedrockLayoutJudge(OPUS_MODEL_ID)
      const layoutQualityKind = createLayoutQualityKind(judge)

      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      mkdirSync('data', { recursive: true })
      const cacheStore = createCacheStore(cacheDbPath)
      const extractor = createCachedPdfExtractor(
        registry.get(strategyId),
        cacheStore,
        strategyMeta.metadata.modelId,
        strategyId,
      )

      console.log(`Running layout evaluation: ${strategyMeta.metadata.name}`)
      console.log(`Fixtures: ${withGT.length}`)

      const start = Date.now()
      const cases: RunResult['cases'] = []

      for (const fixture of withGT) {
        try {
          const result = await extractor.extract(fixture.pdf, {
            slug: fixture.slug,
          })
          const caseMetrics = await layoutQualityKind.score(
            { spec: result.spec, formSpec: result.formSpec },
            undefined,
          )
          cases.push({
            fixture: fixture.slug,
            metrics: caseMetrics.metrics,
            details: caseMetrics.details,
          })
          console.log(
            `  ${fixture.slug}: overall=${(caseMetrics.metrics.overall * 100).toFixed(0)}%`,
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          cases.push({
            fixture: fixture.slug,
            metrics: { overall: 0 },
            details: { error: message },
          })
          console.log(`  ${fixture.slug}: FAILED — ${message}`)
        }
      }

      const summary = layoutQualityKind.summarize(cases)
      const runResult: RunResult = {
        kind: layoutQualityKind.id,
        implementation: strategyId,
        specVersion: '2026-05-06',
        status: 'current',
        timestamp: new Date().toISOString(),
        model: strategyMeta.metadata.name,
        summary: summary.metrics,
        cases,
      }

      mkdirSync(outDir, { recursive: true })
      const jsonPath = join(outDir, `${strategyId}.json`)
      writeFileSync(jsonPath, JSON.stringify(runResult, null, 2))

      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`\nLayout evaluation complete (${elapsed}s)`)
      console.log('Summary:')
      for (const [key, value] of Object.entries(runResult.summary)) {
        console.log(`  ${key}: ${(value * 100).toFixed(1)}%`)
      }
      console.log(`\nResults written to ${outDir}/`)

      return 0
    }

    case 'authoring': {
      const { evaluateAuthoring } = await import('./evaluate-authoring')
      return evaluateAuthoring(args.slice(1))
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

const SHAPING_METRIC_LABELS: Record<string, string> = {
  kindRecall: 'Command-Kind Recall',
  kindPrecision: 'Command-Kind Precision',
  argumentAccuracy: 'Argument Accuracy',
}

function formatCommandList(kinds: unknown): string {
  if (!Array.isArray(kinds) || kinds.length === 0) return '—'
  return (kinds as string[]).join(', ')
}

function generateShapingMarkdown(
  variantId: string,
  metadata: StrategyMetadata,
  result: RunResult,
): string {
  const lines: string[] = []
  lines.push('---')
  lines.push('kind: shaping-commands')
  lines.push(`implementation: ${variantId}`)
  lines.push('status: current')
  lines.push('course-topics: [evaluation, model-selection]')
  lines.push('---')
  lines.push('')
  lines.push(`# Form Shaping: ${metadata.name}`)
  lines.push('')
  lines.push('> Selectable in **Settings \u2192 Variants \u2192 Shaping**.')
  lines.push('')
  lines.push(`**Status:** ${metadata.status}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  const summaryOrder = ['kindRecall', 'kindPrecision', 'argumentAccuracy']
  for (const key of summaryOrder) {
    if (key in result.summary) {
      const label = SHAPING_METRIC_LABELS[key] ?? key
      lines.push(`| ${label} | ${(result.summary[key] * 100).toFixed(1)}% |`)
    }
  }
  for (const [key, value] of Object.entries(result.summary)) {
    if (summaryOrder.includes(key)) continue
    const label = SHAPING_METRIC_LABELS[key] ?? key
    lines.push(`| ${label} | ${(value * 100).toFixed(1)}% |`)
  }
  lines.push('')
  lines.push(
    `_Run timestamp: ${result.timestamp}. Spec version: ${result.specVersion}._`,
  )
  lines.push('')
  lines.push('## Approach')
  lines.push('')
  lines.push(
    `Uses the registered shaping variant \`${variantId}\` (${metadata.name}) via \`createBedrockFormShaper\` with the standard 25-command tool-use prompt. All three variants share the same prompt and toolset; only the model differs.`,
  )
  lines.push('')
  lines.push('## Per-intent Results')
  lines.push('')
  lines.push(
    '| Intent | Recall | Precision | Arg Acc | Matched | Missing | Extra |',
  )
  lines.push('|---|---|---|---|---|---|---|')
  for (const c of result.cases) {
    const details = c.details as Record<string, unknown>
    const matched = formatCommandList(details.matchedKinds)
    const missing = formatCommandList(details.missingKinds)
    const extra = formatCommandList(details.extraKinds)
    const errorNote =
      typeof details.error === 'string' ? ` (error: ${details.error})` : ''
    lines.push(
      `| ${c.fixture}${errorNote} | ${(c.metrics.kindRecall * 100).toFixed(0)}% | ${(c.metrics.kindPrecision * 100).toFixed(0)}% | ${(c.metrics.argumentAccuracy * 100).toFixed(0)}% | ${matched} | ${missing} | ${extra} |`,
    )
  }
  lines.push('')
  lines.push('## Findings')
  lines.push('')
  lines.push(
    '_Interpretation pending — see Summary table for headline numbers._',
  )
  lines.push('')
  lines.push('## Cost')
  lines.push('')
  lines.push(
    `Bedrock on-demand pricing for ${metadata.name} (model id \`${metadata.modelId ?? 'unknown'}\`). Each scripted intent is a single short tool-calling turn; total run cost is well under $0.05 per variant at current pricing.`,
  )
  lines.push('')
  return lines.join('\n')
}
