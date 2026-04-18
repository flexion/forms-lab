import type {
  DataCollectionSpec,
  DataRequirement,
} from '../../data-collection/types'
import type { FieldConfidence } from '../../form-documents/types'

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
export interface FlatField {
  requirement: DataRequirement
  groupId: string
}

/**
 * Flatten all requirements from a spec into a single array with group context
 */
export function flattenFields(spec: DataCollectionSpec): FlatField[] {
  const fields: FlatField[] = []
  for (const group of spec.groups) {
    for (const req of group.requirements) {
      fields.push({ requirement: req, groupId: group.id })
    }
  }
  return fields
}

/**
 * Calculate metrics from matched fields
 *
 * Returns metrics (recall, precision, typeAccuracy, groupAccuracy, sensitivityAccuracy)
 * and details (missed, extra, totalGroundTruth, totalExtracted, totalMatched)
 */
export function calculateMetrics(
  groundTruthFields: FlatField[],
  extractedFields: FlatField[],
  matches: Map<number, number>,
): {
  metrics: Record<string, number>
  details: Record<string, unknown>
} {
  // Calculate recall: fraction of ground truth fields that were found
  const fieldRecall =
    groundTruthFields.length > 0 ? matches.size / groundTruthFields.length : 1.0

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
}
