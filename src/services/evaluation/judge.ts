import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import { buildJudgePrompt } from './judge-prompt'
import { type JudgeResponse, judgeResponseSchema } from './judge-schemas'
import type { FlatField } from './kinds/shared'

export interface FieldJudge {
  judge(
    extracted: FlatField[],
    groundTruth: FlatField[],
  ): Promise<JudgeResponse>
}

export function createBedrockFieldJudge(model: string): FieldJudge {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async judge(
      extracted: FlatField[],
      groundTruth: FlatField[],
    ): Promise<JudgeResponse> {
      const prompt = buildJudgePrompt(extracted, groundTruth)

      const result = await generateText({
        model: bedrock(model),
        maxOutputTokens: 16384,
        messages: [{ role: 'user', content: prompt }],
      })

      const trimmed = result.text.trim()
      const jsonStr = trimmed.startsWith('```')
        ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
        : trimmed
      const parsed = JSON.parse(jsonStr)
      return judgeResponseSchema.parse(parsed)
    },
  }
}
