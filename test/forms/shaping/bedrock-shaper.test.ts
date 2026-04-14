import { describe, expect, it } from 'bun:test'
import type { FormSpec } from '../../../src/services/forms/types'
import { testDataSpec } from '../fixtures'

describe('FormShaper', () => {
  it('returns a valid revised FormSpec from LLM response', async () => {
    const { validateShapingResult } = await import(
      '../../../src/services/forms/shaping/bedrock-shaper'
    )

    const revisedSpec: FormSpec = {
      id: 'benefits-form',
      specId: 'benefits-app',
      title: 'Benefits Application Form',
      pages: [
        {
          id: 'page-1',
          title: 'Personal Information',
          groups: ['personal-info'],
          deliveryMode: 'static',
        },
        {
          id: 'page-new-1',
          title: 'Eligibility Screening',
          groups: ['employment'],
          deliveryMode: 'conversational',
        },
        {
          id: 'page-2',
          title: 'Income',
          groups: ['income'],
          deliveryMode: 'static',
        },
        {
          id: 'page-3',
          title: 'Additional Details',
          groups: ['additional'],
          deliveryMode: 'static',
        },
      ],
    }

    // Should not throw — all groups are valid
    expect(() => validateShapingResult(revisedSpec, testDataSpec)).not.toThrow()
  })

  it('validates that all groups are accounted for', async () => {
    const { validateShapingResult } = await import(
      '../../../src/services/forms/shaping/bedrock-shaper'
    )

    const valid: FormSpec = {
      id: 'benefits-form',
      specId: 'benefits-app',
      title: 'Test',
      pages: [
        {
          id: 'p1',
          title: 'All',
          groups: ['personal-info', 'employment', 'income', 'additional'],
          deliveryMode: 'static',
        },
      ],
    }
    expect(() => validateShapingResult(valid, testDataSpec)).not.toThrow()
  })

  it('rejects FormSpec with unknown group references', async () => {
    const { validateShapingResult } = await import(
      '../../../src/services/forms/shaping/bedrock-shaper'
    )

    const invalid: FormSpec = {
      id: 'benefits-form',
      specId: 'benefits-app',
      title: 'Test',
      pages: [
        {
          id: 'p1',
          title: 'All',
          groups: ['nonexistent-group'],
          deliveryMode: 'static',
        },
      ],
    }
    expect(() => validateShapingResult(invalid, testDataSpec)).toThrow()
  })
})
