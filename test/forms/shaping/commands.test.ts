import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../src/services/data-collection'
import {
  type Command,
  commandSchema,
  type ProjectState,
} from '../../../src/services/forms/shaping/commands'
import type { FormSpec } from '../../../src/services/forms/types'

describe('Command schemas', () => {
  it('validates reorderPages command', () => {
    const command: Command = { kind: 'reorderPages', order: ['p1', 'p2'] }
    expect(commandSchema.parse(command)).toEqual(command)
  })

  it('validates swapPages command', () => {
    const command: Command = { kind: 'swapPages', a: 'p1', b: 'p2' }
    expect(commandSchema.parse(command)).toEqual(command)
  })

  it('validates addField command', () => {
    const command: Command = {
      kind: 'addField',
      groupId: 'g1',
      label: 'Name',
      fieldType: 'text',
      required: true,
    }
    expect(commandSchema.parse(command)).toEqual(command)
  })

  it('rejects unknown command kinds', () => {
    expect(() => commandSchema.parse({ kind: 'fly', id: 'p1' })).toThrow()
  })

  it('ProjectState bundles both specs', () => {
    const state: ProjectState = {
      formSpec: { id: 'f1', specId: 's1', title: 'T', pages: [] } as FormSpec,
      dataSpec: {
        id: 's1',
        title: 'T',
        description: '',
        groups: [],
      } as DataCollectionSpec,
    }
    expect(state.formSpec.id).toBe('f1')
  })
})
