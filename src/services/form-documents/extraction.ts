import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import type { LanguageModel } from 'ai'
import { generateText } from 'ai'
import type { ActivityStore } from '../activity'
import { trackLlmCall } from '../activity'
import type { DataCollectionSpec } from '../data-collection'
import type { ExtractionExemplar } from '../extraction'
import type { FormSpec } from '../forms'
import type { PolicyChunk, PolicyRetriever } from '../rag'
import type { CacheStore } from '../storage'
import {
  generateFormSpec,
  mapAcroFormFields,
  parseJsonResponse,
} from './extraction-steps'
import { buildHybridExtractionPrompt } from './hybrid-extraction-prompt'
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
  /** Optional activity store for tracking LLM usage. */
  activityStore?: ActivityStore
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
  /**
   * Which Step-1 prompt shape to use.
   *
   * - `default` (implicit) — the baseline prompt with optional few-shot
   *   appendix (controlled by `exemplars`).
   * - `hybrid` — a concise rewrite that front-loads a single exemplar.
   *   Requires `hybridExemplar`. Used by the `sonnet-hybrid-v1`
   *   variant.
   */
  promptVariant?: 'default' | 'hybrid'
  /**
   * The single exemplar embedded in the hybrid prompt. Only consulted
   * when `promptVariant === 'hybrid'`.
   */
  hybridExemplar?: ExtractionExemplar
  /**
   * Optional policy retriever. When present, top-k chunks are retrieved
   * per extraction using the fixture slug (or a PDF-derived fallback)
   * as the query and prepended to the Step-1 prompt under a
   * `## Policy Context` section.
   *
   * The retriever may be a Promise so that variants with async
   * embedders can register synchronously in the registry and defer
   * corpus embedding until the first extraction.
   */
  retriever?: PolicyRetriever | Promise<PolicyRetriever>
  /**
   * Number of policy chunks to retrieve per extraction. Defaults to 2.
   * Ignored when `retriever` is not set.
   */
  retrievalK?: number
  /**
   * Custom FormSpec generator for Step 2. When provided, replaces the
   * default `generateFormSpec` call. Use `generateFormSpecWithLayout`
   * for layout-aware generation.
   */
  formSpecGenerator?: (
    model: LanguageModel,
    spec: DataCollectionSpec,
  ) => Promise<FormSpec>
}

/**
 * Build the policy-context section for the Step-1 prompt.
 *
 * Mirrors the `buildExemplarSection` shape: empty string when the
 * input is empty, otherwise a well-labelled block the model can use
 * as grounding. Each chunk's `source` is rendered verbatim so the
 * model can echo it in field descriptions if it chooses.
 */
export function buildPolicyContextSection(chunks: PolicyChunk[]): string {
  if (chunks.length === 0) return ''

  const sections = chunks.map(
    (chunk) => `### ${chunk.source}

${chunk.text}`,
  )

  return `## Policy Context

The following regulatory excerpts govern this form. Use them to inform field types, sensitivity labels, and required-ness — e.g. an SSN mentioned in 8 CFR 274a.2 should be tagged sensitivity: "pii" — but do not copy regulatory text into field labels.

${sections.join('\n\n')}

---

`
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

      // Resolve the policy retriever (if configured) and fetch top-k
      // chunks. Retrieval is keyed on the fixture slug when the caller
      // supplies one, and falls back to the first ~500 characters of
      // the PDF buffer interpreted as UTF-8. The fallback is lossy for
      // binary PDFs, but on real fixtures it surfaces enough tokens
      // (author, title, form id) to be useful when a slug isn't
      // available.
      let policyChunks: PolicyChunk[] = []
      if (options?.retriever) {
        const retriever = await options.retriever
        const k = options.retrievalK ?? 2
        const query =
          extractionOptions?.slug ?? pdf.subarray(0, 500).toString('utf-8')
        policyChunks = await retriever.retrieve(query, k)
      }

      const policyContextSection = buildPolicyContextSection(policyChunks)

      // Select the Step-1 prompt shape. The hybrid variant is a full
      // rewrite; the default variant is the baseline template with an
      // optional few-shot appendix.
      let step1PromptText: string
      if (options?.promptVariant === 'hybrid') {
        if (!options.hybridExemplar) {
          throw new Error(
            'createBedrockPdfExtractor: promptVariant="hybrid" requires hybridExemplar',
          )
        }
        step1PromptText = buildHybridExtractionPrompt(options.hybridExemplar)
        if (policyContextSection) {
          step1PromptText = `${policyContextSection}${step1PromptText}`
        }
      } else {
        const exemplarSection = buildExemplarSection(options?.exemplars)
        step1PromptText = `${policyContextSection}Analyze this government PDF form and extract its structure. Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:

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
            "choices": ["string"] (required for fieldType "choice", otherwise omit),
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
- For yes/no questions, use fieldType "choice" with choices ["Yes", "No"] rather than boolean. Reserve boolean for agreement checkboxes (e.g., "I agree to the terms").
- Every "choice" field MUST include a non-empty \`choices\` array listing the options (e.g., ["US Citizen", "Permanent Resident", "Other"]).
- Flag low-confidence fields (< 0.8) with descriptive flags
- Only include validation rules and conditions if clearly specified in the form
- Be thorough — extract every field visible in the form`
      }

      // Step 1: Extract DataCollectionSpec + confidence from PDF
      // Use generateText + manual JSON parsing because generateObject's
      // tool-use mode returns empty objects on Bedrock.
      const startTime = Date.now()
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
                text: step1PromptText,
              },
            ],
          },
        ],
      })
      if (options?.activityStore) {
        trackLlmCall(options.activityStore, {
          userId: extractionOptions?.userId,
          projectId: extractionOptions?.slug,
          operation: 'extraction',
          model,
          usage: extraction.usage,
          durationMs: Date.now() - startTime,
        })
      }

      const { spec, confidence } = parseJsonResponse(
        extraction.text,
        extractionResponseSchema,
      )

      // Step 2: Generate default FormSpec from extracted spec
      const bedrockModel = bedrock(model)
      const formSpec = options?.formSpecGenerator
        ? await options.formSpecGenerator(bedrockModel, spec)
        : await generateFormSpec(
            bedrockModel,
            spec,
            options?.activityStore,
            extractionOptions?.userId,
            extractionOptions?.slug,
            model,
          )

      // Step 3: Enumerate PDF AcroForm fields and map to spec fieldNames
      const fieldMapping = await mapAcroFormFields(
        bedrockModel,
        pdf,
        spec,
        options?.activityStore,
        extractionOptions?.userId,
        extractionOptions?.slug,
        model,
      )

      return {
        spec,
        formSpec,
        confidence,
        fieldMapping,
      }
    },
  }
}
