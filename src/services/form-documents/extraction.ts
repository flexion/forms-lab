import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { ExtractionExemplar } from '../extraction/exemplars'
import type { CacheStore } from '../storage'
import {
  generateFormSpec,
  mapAcroFormFields,
  parseJsonResponse,
} from './extraction-steps'
import { extractionResponseSchema } from './schemas'
import type { ExtractionOptions, ExtractionResult } from './types'

export interface PdfExtractor {
  extract(pdf: Buffer, options?: ExtractionOptions): Promise<ExtractionResult>
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

function cacheKey(pdf: Buffer, discriminator: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(pdf)
  hasher.update(discriminator)
  return hasher.digest('hex')
}

export function createCachedPdfExtractor(
  inner: PdfExtractor,
  cacheStore: CacheStore,
  cacheModel?: string,
  variantId?: string,
): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? cacheModel ?? DEFAULT_MODEL
      const discriminator = variantId ? `${model}:${variantId}` : model
      const key = cacheKey(pdf, discriminator)

      const cached = cacheStore.get(key)
      if (cached) {
        const result = JSON.parse(cached.result) as ExtractionResult
        if (result.fieldMapping) {
          return result
        }
        // Cache entry predates fieldMapping — fall through to re-extract
      }

      const result = await inner.extract(pdf, options)
      cacheStore.set(key, model, JSON.stringify(result))
      return result
    },
  }
}

export interface BedrockExtractorOptions {
  model?: string
  exemplars?: ExtractionExemplar[]
  maxOutputTokens?: number
  /**
   * Sampling temperature for Step 1 (the extraction prompt). When
   * undefined, the underlying provider default is used. Setting `0`
   * produces deterministic output and is used by the
   * `sonnet-temperature-zero` variant.
   *
   * Scoped to Step 1 only — Steps 2 (formSpec) and 3 (field mapping)
   * keep provider defaults so the variant measures the extraction
   * prompt specifically.
   */
  temperature?: number
}

/** Build the few-shot examples section for the extraction prompt. */
export function buildExemplarSection(
  exemplars: ExtractionExemplar[] | undefined,
): string {
  if (!exemplars || exemplars.length === 0) return ''

  const sections = exemplars.map((exemplar, i) => {
    const formatted = JSON.stringify(JSON.parse(exemplar.output), null, 2)
    return `### Example ${i + 1}: ${exemplar.description}

Input form description:
${exemplar.input}

Expected output:
${formatted}`
  })

  return `\n\n## Examples

The following examples demonstrate the expected extraction patterns. Pay close attention to group structure, sensitivity labels, and conditional fields.

${sections.join('\n\n')}\n\n`
}

export function createBedrockPdfExtractor(
  options?: BedrockExtractorOptions,
): PdfExtractor {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async extract(
      pdf: Buffer,
      extractionOptions?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      // Validate PDF buffer
      if (!pdf || !Buffer.isBuffer(pdf)) {
        throw new Error(
          `Invalid PDF buffer: expected Buffer, received ${typeof pdf}`,
        )
      }
      if (pdf.length === 0) {
        throw new Error('PDF buffer is empty')
      }

      const model = extractionOptions?.model ?? options?.model ?? DEFAULT_MODEL
      const exemplarSection = buildExemplarSection(options?.exemplars)

      // Step 1: Extract DataCollectionSpec + confidence from PDF
      // Use generateText + manual JSON parsing because generateObject's
      // tool-use mode returns empty objects on Bedrock.
      const extraction = await generateText({
        model: bedrock(model),
        maxOutputTokens: options?.maxOutputTokens ?? 32768,
        ...(options?.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
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
                text: `Analyze this government PDF form and extract its structure. Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:

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

${exemplarSection}Guidelines:
- Group related fields (e.g., "Personal Information", "Employment History")
- Use kebab-case for ids, camelCase for fieldName
- Flag low-confidence fields (< 0.8) with descriptive flags
- Only include validation rules and conditions if clearly specified in the form
- Be thorough — extract every field visible in the form`,
              },
            ],
          },
        ],
      })

      const { spec, confidence } = parseJsonResponse(
        extraction.text,
        extractionResponseSchema,
      )

      // Step 2: Generate default FormSpec from extracted spec
      const bedrockModel = bedrock(model)
      const formSpec = await generateFormSpec(bedrockModel, spec)

      // Step 3: Enumerate PDF AcroForm fields and map to spec fieldNames
      const fieldMapping = await mapAcroFormFields(bedrockModel, pdf, spec)

      return {
        spec,
        formSpec,
        confidence,
        fieldMapping,
      }
    },
  }
}
