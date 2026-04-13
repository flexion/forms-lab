import { describe, expect, it } from 'bun:test'
import type {
  DataCollectionSpec,
  FieldType,
  SensitivityLevel,
} from '../src/services/data-collection/types'
import { pdfFieldExtractionKind } from '../src/services/evaluation/kinds/pdf-field-extraction'
import type { FieldConfidence } from '../src/services/ingestion/types'

function makeSpec(
  fields: Array<{
    id: string
    fieldName: string
    label: string
    fieldType: string
    group?: string
    sensitivity?: string
  }>,
): DataCollectionSpec {
  const groups = new Map<string, typeof fields>()
  for (const f of fields) {
    const g = f.group ?? 'default'
    if (!groups.has(g)) groups.set(g, [])
    const group = groups.get(g)
    if (group) group.push(f)
  }
  return {
    id: 'test-spec',
    title: 'Test',
    description: 'Test spec',
    groups: Array.from(groups.entries()).map(([gid, gfields]) => ({
      id: gid,
      title: gid,
      requirements: gfields.map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        label: f.label,
        fieldType: f.fieldType as FieldType,
        required: true,
        sensitivity: f.sensitivity as SensitivityLevel | undefined,
      })),
    })),
  }
}

interface ExtractionOutput {
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}

describe('pdfFieldExtractionKind', () => {
  it('scores perfect extraction with 100% metrics', () => {
    const groundTruth = makeSpec([
      {
        id: 'f1',
        fieldName: 'fullName',
        label: 'Full Name',
        fieldType: 'text',
        group: 'personal',
      },
      {
        id: 'f2',
        fieldName: 'email',
        label: 'Email',
        fieldType: 'email',
        group: 'personal',
      },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        {
          id: 'f1',
          fieldName: 'fullName',
          label: 'Full Name',
          fieldType: 'text',
          group: 'personal',
        },
        {
          id: 'f2',
          fieldName: 'email',
          label: 'Email',
          fieldType: 'email',
          group: 'personal',
        },
      ]),
      confidence: [
        { fieldId: 'f1', confidence: 0.95 },
        { fieldId: 'f2', confidence: 0.9 },
      ],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.fieldRecall).toBe(1.0)
    expect(result.metrics.fieldPrecision).toBe(1.0)
    expect(result.metrics.typeAccuracy).toBe(1.0)
  })

  it('detects missed fields (low recall)', () => {
    const groundTruth = makeSpec([
      {
        id: 'f1',
        fieldName: 'fullName',
        label: 'Full Name',
        fieldType: 'text',
      },
      { id: 'f2', fieldName: 'email', label: 'Email', fieldType: 'email' },
      { id: 'f3', fieldName: 'phone', label: 'Phone', fieldType: 'phone' },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        {
          id: 'f1',
          fieldName: 'fullName',
          label: 'Full Name',
          fieldType: 'text',
        },
      ]),
      confidence: [],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.fieldRecall).toBeCloseTo(1 / 3, 2)
    expect(result.metrics.fieldPrecision).toBe(1.0)
    expect(result.details.missed).toEqual(['email', 'phone'])
  })

  it('detects hallucinated fields (low precision)', () => {
    const groundTruth = makeSpec([
      {
        id: 'f1',
        fieldName: 'fullName',
        label: 'Full Name',
        fieldType: 'text',
      },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        {
          id: 'f1',
          fieldName: 'fullName',
          label: 'Full Name',
          fieldType: 'text',
        },
        {
          id: 'f2',
          fieldName: 'middleName',
          label: 'Middle Name',
          fieldType: 'text',
        },
        { id: 'f3', fieldName: 'suffix', label: 'Suffix', fieldType: 'text' },
      ]),
      confidence: [],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.fieldRecall).toBe(1.0)
    expect(result.metrics.fieldPrecision).toBeCloseTo(1 / 3, 2)
    expect(result.details.extra).toEqual(['middleName', 'suffix'])
  })

  it('detects type mismatches', () => {
    const groundTruth = makeSpec([
      { id: 'f1', fieldName: 'phone', label: 'Phone', fieldType: 'phone' },
      { id: 'f2', fieldName: 'email', label: 'Email', fieldType: 'email' },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        { id: 'f1', fieldName: 'phone', label: 'Phone', fieldType: 'text' },
        { id: 'f2', fieldName: 'email', label: 'Email', fieldType: 'email' },
      ]),
      confidence: [],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.typeAccuracy).toBe(0.5)
  })

  it('matches fields by normalized label when fieldName differs', () => {
    const groundTruth = makeSpec([
      {
        id: 'f1',
        fieldName: 'fullLegalName',
        label: 'Full Legal Name',
        fieldType: 'text',
      },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        {
          id: 'f1',
          fieldName: 'legalName',
          label: 'Full Legal Name',
          fieldType: 'text',
        },
      ]),
      confidence: [],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.fieldRecall).toBe(1.0)
  })

  it('measures sensitivity accuracy', () => {
    const groundTruth = makeSpec([
      {
        id: 'f1',
        fieldName: 'ssn',
        label: 'SSN',
        fieldType: 'text',
        sensitivity: 'pii',
      },
      {
        id: 'f2',
        fieldName: 'name',
        label: 'Name',
        fieldType: 'text',
        sensitivity: 'pii',
      },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        {
          id: 'f1',
          fieldName: 'ssn',
          label: 'SSN',
          fieldType: 'text',
          sensitivity: 'pii',
        },
        {
          id: 'f2',
          fieldName: 'name',
          label: 'Name',
          fieldType: 'text',
          sensitivity: 'low',
        },
      ]),
      confidence: [],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.sensitivityAccuracy).toBe(0.5)
  })

  it('measures group accuracy', () => {
    const groundTruth = makeSpec([
      {
        id: 'f1',
        fieldName: 'name',
        label: 'Name',
        fieldType: 'text',
        group: 'personal',
      },
      {
        id: 'f2',
        fieldName: 'employer',
        label: 'Employer',
        fieldType: 'text',
        group: 'employment',
      },
    ])
    const output: ExtractionOutput = {
      spec: makeSpec([
        {
          id: 'f1',
          fieldName: 'name',
          label: 'Name',
          fieldType: 'text',
          group: 'personal',
        },
        {
          id: 'f2',
          fieldName: 'employer',
          label: 'Employer',
          fieldType: 'text',
          group: 'personal',
        },
      ]),
      confidence: [],
    }
    const result = pdfFieldExtractionKind.score(output, groundTruth)
    expect(result.metrics.groupAccuracy).toBe(0.5)
  })

  it('summarize averages metrics across cases', () => {
    const cases = [
      {
        fixture: 'a',
        metrics: { fieldRecall: 1.0, fieldPrecision: 0.8 },
        details: {},
      },
      {
        fixture: 'b',
        metrics: { fieldRecall: 0.6, fieldPrecision: 1.0 },
        details: {},
      },
    ]
    const summary = pdfFieldExtractionKind.summarize(cases)
    expect(summary.metrics.fieldRecall).toBeCloseTo(0.8, 2)
    expect(summary.metrics.fieldPrecision).toBeCloseTo(0.9, 2)
  })
})
