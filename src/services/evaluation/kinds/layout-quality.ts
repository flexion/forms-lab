import type { DataCollectionSpec } from '../../data-collection'
import type { FormSpec } from '../../forms'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'

export interface LayoutQualityOutput {
  spec: DataCollectionSpec
  formSpec: FormSpec
}

export interface LayoutJudgeResponse {
  scores: Record<string, { score: number; rationale: string }>
}

export interface LayoutJudge {
  judge(
    spec: DataCollectionSpec,
    formSpec: FormSpec,
  ): Promise<LayoutJudgeResponse>
}

const DIMENSIONS = [
  'pageSizing',
  'topicCohesion',
  'logicalProgression',
  'conditionalUse',
  'titleClarity',
  'deliveryModeChoice',
] as const

/**
 * Create a layout quality evaluation kind with the given judge.
 *
 * Follows the same factory pattern as `createLlmJudgeKind` —
 * the judge is injected at construction, not via mutable state.
 */
export function createLayoutQualityKind(
  judge: LayoutJudge,
): EvaluationKind<LayoutQualityOutput, undefined> {
  return {
    id: 'layout-quality',
    description:
      'Evaluates FormSpec layout quality using LLM-as-judge against a civic tech best practices rubric',

    async score(output: LayoutQualityOutput): Promise<CaseMetrics> {
      const response = await judge.judge(output.spec, output.formSpec)

      const metrics: Record<string, number> = {}
      let total = 0
      let count = 0

      for (const dim of DIMENSIONS) {
        const entry = response.scores[dim]
        if (entry) {
          const normalized = (entry.score - 1) / 4 // 1-5 → 0-1
          metrics[dim] = normalized
          total += normalized
          count++
        }
      }

      metrics.overall = count > 0 ? total / count : 0

      return {
        fixture: '',
        metrics,
        details: {
          rawScores: response.scores,
          pageCount: output.formSpec.pages.length,
          fieldCount: output.spec.groups.reduce(
            (sum, g) => sum + g.requirements.length,
            0,
          ),
          groupCount: output.spec.groups.length,
        },
      }
    },

    summarize(cases: CaseMetrics[]): SummaryMetrics {
      if (cases.length === 0) return { metrics: {} }

      const metricKeys = new Set<string>()
      for (const c of cases) {
        for (const key of Object.keys(c.metrics)) metricKeys.add(key)
      }

      const metrics: Record<string, number> = {}
      for (const key of metricKeys) {
        let sum = 0
        let count = 0
        for (const c of cases) {
          if (key in c.metrics) {
            sum += c.metrics[key]
            count++
          }
        }
        metrics[key] = count > 0 ? sum / count : 0
      }

      return { metrics }
    },
  }
}
