import { describe, expect, it } from 'bun:test'
import type { ExtractionExemplar } from '../src/services/extraction'
import { buildExemplarSection } from '../src/services/form-documents/extraction'

describe('buildExemplarSection', () => {
  const sampleExemplars: ExtractionExemplar[] = [
    {
      id: 'test-nested',
      description: 'Form with nested groups',
      rationale: 'Tests nested group extraction',
      input: 'A form with two sections: Personal Info and Address.',
      output: JSON.stringify({
        id: 'test-form',
        title: 'Test Form',
        description: 'A test',
        groups: [
          {
            id: 'personal-info',
            title: 'Personal Information',
            requirements: [
              {
                id: 'first-name',
                fieldName: 'firstName',
                label: 'First Name',
                fieldType: 'text',
                required: true,
              },
            ],
          },
        ],
      }),
    },
  ]

  it('returns empty string when no exemplars provided', () => {
    expect(buildExemplarSection(undefined)).toBe('')
    expect(buildExemplarSection([])).toBe('')
  })

  it('builds a section with numbered examples', () => {
    const result = buildExemplarSection(sampleExemplars)
    expect(result).toContain('## Examples')
    expect(result).toContain('### Example 1: Form with nested groups')
    expect(result).toContain(
      'A form with two sections: Personal Info and Address.',
    )
    expect(result).toContain('"id": "test-form"')
  })

  it('numbers multiple examples sequentially', () => {
    const twoExemplars: ExtractionExemplar[] = [
      sampleExemplars[0],
      {
        ...sampleExemplars[0],
        id: 'test-sensitivity',
        description: 'Form with PII fields',
      },
    ]
    const result = buildExemplarSection(twoExemplars)
    expect(result).toContain('### Example 1: Form with nested groups')
    expect(result).toContain('### Example 2: Form with PII fields')
  })
})
