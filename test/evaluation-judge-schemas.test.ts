import { describe, expect, it } from 'bun:test'
import { judgeResponseSchema } from '../src/services/evaluation/judge-schemas'

describe('judgeResponseSchema', () => {
  it('parses a valid judge response', () => {
    const response = {
      matches: [
        {
          groundTruthFieldName: 'oathDay',
          extractedFieldName: 'certificationOathDay',
          confidence: 0.95,
          reasoning: 'Same field — extracted version has a section prefix',
        },
      ],
      unmatchedGroundTruth: ['firstName', 'lastName'],
      unmatchedExtracted: ['fullName'],
    }
    const result = judgeResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matches).toHaveLength(1)
      expect(result.data.matches[0].confidence).toBe(0.95)
      expect(result.data.unmatchedGroundTruth).toEqual([
        'firstName',
        'lastName',
      ])
      expect(result.data.unmatchedExtracted).toEqual(['fullName'])
    }
  })

  it('rejects response missing required fields', () => {
    const response = { matches: [] }
    const result = judgeResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it('rejects match with confidence out of range', () => {
    const response = {
      matches: [
        {
          groundTruthFieldName: 'a',
          extractedFieldName: 'b',
          confidence: 1.5,
          reasoning: 'test',
        },
      ],
      unmatchedGroundTruth: [],
      unmatchedExtracted: [],
    }
    const result = judgeResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })
})
