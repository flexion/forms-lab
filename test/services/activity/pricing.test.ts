import { describe, expect, it } from 'bun:test'
import { BEDROCK_PRICING, estimateCost } from '../../../src/services/activity'

describe('estimateCost', () => {
  it('computes cost for known model', () => {
    const cost = estimateCost(
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      1_000_000,
      1_000_000,
    )
    // $3 input + $15 output = $18
    expect(cost).toBe(18.0)
  })

  it('returns 0 for unknown model', () => {
    const cost = estimateCost('unknown-model', 1000, 1000)
    expect(cost).toBe(0)
  })

  it('handles small token counts correctly', () => {
    const cost = estimateCost(
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
      1000,
      500,
    )
    // (1000 * 3 + 500 * 15) / 1_000_000 = 10500 / 1_000_000 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 6)
  })

  it('pricing table has expected model entry', () => {
    expect(
      BEDROCK_PRICING['us.anthropic.claude-sonnet-4-20250514-v1:0'],
    ).toEqual({
      input: 3.0,
      output: 15.0,
    })
  })
})
