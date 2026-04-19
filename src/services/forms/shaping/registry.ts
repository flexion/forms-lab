import {
  HAIKU_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from '../../extraction/models'
import { StrategyRegistry } from '../../strategy-registry'
import { createBedrockFormShaper } from './bedrock-shaper'
import type { FormShaper } from './types'

export function createShapingRegistry(): StrategyRegistry<FormShaper> {
  const registry = new StrategyRegistry<FormShaper>()

  registry.register({
    id: 'bedrock-sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description:
        'Balanced quality and speed. Current default for interactive shaping.',
      status: 'baseline',
      courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/shaping-model-comparison/sonnet',
      modelId: SONNET_MODEL_ID,
    },
    create: () => createBedrockFormShaper({ model: SONNET_MODEL_ID }),
  })

  registry.register({
    id: 'bedrock-haiku',
    metadata: {
      name: 'Claude Haiku 4.5',
      description:
        'Fast and cheap. May miss nuance in complex shaping requests.',
      status: 'experimental',
      courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/shaping-model-comparison/haiku',
      modelId: HAIKU_MODEL_ID,
    },
    create: () => createBedrockFormShaper({ model: HAIKU_MODEL_ID }),
  })

  registry.register({
    id: 'bedrock-opus',
    metadata: {
      name: 'Claude Opus 4.6',
      description:
        'Frontier model. Highest quality for complex multi-step shaping.',
      status: 'experimental',
      courseTopics: ['llm-integration', 'form-authoring', 'model-selection'],
      catalogPath: '/catalog/experiments/shaping-model-comparison/opus',
      modelId: OPUS_MODEL_ID,
    },
    create: () => createBedrockFormShaper({ model: OPUS_MODEL_ID }),
  })

  registry.setDefault('bedrock-sonnet')

  return registry
}
