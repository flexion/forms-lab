import { describe, expect, it } from 'bun:test'
import {
  dataRequirementSchema,
  extractionResponseSchema,
} from '../../src/services/form-documents/schemas'

describe('dataRequirementSchema', () => {
  it('accepts a text field without choices', () => {
    const parsed = dataRequirementSchema.safeParse({
      id: 'first-name',
      fieldName: 'firstName',
      label: 'First name',
      fieldType: 'text',
      required: true,
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts a choice field with choices', () => {
    const parsed = dataRequirementSchema.safeParse({
      id: 'prior-application',
      fieldName: 'priorApplication',
      label: 'Have you applied before?',
      fieldType: 'choice',
      required: true,
      choices: ['Yes', 'No'],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a choice field without choices', () => {
    const parsed = dataRequirementSchema.safeParse({
      id: 'prior-application',
      fieldName: 'priorApplication',
      label: 'Have you applied before?',
      fieldType: 'choice',
      required: true,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toContain('choices')
    }
  })

  it('rejects a choice field with an empty choices array', () => {
    const parsed = dataRequirementSchema.safeParse({
      id: 'status',
      fieldName: 'status',
      label: 'Status',
      fieldType: 'choice',
      required: true,
      choices: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts a boolean agreement field (no choices expected)', () => {
    const parsed = dataRequirementSchema.safeParse({
      id: 'agree-terms',
      fieldName: 'agreeTerms',
      label: 'I agree to the terms',
      fieldType: 'boolean',
      required: true,
    })
    expect(parsed.success).toBe(true)
  })
})

describe('extractionResponseSchema', () => {
  it('surfaces choice-field validation errors through the full response', () => {
    const parsed = extractionResponseSchema.safeParse({
      spec: {
        id: 'demo',
        title: 'Demo',
        description: 'd',
        groups: [
          {
            id: 'g',
            title: 'G',
            requirements: [
              {
                id: 'f',
                fieldName: 'f',
                label: 'F',
                fieldType: 'choice',
                required: true,
                // intentionally missing choices
              },
            ],
          },
        ],
      },
    })
    expect(parsed.success).toBe(false)
  })
})
