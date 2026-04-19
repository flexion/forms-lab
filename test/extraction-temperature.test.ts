import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as aiModule from 'ai'

const mockGenerateText = mock()
// Re-export the full `ai` module, only overriding `generateText`. Bun's
// `mock.module` is process-global, so trimming exports would break any
// later test whose transitive imports touch `tool`, `stepCountIs`, etc.
mock.module('ai', () => ({
  ...aiModule,
  generateText: mockGenerateText,
}))

const mockBedrockModel = 'bedrock-model-instance'
const mockBedrock = mock(() => mockBedrockModel)
mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => mockBedrock),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: mock(() => () => Promise.resolve({})),
}))

// enumerateFields is left unmocked: a non-PDF Buffer causes pdf-lib to
// throw, and field-mapping.ts catches that and returns []. This keeps
// Step 3 a no-op without registering a mock that would leak into other
// test files (Bun's mock.module is process-global).

// Import after mocks are registered
const { createBedrockPdfExtractor } = await import(
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
  // Step 1: extraction, Step 2: formSpec, Step 3: field mapping not called
  // because enumerateFields returns []
  mockGenerateText.mockResolvedValueOnce({ text: validExtractionResponse })
  mockGenerateText.mockResolvedValueOnce({ text: validFormSpecResponse })
}

describe('createBedrockPdfExtractor — temperature option', () => {
  beforeEach(() => {
    mockGenerateText.mockClear()
    mockBedrock.mockClear()
  })

  it('propagates temperature to the Step 1 generateText call', async () => {
    const extractor = createBedrockPdfExtractor({
      model: 'sonnet',
      temperature: 0,
    })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'))

    expect(mockGenerateText).toHaveBeenCalled()
    const step1Call = mockGenerateText.mock.calls[0][0]
    expect(step1Call.temperature).toBe(0)
  })

  it('leaves temperature unset when the option is omitted', async () => {
    const extractor = createBedrockPdfExtractor({ model: 'sonnet' })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'))

    const step1Call = mockGenerateText.mock.calls[0][0]
    expect(step1Call.temperature).toBeUndefined()
  })

  it('does not apply temperature to Step 2 (formSpec generation)', async () => {
    const extractor = createBedrockPdfExtractor({
      model: 'sonnet',
      temperature: 0,
    })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'))

    // Step 2 uses the shared generateFormSpec helper which should not
    // inherit the extractor's temperature (we're measuring the extraction
    // prompt specifically, not the downstream steps).
    const step2Call = mockGenerateText.mock.calls[1][0]
    expect(step2Call.temperature).toBeUndefined()
  })
})
