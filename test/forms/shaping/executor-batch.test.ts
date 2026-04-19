import { describe, expect, it } from 'bun:test'
import type { ProjectState } from '../../../src/services/forms'
import { executeBatch } from '../../../src/services/forms'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'Test',
      description: '',
      groups: [
        { id: 'g1', title: 'G1', requirements: [] },
        { id: 'g2', title: 'G2', requirements: [] },
      ],
    },
    formSpec: {
      id: 'f1',
      specId: 'ds1',
      title: 'Form',
      pages: [
        { id: 'p1', title: 'P1', groups: ['g1'] },
        { id: 'p2', title: 'P2', groups: ['g2'] },
      ],
    },
  }
}

describe('executeBatch', () => {
  it('applies commands sequentially when all succeed', () => {
    const result = executeBatch(fixture(), [
      { kind: 'swapPages', a: 'p1', b: 'p2' },
      { kind: 'renamePage', id: 'p1', title: 'New name' },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].id).toBe('p2')
      expect(result.state.formSpec.pages[1].id).toBe('p1')
      expect(result.state.formSpec.pages[1].title).toBe('New name')
    }
  })

  it('rolls back entirely when any command fails', () => {
    const initial = fixture()
    const result = executeBatch(initial, [
      { kind: 'swapPages', a: 'p1', b: 'p2' },
      { kind: 'swapPages', a: 'nope', b: 'p1' },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failedAt).toBe(1)
    }
  })

  it('returns ok with empty batch', () => {
    const result = executeBatch(fixture(), [])
    expect(result.ok).toBe(true)
  })
})
