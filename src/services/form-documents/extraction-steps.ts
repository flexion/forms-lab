/**
 * Shared extraction pipeline steps.
 *
 * Steps 2 (FormSpec generation) and 3 (AcroForm field mapping) are reused
 * by both the free-JSON and tool-use extraction variants.
 */

import type { LanguageModel } from 'ai'
import { generateText } from 'ai'
import type { DataCollectionSpec } from '../data-collection'
import type { FormSpec } from '../forms'
import { enumerateFields } from './field-mapping'
import { formSpecSchema } from './schemas'
import type { FieldMapping } from './types'

/** Extract JSON from a model response, stripping markdown fences if present. */
export function parseJsonResponse<T>(
  text: string,
  schema: { parse: (v: unknown) => T },
): T {
  const trimmed = text.trim()
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    : trimmed
  const parsed = JSON.parse(jsonStr)
  return schema.parse(parsed)
}

/** Step 2: Generate a default FormSpec from an extracted DataCollectionSpec. */
export async function generateFormSpec(
  model: LanguageModel,
  spec: DataCollectionSpec,
): Promise<FormSpec> {
  const result = await generateText({
    model,
    maxOutputTokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Given this DataCollectionSpec, generate a FormSpec as JSON. Return ONLY valid JSON (no markdown, no explanation) matching this schema:

{
  "id": "form-<specId>",
  "specId": "${spec.id}",
  "title": "string",
  "pages": [
    {
      "id": "page-1",
      "title": "string",
      "description": "string (optional)",
      "groups": ["group-id-1", "group-id-2"],
      "deliveryMode": "static|conversational|hybrid"
    }
  ],
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}

Rules:
- Each page should contain 1-3 related requirement groups
- Set deliveryMode to "static" for simple sections, "conversational" for sections with many conditional fields, "hybrid" for moderately complex sections

DataCollectionSpec:
${JSON.stringify(spec, null, 2)}`,
      },
    ],
  })

  return parseJsonResponse(result.text, formSpecSchema)
}

/** Step 3: Map PDF AcroForm fields to spec fieldNames using LLM. */
export async function mapAcroFormFields(
  model: LanguageModel,
  pdf: Buffer,
  spec: DataCollectionSpec,
): Promise<FieldMapping> {
  const pdfFieldNames = await enumerateFields(pdf)
  let fieldMapping: FieldMapping = {}

  if (pdfFieldNames.length > 0) {
    const allFieldNames = spec.groups
      .flatMap((g) => g.requirements)
      .map((r) => ({ fieldName: r.fieldName, label: r.label }))

    const mappingResult = await generateText({
      model,
      maxOutputTokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Map these DataCollectionSpec fields to the PDF form fields. Return ONLY valid JSON (no markdown, no explanation) as an object where keys are spec fieldNames and values are PDF field names.

Spec fields:
${JSON.stringify(allFieldNames, null, 2)}

PDF AcroForm field names:
${JSON.stringify(pdfFieldNames, null, 2)}

Rules:
- Only include mappings where you are confident the spec field corresponds to the PDF field
- Key = spec fieldName (camelCase), Value = exact PDF field name string
- If a spec field has no clear PDF counterpart, omit it`,
        },
      ],
    })

    const mappingText = mappingResult.text.trim()
    const jsonStr = mappingText.startsWith('```')
      ? mappingText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      : mappingText
    fieldMapping = JSON.parse(jsonStr) as FieldMapping
  }

  return fieldMapping
}
