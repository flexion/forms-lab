import { describe, expect, it } from 'bun:test'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import { project } from '../../../src/services/forms/shaping/projector'

describe('project', () => {
  it('applies a batch like the executor', () => {
    const state: ProjectState = {
      dataSpec: {
        id: 'ds1',
        title: 'T',
        description: '',
        groups: [
          { id: 'g1', title: 'G1', requirements: [] },
          { id: 'g2', title: 'G2', requirements: [] },
        ],
      },
      formSpec: {
        id: 'f1',
        specId: 'ds1',
        title: 'F',
        pages: [
          { id: 'p1', title: 'A', groups: ['g1'] },
          { id: 'p2', title: 'B', groups: ['g2'] },
        ],
      },
    }
    const result = project(state, [{ kind: 'swapPages', a: 'p1', b: 'p2' }])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].id).toBe('p2')
    }
  })
})
