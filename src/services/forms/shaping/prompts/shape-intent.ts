import type { DataCollectionSpec } from '../../../data-collection/types'
import type { FormSpec } from '../../types'

export function buildShapeIntentPrompt(
  intent: string,
  currentFormSpec: FormSpec,
  dataSpec: DataCollectionSpec,
): string {
  return `You are a form design assistant. A form creator wants to modify the structure of their form.

## Current FormSpec
${JSON.stringify(currentFormSpec, null, 2)}

## Available Requirement Groups (from DataCollectionSpec)
${JSON.stringify(
  dataSpec.groups.map((g) => ({
    id: g.id,
    title: g.title,
    fieldCount: g.requirements.length,
    fields: g.requirements.map((r) => r.label),
  })),
  null,
  2,
)}

## The form creator's request
"${intent}"

## Instructions
Return ONLY valid JSON (no markdown, no explanation) — a revised FormSpec matching this schema:

{
  "id": "${currentFormSpec.id}",
  "specId": "${currentFormSpec.specId}",
  "title": "string",
  "pages": [
    {
      "id": "string",
      "title": "string",
      "description": "string (optional)",
      "groups": ["group-id-1"],
      "deliveryMode": "static|conversational|hybrid"
    }
  ]
}

Rules:
- Only reference group IDs that exist in the Available Requirement Groups above.
- Every group from the DataCollectionSpec must appear on exactly one page.
- Preserve existing page IDs where possible. Use new IDs (e.g., "page-new-1") only for new pages.
- When adding a new page (like a screener or eligibility check), create a new page with relevant groups moved to it.
- Set deliveryMode based on section complexity: "static" for simple, "conversational" for complex/conditional, "hybrid" for moderate.
- Apply the creator's request as faithfully as possible.`
}
