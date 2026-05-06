import type { DataCollectionSpec } from '../data-collection'
import type { FormSpec } from '../forms'

export function buildLayoutJudgePrompt(
  spec: DataCollectionSpec,
  formSpec: FormSpec,
): string {
  const totalFields = spec.groups.reduce(
    (sum, g) => sum + g.requirements.length,
    0,
  )

  return `You are evaluating the layout quality of a generated form. You will be given:
1. A DataCollectionSpec (what data the form collects)
2. A FormSpec (how the form is structured into pages)

Score the FormSpec's layout quality on these six dimensions. Each score is 1-5:

1 = Poor (clearly problematic, violates basic usability)
2 = Below average (noticeable issues, user would struggle)
3 = Acceptable (functional but not optimized)
4 = Good (follows best practices with minor imperfections)
5 = Excellent (optimal for this form's size and complexity)

## Rubric

### pageSizing
Are pages appropriately sized for this form's complexity? A 5-field form on one page is fine. A 50-field form on one page is poor. But splitting 3 related fields across 3 pages is also poor (over-pagination).

### topicCohesion
Does each page address a single clear topic? Related fields (all address components, all employment fields) should be together. Unrelated fields (name + income + legal history) on the same page is poor.

### logicalProgression
Do pages flow in a natural order? Easy/identity questions first, complex/sensitive questions later. The user should feel they're making progress, not jumping between unrelated topics.

### conditionalUse
If the DataCollectionSpec has fields with conditions or groups that only apply to some users, does the FormSpec use page-level conditions appropriately? If there are no conditional fields, score 5 (not applicable = perfect).

### titleClarity
Are page titles plain-language and descriptive? "Your contact details" scores higher than "Section 1A" or "Part I - Applicant Information". Titles should help the user understand what they'll be asked without reading the fields.

### deliveryModeChoice
Are delivery modes assigned appropriately? Simple factual fields (name, DOB) should be "static". Complex conditional sections should be "conversational". If all pages are "static" on a complex form, that's suboptimal.

## Response Format

Return ONLY valid JSON (no markdown fences, no explanation outside JSON):

{
  "scores": {
    "pageSizing": { "score": 1-5, "rationale": "one sentence" },
    "topicCohesion": { "score": 1-5, "rationale": "one sentence" },
    "logicalProgression": { "score": 1-5, "rationale": "one sentence" },
    "conditionalUse": { "score": 1-5, "rationale": "one sentence" },
    "titleClarity": { "score": 1-5, "rationale": "one sentence" },
    "deliveryModeChoice": { "score": 1-5, "rationale": "one sentence" }
  }
}

## Form Context

This form has ${totalFields} fields across ${spec.groups.length} groups.

### DataCollectionSpec

${JSON.stringify(spec, null, 2)}

### FormSpec

${JSON.stringify(formSpec, null, 2)}`
}
