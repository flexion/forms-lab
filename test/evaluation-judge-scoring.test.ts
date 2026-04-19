import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../src/services/data-collection'
import type { FieldJudge } from '../src/services/evaluation/judge'
import type { JudgeResponse } from '../src/services/evaluation/judge-schemas'
import { createLlmJudgeKind } from '../src/services/evaluation/kinds/pdf-field-extraction-judge'

function makeSpec(
  fields: Array<{ fieldName: string; label: string; groupId: string }>,
): DataCollectionSpec {
  const groups = new Map<string, typeof fields>()
  for (const f of fields) {
    const existing = groups.get(f.groupId) ?? []
    existing.push(f)
    groups.set(f.groupId, existing)
  }
  return {
    id: 'test',
    title: 'Test',
    description: '',
    groups: Array.from(groups.entries()).map(([id, reqs]) => ({
      id,
      title: id,
      requirements: reqs.map((r) => ({
        id: r.fieldName,
        fieldName: r.fieldName,
        label: r.label,
        fieldType: 'text' as const,
        required: true,
      })),
    })),
  }
}

function createStubJudge(response: JudgeResponse): FieldJudge {
  return {
    async judge(): Promise<JudgeResponse> {
      return response
    },
  }
}

describe('LLM judge evaluation kind', () => {
  it('computes metrics from judge matches', async () => {
    const groundTruth = makeSpec([
      { fieldName: 'courtOfProsecution', label: 'Court', groupId: 'case' },
      { fieldName: 'oathDay', label: 'Day', groupId: 'cert' },
      { fieldName: 'firstName', label: 'First', groupId: 'info' },
    ])

    const extracted = makeSpec([
      { fieldName: 'prosecutionCourt', label: 'Court', groupId: 'case' },
      { fieldName: 'certOathDay', label: 'Day', groupId: 'cert' },
      { fieldName: 'extraField', label: 'Extra', groupId: 'other' },
    ])

    const judge = createStubJudge({
      matches: [
        {
          groundTruthFieldName: 'courtOfProsecution',
          extractedFieldName: 'prosecutionCourt',
          confidence: 0.95,
          reasoning: 'word order',
        },
        {
          groundTruthFieldName: 'oathDay',
          extractedFieldName: 'certOathDay',
          confidence: 0.9,
          reasoning: 'prefix',
        },
      ],
      unmatchedGroundTruth: ['firstName'],
      unmatchedExtracted: ['extraField'],
    })

    const kind = createLlmJudgeKind(judge)
    const result = await kind.score(
      { spec: extracted, confidence: [] },
      groundTruth,
    )

    expect(result.metrics.fieldRecall).toBeCloseTo(2 / 3, 2)
    expect(result.metrics.fieldPrecision).toBeCloseTo(2 / 3, 2)
    expect(result.details.totalMatched).toBe(2)
    expect(result.details.totalGroundTruth).toBe(3)
    expect(result.details.totalExtracted).toBe(3)
    expect(result.details.missed as string[]).toContain('firstName')
    expect(result.details.extra as string[]).toContain('extraField')
  })

  it('returns perfect scores for identical specs', async () => {
    const spec = makeSpec([
      { fieldName: 'name', label: 'Name', groupId: 'info' },
    ])

    const judge = createStubJudge({
      matches: [
        {
          groundTruthFieldName: 'name',
          extractedFieldName: 'name',
          confidence: 1.0,
          reasoning: 'exact match',
        },
      ],
      unmatchedGroundTruth: [],
      unmatchedExtracted: [],
    })

    const kind = createLlmJudgeKind(judge)
    const result = await kind.score({ spec, confidence: [] }, spec)

    expect(result.metrics.fieldRecall).toBe(1.0)
    expect(result.metrics.fieldPrecision).toBe(1.0)
  })

  it('stores judge matches in details', async () => {
    const gt = makeSpec([{ fieldName: 'a', label: 'A', groupId: 'g' }])
    const ex = makeSpec([{ fieldName: 'b', label: 'B', groupId: 'g' }])

    const judge = createStubJudge({
      matches: [
        {
          groundTruthFieldName: 'a',
          extractedFieldName: 'b',
          confidence: 0.8,
          reasoning: 'semantic match',
        },
      ],
      unmatchedGroundTruth: [],
      unmatchedExtracted: [],
    })

    const kind = createLlmJudgeKind(judge)
    const result = await kind.score({ spec: ex, confidence: [] }, gt)

    const judgeMatches = result.details.judgeMatches as Array<{
      groundTruthFieldName: string
      extractedFieldName: string
      confidence: number
    }>
    expect(judgeMatches).toHaveLength(1)
    expect(judgeMatches[0].confidence).toBe(0.8)
  })
})
