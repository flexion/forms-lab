import { StrategyRegistry } from '../../shared/strategy-registry'
import { HAIKU_MODEL_ID, OPUS_MODEL_ID, SONNET_MODEL_ID } from '../extraction'
import { type AuthoringPipeline, createAuthoringPipeline } from './pipeline'
import type { AuthoringStageConfig } from './types'

interface StageStrategy {
  modelId: string
}

function createStageRegistry(
  taskLabel: string,
): StrategyRegistry<StageStrategy> {
  const registry = new StrategyRegistry<StageStrategy>()

  registry.register({
    id: 'bedrock-sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description: `Uses Claude Sonnet 4 for ${taskLabel}. Recommended for accuracy and compliance with regulatory requirements.`,
      status: 'baseline',
      courseTopics: ['rag', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/authoring-pipeline',
      modelId: SONNET_MODEL_ID,
    },
    create: () => ({ modelId: SONNET_MODEL_ID }),
  })

  registry.register({
    id: 'bedrock-haiku',
    metadata: {
      name: 'Claude Haiku 4.5',
      description: `Uses Claude Haiku 4.5 for ${taskLabel}. Fastest and cheapest, suitable for simple forms.`,
      status: 'experimental',
      courseTopics: ['rag', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/authoring-pipeline',
      modelId: HAIKU_MODEL_ID,
    },
    create: () => ({ modelId: HAIKU_MODEL_ID }),
  })

  registry.register({
    id: 'bedrock-opus',
    metadata: {
      name: 'Claude Opus 4.6',
      description: `Uses Claude Opus 4.6 for ${taskLabel}. Most capable for complex regulatory analysis, slower and more expensive.`,
      status: 'experimental',
      courseTopics: ['rag', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/authoring-pipeline',
      modelId: OPUS_MODEL_ID,
    },
    create: () => ({ modelId: OPUS_MODEL_ID }),
  })

  registry.setDefault('bedrock-sonnet')
  return registry
}

export function createAuthoringCriteriaRegistry(): StrategyRegistry<StageStrategy> {
  return createStageRegistry('criteria analysis')
}

export function createAuthoringStructureRegistry(): StrategyRegistry<StageStrategy> {
  return createStageRegistry('structure generation')
}

export function createAuthoringGenerationRegistry(): StrategyRegistry<StageStrategy> {
  return createStageRegistry('field generation')
}

export function resolveAuthoringPipeline(
  criteriaModelId: string,
  structureModelId: string,
  generationModelId: string,
): AuthoringPipeline {
  const config: AuthoringStageConfig = {
    criteria: { modelId: criteriaModelId },
    structure: { modelId: structureModelId },
    generation: { modelId: generationModelId },
    evaluation: { modelId: HAIKU_MODEL_ID },
  }
  return createAuthoringPipeline(config)
}
