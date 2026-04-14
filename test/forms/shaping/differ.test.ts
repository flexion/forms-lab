import { describe, expect, it } from 'bun:test'
import { diffFormSpecs } from '../../../src/services/forms/shaping/differ'
import type { FormSpec } from '../../../src/services/forms/types'

const base: FormSpec = {
  id: 'form-1',
  specId: 'spec-1',
  title: 'Test Form',
  pages: [
    { id: 'p1', title: 'Page 1', groups: ['g1'] },
    { id: 'p2', title: 'Page 2', groups: ['g2', 'g3'] },
    { id: 'p3', title: 'Page 3', groups: ['g4'] },
  ],
}

describe('diffFormSpecs', () => {
  it('detects no changes when specs are identical', () => {
    const diff = diffFormSpecs(base, structuredClone(base))
    expect(diff.hasChanges).toBe(false)
    expect(diff.pages.every((p) => p.status === 'unchanged')).toBe(true)
  })

  it('detects an added page', () => {
    const revised: FormSpec = {
      ...base,
      pages: [...base.pages, { id: 'p4', title: 'New Page', groups: ['g5'] }],
    }
    const diff = diffFormSpecs(base, revised)
    expect(diff.hasChanges).toBe(true)
    const added = diff.pages.find((p) => p.id === 'p4')
    expect(added?.status).toBe('added')
  })

  it('detects a removed page', () => {
    const revised: FormSpec = {
      ...base,
      pages: base.pages.slice(0, 2),
    }
    const diff = diffFormSpecs(base, revised)
    expect(diff.hasChanges).toBe(true)
    const removed = diff.pages.find((p) => p.id === 'p3')
    expect(removed?.status).toBe('removed')
  })

  it('detects a reordered page', () => {
    const revised: FormSpec = {
      ...base,
      pages: [base.pages[0], base.pages[2], base.pages[1]],
    }
    const diff = diffFormSpecs(base, revised)
    expect(diff.hasChanges).toBe(true)
    const moved = diff.pages.filter((p) => p.status === 'moved')
    expect(moved.length).toBeGreaterThan(0)
  })

  it('detects modified groups on a page', () => {
    const revised: FormSpec = {
      ...base,
      pages: [
        base.pages[0],
        { ...base.pages[1], groups: ['g2', 'g3', 'g5'] },
        base.pages[2],
      ],
    }
    const diff = diffFormSpecs(base, revised)
    expect(diff.hasChanges).toBe(true)
    const modified = diff.pages.find((p) => p.id === 'p2')
    expect(modified?.status).toBe('modified')
  })

  it('generates a human-readable summary', () => {
    const revised: FormSpec = {
      ...base,
      pages: [
        base.pages[0],
        { id: 'p-new', title: 'Eligibility', groups: ['g5'] },
        base.pages[1],
        base.pages[2],
      ],
    }
    const diff = diffFormSpecs(base, revised)
    expect(diff.summary).toContain('Added')
    expect(diff.summary.length).toBeGreaterThan(0)
  })
})
