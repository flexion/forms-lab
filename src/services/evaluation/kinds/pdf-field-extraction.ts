import type { DataCollectionSpec } from '../../data-collection/types'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'
import {
  calculateMetrics,
  type ExtractionOutput,
  type FlatField,
  flattenFields,
} from './shared'

export type { ExtractionOutput }

/**
 * Normalize a label for fuzzy matching:
 * - Lowercase
 * - Strip non-alphanumeric characters
 * - Collapse whitespace
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Match extracted fields to ground truth fields using two-pass approach:
 * 1. Exact fieldName match
 * 2. Normalized label match for remaining unmatched fields
 *
 * Returns a map from ground truth field index to extracted field index
 */
function matchFields(
  extracted: FlatField[],
  groundTruth: FlatField[],
): Map<number, number> {
  const matches = new Map<number, number>()
  const usedExtracted = new Set<number>()

  // Pass 1: Exact fieldName match
  for (let gtIdx = 0; gtIdx < groundTruth.length; gtIdx++) {
    const gtField = groundTruth[gtIdx]
    for (let exIdx = 0; exIdx < extracted.length; exIdx++) {
      if (usedExtracted.has(exIdx)) continue
      const exField = extracted[exIdx]
      if (gtField.requirement.fieldName === exField.requirement.fieldName) {
        matches.set(gtIdx, exIdx)
        usedExtracted.add(exIdx)
        break
      }
    }
  }

  // Pass 2: Normalized label match for remaining unmatched fields
  for (let gtIdx = 0; gtIdx < groundTruth.length; gtIdx++) {
    if (matches.has(gtIdx)) continue // Already matched
    const gtField = groundTruth[gtIdx]
    const gtNormLabel = normalizeLabel(gtField.requirement.label)

    for (let exIdx = 0; exIdx < extracted.length; exIdx++) {
      if (usedExtracted.has(exIdx)) continue
      const exField = extracted[exIdx]
      const exNormLabel = normalizeLabel(exField.requirement.label)

      if (gtNormLabel === exNormLabel) {
        matches.set(gtIdx, exIdx)
        usedExtracted.add(exIdx)
        break
      }
    }
  }

  return matches
}

/**
 * PDF Field Extraction evaluation kind
 *
 * Compares extracted DataCollectionSpec against ground truth using:
 * - Field recall: fraction of ground truth fields found
 * - Field precision: fraction of extracted fields that match ground truth
 * - Type accuracy: fraction of matched fields with correct fieldType
 * - Group accuracy: fraction of matched fields with correct group
 * - Sensitivity accuracy: fraction of matched fields with correct sensitivity level
 */
export const pdfFieldExtractionKind: EvaluationKind<
  ExtractionOutput,
  DataCollectionSpec
> = {
  id: 'pdf-field-extraction',
  description:
    'Evaluates PDF field extraction accuracy using deterministic field matching',

  async score(
    output: ExtractionOutput,
    groundTruth: DataCollectionSpec,
  ): Promise<CaseMetrics> {
    const extractedFields = flattenFields(output.spec)
    const groundTruthFields = flattenFields(groundTruth)
    const matches = matchFields(extractedFields, groundTruthFields)

    const { metrics, details } = calculateMetrics(
      groundTruthFields,
      extractedFields,
      matches,
    )

    return {
      fixture: '', // Will be set by harness
      metrics,
      details,
    }
  },

  summarize(cases: CaseMetrics[]): SummaryMetrics {
    if (cases.length === 0) {
      return { metrics: {} }
    }

    // Collect all metric keys from all cases
    const metricKeys = new Set<string>()
    for (const c of cases) {
      for (const key of Object.keys(c.metrics)) {
        metricKeys.add(key)
      }
    }

    // Average each metric across all cases
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
