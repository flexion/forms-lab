// src/services/form-authoring/evaluator.ts
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateObject } from 'ai'
import { z } from 'zod'
import { HAIKU_MODEL_ID } from '../extraction'
import type { ProjectState } from '../forms'
import type { PolicyChunk } from '../rag'
import { buildEvalPrompt } from './prompts'
import type { Criterion, SectionEvalResult } from './types'

export interface AuthoringEvaluator {
  evaluateSection(
    groupId: string,
    state: ProjectState,
    criteria: Criterion[],
    corpus: PolicyChunk[],
  ): Promise<SectionEvalResult[]>
}

const evalResultSchema = z.array(
  z.object({
    criterionId: z.string(),
    pass: z.boolean(),
    explanation: z.string(),
  }),
)

export function createAuthoringEvaluator(modelId?: string): AuthoringEvaluator {
  const model = modelId ?? HAIKU_MODEL_ID
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async evaluateSection(groupId, state, criteria, corpus) {
      if (criteria.length === 0) return []

      const response = await generateObject({
        model: bedrock(model),
        schema: evalResultSchema,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: buildEvalPrompt(groupId, state, criteria, corpus),
          },
        ],
      })
      return response.object
    },
  }
}
