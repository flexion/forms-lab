// test/form-authoring/prompts.test.ts
import { describe, expect, test } from 'bun:test'
import {
  buildCriteriaPrompt,
  buildEvalPrompt,
  buildSectionPrompt,
  buildStructurePrompt,
} from '../../src/services/form-authoring/prompts'
import type { Criterion } from '../../src/services/form-authoring/types'
import type { PolicyChunk } from '../../src/services/rag'

const sampleChunks: PolicyChunk[] = [
  {
    id: 'snap/1',
    source: '7 CFR 273.2(i)',
    title: 'SNAP Wisconsin',
    text: 'Expedited service must be provided within 7 days.',
    formSlug: 'snap-wisconsin',
  },
  {
    id: 'snap/2',
    source: '7 CFR 273.9(b)',
    title: 'SNAP Wisconsin',
    text: 'Income includes earned and unearned categories.',
    formSlug: 'snap-wisconsin',
  },
]

const sampleCriteria: Criterion[] = [
  {
    id: 'c1',
    text: 'Must screen for expedited processing',
    source: '7 CFR 273.2(i)',
    status: 'approved',
  },
]

describe('buildCriteriaPrompt', () => {
  test('includes all corpus text', () => {
    const prompt = buildCriteriaPrompt(sampleChunks)
    expect(prompt).toContain('7 CFR 273.2(i)')
    expect(prompt).toContain('Expedited service must be provided')
    expect(prompt).toContain('7 CFR 273.9(b)')
  })

  test('instructs agent to produce criteria with citations', () => {
    const prompt = buildCriteriaPrompt(sampleChunks)
    expect(prompt).toContain('criteria')
    expect(prompt).toContain('citation')
  })
})

describe('buildStructurePrompt', () => {
  test('includes criteria and corpus', () => {
    const prompt = buildStructurePrompt(sampleCriteria, sampleChunks, null)
    expect(prompt).toContain('Must screen for expedited processing')
    expect(prompt).toContain('7 CFR 273.2(i)')
  })

  test('includes current state when provided', () => {
    const state = {
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      dataSpec: { id: 's1', title: 'Test', description: '', groups: [] },
    }
    const prompt = buildStructurePrompt(sampleCriteria, sampleChunks, state)
    expect(prompt).toContain('Current form state')
  })
})

describe('buildSectionPrompt', () => {
  test('includes group context and scoped corpus', () => {
    const prompt = buildSectionPrompt(
      'income-group',
      'Income Information',
      sampleCriteria,
      sampleChunks,
    )
    expect(prompt).toContain('income-group')
    expect(prompt).toContain('Income Information')
  })
})

describe('buildEvalPrompt', () => {
  test('includes criteria and current form state', () => {
    const state = {
      formSpec: { id: 'f1', specId: 's1', title: 'Test', pages: [] },
      dataSpec: { id: 's1', title: 'Test', description: '', groups: [] },
    }
    const prompt = buildEvalPrompt(
      'income-group',
      state,
      sampleCriteria,
      sampleChunks,
    )
    expect(prompt).toContain('income-group')
    expect(prompt).toContain('pass')
    expect(prompt).toContain('fail')
  })
})
