import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as bedrockModule from '@ai-sdk/amazon-bedrock'
import * as credentialsModule from '@aws-sdk/credential-providers'
import * as aiModule from 'ai'

// Bun's `mock.module` is process-global. Re-export every real binding and
// override only what we need. See test/extraction-temperature.test.ts for
// rationale.
const mockEmbed = mock()
mock.module('ai', () => ({
  ...aiModule,
  embed: mockEmbed,
}))

const mockEmbeddingModel = 'embedding-model-instance'
const mockEmbeddingModelFactory = mock(() => mockEmbeddingModel)
const mockBedrock = { embeddingModel: mockEmbeddingModelFactory }
const mockCreateAmazonBedrock = mock(() => mockBedrock)
mock.module('@ai-sdk/amazon-bedrock', () => ({
  ...bedrockModule,
  createAmazonBedrock: mockCreateAmazonBedrock,
}))

mock.module('@aws-sdk/credential-providers', () => ({
  ...credentialsModule,
  fromNodeProviderChain: mock(() => () => Promise.resolve({})),
}))

const { createTitanEmbedder } = await import(
  '../src/services/rag/titan-embedder'
)

describe('createTitanEmbedder', () => {
  beforeEach(() => {
    mockEmbed.mockClear()
    mockEmbeddingModelFactory.mockClear()
    mockCreateAmazonBedrock.mockClear()
  })

  it('uses titan-embed-text-v2 by default', async () => {
    const embedder = createTitanEmbedder()
    mockEmbed.mockResolvedValueOnce({ embedding: [0.1, 0.2, 0.3] })

    await embedder.embed('hello')

    expect(mockEmbeddingModelFactory).toHaveBeenCalledWith(
      'amazon.titan-embed-text-v2:0',
    )
  })

  it('passes the text through and returns the embedding vector', async () => {
    const embedder = createTitanEmbedder()
    const expected = [0.11, 0.22, 0.33]
    mockEmbed.mockResolvedValueOnce({ embedding: expected })

    const result = await embedder.embed('foo bar')

    expect(mockEmbed).toHaveBeenCalled()
    const call = mockEmbed.mock.calls[0][0]
    expect(call.value).toBe('foo bar')
    expect(call.model).toBe(mockEmbeddingModel)
    expect(result).toEqual(expected)
  })

  it('accepts a custom model id', async () => {
    const embedder = createTitanEmbedder({ model: 'amazon.titan-embed-text-v1' })
    mockEmbed.mockResolvedValueOnce({ embedding: [0] })

    await embedder.embed('x')

    expect(mockEmbeddingModelFactory).toHaveBeenCalledWith(
      'amazon.titan-embed-text-v1',
    )
  })
})
