import type { FlatField } from './kinds/shared'

function formatField(field: FlatField): string {
  return JSON.stringify({
    fieldName: field.requirement.fieldName,
    label: field.requirement.label,
    fieldType: field.requirement.fieldType,
    group: field.groupId,
  })
}

export function buildJudgePrompt(
  extracted: FlatField[],
  groundTruth: FlatField[],
): string {
  const gtList = groundTruth.map(formatField).join(',\n  ')
  const exList = extracted.map(formatField).join(',\n  ')

  return `You are evaluating the output of a PDF form field extraction system. Compare the extracted fields against the ground truth fields and determine which extracted fields match which ground truth fields.

Two fields "match" if they represent the SAME piece of information the form collects, even when they use different names. Examples of matches:
- "prosecutionCourt" ↔ "courtOfProsecution" (same concept, word order differs)
- "certificationOathDay" ↔ "oathDay" (one has a section prefix)
- "communityActivityContactName" ↔ "communityActivityContactNames" (singular vs plural)
- "priorApplicationDate" ↔ "previousApplicationDate" (synonym: prior/previous)
- "sobrietyDuration" ↔ "sobrietyLength" (synonym: duration/length)

Examples of NON-matches:
- "fullName" vs "firstName"/"lastName" (different granularity — one combined, others individual)
- "attorneyPhone" vs "attorneyContact" (phone is a subset of contact info)

Rules:
- Each ground truth field matches at most one extracted field, and vice versa
- Only match fields that represent the SAME piece of information
- Fields at different granularity levels should NOT be matched
- Set confidence: 1.0 = obvious match, 0.7 = likely match, 0.5 = uncertain

Return ONLY valid JSON (no markdown fences, no explanation outside the JSON) with this structure:
{
  "matches": [
    {
      "groundTruthFieldName": "string",
      "extractedFieldName": "string",
      "confidence": 0.0-1.0,
      "reasoning": "brief explanation"
    }
  ],
  "unmatchedGroundTruth": ["fieldName1", "fieldName2"],
  "unmatchedExtracted": ["fieldName1", "fieldName2"]
}

Ground truth fields (${groundTruth.length} total):
[
  ${gtList}
]

Extracted fields (${extracted.length} total):
[
  ${exList}
]`
}
