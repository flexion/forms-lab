import type { PdfExtractor } from '../form-documents/extraction'
import { createBedrockPdfExtractor } from '../form-documents/extraction'
import { createToolUsePdfExtractor } from '../form-documents/tool-use-extraction'
import { StrategyRegistry } from '../strategy-registry'
import { HAIKU_MODEL_ID, OPUS_MODEL_ID, SONNET_MODEL_ID } from './models'

export function createExtractorRegistry(): StrategyRegistry<PdfExtractor> {
  const registry = new StrategyRegistry<PdfExtractor>()

  registry.register({
    id: 'opus-baseline',
    metadata: {
      name: 'Claude Opus 4.6',
      description:
        'Frontier model used as ground truth reference. Highest recall (72%) and strongest overall accuracy, but slowest and most expensive per extraction.',
      status: 'baseline',
      courseTopics: ['evaluation'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/opus-baseline',
      modelId: OPUS_MODEL_ID,
    },
    create: () => createBedrockPdfExtractor({ model: OPUS_MODEL_ID }),
  })

  registry.register({
    id: 'sonnet',
    metadata: {
      name: 'Claude Sonnet 4',
      description:
        'Recommended default. Good balance of recall (55%), precision (87%), and speed. Handles most government forms well at moderate cost.',
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
      description:
        'Fastest and cheapest option. Adequate for simple forms but misses fields on complex multi-page documents. Best for quick iteration when accuracy is less critical.',
      status: 'experimental',
      courseTopics: ['evaluation', 'model-selection'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/haiku',
      modelId: HAIKU_MODEL_ID,
    },
    create: () => createBedrockPdfExtractor({ model: HAIKU_MODEL_ID }),
  })

  registry.register({
    id: 'tool-use-sonnet',
    metadata: {
      name: 'Claude Sonnet 4 (tool-use)',
      description:
        'Uses structured tool calls instead of free-form JSON, eliminating malformed output. Very high precision (96%) and sensitivity accuracy (79%), but lower recall (35%) on large forms due to step limits. Best when output correctness matters more than completeness.',
      status: 'experimental',
      courseTopics: ['evaluation', 'constrained-generation', 'tool-use'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/tool-use-sonnet',
      modelId: SONNET_MODEL_ID,
    },
    create: () => createToolUsePdfExtractor({ model: SONNET_MODEL_ID }),
  })

  registry.setDefault('sonnet')
  return registry
}
