import { describe, expect, it } from 'bun:test'
import {
  extractionTools,
  reconstructSpec,
} from '../src/services/form-documents'

describe('extractionTools', () => {
  it('defines createSpec, addGroup, addField, and flagLowConfidence tools', () => {
    expect(extractionTools.createSpec).toBeDefined()
    expect(extractionTools.addGroup).toBeDefined()
    expect(extractionTools.addField).toBeDefined()
    expect(extractionTools.flagLowConfidence).toBeDefined()
  })

  it('each tool has an inputSchema', () => {
    for (const [, t] of Object.entries(extractionTools)) {
      expect((t as { inputSchema: unknown }).inputSchema).toBeDefined()
    }
  })
})

describe('reconstructSpec', () => {
  it('reconstructs a spec from a sequence of tool calls', () => {
    const toolCalls = [
      {
        toolName: 'createSpec' as const,
        input: {
          id: 'test-form',
          title: 'Test Form',
          description: 'A test form',
        },
      },
      {
        toolName: 'addGroup' as const,
        input: {
          id: 'personal-info',
          title: 'Personal Information',
          description: 'Your personal details',
        },
      },
      {
        toolName: 'addField' as const,
        input: {
          id: 'first-name',
          fieldName: 'firstName',
          label: 'First Name',
          fieldType: 'text' as const,
          required: true,
        },
      },
      {
        toolName: 'addField' as const,
        input: {
          id: 'last-name',
          fieldName: 'lastName',
          label: 'Last Name',
          fieldType: 'text' as const,
          required: true,
        },
      },
      {
        toolName: 'addGroup' as const,
        input: {
          id: 'contact-info',
          title: 'Contact Information',
        },
      },
      {
        toolName: 'addField' as const,
        input: {
          id: 'email-address',
          fieldName: 'emailAddress',
          label: 'Email Address',
          fieldType: 'email' as const,
          required: true,
          sensitivity: 'pii' as const,
        },
      },
      {
        toolName: 'flagLowConfidence' as const,
        input: {
          fieldId: 'email-address',
          confidence: 0.7,
          flags: ['ambiguous-type'],
        },
      },
    ]

    const result = reconstructSpec(toolCalls)

    expect(result.spec.id).toBe('test-form')
    expect(result.spec.title).toBe('Test Form')
    expect(result.spec.description).toBe('A test form')
    expect(result.spec.groups).toHaveLength(2)

    const group1 = result.spec.groups[0]
    expect(group1.id).toBe('personal-info')
    expect(group1.title).toBe('Personal Information')
    expect(group1.description).toBe('Your personal details')
    expect(group1.requirements).toHaveLength(2)
    expect(group1.requirements[0].id).toBe('first-name')
    expect(group1.requirements[0].fieldName).toBe('firstName')
    expect(group1.requirements[0].fieldType).toBe('text')
    expect(group1.requirements[1].id).toBe('last-name')

    const group2 = result.spec.groups[1]
    expect(group2.id).toBe('contact-info')
    expect(group2.requirements).toHaveLength(1)
    expect(group2.requirements[0].id).toBe('email-address')
    expect(group2.requirements[0].sensitivity).toBe('pii')

    expect(result.confidence).toHaveLength(1)
    expect(result.confidence[0].fieldId).toBe('email-address')
    expect(result.confidence[0].confidence).toBe(0.7)
    expect(result.confidence[0].flags).toEqual(['ambiguous-type'])
  })

  it('throws when createSpec is not the first call', () => {
    const toolCalls = [
      {
        toolName: 'addGroup' as const,
        input: { id: 'group-1', title: 'Group 1' },
      },
    ]
    expect(() => reconstructSpec(toolCalls)).toThrow('createSpec')
  })

  it('throws when addField is called without a group', () => {
    const toolCalls = [
      {
        toolName: 'createSpec' as const,
        input: { id: 'form', title: 'Form', description: 'Desc' },
      },
      {
        toolName: 'addField' as const,
        input: {
          id: 'field-1',
          fieldName: 'field1',
          label: 'Field 1',
          fieldType: 'text' as const,
          required: true,
        },
      },
    ]
    expect(() => reconstructSpec(toolCalls)).toThrow('group')
  })

  it('handles optional fields correctly', () => {
    const toolCalls = [
      {
        toolName: 'createSpec' as const,
        input: { id: 'form', title: 'Form', description: 'Desc' },
      },
      {
        toolName: 'addGroup' as const,
        input: { id: 'group-1', title: 'Group 1' },
      },
      {
        toolName: 'addField' as const,
        input: {
          id: 'notes',
          fieldName: 'notes',
          label: 'Notes',
          fieldType: 'longText' as const,
          required: false,
          helpText: 'Optional notes',
        },
      },
    ]

    const result = reconstructSpec(toolCalls)
    const field = result.spec.groups[0].requirements[0]
    expect(field.required).toBe(false)
    expect(field.helpText).toBe('Optional notes')
    expect(field.sensitivity).toBeUndefined()
  })

  it('returns empty confidence array when no flags are raised', () => {
    const toolCalls = [
      {
        toolName: 'createSpec' as const,
        input: { id: 'form', title: 'Form', description: 'Desc' },
      },
      {
        toolName: 'addGroup' as const,
        input: { id: 'group-1', title: 'Group 1' },
      },
      {
        toolName: 'addField' as const,
        input: {
          id: 'f1',
          fieldName: 'f1',
          label: 'Field',
          fieldType: 'text' as const,
          required: true,
        },
      },
    ]

    const result = reconstructSpec(toolCalls)
    expect(result.confidence).toEqual([])
  })
})
