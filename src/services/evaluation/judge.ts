import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
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
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
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
