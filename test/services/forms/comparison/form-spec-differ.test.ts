import { describe, expect, it } from 'bun:test'
import { diffFormSpecs } from '../../../../src/services/forms/comparison/form-spec-differ'
import type { FormSpec } from '../../../../src/services/forms/types'

const baseSpec: FormSpec = {
  id: 'form1',
  specId: 'form1',
  title: 'Tax Form',
  pages: [
    {
      id: 'p1',
      title: 'Personal Info',
      groups: ['personal'],
      deliveryMode: 'static',
    },
    { id: 'p2', title: 'Income', groups: ['income'], deliveryMode: 'static' },
    { id: 'p3', title: 'Deductions', groups: ['ded'], deliveryMode: 'static' },
  ],
}

describe('diffFormSpecs', () => {
  it('detects a newly added page', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: [
        baseSpec.pages[0],
        baseSpec.pages[1],
        {
          id: 'p-military',
          title: 'Military Service',
          groups: ['military'],
          deliveryMode: 'static',
        },
        baseSpec.pages[2],
      ],
    }
    const changes = diffFormSpecs(baseSpec, head)
    const added = changes.filter((c) => c.category === 'added')
    expect(added).toHaveLength(1)
    expect(added[0].description).toContain('Military Service')
  })

  it('detects a moved (reordered) page', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: [baseSpec.pages[0], baseSpec.pages[2], baseSpec.pages[1]],
    }
    const changes = diffFormSpecs(baseSpec, head)
    const moves = changes.filter((c) => c.category === 'moved')
    expect(moves.length).toBeGreaterThan(0)
  })

  it('detects a delivery-mode change', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: baseSpec.pages.map((p) =>
        p.id === 'p2' ? { ...p, deliveryMode: 'conversational' as const } : p,
      ),
    }
    const changes = diffFormSpecs(baseSpec, head)
    expect(changes).toHaveLength(1)
    expect(changes[0].category).toBe('modified')
    expect(changes[0].description).toMatch(/delivery mode/i)
  })

  it('detects a removed page', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: [baseSpec.pages[0], baseSpec.pages[1]],
    }
    const changes = diffFormSpecs(baseSpec, head)
    const removed = changes.filter((c) => c.category === 'removed')
    expect(removed).toHaveLength(1)
    expect(removed[0].description).toContain('Deductions')
  })

  it('detects a renamed page (same id, different title)', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: baseSpec.pages.map((p) =>
        p.id === 'p2' ? { ...p, title: 'Wages' } : p,
      ),
    }
    const changes = diffFormSpecs(baseSpec, head)
    const renamed = changes.filter((c) => c.category === 'renamed')
    expect(renamed).toHaveLength(1)
  })

  it('detects a group added to a page', () => {
    const head: FormSpec = {
      ...baseSpec,
      pages: baseSpec.pages.map((p) =>
        p.id === 'p2' ? { ...p, groups: ['income', 'bonus'] } : p,
      ),
    }
    const changes = diffFormSpecs(baseSpec, head)
    const added = changes.filter(
      (c) => c.category === 'added' && c.path.length === 2,
    )
    expect(added).toHaveLength(1)
    expect(added[0].description).toContain('bonus')
  })

  it('returns empty for identical specs', () => {
    expect(diffFormSpecs(baseSpec, baseSpec)).toEqual([])
  })
})
