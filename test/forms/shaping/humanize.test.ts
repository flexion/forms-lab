import { describe, expect, it } from 'bun:test'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import { humanize } from '../../../src/services/forms/shaping/humanize'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'Test',
      description: '',
      groups: [
        {
          id: 'g1',
          title: 'Personal',
          requirements: [
            {
              id: 'f1',
              fieldName: 'name',
              label: 'Name',
              fieldType: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    formSpec: {
      id: 'f1',
      specId: 'ds1',
      title: 'Form',
      pages: [
        { id: 'p1', title: 'Personal Info', groups: ['g1'] },
        { id: 'p2', title: 'Work', groups: [] },
      ],
    },
  }
}

describe('humanize', () => {
  it('swapPages references both page titles', () => {
    const text = humanize({ kind: 'swapPages', a: 'p1', b: 'p2' }, fixture())
    expect(text).toContain('Personal Info')
    expect(text).toContain('Work')
  })

  it('setDeliveryMode uses the page title and mode', () => {
    const text = humanize(
      { kind: 'setDeliveryMode', pageId: 'p1', mode: 'conversational' },
      fixture(),
    )
    expect(text).toContain('Personal Info')
    expect(text).toContain('conversational')
  })

  it('relabelField uses the old label', () => {
    const text = humanize(
      { kind: 'relabelField', id: 'f1', label: 'Full name' },
      fixture(),
    )
    expect(text).toContain('Name')
    expect(text).toContain('Full name')
  })

  it('produces a non-empty string for every command kind', () => {
    const state = fixture()
    const samples = [
      { kind: 'reorderPages', order: ['p2', 'p1'] },
      { kind: 'movePage', id: 'p1', toIndex: 1 },
      { kind: 'addPage', title: 'New page' },
      { kind: 'removePage', id: 'p2' },
      { kind: 'renamePage', id: 'p1', title: 'Renamed' },
      { kind: 'splitPage', id: 'p1', newTitle: 'Half', groupsToMove: [] },
      { kind: 'mergePages', intoId: 'p1', fromId: 'p2' },
      { kind: 'moveGroup', groupId: 'g1', toPageId: 'p2' },
      { kind: 'renameGroup', id: 'g1', title: 'People' },
      { kind: 'addGroup', pageId: 'p1', title: 'Extra' },
      { kind: 'removeGroup', id: 'g1' },
      { kind: 'splitGroup', id: 'g1', newTitle: 'Part', fieldsToMove: [] },
      { kind: 'mergeGroups', intoId: 'g1', fromId: 'g1' },
      { kind: 'moveField', fieldId: 'f1', toGroupId: 'g1' },
      { kind: 'reorderFields', groupId: 'g1', order: ['f1'] },
      { kind: 'setRequired', id: 'f1', required: false },
      {
        kind: 'setFieldCondition',
        id: 'f1',
        condition: { field: 'f1', operator: 'equals' as const, value: 'x' },
      },
      { kind: 'setFieldSensitivity', id: 'f1', level: 'pii' as const },
      { kind: 'changeFieldType', id: 'f1', fieldType: 'email' as const },
      { kind: 'setFieldControl', id: 'f1', control: 'radio' as const },
      {
        kind: 'addField',
        groupId: 'g1',
        label: 'New',
        fieldType: 'text' as const,
        required: false,
      },
      { kind: 'removeField', id: 'f1' },
    ]
    for (const cmd of samples) {
      expect(humanize(cmd as never, state)).not.toBe('')
    }
  })
})
