import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { PolicyChunk } from '../../src/services/rag'

const mockGenerateObject = mock()
const mockGenerateText = mock()

mock.module('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
  tool: mock((def: any) => def),
  stepCountIs: mock(() => ({})),
  embed: mock(() => ({})),
}))

mock.module('@ai-sdk/amazon-bedrock', () => ({
  createAmazonBedrock: mock(() => (model: string) => ({ modelId: model })),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  fromIni: mock(() => ({})),
  fromNodeProviderChain: mock(() => ({})),
}))

const { createAuthoringPipeline } = await import(
  '../../src/services/form-authoring/pipeline'
)

const sampleChunks: PolicyChunk[] = [
  {
    id: 'snap/1',
    source: '7 CFR 273.2(i)',
    title: 'SNAP',
    text: 'Expedited service screening criteria.',
    formSlug: 'snap-wisconsin',
  },
]

describe('analyzeCriteria', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
  })

  test('returns criteria from LLM response', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        {
          id: 'exp-screening',
          text: 'Must screen for expedited processing',
          source: '7 CFR 273.2(i)',
        },
      ],
    })

    const pipeline = createAuthoringPipeline()
    const result = await pipeline.analyzeCriteria(sampleChunks)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('exp-screening')
    expect(result[0].status).toBe('pending')
  })
})

describe('planStructure', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
  })

  test('returns commands from tool calls', async () => {
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        { toolName: 'addPage', input: { title: 'Household Info' } },
        {
          toolName: 'addGroup',
          input: { pageId: 'page-new-abc', title: 'Members' },
        },
      ],
      text: 'Created household section.',
    })

    const pipeline = createAuthoringPipeline()
    const result = await pipeline.planStructure(
      [
        {
          id: 'c1',
          text: 'Collect household composition',
          source: '7 CFR 273.1(b)',
          status: 'approved',
        },
      ],
      sampleChunks,
      null,
    )
    expect(result.commands).toHaveLength(2)
    expect(result.commands[0].kind).toBe('addPage')
    expect(result.explanation).toBe('Created household section.')
  })
})

describe('generateSection', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
  })

  test('returns field commands for a group', async () => {
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        {
          toolName: 'addField',
          input: {
            groupId: 'income-group',
            label: 'Monthly earned income',
            fieldType: 'currency',
            required: true,
          },
        },
      ],
      text: 'Added income field.',
    })

    const pipeline = createAuthoringPipeline()
    const result = await pipeline.generateSection(
      'income-group',
      'Income Information',
      [],
      sampleChunks,
    )
    expect(result.commands).toHaveLength(1)
    expect(result.commands[0].kind).toBe('addField')
  })
})
