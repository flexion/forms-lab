import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { DataCollectionSpec } from '../data-collection'
import type { FormSpec } from '../forms'
import type { LayoutJudge, LayoutJudgeResponse } from './kinds/layout-quality'
import { buildLayoutJudgePrompt } from './layout-judge-prompt'

export function createBedrockLayoutJudge(model: string): LayoutJudge {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async judge(
      spec: DataCollectionSpec,
      formSpec: FormSpec,
    ): Promise<LayoutJudgeResponse> {
      const prompt = buildLayoutJudgePrompt(spec, formSpec)

      const result = await generateText({
        model: bedrock(model),
        maxOutputTokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const trimmed = result.text.trim()
      const jsonStr = trimmed.startsWith('```')
        ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
        : trimmed
      return JSON.parse(jsonStr) as LayoutJudgeResponse
    },
  }
}
