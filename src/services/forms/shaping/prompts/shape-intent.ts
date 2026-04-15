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
- **Preserve existing page objects intact.** When reordering, moving, or swapping pages, keep each page's id, title, groups, and deliveryMode exactly as they are — only change the order of page objects in the pages array. Do NOT keep the same id but substitute different content into it.
- Only modify a page's title/groups/deliveryMode if the creator's request explicitly asks to rename, regroup, or change the mode of that page.
- When adding a new page (like a screener or eligibility check), create a new page with new id (e.g., "page-new-1") and move the relevant groups from existing pages to the new page.
- When the creator asks to "swap X and Y" or "reorder pages", just rearrange the order of the page objects in the pages array — leave their internal content alone.
- Set deliveryMode based on section complexity: "static" for simple, "conversational" for complex/conditional, "hybrid" for moderate — but only when the creator asks to reconsider delivery modes.
- Apply the creator's request as faithfully as possible, making the minimum set of changes required.`
}
