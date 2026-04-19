// test/form-authoring/integration.test.ts
import { describe, expect, mock, test, beforeEach } from 'bun:test'

const mockGenerateObject = mock()
const mockGenerateText = mock()

mock.module('ai', () => ({
  generateObject: mockGenerateObject,
  generateText: mockGenerateText,
  tool: mock((config: any) => config),
  embed: mock(),
  stepCountIs: mock(() => ({ type: 'step-count' })),
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
const { createAuthoringEvaluator } = await import(
  '../../src/services/form-authoring/evaluator'
)
const { loadPolicyCorpus } = await import('../../src/services/rag')

describe('full pipeline round-trip', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
    mockGenerateText.mockReset()
  })

  test('stage 1 -> 2 -> 3 -> 4 produces commands and eval results', async () => {
    // Stage 1: criteria
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        { id: 'exp-screening', text: 'Must screen for expedited processing', source: '7 CFR 273.2(i)' },
        { id: 'household-comp', text: 'Must collect household composition', source: '7 CFR 273.1(b)' },
      ],
    })

    const pipeline = createAuthoringPipeline()
    const corpus = loadPolicyCorpus({ slug: 'snap-wisconsin' })
    const criteria = await pipeline.analyzeCriteria(corpus)
    expect(criteria).toHaveLength(2)
    expect(criteria[0].status).toBe('pending')

    // Stage 2: structure
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        { toolName: 'addPage', input: { title: 'Screening' } },
        { toolName: 'addGroup', input: { pageId: 'page-new-1', title: 'Expedited Screening' } },
        { toolName: 'addPage', input: { title: 'Household' } },
        { toolName: 'addGroup', input: { pageId: 'page-new-2', title: 'Household Members' } },
      ],
      text: 'Created screening and household pages.',
    })

    const approvedCriteria = criteria.map((c) => ({ ...c, status: 'approved' as const }))
    const structure = await pipeline.planStructure(approvedCriteria, corpus, null)
    expect(structure.commands).toHaveLength(4)
    expect(structure.commands[0].kind).toBe('addPage')

    // Stage 3: section generation
    mockGenerateText.mockResolvedValueOnce({
      toolCalls: [
        {
          toolName: 'addField',
          input: {
            groupId: 'screening-group',
            label: 'Monthly income below $150?',
            fieldType: 'boolean',
            required: true,
          },
        },
      ],
      text: 'Added expedited screening fields.',
    })

    const section = await pipeline.generateSection(
      'screening-group',
      'Expedited Screening',
      approvedCriteria,
      corpus,
    )
    expect(section.commands).toHaveLength(1)
    expect(section.commands[0].kind).toBe('addField')

    // Stage 4: evaluation
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        {
          criterionId: 'exp-screening',
          pass: true,
          explanation: 'Screening question addresses expedited criteria.',
        },
      ],
    })

    const evaluator = createAuthoringEvaluator()
    const state = {
      formSpec: {
        id: 'f1',
        specId: 's1',
        title: 'SNAP',
        pages: [{ id: 'p1', title: 'Screening', groups: ['screening-group'] }],
      },
      dataSpec: {
        id: 's1',
        title: 'SNAP',
        description: '',
        groups: [
          {
            id: 'screening-group',
            title: 'Expedited Screening',
            requirements: [
              {
                id: 'f1',
                label: 'Monthly income below $150?',
                fieldType: 'boolean',
                required: true,
              },
            ],
          },
        ],
      },
    }
    const evalResults = await evaluator.evaluateSection(
      'screening-group',
      state,
      approvedCriteria,
      corpus,
    )
    expect(evalResults).toHaveLength(1)
    expect(evalResults[0].pass).toBe(true)
  })
})
