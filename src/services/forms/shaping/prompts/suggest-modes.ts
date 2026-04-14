import type { DataCollectionSpec } from '../../../data-collection/types'
import type { FormSpec } from '../../types'

export function buildSuggestModesPrompt(
  formSpec: FormSpec,
  dataSpec: DataCollectionSpec,
): string {
  const groupMap = new Map(dataSpec.groups.map((g) => [g.id, g]))

  const pageAnalysis = formSpec.pages.map((page) => {
    const groups = page.groups.map((gid) => groupMap.get(gid)).filter(Boolean)
    const totalFields = groups.reduce(
      (sum, g) => sum + (g?.requirements.length ?? 0),
      0,
    )
    const conditionalFields = groups.reduce(
      (sum, g) =>
        sum + (g?.requirements.filter((r) => r.condition).length ?? 0),
      0,
    )
    const conditionalGroups = groups.filter((g) => g?.condition).length

    return {
      pageTitle: page.title,
      pageId: page.id,
      totalFields,
      conditionalFields,
      conditionalGroups,
      groups: groups.map((g) => ({
        title: g?.title,
        fieldCount: g?.requirements.length,
        hasCondition: !!g?.condition,
      })),
    }
  })

  return `Analyze these form pages and suggest the best delivery mode for each.

## Pages
${JSON.stringify(pageAnalysis, null, 2)}

## Delivery Modes
- "static": Traditional form layout. Best for simple sections with few fields and no conditional logic.
- "conversational": Step-by-step guided flow. Best for complex sections with many conditional fields or branching logic.
- "hybrid": Mix of both. Best for moderately complex sections.

Return ONLY valid JSON (no markdown, no explanation) as an array:
[
  {
    "pageId": "string",
    "suggestedMode": "static|conversational|hybrid",
    "rationale": "string (one sentence explaining why)"
  }
]`
}
