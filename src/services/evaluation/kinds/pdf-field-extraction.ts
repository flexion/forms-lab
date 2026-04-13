import type {
  DataCollectionSpec,
  DataRequirement,
} from '../../data-collection/types'
import type { FieldConfidence } from '../../ingestion/types'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'

/**
 * Output format for PDF field extraction
 */
export interface ExtractionOutput {
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}

/**
 * Flattened field with group information
 */
interface FlatField {
  requirement: DataRequirement
  groupId: string
}

/**
 * Flatten all requirements from a spec into a single array with group context
 */
function flattenFields(spec: DataCollectionSpec): FlatField[] {
  const fields: FlatField[] = []
  for (const group of spec.groups) {
    for (const req of group.requirements) {
      fields.push({ requirement: req, groupId: group.id })
    }
  }
  return fields
}

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

    // Calculate recall: fraction of ground truth fields that were found
    const fieldRecall =
      groundTruthFields.length > 0
        ? matches.size / groundTruthFields.length
        : 1.0

    // Calculate precision: fraction of extracted fields that match ground truth
    const fieldPrecision =
      extractedFields.length > 0 ? matches.size / extractedFields.length : 1.0

    // Track missed and extra fields for diagnostics
    const missed: string[] = []
    for (let gtIdx = 0; gtIdx < groundTruthFields.length; gtIdx++) {
      if (!matches.has(gtIdx)) {
        missed.push(groundTruthFields[gtIdx].requirement.fieldName)
      }
    }

    const extra: string[] = []
    const matchedExtractedIndices = new Set(matches.values())
    for (let exIdx = 0; exIdx < extractedFields.length; exIdx++) {
      if (!matchedExtractedIndices.has(exIdx)) {
        extra.push(extractedFields[exIdx].requirement.fieldName)
      }
    }

    // Calculate type accuracy: fraction of matched fields with correct type
    let typeCorrect = 0
    for (const [gtIdx, exIdx] of matches) {
      const gtField = groundTruthFields[gtIdx]
      const exField = extractedFields[exIdx]
      if (gtField.requirement.fieldType === exField.requirement.fieldType) {
        typeCorrect++
      }
    }
    const typeAccuracy = matches.size > 0 ? typeCorrect / matches.size : 1.0

    // Calculate group accuracy: fraction of matched fields with correct group
    let groupCorrect = 0
    for (const [gtIdx, exIdx] of matches) {
      const gtField = groundTruthFields[gtIdx]
      const exField = extractedFields[exIdx]
      if (gtField.groupId === exField.groupId) {
        groupCorrect++
      }
    }
    const groupAccuracy = matches.size > 0 ? groupCorrect / matches.size : 1.0

    // Calculate sensitivity accuracy: fraction of matched fields with correct sensitivity
    let sensitivityCorrect = 0
    for (const [gtIdx, exIdx] of matches) {
      const gtField = groundTruthFields[gtIdx]
      const exField = extractedFields[exIdx]
      if (gtField.requirement.sensitivity === exField.requirement.sensitivity) {
        sensitivityCorrect++
      }
    }
    const sensitivityAccuracy =
      matches.size > 0 ? sensitivityCorrect / matches.size : 1.0

    return {
      fixture: '', // Will be set by harness
      metrics: {
        fieldRecall,
        fieldPrecision,
        typeAccuracy,
        groupAccuracy,
        sensitivityAccuracy,
      },
      details: {
        missed,
        extra,
        totalGroundTruth: groundTruthFields.length,
        totalExtracted: extractedFields.length,
        totalMatched: matches.size,
      },
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
