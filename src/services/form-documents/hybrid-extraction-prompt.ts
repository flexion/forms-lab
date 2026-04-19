/**
 * Hybrid extraction prompt — concise instructions + one exemplar.
 *
 * Ports the Assignment 10 "hybrid-v2" shape to the PDF extraction
 * pipeline: one concrete example front-loaded, short rules list, no
 * verbose guidelines. The hypothesis is that for a frontier model
 * (Sonnet) less is more — the baseline prompt's guideline enumeration
 * over-constrains it.
 *
 * Lives in its own module rather than inline in \`extraction.ts\` because
 * the baseline prompt is already at the ceiling of readable inline
 * string templating; stacking a second ~1.5k-character prompt next to
 * it would create a maintenance hazard.
 */

import type { ExtractionExemplar } from '../extraction'

/**
 * Build the hybrid Step-1 prompt for a single exemplar.
 *
 * Callers are trusted to pass a non-empty, valid exemplar — the
 * registry picks one from \`exemplars\` before wiring the extractor.
 */
export function buildHybridExtractionPrompt(
  exemplar: ExtractionExemplar,
): string {
  const formattedOutput = JSON.stringify(JSON.parse(exemplar.output), null, 2)

  return `Extract the structure of this government PDF form as JSON matching the schema below. Follow the example extraction before producing your own.

## Example

Input form description:
${exemplar.input}

Output JSON:
${formattedOutput}

## Schema

{
  "spec": {
    "id": "string (kebab-case)",
    "title": "string",
    "description": "string",
    "groups": [
      {
        "id": "string",
        "title": "string",
        "description": "string (optional)",
        "requirements": [
          {
            "id": "string (kebab-case)",
            "fieldName": "string (camelCase)",
            "label": "string",
            "fieldType": "text|email|phone|url|number|currency|date|boolean|choice|longText",
            "required": true/false,
            "helpText": "string (optional)",
            "sensitivity": "low|medium|high|pii (optional)"
          }
        ]
      }
    ]
  },
  "confidence": [
    {
      "fieldId": "string (matches requirement id)",
      "confidence": 0.0-1.0,
      "flags": ["string"] (optional, e.g. "ambiguous-type", "label-unclear")
    }
  ]
}

## Your extraction

Return ONLY the JSON. Use kebab-case ids, camelCase fieldNames. Flag fields you're less than 80% confident on. Be thorough.`
}
