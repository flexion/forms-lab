import type { DataCollectionSpec } from '../../data-collection/types'
import type { FieldJudge } from '../judge'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'
import {
  calculateMetrics,
  type ExtractionOutput,
  flattenFields,
} from './shared'

export function createLlmJudgeKind(
  judge: FieldJudge,
): EvaluationKind<ExtractionOutput, DataCollectionSpec> {
  return {
    id: 'pdf-field-extraction-llm-judge',
    description:
      'Evaluates PDF field extraction accuracy using LLM semantic matching',

    async score(
      output: ExtractionOutput,
      groundTruth: DataCollectionSpec,
    ): Promise<CaseMetrics> {
      const extractedFields = flattenFields(output.spec)
      const groundTruthFields = flattenFields(groundTruth)

      const judgeResult = await judge.judge(extractedFields, groundTruthFields)

      const gtIndex = new Map<string, number>()
      for (let i = 0; i < groundTruthFields.length; i++) {
        gtIndex.set(groundTruthFields[i].requirement.fieldName, i)
      }
      const exIndex = new Map<string, number>()
      for (let i = 0; i < extractedFields.length; i++) {
        exIndex.set(extractedFields[i].requirement.fieldName, i)
      }

      const matches = new Map<number, number>()
      const validJudgeMatches = []
      for (const m of judgeResult.matches) {
        const gtIdx = gtIndex.get(m.groundTruthFieldName)
        const exIdx = exIndex.get(m.extractedFieldName)
        if (gtIdx !== undefined && exIdx !== undefined) {
          matches.set(gtIdx, exIdx)
          validJudgeMatches.push(m)
        }
      }

      const { metrics, details } = calculateMetrics(
        groundTruthFields,
        extractedFields,
        matches,
      )

      return {
        fixture: '',
        metrics,
        details: {
          ...details,
          judgeMatches: validJudgeMatches,
          scorer: 'llm-judge',
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
