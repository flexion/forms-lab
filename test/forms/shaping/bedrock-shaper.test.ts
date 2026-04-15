import { describe, expect, it } from 'bun:test'
import { validateCommands } from '../../../src/services/forms/shaping/bedrock-shaper'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'T',
      description: '',
      groups: [{ id: 'g1', title: 'G1', requirements: [] }],
    },
    formSpec: {
      id: 'f1',
      specId: 'ds1',
      title: 'F',
      pages: [{ id: 'p1', title: 'P', groups: ['g1'] }],
    },
  }
}

describe('validateCommands', () => {
  it('returns ok for a valid executable batch', () => {
    const result = validateCommands(
      [
        { kind: 'renamePage', id: 'p1', title: 'New' },
        { kind: 'renameGroup', id: 'g1', title: 'New G' },
      ],
      fixture(),
    )
    expect(result.ok).toBe(true)
  })

  it('returns error when batch references unknown ids', () => {
    const result = validateCommands(
      [{ kind: 'renamePage', id: 'nope', title: 'x' }],
      fixture(),
    )
    expect(result.ok).toBe(false)
  })
})
