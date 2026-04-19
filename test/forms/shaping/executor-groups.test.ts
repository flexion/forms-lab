import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../src/services/data-collection'
import type { FormSpec, ProjectState } from '../../../src/services/forms'
import { executeCommand } from '../../../src/services/forms/shaping/executor'

function fixture(): ProjectState {
  const dataSpec: DataCollectionSpec = {
    id: 'ds1',
    title: 'Test',
    description: '',
    groups: [
      { id: 'g1', title: 'Personal Info', requirements: [] },
      { id: 'g2', title: 'Employment', requirements: [] },
      { id: 'g3', title: 'Income', requirements: [] },
    ],
  }
  const formSpec: FormSpec = {
    id: 'f1',
    specId: 'ds1',
    title: 'Form',
    pages: [
      { id: 'p1', title: 'Page 1', groups: ['g1', 'g2'] },
      { id: 'p2', title: 'Page 2', groups: ['g3'] },
    ],
  }
  return { formSpec, dataSpec }
}

describe('executor — group commands', () => {
  it('moveGroup moves a group from one page to another', () => {
    const result = executeCommand(fixture(), {
      kind: 'moveGroup',
      groupId: 'g2',
      toPageId: 'p2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.formSpec.pages[0].groups).toEqual(['g1'])
      expect(result.state.formSpec.pages[1].groups).toEqual(['g3', 'g2'])
    }
  })

  it('moveGroup rejects unknown groupId', () => {
    const result = executeCommand(fixture(), {
      kind: 'moveGroup',
      groupId: 'nope',
      toPageId: 'p2',
    })
    expect(result.ok).toBe(false)
  })

  it('renameGroup updates the group title in dataSpec', () => {
    const result = executeCommand(fixture(), {
      kind: 'renameGroup',
      id: 'g2',
      title: 'Work',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const renamed = result.state.dataSpec.groups.find((g) => g.id === 'g2')
      expect(renamed?.title).toBe('Work')
    }
  })

  it('addGroup creates an empty group and references it on the page', () => {
    const result = executeCommand(fixture(), {
      kind: 'addGroup',
      pageId: 'p2',
      title: 'New Section',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const newGroup = result.state.dataSpec.groups.find(
        (g) => g.title === 'New Section',
      )
      expect(newGroup).toBeDefined()
      expect(newGroup?.requirements).toEqual([])
      // biome-ignore lint/style/noNonNullAssertion: toBeDefined() guard above proves newGroup is defined
      expect(result.state.formSpec.pages[1].groups).toContain(newGroup!.id)
    }
  })

  it('removeGroup fails if group has fields and no relocation', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f1',
        fieldName: 'x',
        label: 'X',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, { kind: 'removeGroup', id: 'g2' })
    expect(result.ok).toBe(false)
  })

  it('removeGroup succeeds when moveFieldsTo is provided', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f1',
        fieldName: 'x',
        label: 'X',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, {
      kind: 'removeGroup',
      id: 'g2',
      moveFieldsTo: 'g1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g1')?.requirements
          .length,
      ).toBe(1)
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g2'),
      ).toBeUndefined()
    }
  })

  it('splitGroup creates a new group on the same page with selected fields', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f1',
        fieldName: 'a',
        label: 'A',
        fieldType: 'text',
        required: false,
      },
      {
        id: 'f2',
        fieldName: 'b',
        label: 'B',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, {
      kind: 'splitGroup',
      id: 'g2',
      newTitle: 'Extra',
      fieldsToMove: ['f2'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const orig = result.state.dataSpec.groups.find((g) => g.id === 'g2')
      const extra = result.state.dataSpec.groups.find(
        (g) => g.title === 'Extra',
      )
      expect(orig?.requirements.map((r) => r.id)).toEqual(['f1'])
      expect(extra?.requirements.map((r) => r.id)).toEqual(['f2'])
    }
  })

  it('mergeGroups combines fields into one and removes source', () => {
    const state = fixture()
    state.dataSpec.groups[0].requirements = [
      {
        id: 'f1',
        fieldName: 'a',
        label: 'A',
        fieldType: 'text',
        required: false,
      },
    ]
    state.dataSpec.groups[1].requirements = [
      {
        id: 'f2',
        fieldName: 'b',
        label: 'B',
        fieldType: 'text',
        required: false,
      },
    ]
    const result = executeCommand(state, {
      kind: 'mergeGroups',
      intoId: 'g1',
      fromId: 'g2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const merged = result.state.dataSpec.groups.find((g) => g.id === 'g1')
      expect(merged?.requirements.map((r) => r.id)).toEqual(['f1', 'f2'])
      expect(
        result.state.dataSpec.groups.find((g) => g.id === 'g2'),
      ).toBeUndefined()
    }
  })
})
