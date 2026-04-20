import { StrategyRegistry } from '../../shared/strategy-registry'
import {
  createBedrockPdfExtractor,
  createToolUsePdfExtractor,
  type PdfExtractor,
} from '../form-documents'
import { exemplars } from './exemplars'
import {
  HAIKU_MODEL_ID,
  LLAMA_3_2_VISION_MODEL_ID,
  NOVA_LITE_MODEL_ID,
  NOVA_PRO_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from './models'
import { getRagRetriever } from './rag-corpus'

export function createExtractorRegistry(): StrategyRegistry<PdfExtractor> {
  const registry = new StrategyRegistry<PdfExtractor>()
  const [nestedGroupsExemplar] = exemplars

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
        'Previous default. Good balance of recall (55%), precision (87%), and speed. Handles most government forms well at moderate cost. Superseded by Sonnet hybrid prompt, which wins on every metric at the same cost.',
      status: 'experimental',
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
    id: 'sonnet-temperature-zero',
    metadata: {
      name: 'Claude Sonnet 4 (temperature=0)',
      description:
        'Baseline Sonnet prompt with temperature=0. Ablates the "free optimization" lever from Assignment 10: deterministic output at zero marginal cost.',
      status: 'experimental',
      courseTopics: ['evaluation', 'prompt-optimization', 'determinism'],
      catalogPath:
        '/catalog/experiments/pdf-field-extraction/sonnet-temperature-zero',
      modelId: SONNET_MODEL_ID,
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
    },
    create: () =>
      createBedrockPdfExtractor({ model: SONNET_MODEL_ID, temperature: 0 }),
  })

  registry.register({
    id: 'sonnet-hybrid-v1',
    metadata: {
      name: 'Claude Sonnet 4 (hybrid prompt)',
      description:
        'Recommended default. Concise instructions + 1 exemplar + temperature=0. Pareto-dominates every prompt-only variant: 73% recall, 99% precision, 51% sensitivity — wins four of five metrics at baseline Sonnet cost. Ports the Assignment 10 hybrid-v2 strategy to PDF extraction.',
      status: 'production',
      courseTopics: ['evaluation', 'prompt-optimization', 'few-shot'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1',
      modelId: SONNET_MODEL_ID,
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
    },
    create: () => {
      if (!nestedGroupsExemplar) {
        throw new Error(
          'sonnet-hybrid-v1: nested-groups exemplar missing from exemplars[]',
        )
      }
      return createBedrockPdfExtractor({
        model: SONNET_MODEL_ID,
        temperature: 0,
        promptVariant: 'hybrid',
        hybridExemplar: nestedGroupsExemplar,
      })
    },
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

  registry.register({
    id: 'sonnet-with-rag',
    metadata: {
      name: 'Claude Sonnet 4 (RAG)',
      description:
        'Retrieves policy excerpts (CFR/USC) from a curated corpus and prepends them to the extraction prompt as grounding context. Tests whether regulatory grounding improves sensitivity labelling and type accuracy on government forms.',
      status: 'experimental',
      courseTopics: ['evaluation', 'rag', 'retrieval'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/sonnet-with-rag',
      modelId: SONNET_MODEL_ID,
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
    },
    create: () =>
      createBedrockPdfExtractor({
        model: SONNET_MODEL_ID,
        retriever: getRagRetriever(),
        retrievalK: 2,
      }),
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
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 },
    },
    create: () => createToolUsePdfExtractor({ model: SONNET_MODEL_ID }),
  })

  registry.register({
    id: 'nova-pro',
    metadata: {
      name: 'Amazon Nova Pro',
      description:
        'Amazon multimodal model at 1/4 the cost of Sonnet. Supports PDF input natively. Coursework showed 97-100% on simple tool-calling tasks. Tests whether a non-Claude model can handle government form extraction.',
      status: 'experimental',
      courseTopics: ['evaluation', 'model-selection', 'cost-optimization'],
      catalogPath: '/catalog/experiments/pdf-field-extraction/nova-pro',
      modelId: NOVA_PRO_MODEL_ID,
      pricing: { inputPer1k: 0.0008, outputPer1k: 0.0032 },
    },
    create: () =>
      createBedrockPdfExtractor({
        model: NOVA_PRO_MODEL_ID,
        maxOutputTokens: 10000,
      }),
  })

  registry.register({
    id: 'nova-lite',
    metadata: {
      name: 'Amazon Nova Lite',
      description:
        'Amazon multimodal model at a fraction of Nova Pro cost. Supports PDF input natively. Probes the lower bound of non-Anthropic capability on document-understanding tasks — a capability-boundary probe rather than a production candidate.',
      status: 'experimental',
      courseTopics: [
        'evaluation',
        'model-selection',
        'cost-optimization',
        'capability-boundaries',
      ],
      catalogPath: '/catalog/experiments/pdf-field-extraction/nova-lite',
      modelId: NOVA_LITE_MODEL_ID,
      pricing: { inputPer1k: 0.00006, outputPer1k: 0.00024 },
    },
    create: () =>
      createBedrockPdfExtractor({
        model: NOVA_LITE_MODEL_ID,
        maxOutputTokens: 10000,
      }),
  })

  registry.register({
    id: 'llama-3-2-vision',
    metadata: {
      name: 'Meta Llama 3.2 90B Vision',
      description:
        'Meta Llama 3.2 90B Instruct (vision) via Bedrock. Non-Anthropic, non-Amazon multimodal option. Tests whether an open-weights vision model can decompose a government form into granular fields.',
      status: 'experimental',
      courseTopics: [
        'evaluation',
        'model-selection',
        'cost-optimization',
        'capability-boundaries',
      ],
      catalogPath: '/catalog/experiments/pdf-field-extraction/llama-3-2-vision',
      modelId: LLAMA_3_2_VISION_MODEL_ID,
      pricing: { inputPer1k: 0.002, outputPer1k: 0.002 },
    },
    create: () =>
      createBedrockPdfExtractor({
        model: LLAMA_3_2_VISION_MODEL_ID,
        maxOutputTokens: 8000,
      }),
  })

  registry.setDefault('sonnet-hybrid-v1')
  return registry
}
