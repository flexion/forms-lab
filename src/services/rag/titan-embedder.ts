/**
 * Bedrock Titan text-embedding implementation of the Embedder interface.
 *
 * Uses `amazon.titan-embed-text-v2:0` by default — 1024-dim, L2-normalised
 * vectors, supported in us-east-1 under the same Bedrock access we already
 * rely on for extraction. The `embed` call is a thin wrapper around the
 * `ai` SDK's embedding API so test mocks operate at the same seam as the
 * rest of the pipeline.
 */

import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { embed } from 'ai'
import type { Embedder } from './retrieval'

export interface TitanEmbedderOptions {
  /**
   * Override the embedding model id. Defaults to the recommended v2
   * model; use v1 if a deployment is pinned to it.
   */
  model?: string
  /** Override the Bedrock region — defaults to AWS_BEDROCK_REGION / AWS_REGION. */
  region?: string
}

const DEFAULT_MODEL = 'amazon.titan-embed-text-v2:0'

export function createTitanEmbedder(options: TitanEmbedderOptions = {}): Embedder {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region:
      options.region ?? process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  const embeddingModel = bedrock.embeddingModel(options.model ?? DEFAULT_MODEL)

  return {
    async embed(text: string): Promise<number[]> {
      const result = await embed({ model: embeddingModel, value: text })
      return result.embedding
    },
  }
}
