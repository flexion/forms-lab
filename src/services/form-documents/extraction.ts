import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { CacheStore } from '../storage'
import { extractionResponseSchema, formSpecSchema } from './schemas'
import type { ExtractionOptions, ExtractionResult } from './types'

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
  cacheModel?: string,
): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? cacheModel ?? DEFAULT_MODEL
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

/** Extract JSON from a model response, stripping markdown fences if present. */
function parseJsonResponse<T>(
  text: string,
  schema: { parse: (v: unknown) => T },
): T {
  const trimmed = text.trim()
  // Strip ```json ... ``` fences
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    : trimmed
  const parsed = JSON.parse(jsonStr)
  return schema.parse(parsed)
}

export interface BedrockExtractorOptions {
  model?: string
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
      const model = extractionOptions?.model ?? options?.model ?? DEFAULT_MODEL

      // Step 1: Extract DataCollectionSpec + confidence from PDF
      // Use generateText + manual JSON parsing because generateObject's
      // tool-use mode returns empty objects on Bedrock.
      const extraction = await generateText({
        model: bedrock(model),
        maxOutputTokens: 32768,
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

Guidelines:
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
      const formSpecResult = await generateText({
        model: bedrock(model),
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

      const formSpec = parseJsonResponse(formSpecResult.text, formSpecSchema)

      return {
        spec,
        formSpec,
        confidence,
      }
    },
  }
}
