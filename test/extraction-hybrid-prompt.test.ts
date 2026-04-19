import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as credentialsModule from '@aws-sdk/credential-providers'
import * as aiModule from 'ai'
import type { ExtractionExemplar } from '../src/services/extraction/exemplars'
import { exemplars } from '../src/services/extraction/exemplars'
import { buildExemplarSection } from '../src/services/form-documents/extraction'
import { buildHybridExtractionPrompt } from '../src/services/form-documents/hybrid-extraction-prompt'

const mockGenerateText = mock()
// Bun's `mock.module` is process-global — re-export every real binding so we
// don't trim symbols that later tests import transitively (e.g. `fromIni`
// from `@aws-sdk/credential-providers`, imported by the shaping code).
mock.module('ai', () => ({
  ...aiModule,
  generateText: mockGenerateText,
}))

mock.module('@aws-sdk/credential-providers', () => ({
  ...credentialsModule,
  fromNodeProviderChain: mock(() => () => Promise.resolve({})),
}))

const { createBedrockPdfExtractor } = await import(
  '../src/services/form-documents/extraction'
)

const stubExtraction = JSON.stringify({
  spec: {
    id: 'x',
    title: 'X',
    description: 'x',
    groups: [
      {
        id: 'g',
        title: 'G',
        requirements: [
          {
            id: 'f',
            fieldName: 'f',
            label: 'F',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  confidence: [{ fieldId: 'f', confidence: 0.9 }],
})

const stubFormSpec = JSON.stringify({
  id: 'form-x',
  specId: 'x',
  title: 'X',
  pages: [{ id: 'p1', title: 'P', groups: ['g'], deliveryMode: 'static' }],
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
})

function mockPipelineResponses(): void {
  mockGenerateText.mockResolvedValueOnce({ text: stubExtraction })
  mockGenerateText.mockResolvedValueOnce({ text: stubFormSpec })
}

function getStep1PromptText(): string {
  const step1Call = mockGenerateText.mock.calls[0][0]
  const textPart = step1Call.messages[0].content.find(
    (p: { type: string }) => p.type === 'text',
  )
  return textPart?.text ?? ''
}

const sampleExemplar: ExtractionExemplar = {
  id: 'nested-groups-sample',
  description: 'Employment history with current/previous sub-sections',
  rationale: 'Demonstrates nested grouping',
  input:
    'Section 4: Employment History. Sub-section A — Current Employment: Employer Name, Job Title.',
  output: JSON.stringify({
    id: 'employment-history',
    title: 'Employment History',
    groups: [
      {
        id: 'current-employment',
        title: 'Current Employment',
        requirements: [
          {
            id: 'current-employer-name',
            fieldName: 'currentEmployerName',
            label: 'Employer Name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  }),
}

describe('buildHybridExtractionPrompt', () => {
  it('includes the three top-level section headers', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toContain('## Example')
    expect(prompt).toContain('## Schema')
    expect(prompt).toContain('## Your extraction')
  })

  it('uses singular `## Example` — not the plural `## Examples` heading from the baseline few-shot appendix', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    // The baseline `buildExemplarSection` uses `## Examples` (plural).
    // The hybrid prompt is a self-contained rewrite, not an appendix,
    // so it must use the singular heading.
    expect(prompt).not.toContain('## Examples')
  })

  it('embeds the exemplar input verbatim', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toContain(sampleExemplar.input)
  })

  it('embeds a recognizable key from the exemplar output JSON', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toContain('currentEmployerName')
    expect(prompt).toContain('current-employment')
  })

  it('includes schema guidance for kebab-case ids and camelCase fieldNames', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toMatch(/kebab-case/i)
    expect(prompt).toMatch(/camelCase/i)
  })

  it('instructs the model to return ONLY the JSON', () => {
    const prompt = buildHybridExtractionPrompt(sampleExemplar)
    expect(prompt).toMatch(/ONLY the JSON/i)
  })

  it('is measurably shorter than the baseline prompt plus the 3-exemplar few-shot appendix', () => {
    // Sanity check on the "concise" claim. The hybrid prompt ships one
    // example inline; the baseline plus 3 few-shot exemplars is the
    // bulkiest competitor in the suite.
    const [nestedGroupsExemplar] = exemplars
    if (!nestedGroupsExemplar) throw new Error('exemplar 0 missing')
    const hybrid = buildHybridExtractionPrompt(nestedGroupsExemplar)
    const fewShotAppendix = buildExemplarSection(exemplars)
    expect(hybrid.length).toBeLessThan(fewShotAppendix.length)
  })
})

describe('createBedrockPdfExtractor — promptVariant wiring', () => {
  beforeEach(() => {
    mockGenerateText.mockClear()
  })

  it('uses the hybrid prompt on Step 1 when promptVariant="hybrid"', async () => {
    const [nestedGroupsExemplar] = exemplars
    if (!nestedGroupsExemplar) throw new Error('exemplar 0 missing')
    const extractor = createBedrockPdfExtractor({
      model: 'sonnet',
      promptVariant: 'hybrid',
      hybridExemplar: nestedGroupsExemplar,
    })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'))

    const text = getStep1PromptText()
    expect(text).toContain('## Example')
    expect(text).toContain('## Your extraction')
    // The hybrid prompt is self-contained — it must not carry the
    // baseline's appendix heading.
    expect(text).not.toContain('## Examples')
    // Should embed the nested-groups exemplar content.
    expect(text).toContain('currentEmployerName')
  })

  it('uses the baseline prompt on Step 1 when promptVariant is omitted', async () => {
    const extractor = createBedrockPdfExtractor({ model: 'sonnet' })
    mockPipelineResponses()

    await extractor.extract(Buffer.from('fake-pdf'))

    const text = getStep1PromptText()
    // Baseline prompt cues: numbered guidelines block.
    expect(text).toContain('Guidelines:')
    expect(text).not.toContain('## Example')
  })
})
