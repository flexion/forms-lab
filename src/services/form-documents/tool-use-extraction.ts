/**
 * Tool-use extraction variant.
 *
 * Uses AI SDK tool-use (constrained generation) for Step 1 instead of
 * free-JSON prompting. The model calls domain tools (createSpec, addGroup,
 * addField, flagLowConfidence) that build the DataCollectionSpec incrementally.
 *
 * Steps 2 (FormSpec) and 3 (field mapping) reuse the shared free-JSON helpers.
 */

import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText, stepCountIs } from 'ai'
import type { ActivityStore } from '../activity'
import { trackLlmCall } from '../activity'
import type { PdfExtractor } from './extraction'
import { generateFormSpec, mapAcroFormFields } from './extraction-steps'
import { extractionTools, reconstructSpec } from './extraction-tools'
import type { ExtractionOptions, ExtractionResult } from './types'

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

export interface ToolUseExtractorOptions {
  model?: string
  /** Optional activity store for tracking LLM usage. */
  activityStore?: ActivityStore
}

export function createToolUsePdfExtractor(
  options?: ToolUseExtractorOptions,
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

      // Step 1: Extract DataCollectionSpec via tool-use (constrained generation)
      // maxSteps allows the model to make multiple rounds of tool calls —
      // large forms need 50+ calls which exceed a single response.
      const startTime = Date.now()
      const response = await generateText({
        model: bedrock(model),
        maxOutputTokens: 32768,
        stopWhen: stepCountIs(20),
        tools: extractionTools,
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
                text: `Analyze this government PDF form and extract its complete structure by calling the provided tools.

Call the tools in this order:
1. Call createSpec once to set the form ID (kebab-case), title, and description.
2. For each logical section of the form, call addGroup with a kebab-case ID and title.
3. Immediately after each addGroup, call addField for every field in that section. Use camelCase for fieldName, kebab-case for id.
4. After all groups and fields, call flagLowConfidence for any field where you are less than 80% confident in your extraction (e.g., ambiguous type, unclear label).

Guidelines:
- Group related fields (e.g., "Personal Information", "Employment History")
- Be thorough — extract every field visible in the form
- Set sensitivity to "pii" for personally identifiable information (names, SSN, dates of birth)
- Use appropriate fieldType values: text, email, phone, url, number, currency, date, boolean, choice, longText`,
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
          usage: response.usage,
          durationMs: Date.now() - startTime,
        })
      }

      // Collect tool calls from all steps (model may take multiple rounds)
      const toolCalls = response.steps
        .flatMap((step) => step.toolCalls ?? [])
        .map((call) => ({
          toolName: call.toolName as
            | 'createSpec'
            | 'addGroup'
            | 'addField'
            | 'flagLowConfidence',
          input: call.input as Record<string, unknown>,
        }))

      const { spec, confidence } = reconstructSpec(toolCalls)

      console.log(
        `[tool-use-extraction] Reconstructed spec: ${spec.groups.length} groups, ${spec.groups.reduce((n, g) => n + g.requirements.length, 0)} fields, ${confidence.length} low-confidence flags`,
      )

      // Step 2: Generate default FormSpec from extracted spec (shared helper)
      const bedrockModel = bedrock(model)
      const formSpec = await generateFormSpec(
        bedrockModel,
        spec,
        options?.activityStore,
        extractionOptions?.userId,
        extractionOptions?.slug,
        model,
      )

      // Step 3: Enumerate PDF AcroForm fields and map to spec fieldNames (shared helper)
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
