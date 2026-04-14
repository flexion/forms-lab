import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { DataCollectionSpec } from '../../data-collection/types'
import type { FormSpec } from '../types'
import { buildShapeIntentPrompt } from './prompts/shape-intent'
import type { FormShaper, ShapingRequest, ShapingResult } from './types'

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim()
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    : trimmed
  return JSON.parse(jsonStr)
}

export function validateShapingResult(
  formSpec: FormSpec,
  dataSpec: DataCollectionSpec,
): void {
  const allGroupIds = new Set(dataSpec.groups.map((g) => g.id))

  for (const page of formSpec.pages) {
    for (const groupId of page.groups) {
      if (!allGroupIds.has(groupId)) {
        throw new Error(`Unknown group "${groupId}" in page "${page.title}"`)
      }
    }
  }
}

export interface BedrockShaperOptions {
  model?: string
}

export function createBedrockFormShaper(
  options?: BedrockShaperOptions,
): FormShaper {
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async shape(request: ShapingRequest): Promise<ShapingResult> {
      const model = options?.model ?? DEFAULT_MODEL
      const prompt = buildShapeIntentPrompt(
        request.intent,
        request.currentFormSpec,
        request.dataSpec,
      )

      const result = await generateText({
        model: bedrock(model),
        maxOutputTokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      })

      const parsed = parseJsonResponse(result.text) as FormSpec
      validateShapingResult(parsed, request.dataSpec)

      return {
        revisedFormSpec: parsed,
        summary: `Applied: ${request.intent}`,
      }
    },
  }
}
