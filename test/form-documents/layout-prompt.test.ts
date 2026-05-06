import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../src/services/data-collection'
import { buildLayoutPrompt } from '../../src/services/form-documents/layout-prompt'

const smallSpec: DataCollectionSpec = {
  id: 'contact-info',
  title: 'Contact Information',
  description: 'Collects basic contact details',
  groups: [
    {
      id: 'personal',
      title: 'Personal Details',
      requirements: [
        {
          id: 'first-name',
          fieldName: 'firstName',
          label: 'First Name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'last-name',
          fieldName: 'lastName',
          label: 'Last Name',
          fieldType: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'address',
      title: 'Mailing Address',
      requirements: [
        {
          id: 'street',
          fieldName: 'street',
          label: 'Street Address',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'city',
          fieldName: 'city',
          label: 'City',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'state',
          fieldName: 'state',
          label: 'State',
          fieldType: 'choice',
          required: true,
          choices: ['CA', 'NY', 'TX'],
        },
      ],
    },
  ],
}

describe('buildLayoutPrompt', () => {
  it('includes the spec JSON with identifiable content', () => {
    const prompt = buildLayoutPrompt(smallSpec)
    expect(prompt).toContain('"contact-info"')
    expect(prompt).toContain('"Personal Details"')
    expect(prompt).toContain('"Mailing Address"')
  })

  it('includes layout principles', () => {
    const prompt = buildLayoutPrompt(smallSpec)
    expect(prompt).toContain('One topic per page')
    expect(prompt).toContain('plain-language')
  })

  it('includes adaptive sizing heuristics', () => {
    const prompt = buildLayoutPrompt(smallSpec)
    expect(prompt).toContain('Adaptive sizing')
  })

  it('includes form statistics', () => {
    const prompt = buildLayoutPrompt(smallSpec)
    // 5 total fields, 2 groups
    expect(prompt).toContain('5')
    expect(prompt).toContain('2 groups')
  })

  it('includes the FormSpec JSON schema', () => {
    const prompt = buildLayoutPrompt(smallSpec)
    expect(prompt).toContain('FormSpec')
    expect(prompt).toContain('deliveryMode')
    expect(prompt).toContain('pages')
  })

  it('includes deliveryMode assignment guidance', () => {
    const prompt = buildLayoutPrompt(smallSpec)
    expect(prompt).toContain('static')
    expect(prompt).toContain('conversational')
    expect(prompt).toContain('hybrid')
  })
})
