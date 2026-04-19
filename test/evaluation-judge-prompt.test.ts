import { describe, expect, it } from 'bun:test'
import { buildJudgePrompt } from '../src/services/evaluation/judge-prompt'
import type { FlatField } from '../src/services/evaluation/kinds/shared'

const gtFields: FlatField[] = [
  {
    requirement: {
      id: 'f1',
      fieldName: 'courtOfProsecution',
      label: 'Court where you were prosecuted',
      fieldType: 'text',
      required: true,
    },
    groupId: 'case-background',
  },
  {
    requirement: {
      id: 'f2',
      fieldName: 'oathDay',
      label: 'Day (of submission)',
      fieldType: 'text',
      required: true,
    },
    groupId: 'certification',
  },
]

const exFields: FlatField[] = [
  {
    requirement: {
      id: 'e1',
      fieldName: 'prosecutionCourt',
      label: 'Prosecution Court',
      fieldType: 'text',
      required: true,
    },
    groupId: 'case-info',
  },
  {
    requirement: {
      id: 'e2',
      fieldName: 'certificationOathDay',
      label: 'Certification Oath Day',
      fieldType: 'text',
      required: true,
    },
    groupId: 'certification-oath',
  },
]

describe('buildJudgePrompt', () => {
  it('includes all ground truth and extracted field names', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('courtOfProsecution')
    expect(prompt).toContain('oathDay')
    expect(prompt).toContain('prosecutionCourt')
    expect(prompt).toContain('certificationOathDay')
  })

  it('includes field labels', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('Court where you were prosecuted')
    expect(prompt).toContain('Prosecution Court')
  })

  it('includes group context', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('case-background')
    expect(prompt).toContain('case-info')
  })

  it('requests JSON output', () => {
    const prompt = buildJudgePrompt(exFields, gtFields)
    expect(prompt).toContain('"matches"')
    expect(prompt).toContain('"unmatchedGroundTruth"')
    expect(prompt).toContain('"unmatchedExtracted"')
  })
})
