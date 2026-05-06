import { describe, expect, test } from 'bun:test'
import { createBedrockLayoutJudge } from '../../src/services/evaluation/layout-judge'

describe('createBedrockLayoutJudge', () => {
  test('returns an object with a judge method', () => {
    const judge = createBedrockLayoutJudge(
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
    )
    expect(typeof judge.judge).toBe('function')
  })
})
