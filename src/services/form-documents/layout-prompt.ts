/**
 * Layout-aware FormSpec generation prompt.
 *
 * Encodes civic tech best practices for form layout into a structured
 * prompt that guides an LLM to produce a well-paginated FormSpec from
 * a DataCollectionSpec. The prompt includes adaptive sizing heuristics,
 * layout principles, deliveryMode guidance, and the target JSON schema.
 */

import type { DataCollectionSpec } from '../data-collection'

/** Compute total field count across all groups. */
function countFields(spec: DataCollectionSpec): number {
  return spec.groups.reduce((sum, g) => sum + g.requirements.length, 0)
}

/** Determine form size category for adaptive sizing. */
function formSizeCategory(fieldCount: number): string {
  if (fieldCount <= 8) return 'small (1-2 pages)'
  if (fieldCount <= 20) return 'medium (2-4 pages)'
  if (fieldCount <= 40) return 'large (4-7 pages)'
  return 'very large (7+ pages)'
}

/**
 * Build a layout-aware prompt for FormSpec generation from a DataCollectionSpec.
 *
 * The returned string is intended to be sent to an LLM as the user message.
 * It is a pure function with no side effects or async behavior.
 */
export function buildLayoutPrompt(spec: DataCollectionSpec): string {
  const fieldCount = countFields(spec)
  const groupCount = spec.groups.length
  const sizeCategory = formSizeCategory(fieldCount)

  return `You are a civic technology form designer. Given the DataCollectionSpec below, generate a FormSpec JSON that organizes fields into well-structured pages following layout best practices.

## Adaptive sizing

This form has ${fieldCount} fields across ${groupCount} groups, which is a ${sizeCategory} form. Scale page count proportionally — do not over-paginate small forms or under-paginate large ones.

## Layout principles

Apply these civic tech best practices when assigning groups to pages:

1. **One topic per page** — each page should address a single coherent topic. Users complete pages faster when context doesn't shift mid-page.
2. **Front-load easy questions** — place simple, low-effort fields (name, contact info) on early pages to build momentum before complex sections.
3. **Group for recognition** — related fields together reduce cognitive load. Users should recognize why fields appear on the same page.
4. **Use plain-language titles** — page titles should describe what the user will do, not internal jargon (e.g., "Tell us about yourself" not "Personal Information Section A").
5. **Conditional pages** — if a group has a condition, place it on its own page so it can be skipped entirely without confusing the user.
6. **Don't over-paginate** — avoid single-field pages unless justified by sensitivity or conditionality. Two closely related groups can share a page.

## deliveryMode assignment

Assign a deliveryMode to each page based on its content:

- **static** — straightforward fields with clear labels (name, date, address). Most pages should be static.
- **conversational** — sections with many conditional fields, complex eligibility logic, or questions that benefit from guided explanation.
- **hybrid** — moderately complex sections where some fields are straightforward but others may need clarification.

Default to "static" unless the page content clearly warrants conversational or hybrid treatment.

## FormSpec JSON schema

Return ONLY valid JSON (no markdown fences, no explanation) matching this schema:

{
  "id": "form-<specId>",
  "specId": "${spec.id}",
  "title": "string — a user-friendly form title",
  "pages": [
    {
      "id": "page-<n>",
      "title": "string — plain-language page title",
      "description": "string (optional) — brief guidance for the user",
      "groups": ["group-id-1", "group-id-2"],
      "deliveryMode": "static | conversational | hybrid"
    }
  ]
}

Each page's "groups" array references group IDs from the DataCollectionSpec. Every group must appear in exactly one page.

## DataCollectionSpec

${JSON.stringify(spec, null, 2)}

## Form statistics

- Total fields: ${fieldCount}
- Total groups: ${groupCount}
- Size category: ${sizeCategory}

## Instructions

Generate the FormSpec JSON now. Ensure every group from the spec is assigned to exactly one page.`
}
