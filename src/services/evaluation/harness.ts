import type { DataCollectionSpec } from '../data-collection/types'
import type { PdfExtractor } from '../form-documents/extraction'
import type { ExtractionOutput } from './kinds/pdf-field-extraction'
import type { EvaluationKind, RunResult } from './types'

export interface EvaluationFixture {
  slug: string
  pdf: Buffer
  groundTruth: DataCollectionSpec
}

export interface RunOptions {
  kind: EvaluationKind<ExtractionOutput, DataCollectionSpec>
  extractor: PdfExtractor
  fixtures: EvaluationFixture[]
  implementation: string
  specVersion: string
  model: string
}

export async function runEvaluation(options: RunOptions): Promise<RunResult> {
  const { kind, extractor, fixtures, implementation, specVersion, model } =
    options

  const cases = []
  for (const fixture of fixtures) {
    const extractionResult = await extractor.extract(fixture.pdf, {
      slug: fixture.slug,
    })
    const output: ExtractionOutput = {
      spec: extractionResult.spec,
      confidence: extractionResult.confidence,
    }
    const caseMetrics = await kind.score(output, fixture.groundTruth)
    cases.push({
      fixture: fixture.slug,
      metrics: caseMetrics.metrics,
      details: caseMetrics.details,
    })
  }

  const summary = kind.summarize(
    cases.map((c) => ({
      fixture: c.fixture,
      metrics: c.metrics,
      details: c.details,
    })),
  )

  return {
    kind: kind.id,
    implementation,
    specVersion,
    status: 'current',
    timestamp: new Date().toISOString(),
    model,
    summary: summary.metrics,
    cases,
  }
}
