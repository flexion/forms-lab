import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../../src/services/data-collection/types'
import { diffDataCollectionSpecs } from '../../../../src/services/forms/comparison/data-collection-spec-differ'

const baseSpec: DataCollectionSpec = {
  id: 'form1',
  title: 'Tax Form',
  description: '',
  groups: [
    {
      id: 'income',
      title: 'Income',
      requirements: [
        {
          id: 'employer',
          fieldName: 'employer',
          fieldType: 'text',
          label: 'Employer',
          required: false,
        },
      ],
    },
  ],
}

describe('diffDataCollectionSpecs', () => {
  it('returns empty array for identical specs', () => {
    expect(diffDataCollectionSpecs(baseSpec, baseSpec)).toEqual([])
  })

  it('detects added requirement group', () => {
    const head: DataCollectionSpec = {
      ...baseSpec,
      groups: [
        ...baseSpec.groups,
        { id: 'military', title: 'Military Service', requirements: [] },
      ],
    }
    const changes = diffDataCollectionSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('added')
    expect(changes[0].description).toContain('Military Service')
  })

  it('detects a field marked as required', () => {
    const head: DataCollectionSpec = {
      ...baseSpec,
      groups: [
        {
          ...baseSpec.groups[0],
          requirements: [
            { ...baseSpec.groups[0].requirements[0], required: true },
          ],
        },
      ],
    }
    const changes = diffDataCollectionSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('modified')
    expect(changes[0].description).toContain('required')
  })

  it('detects a renamed group (same id, different title)', () => {
    const head: DataCollectionSpec = {
      ...baseSpec,
      groups: [{ ...baseSpec.groups[0], title: 'Wages' }],
    }
    const changes = diffDataCollectionSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('renamed')
  })
})
