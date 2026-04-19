import { describe, expect, test } from 'bun:test'
import {
  criteriaSetSchema,
  criterionSchema,
} from '../../src/services/form-authoring/types'

describe('Criterion schema', () => {
  test('accepts a valid criterion', () => {
    const result = criterionSchema.safeParse({
      id: 'exp-screening',
      text: 'Must screen for expedited processing per 7 CFR 273.2(i)',
      source: '7 CFR 273.2(i)',
      status: 'pending',
    })
    expect(result.success).toBe(true)
  })

  test('rejects missing text', () => {
    const result = criterionSchema.safeParse({
      id: 'exp-screening',
      source: '7 CFR 273.2(i)',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  test('rejects invalid status', () => {
    const result = criterionSchema.safeParse({
      id: 'exp-screening',
      text: 'Must screen',
      source: '7 CFR 273.2(i)',
      status: 'unknown',
    })
    expect(result.success).toBe(false)
  })
})

describe('CriteriaSet schema', () => {
  test('accepts a complete criteria set', () => {
    const result = criteriaSetSchema.safeParse({
      criteria: [
        {
          id: 'exp-screening',
          text: 'Must screen for expedited processing per 7 CFR 273.2(i)',
          source: '7 CFR 273.2(i)',
          status: 'approved',
        },
      ],
      approvedAt: '2026-04-19T12:00:00Z',
      approvedBy: 'testuser',
    })
    expect(result.success).toBe(true)
  })

  test('accepts unapproved criteria set', () => {
    const result = criteriaSetSchema.safeParse({
      criteria: [],
      approvedAt: null,
      approvedBy: null,
    })
    expect(result.success).toBe(true)
  })
})
