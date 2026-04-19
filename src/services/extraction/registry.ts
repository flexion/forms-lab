import type { PdfExtractor } from '../form-documents/extraction'
import { createBedrockPdfExtractor } from '../form-documents/extraction'
import { StrategyRegistry } from '../strategy-registry'
import { exemplars } from './exemplars'
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
      pricing: { inputPer1k: 0.015, outputPer1k: 0.075 },
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
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
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
      pricing: { inputPer1k: 0.0008, outputPer1k: 0.004 },
    },
    create: () => createBedrockPdfExtractor({ model: HAIKU_MODEL_ID }),
  })

  registry.register({
    id: 'few-shot-sonnet',
    metadata: {
      name: 'Claude Sonnet 4 (few-shot)',
      description:
        'Sonnet with curated examples that teach edge cases (nested groups, PII sensitivity, conditional fields). Higher precision (87%) than baseline Sonnet with improved sensitivity classification. Best when extraction accuracy on complex sections matters more than total field count.',
      status: 'experimental',
      courseTopics: ['evaluation', 'few-shot', 'prompt-conditioning'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/few-shot-sonnet',
      modelId: SONNET_MODEL_ID,
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
    },
    create: () =>
      createBedrockPdfExtractor({ model: SONNET_MODEL_ID, exemplars }),
  })

  registry.setDefault('sonnet')
  return registry
}
