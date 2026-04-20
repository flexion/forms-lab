import { StrategyRegistry } from '../../../shared/strategy-registry'
import {
  HAIKU_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from '../../extraction'
import { createBedrockFormShaper } from './bedrock-shaper'
import { withValidationRetry } from './retry'
import type { FormShaper } from './types'

function registeredShaper(model: string): FormShaper {
  return withValidationRetry(createBedrockFormShaper({ model }))
}

export function createShapingRegistry(): StrategyRegistry<FormShaper> {
  const registry = new StrategyRegistry<FormShaper>()

  registry.register({
    id: 'bedrock-sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description:
        'Recommended default. Responds quickly and handles most shaping requests (page reordering, field edits, delivery mode changes) accurately. Good balance of quality and interactive speed.',
      status: 'baseline',
      courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/shaping-model-comparison/sonnet',
      modelId: SONNET_MODEL_ID,
    },
    create: () => registeredShaper(SONNET_MODEL_ID),
  })

  registry.register({
    id: 'bedrock-haiku',
    metadata: {
      name: 'Claude Haiku 4.5',
      description:
        'Fastest responses, lowest cost. Handles simple edits (rename, reorder) well but may misinterpret complex multi-step requests like "reorganize all sections by complexity." Best for quick, straightforward changes.',
      status: 'experimental',
      courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/shaping-model-comparison/haiku',
      modelId: HAIKU_MODEL_ID,
    },
    create: () => registeredShaper(HAIKU_MODEL_ID),
  })

  registry.register({
    id: 'bedrock-opus',
    metadata: {
      name: 'Claude Opus 4.6',
      description:
        'Frontier model, most capable for complex multi-step shaping. Best at interpreting ambiguous requests and generating multi-command sequences (e.g., "suggest delivery modes based on section complexity"). Slower and more expensive per request.',
      status: 'experimental',
      courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/shaping-model-comparison/opus',
      modelId: OPUS_MODEL_ID,
    },
    create: () => registeredShaper(OPUS_MODEL_ID),
  })

  registry.setDefault('bedrock-sonnet')

  return registry
}
