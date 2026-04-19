import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../src/services/data-collection'
import {
  evaluationRunSchema,
  pdfFieldExtractionKind,
  runEvaluation,
} from '../src/services/evaluation'
import type { PdfExtractor } from '../src/services/form-documents/extraction'

const groundTruth: DataCollectionSpec = {
  id: 'test-spec',
  title: 'Test Form',
  description: 'A test form',
  groups: [
    {
      id: 'personal',
      title: 'Personal Info',
      requirements: [
        {
          id: 'f1',
          fieldName: 'fullName',
          label: 'Full Name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'f2',
          fieldName: 'email',
          label: 'Email',
          fieldType: 'email',
          required: true,
        },
      ],
    },
  ],
}

function makeStubExtractor(output: DataCollectionSpec): PdfExtractor {
  return {
    async extract() {
      return {
        spec: output,
        formSpec: {
          id: 'f',
          specId: 'test',
          title: 'Test',
          pages: [],
          createdAt: '',
          updatedAt: '',
        },
        confidence: [],
        fieldMapping: {},
      }
    },
  }
}

describe('runEvaluation', () => {
  it('produces a valid RunResult from a stub extractor', async () => {
    const extractor = makeStubExtractor(groundTruth)
    const fixtures = [
      { slug: 'test-fixture', pdf: Buffer.from('fake-pdf'), groundTruth },
    ]

    const result = await runEvaluation({
      kind: pdfFieldExtractionKind,
      extractor,
      fixtures,
      implementation: 'stub',
      specVersion: '2026-04-11',
      model: 'stub-model',
    })

    expect(result.kind).toBe('pdf-field-extraction')
    expect(result.implementation).toBe('stub')
    expect(result.status).toBe('current')
    expect(result.cases).toHaveLength(1)
    expect(result.cases[0].fixture).toBe('test-fixture')
    expect(result.summary.fieldRecall).toBe(1.0)

    // Validate against schema
    const parsed = evaluationRunSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('handles multiple fixtures', async () => {
    const partialSpec: DataCollectionSpec = {
      ...groundTruth,
      groups: [
        {
          id: 'personal',
          title: 'Personal Info',
          requirements: [groundTruth.groups[0].requirements[0]], // Only fullName
        },
      ],
    }
    const extractor = makeStubExtractor(partialSpec)
    const fixtures = [
      { slug: 'fixture-a', pdf: Buffer.from('a'), groundTruth },
      { slug: 'fixture-b', pdf: Buffer.from('b'), groundTruth },
    ]

    const result = await runEvaluation({
      kind: pdfFieldExtractionKind,
      extractor,
      fixtures,
      implementation: 'partial',
      specVersion: '2026-04-11',
      model: 'stub',
    })

    expect(result.cases).toHaveLength(2)
    expect(result.summary.fieldRecall).toBeCloseTo(0.5, 2)
  })
})
