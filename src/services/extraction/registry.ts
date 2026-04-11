import type { PdfExtractor } from '../pdf-extractor'
import { createBedrockPdfExtractor } from '../pdf-extractor'
import { StrategyRegistry } from '../strategy-registry'
import { HAIKU_MODEL_ID, OPUS_MODEL_ID, SONNET_MODEL_ID } from './models'

export function createExtractorRegistry(): StrategyRegistry<PdfExtractor> {
  const registry = new StrategyRegistry<PdfExtractor>()

  registry.register({
    id: 'opus-baseline',
    metadata: {
      name: 'Claude Opus 4.6',
      description:
        'Frontier model, highest quality. Used as ground truth reference.',
      status: 'baseline',
      courseTopics: ['evaluation'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/baseline-opus',
      modelId: OPUS_MODEL_ID,
    },
    create: () => createBedrockPdfExtractor({ model: OPUS_MODEL_ID }),
  })

  registry.register({
    id: 'sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description: 'Balanced quality and speed. Current default.',
      status: 'production',
      courseTopics: ['evaluation', 'model-selection'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/sonnet',
      modelId: SONNET_MODEL_ID,
    },
    create: () => createBedrockPdfExtractor({ model: SONNET_MODEL_ID }),
  })

  registry.register({
    id: 'haiku',
    metadata: {
      name: 'Claude Haiku 4.5',
      description: 'Fast and cheap. Lower accuracy for complex forms.',
      status: 'experimental',
      courseTopics: ['evaluation', 'model-selection'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/haiku',
      modelId: HAIKU_MODEL_ID,
    },
    create: () => createBedrockPdfExtractor({ model: HAIKU_MODEL_ID }),
  })

  registry.setDefault('sonnet')
  return registry
}
