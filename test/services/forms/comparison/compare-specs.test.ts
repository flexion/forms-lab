import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../../src/services/data-collection'
import { compareSpecs } from '../../../../src/services/forms/comparison'
import type { FormSpec } from '../../../../src/services/forms/types'

const dataSpec: DataCollectionSpec = {
  id: 'f1',
  title: 'T',
  description: '',
  groups: [{ id: 'g', title: 'G', requirements: [] }],
}
const formSpec: FormSpec = {
  id: 'f1',
  specId: 'f1',
  title: 'T',
  pages: [{ id: 'p1', title: 'P', groups: ['g'], deliveryMode: 'static' }],
}

describe('compareSpecs', () => {
  it('aggregates changes from both differs', () => {
    const base = { dataSpec, formSpec }
    const head = {
      dataSpec: {
        ...dataSpec,
        groups: [
          ...dataSpec.groups,
          { id: 'g2', title: 'G2', requirements: [] },
        ],
      },
      formSpec: {
        ...formSpec,
        pages: [
          ...formSpec.pages,
          {
            id: 'p2',
            title: 'P2',
            groups: ['g2'],
            deliveryMode: 'static' as const,
          },
        ],
      },
    }
    const changes = compareSpecs(base, head)
    expect(changes.some((c) => c.resource === 'data-collection-spec')).toBe(
      true,
    )
    expect(changes.some((c) => c.resource === 'form-spec')).toBe(true)
  })

  it('returns empty when snapshots are identical', () => {
    expect(
      compareSpecs({ dataSpec, formSpec }, { dataSpec, formSpec }),
    ).toEqual([])
  })
})
