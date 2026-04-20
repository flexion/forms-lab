import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { HAIKU_MODEL_ID, SONNET_MODEL_ID } from '../extraction'
import { type Command, commandTools, type ProjectState } from '../forms'
import type { PolicyChunk } from '../rag'
import {
  buildCriteriaPrompt,
  buildSectionPrompt,
  buildStructurePrompt,
} from './prompts'
import type { AuthoringStage, AuthoringStageConfig, Criterion } from './types'

const DEFAULT_CONFIG: AuthoringStageConfig = {
  criteria: { modelId: HAIKU_MODEL_ID },
  structure: { modelId: SONNET_MODEL_ID },
  generation: { modelId: SONNET_MODEL_ID },
  evaluation: { modelId: HAIKU_MODEL_ID },
}

export interface AuthoringPipeline {
  analyzeCriteria(corpus: PolicyChunk[]): Promise<Criterion[]>
  planStructure(
    criteria: Criterion[],
    corpus: PolicyChunk[],
    state: ProjectState | null,
  ): Promise<{ commands: Command[]; explanation: string }>
  generateSection(
    groupId: string,
    groupTitle: string,
    criteria: Criterion[],
    scopedCorpus: PolicyChunk[],
  ): Promise<{ commands: Command[]; explanation: string }>
}

const criterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
})

export function createAuthoringPipeline(
  config: AuthoringStageConfig = DEFAULT_CONFIG,
): AuthoringPipeline {
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async analyzeCriteria(corpus: PolicyChunk[]): Promise<Criterion[]> {
      const response = await generateObject({
        model: bedrock(config.criteria.modelId),
        maxOutputTokens: 4096,
        prompt: buildCriteriaPrompt(corpus),
        schema: z.object({ criteria: z.array(criterionSchema) }),
      })

      return response.object.criteria.map((c) => ({
        ...c,
        status: 'pending' as const,
      }))
    },

    async planStructure(
      criteria: Criterion[],
      corpus: PolicyChunk[],
      state: ProjectState | null,
    ): Promise<{ commands: Command[]; explanation: string }> {
      const response = await generateText({
        model: bedrock(config.structure.modelId),
        maxOutputTokens: 4096,
        tools: commandTools,
        messages: [
          {
            role: 'user',
            content: buildStructurePrompt(criteria, corpus, state),
          },
        ],
      })

      const commands: Command[] = []
      for (const call of response.toolCalls ?? []) {
        commands.push({
          kind: call.toolName,
          ...(call.input as object),
        } as Command)
      }

      const explanation = (response.text ?? '').trim() || 'Applied changes.'
      return { commands, explanation }
    },

    async generateSection(
      groupId: string,
      groupTitle: string,
      criteria: Criterion[],
      scopedCorpus: PolicyChunk[],
    ): Promise<{ commands: Command[]; explanation: string }> {
      const response = await generateText({
        model: bedrock(config.generation.modelId),
        maxOutputTokens: 4096,
        tools: commandTools,
        messages: [
          {
            role: 'user',
            content: buildSectionPrompt(
              groupId,
              groupTitle,
              criteria,
              scopedCorpus,
            ),
          },
        ],
      })

      const commands: Command[] = []
      for (const call of response.toolCalls ?? []) {
        commands.push({
          kind: call.toolName,
          ...(call.input as object),
        } as Command)
      }

      const explanation = (response.text ?? '').trim() || 'Applied changes.'
      return { commands, explanation }
    },
  }
}

export interface StageDetectionInput {
  hasCriteria: boolean
  criteriaApproved: boolean
  hasPages: boolean
  uncoveredGroupCount: number
}

export function detectAuthoringStage(
  input: StageDetectionInput,
): AuthoringStage {
  if (!input.hasCriteria || !input.criteriaApproved) return 'criteria'
  if (!input.hasPages || input.uncoveredGroupCount > 0) return 'structure'
  return 'sections'
}
