import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as bedrockModule from '@ai-sdk/amazon-bedrock'
import * as credentialsModule from '@aws-sdk/credential-providers'
import * as aiModule from 'ai'
import type { PolicyChunk, PolicyRetriever } from '../src/services/rag'

const mockGenerateText = mock()
mock.module('ai', () => ({
  ...aiModule,
  generateText: mockGenerateText,
}))

const mockBedrockModel = 'bedrock-model-instance'
const mockBedrock = mock(() => mockBedrockModel)
mock.module('@ai-sdk/amazon-bedrock', () => ({
  ...bedrockModule,
  createAmazonBedrock: mock(() => mockBedrock),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  ...credentialsModule,
  fromNodeProviderChain: mock(() => () => Promise.resolve({})),
}))

const { buildPolicyContextSection, createBedrockPdfExtractor } = await import(
  '../src/services/form-documents/extraction'
)

const validExtractionResponse = JSON.stringify({
  spec: {
    id: 'test-spec',
    title: 'Test',
    description: 'A test',
    groups: [
      {
        id: 'g1',
        title: 'Group',
        requirements: [
          {
            id: 'f1',
            fieldName: 'firstName',
            label: 'First',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  confidence: [{ fieldId: 'f1', confidence: 0.95 }],
})

const validFormSpecResponse = JSON.stringify({
  id: 'form-test-spec',
  specId: 'test-spec',
  title: 'Test',
  pages: [
    { id: 'page-1', title: 'Page', groups: ['g1'], deliveryMode: 'static' },
  ],
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
})

function mockPipelineResponses(): void {
  mockGenerateText.mockResolvedValueOnce({ text: validExtractionResponse })
  mockGenerateText.mockResolvedValueOnce({ text: validFormSpecResponse })
}

const sampleChunks: PolicyChunk[] = [
  {
    id: 'i-9/1',
    source: '8 CFR 274a.2(b)(1)(i)',
    title: 'USCIS Form I-9',
    text: 'Within three business days of the hire, the employer shall physically examine the original document or documents presented.',
    formSlug: 'i-9',
  },
  {
    id: 'i-9/2',
    source: '8 CFR 274a.2(b)(1)(v)',
    title: 'USCIS Form I-9',
    text: 'List A documents include a U.S. passport, a Permanent Resident Card, and an Employment Authorization Document.',
    formSlug: 'i-9',
  },
]

function stubRetriever(chunks: PolicyChunk[]): PolicyRetriever {
  return {
    async retrieve(_query: string, k: number): Promise<PolicyChunk[]> {
      return chunks.slice(0, k)
    },
  }
}

describe('buildPolicyContextSection', () => {
  it('returns empty string when no chunks are provided', () => {
    expect(buildPolicyContextSection([])).toBe('')
  })

  it('includes a ## Policy Context heading', () => {
    const section = buildPolicyContextSection(sampleChunks)
    expect(section).toContain('## Policy Context')
  })

  it('renders each chunk source and verbatim text', () => {
    const section = buildPolicyContextSection(sampleChunks)
    expect(section).toContain('8 CFR 274a.2(b)(1)(i)')
    expect(section).toContain('three business days')
    expect(section).toContain('8 CFR 274a.2(b)(1)(v)')
    expect(section).toContain('List A documents')
  })
})

describe('createBedrockPdfExtractor — retriever option', () => {
  beforeEach(() => {
    mockGenerateText.mockClear()
    mockBedrock.mockClear()
  })

  it('prepends the Policy Context section to the Step-1 prompt when a retriever is provided', async () => {
    const extractor = createBedrockPdfExtractor({
      model: 'sonnet',
      retriever: stubRetriever(sampleChunks),
      retrievalK: 2,
    })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'), { slug: 'i-9' })

    expect(mockGenerateText).toHaveBeenCalled()
    const step1Call = mockGenerateText.mock.calls[0][0]
    const promptText = step1Call.messages[0].content.find(
      (c: { type: string }) => c.type === 'text',
    ).text
    expect(promptText).toContain('## Policy Context')
    expect(promptText).toContain('8 CFR 274a.2(b)(1)(i)')
    expect(promptText).toContain('8 CFR 274a.2(b)(1)(v)')
  })

  it('omits the Policy Context section when no retriever is configured', async () => {
    const extractor = createBedrockPdfExtractor({ model: 'sonnet' })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'))

    const step1Call = mockGenerateText.mock.calls[0][0]
    const promptText = step1Call.messages[0].content.find(
      (c: { type: string }) => c.type === 'text',
    ).text
    expect(promptText).not.toContain('## Policy Context')
  })

  it('defaults retrieval to top-2 when retrievalK is omitted', async () => {
    const calls: Array<{ query: string; k: number }> = []
    const spyRetriever: PolicyRetriever = {
      async retrieve(query: string, k: number): Promise<PolicyChunk[]> {
        calls.push({ query, k })
        return sampleChunks.slice(0, k)
      },
    }
    const extractor = createBedrockPdfExtractor({
      model: 'sonnet',
      retriever: spyRetriever,
    })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'), { slug: 'i-9' })

    expect(calls).toHaveLength(1)
    expect(calls[0].k).toBe(2)
  })

  it('passes the extraction slug to the retriever as the query', async () => {
    const calls: Array<{ query: string }> = []
    const spyRetriever: PolicyRetriever = {
      async retrieve(query: string, k: number): Promise<PolicyChunk[]> {
        calls.push({ query })
        return sampleChunks.slice(0, k)
      },
    }
    const extractor = createBedrockPdfExtractor({
      model: 'sonnet',
      retriever: spyRetriever,
    })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'), { slug: 'i-9' })

    expect(calls[0].query).toBe('i-9')
  })
})
