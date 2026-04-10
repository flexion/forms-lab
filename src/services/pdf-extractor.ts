import { bedrock } from '@ai-sdk/amazon-bedrock'
import { generateObject } from 'ai'
import type { ExtractionOptions, ExtractionResult } from '../types/models'
import type { CacheStore } from './database'
import { extractionResponseSchema, formSpecSchema } from './extraction-schemas'

export interface PdfExtractor {
  extract(pdf: Buffer, options?: ExtractionOptions): Promise<ExtractionResult>
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

function cacheKey(pdf: Buffer, model: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(pdf)
  hasher.update(model)
  return hasher.digest('hex')
}

export function createCachedPdfExtractor(
  inner: PdfExtractor,
  cacheStore: CacheStore,
): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? DEFAULT_MODEL
      const key = cacheKey(pdf, model)

      const cached = cacheStore.get(key)
      if (cached) {
        return JSON.parse(cached.result) as ExtractionResult
      }

      const result = await inner.extract(pdf, options)
      cacheStore.set(key, model, JSON.stringify(result))
      return result
    },
  }
}

export function createBedrockPdfExtractor(): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? DEFAULT_MODEL

      // Step 1: Extract DataCollectionSpec + confidence from PDF
      const extraction = await generateObject({
        model: bedrock(model),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                data: pdf,
                mediaType: 'application/pdf',
              },
              {
                type: 'text',
                text: `Analyze this government PDF form and extract its structure as a DataCollectionSpec.

For each field in the form, identify:
- A unique id (kebab-case, e.g., "full-name", "date-of-birth")
- The fieldName (camelCase version)
- A human-readable label
- The field type (text, email, phone, url, number, currency, date, boolean, choice, longText)
- Whether it is required
- Any help text or instructions
- Validation rules (patterns, min/max values, length constraints)
- Conditions (fields that only appear based on other field values)
- Sensitivity level (low, medium, high, pii)

Group related fields into RequirementGroups (e.g., "Personal Information", "Employment History").

For each field, also provide a confidence score (0-1) indicating how certain you are about the extraction. Flag any ambiguous fields with descriptive flags like "ambiguous-type", "conditional-logic-unclear", "label-unclear".

Be thorough — extract every field visible in the form.`,
              },
            ],
          },
        ],
        schema: extractionResponseSchema,
      })

      const { spec, confidence } = extraction.object

      // Step 2: Generate default FormSpec from extracted spec
      const formSpecResult = await generateObject({
        model: bedrock(model),
        messages: [
          {
            role: 'user',
            content: `Given this DataCollectionSpec, generate a default FormSpec that organizes the form into logical pages.

DataCollectionSpec:
${JSON.stringify(spec, null, 2)}

Rules:
- Each page should contain 1-3 related requirement groups
- Set the specId to "${spec.id}"
- Use a unique id for the FormSpec (e.g., "form-" + specId)
- Each page needs a unique id (e.g., "page-1", "page-2")
- Set deliveryMode to "static" for simple sections, "conversational" for sections with many conditional fields (more than 3 conditions), and "hybrid" for moderately complex sections
- Set createdAt and updatedAt to "${new Date().toISOString()}"
- Give each page a descriptive title`,
          },
        ],
        schema: formSpecSchema,
      })

      return {
        spec,
        formSpec: formSpecResult.object,
        confidence,
      }
    },
  }
}
