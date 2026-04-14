import { describe, expect, it } from 'bun:test'
import { buildSuggestModesPrompt } from '../../../src/services/forms/shaping/prompts/suggest-modes'
import { testDataSpec, testFormSpec } from '../fixtures'

describe('buildSuggestModesPrompt', () => {
  it('includes all page titles in the prompt', () => {
    const prompt = buildSuggestModesPrompt(testFormSpec, testDataSpec)
    expect(prompt).toContain('Personal Information')
    expect(prompt).toContain('Employment')
    expect(prompt).toContain('Additional Details')
  })

  it('includes field counts per group', () => {
    const prompt = buildSuggestModesPrompt(testFormSpec, testDataSpec)
    expect(prompt).toContain('3')
  })

  it('mentions conditional fields when present', () => {
    const prompt = buildSuggestModesPrompt(testFormSpec, testDataSpec)
    expect(prompt).toContain('conditional')
  })
})
