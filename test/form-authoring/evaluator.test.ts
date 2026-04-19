// test/form-authoring/evaluator.test.ts
import { describe, expect, mock, test, beforeEach } from 'bun:test'
import * as aiModule from 'ai'
import * as bedrockModule from '@ai-sdk/amazon-bedrock'
import * as credentialsModule from '@aws-sdk/credential-providers'
import type { Criterion } from '../../src/services/form-authoring/types'

const mockGenerateObject = mock()

mock.module('ai', () => ({
  ...aiModule,
  generateObject: mockGenerateObject,
}))

mock.module('@ai-sdk/amazon-bedrock', () => ({
  ...bedrockModule,
  createAmazonBedrock: mock(() => (model: string) => ({ modelId: model })),
}))

mock.module('@aws-sdk/credential-providers', () => ({
  ...credentialsModule,
  fromIni: mock(() => ({})),
  fromNodeProviderChain: mock(() => ({})),
}))

const { createAuthoringEvaluator } = await import(
  '../../src/services/form-authoring/evaluator'
)

const sampleState = {
  formSpec: {
    id: 'f1',
    specId: 's1',
    title: 'SNAP Application',
    pages: [{ id: 'p1', title: 'Income', groups: ['income-group'] }],
  },
  dataSpec: {
    id: 's1',
    title: 'SNAP',
    description: '',
    groups: [
      {
        id: 'income-group',
        title: 'Income Information',
        requirements: [
          {
            id: 'f1',
            fieldName: 'monthlyEarnedIncome',
            label: 'Monthly earned income',
            fieldType: 'currency' as const,
            required: true,
          },
        ],
      },
    ],
  },
}

const criteria: Criterion[] = [
  {
    id: 'income-types',
    text: 'Must distinguish earned vs unearned income',
    source: '7 CFR 273.9(b)',
    status: 'approved',
  },
]

describe('evaluateSection', () => {
  beforeEach(() => {
    mockGenerateObject.mockReset()
  })

  test('returns pass/fail results per criterion', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: [
        {
          criterionId: 'income-types',
          pass: false,
          explanation: 'Missing unearned income distinction',
        },
      ],
    })

    const evaluator = createAuthoringEvaluator()
    const result = await evaluator.evaluateSection(
      'income-group',
      sampleState,
      criteria,
      [],
    )
    expect(result).toHaveLength(1)
    expect(result[0].pass).toBe(false)
    expect(result[0].criterionId).toBe('income-types')
  })

  test('returns empty array when no criteria are relevant', async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: [],
    })

    const evaluator = createAuthoringEvaluator()
    const result = await evaluator.evaluateSection(
      'income-group',
      sampleState,
      [],
      [],
    )
    expect(result).toHaveLength(0)
  })
})
