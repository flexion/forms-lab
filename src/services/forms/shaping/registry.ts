import { StrategyRegistry } from '../../strategy-registry'
import { createBedrockFormShaper } from './bedrock-shaper'
import type { FormShaper } from './types'

export function createShapingRegistry(): StrategyRegistry<FormShaper> {
  const registry = new StrategyRegistry<FormShaper>()

  registry.register({
    id: 'bedrock-sonnet',
    metadata: {
      name: 'Sonnet (Bedrock)',
      description:
        'Claude Sonnet via AWS Bedrock — fast interactive form shaping',
      status: 'baseline',
      courseTopics: ['llm-integration', 'form-authoring'],
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    },
    create: () => createBedrockFormShaper(),
  })

  return registry
}
