import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DataCollectionSpec } from '../../../services/data-collection'
import {
  type ExtractionOutput,
  pdfFieldExtractionKind,
} from '../../../services/evaluation'
import { HAIKU_MODEL_ID, SONNET_MODEL_ID } from '../../../services/extraction'
import {
  type AuthoringStageConfig,
  createAuthoringPipeline,
} from '../../../services/form-authoring'
import type { Command } from '../../../services/forms'
import {
  createFormProjectRepo,
  createProjectService,
} from '../../../services/projects'
import { loadPolicyCorpus } from '../../../services/rag'
import { createProjectStore } from '../../../services/storage'

interface VariantConfig {
  id: string
  name: string
  config: AuthoringStageConfig
}

const VARIANTS: VariantConfig[] = [
  {
    id: 'all-sonnet',
    name: 'All Sonnet 4',
    config: {
      criteria: { modelId: SONNET_MODEL_ID },
      structure: { modelId: SONNET_MODEL_ID },
      generation: { modelId: SONNET_MODEL_ID },
      evaluation: { modelId: HAIKU_MODEL_ID },
    },
  },
  {
    id: 'haiku-generation',
    name: 'Sonnet criteria+structure, Haiku generation',
    config: {
      criteria: { modelId: SONNET_MODEL_ID },
      structure: { modelId: SONNET_MODEL_ID },
      generation: { modelId: HAIKU_MODEL_ID },
      evaluation: { modelId: HAIKU_MODEL_ID },
    },
  },
  {
    id: 'all-haiku',
    name: 'All Haiku 4.5',
    config: {
      criteria: { modelId: HAIKU_MODEL_ID },
      structure: { modelId: HAIKU_MODEL_ID },
      generation: { modelId: HAIKU_MODEL_ID },
      evaluation: { modelId: HAIKU_MODEL_ID },
    },
  },
]

export async function evaluateAuthoring(args: string[]): Promise<number> {
  const variantId = args[0]
  const outDir = args.includes('--out-dir')
    ? args[args.indexOf('--out-dir') + 1]
    : join(tmpdir(), `authoring-eval-${Date.now()}`)

  if (!variantId || variantId === '--help') {
    console.log(
      'Usage: bun run cli evaluate authoring <variant-id> [--out-dir <path>]',
    )
    console.log('\nVariants:')
    for (const v of VARIANTS) {
      console.log(`  ${v.id.padEnd(20)} ${v.name}`)
    }
    console.log('\n  compare              Run all variants and compare')
    return variantId === '--help' ? 0 : 1
  }

  if (variantId === 'compare') {
    return runComparison(outDir)
  }

  const variant = VARIANTS.find((v) => v.id === variantId)
  if (!variant) {
    console.error(`Unknown variant: ${variantId}`)
    console.log('Available:', VARIANTS.map((v) => v.id).join(', '))
    return 1
  }

  const result = await runSingleVariant(variant)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    join(outDir, `${variant.id}.json`),
    JSON.stringify(result, null, 2),
  )
  console.log(`\nResults written to ${outDir}/${variant.id}.json`)
  return 0
}

async function runComparison(outDir: string): Promise<number> {
  mkdirSync(outDir, { recursive: true })
  console.log('Running authoring pipeline evaluation comparison')
  console.log('='.repeat(60))

  const results: Array<{
    variant: string
    metrics: Record<string, number>
    duration: number
  }> = []

  for (const variant of VARIANTS) {
    const result = await runSingleVariant(variant)
    results.push({
      variant: variant.id,
      metrics: result.metrics,
      duration: result.durationMs,
    })
    writeFileSync(
      join(outDir, `${variant.id}.json`),
      JSON.stringify(result, null, 2),
    )
  }

  // Print comparison table
  console.log('\n' + '='.repeat(60))
  console.log('COMPARISON')
  console.log('='.repeat(60))
  console.log(
    'Variant'.padEnd(25) +
      'Recall'.padEnd(10) +
      'Precision'.padEnd(12) +
      'TypeAcc'.padEnd(10) +
      'Duration',
  )
  console.log('-'.repeat(60))
  for (const r of results) {
    console.log(
      r.variant.padEnd(25) +
        `${(r.metrics.fieldRecall * 100).toFixed(1)}%`.padEnd(10) +
        `${(r.metrics.fieldPrecision * 100).toFixed(1)}%`.padEnd(12) +
        `${(r.metrics.typeAccuracy * 100).toFixed(1)}%`.padEnd(10) +
        `${(r.duration / 1000).toFixed(1)}s`,
    )
  }

  writeFileSync(
    join(outDir, 'comparison.json'),
    JSON.stringify(results, null, 2),
  )
  console.log(`\nAll results written to ${outDir}/`)
  return 0
}

interface EvalResult {
  variant: string
  variantName: string
  metrics: Record<string, number>
  durationMs: number
  fieldCount: number
  groupCount: number
  pageCount: number
  spec: DataCollectionSpec | null
}

async function runSingleVariant(variant: VariantConfig): Promise<EvalResult> {
  console.log(`\n--- ${variant.name} (${variant.id}) ---`)
  const start = Date.now()

  // Load ground truth
  const groundTruth = JSON.parse(
    readFileSync('fixtures/snap-wisconsin/ground-truth.json', 'utf-8'),
  ) as DataCollectionSpec

  // Set up a temporary project to run the pipeline
  const tempDir = join(tmpdir(), `authoring-eval-${variant.id}-${Date.now()}`)
  mkdirSync(join(tempDir, 'repos'), { recursive: true })
  const store = createProjectStore(join(tempDir, 'projects.db'))
  const repo = createFormProjectRepo(join(tempDir, 'repos'))
  const service = createProjectService(store, repo, {
    resolveExtractor: () => {
      throw new Error('no extractor')
    },
    resolveVariant: () => ({ variantId: variant.id, modelId: 'eval' }),
  })

  const user = { login: 'eval', name: 'Evaluator', avatarUrl: '' }
  const project = await service.createEmptyProject('SNAP Eval', user)
  const branch = 'import'

  // Run the pipeline
  const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
  const pipeline = createAuthoringPipeline(variant.config)

  // Step 1: Criteria
  console.log('  Analyzing criteria...')
  const criteria = await pipeline.analyzeCriteria(corpus)
  console.log(`  ${criteria.length} criteria`)

  // Step 2: Structure
  console.log('  Generating structure...')
  const structResult = await pipeline.planStructure(criteria, corpus, null)
  const pageCommands = structResult.commands.filter((c) => c.kind === 'addPage')
  console.log(`  ${pageCommands.length} pages`)

  if (pageCommands.length > 0) {
    const r = await service.executeCommands(
      'eval',
      project.slug,
      pageCommands,
      'Pages',
      'llm',
      user,
      { branch },
    )
    if (!r.ok) {
      console.error('  Page save failed:', r.error)
    }
  }

  // Step 3: Groups
  const view2 = await service.getProject('eval', project.slug, user, branch)
  if (view2.formSpec) {
    const emptyPages = view2.formSpec.pages.filter((p) => p.groups.length === 0)
    if (emptyPages.length > 0) {
      const groupCommands = emptyPages.map((p) => ({
        kind: 'addGroup' as const,
        pageId: p.id,
        title: p.title,
      }))
      await service.executeCommands(
        'eval',
        project.slug,
        groupCommands,
        'Groups',
        'llm',
        user,
        { branch },
      )
      console.log(`  ${groupCommands.length} groups`)
    }
  }

  // Step 4: Fields
  const view3 = await service.getProject('eval', project.slug, user, branch)
  let totalFields = 0
  if (view3.spec) {
    const groups = view3.spec.groups.filter((g) => g.requirements.length === 0)
    for (const group of groups) {
      process.stdout.write(`  Fields: ${group.title}...`)
      const result = await pipeline.generateSection(
        group.id,
        group.title,
        criteria,
        corpus,
      )
      if (result.commands.length > 0) {
        const r = await service.executeCommands(
          'eval',
          project.slug,
          result.commands,
          result.explanation,
          'llm',
          user,
          { branch },
        )
        if (r.ok) {
          const fields = result.commands.filter(
            (c: Command) => c.kind === 'addField',
          ).length
          totalFields += fields
          console.log(` ${fields} fields`)
        } else {
          console.log(` FAILED: ${r.error}`)
        }
      } else {
        console.log(' 0 fields')
      }
    }
  }

  // Get final state and score
  const finalView = await service.getProject('eval', project.slug, user, branch)
  const duration = Date.now() - start

  if (!finalView.spec) {
    console.log('  No spec produced!')
    return {
      variant: variant.id,
      variantName: variant.name,
      metrics: { fieldRecall: 0, fieldPrecision: 0, typeAccuracy: 0 },
      durationMs: duration,
      fieldCount: 0,
      groupCount: 0,
      pageCount: 0,
      spec: null,
    }
  }

  // Score against ground truth
  const output: ExtractionOutput = {
    spec: finalView.spec as DataCollectionSpec,
    confidence: [],
  }
  const caseResult = await pdfFieldExtractionKind.score(output, groundTruth)

  console.log(`\n  Results:`)
  console.log(`    Pages: ${finalView.formSpec?.pages.length ?? 0}`)
  console.log(`    Groups: ${finalView.spec.groups.length}`)
  console.log(`    Fields: ${totalFields}`)
  console.log(
    `    Field Recall: ${(caseResult.metrics.fieldRecall * 100).toFixed(1)}%`,
  )
  console.log(
    `    Field Precision: ${(caseResult.metrics.fieldPrecision * 100).toFixed(1)}%`,
  )
  console.log(
    `    Type Accuracy: ${(caseResult.metrics.typeAccuracy * 100).toFixed(1)}%`,
  )
  console.log(`    Duration: ${(duration / 1000).toFixed(1)}s`)

  // Cleanup
  const { rmSync } = require('node:fs')
  rmSync(tempDir, { recursive: true, force: true })

  return {
    variant: variant.id,
    variantName: variant.name,
    metrics: caseResult.metrics,
    durationMs: duration,
    fieldCount: totalFields,
    groupCount: finalView.spec.groups.length,
    pageCount: finalView.formSpec?.pages.length ?? 0,
    spec: finalView.spec as DataCollectionSpec,
  }
}
