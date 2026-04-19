import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../src/services/data-collection'
import type { ProjectState } from '../../../src/services/forms/shaping/commands'
import { executeCommand } from '../../../src/services/forms/shaping/executor'
import type { FormSpec } from '../../../src/services/forms/types'

function fixture(): ProjectState {
  const dataSpec: DataCollectionSpec = {
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
          {
            id: 'f2',
            fieldName: 'age',
            label: 'Age',
            fieldType: 'number',
            required: false,
          },
        ],
      },
      {
        id: 'g2',
        title: 'Work',
        requirements: [
          {
            id: 'f3',
            fieldName: 'employer',
            label: 'Employer',
            fieldType: 'text',
            required: false,
          },
        ],
      },
    ],
  }
  const formSpec: FormSpec = {
    id: 'f1',
    specId: 'ds1',
    title: 'Form',
    pages: [{ id: 'p1', title: 'P1', groups: ['g1', 'g2'] }],
  }
  return { formSpec, dataSpec }
}

describe('executor — field commands', () => {
  it('moveField relocates a field to another group', () => {
    const result = executeCommand(fixture(), {
      kind: 'moveField',
      fieldId: 'f2',
      toGroupId: 'g2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups
          .find((g) => g.id === 'g1')
          ?.requirements.map((r) => r.id),
      ).toEqual(['f1'])
      expect(
        result.state.dataSpec.groups
          .find((g) => g.id === 'g2')
          ?.requirements.map((r) => r.id),
      ).toEqual(['f3', 'f2'])
    }
  })

  it('reorderFields reorders within a group', () => {
    const result = executeCommand(fixture(), {
      kind: 'reorderFields',
      groupId: 'g1',
      order: ['f2', 'f1'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[0].requirements.map((r) => r.id),
      ).toEqual(['f2', 'f1'])
    }
  })

  it('relabelField updates label and optional helpText', () => {
    const result = executeCommand(fixture(), {
      kind: 'relabelField',
      id: 'f1',
      label: 'Full name',
      helpText: 'First and last',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const f1 = result.state.dataSpec.groups[0].requirements[0]
      expect(f1.label).toBe('Full name')
      expect(f1.helpText).toBe('First and last')
    }
  })

  it('setRequired toggles the required flag', () => {
    const result = executeCommand(fixture(), {
      kind: 'setRequired',
      id: 'f2',
      required: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.dataSpec.groups[0].requirements[1].required).toBe(
        true,
      )
    }
  })

  it('setFieldCondition applies a condition', () => {
    const result = executeCommand(fixture(), {
      kind: 'setFieldCondition',
      id: 'f3',
      condition: { field: 'f1', operator: 'equals', value: 'Alice' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[1].requirements[0].condition?.field,
      ).toBe('f1')
    }
  })

  it('setFieldCondition clears a condition when null', () => {
    const state = fixture()
    state.dataSpec.groups[1].requirements[0].condition = {
      field: 'f1',
      operator: 'equals',
      value: 'Alice',
    }
    const result = executeCommand(state, {
      kind: 'setFieldCondition',
      id: 'f3',
      condition: null,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[1].requirements[0].condition,
      ).toBeUndefined()
    }
  })

  it('setFieldSensitivity updates sensitivity level', () => {
    const result = executeCommand(fixture(), {
      kind: 'setFieldSensitivity',
      id: 'f1',
      level: 'pii',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.dataSpec.groups[0].requirements[0].sensitivity).toBe(
        'pii',
      )
    }
  })

  it('changeFieldType updates fieldType and choices', () => {
    const result = executeCommand(fixture(), {
      kind: 'changeFieldType',
      id: 'f2',
      fieldType: 'choice',
      choices: ['low', 'medium', 'high'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const f = result.state.dataSpec.groups[0].requirements[1]
      expect(f.fieldType).toBe('choice')
      expect(f.choices).toEqual(['low', 'medium', 'high'])
    }
  })

  it('setFieldControl sets the control preference', () => {
    const result = executeCommand(fixture(), {
      kind: 'setFieldControl',
      id: 'f1',
      control: 'radio',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.dataSpec.groups[0].requirements[0].control).toBe(
        'radio',
      )
    }
  })

  it('addField creates a new field in the specified group', () => {
    const result = executeCommand(fixture(), {
      kind: 'addField',
      groupId: 'g2',
      label: 'Start date',
      fieldType: 'date',
      required: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const g2 = result.state.dataSpec.groups.find((g) => g.id === 'g2')!
      expect(g2.requirements.length).toBe(2)
      const added = g2.requirements.find((r) => r.label === 'Start date')
      expect(added?.fieldType).toBe('date')
      expect(added?.required).toBe(true)
    }
  })

  it('removeField deletes a field from its group', () => {
    const result = executeCommand(fixture(), {
      kind: 'removeField',
      id: 'f2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.state.dataSpec.groups[0].requirements.map((r) => r.id),
      ).toEqual(['f1'])
    }
  })

  it('removeField rejects unknown field id', () => {
    const result = executeCommand(fixture(), {
      kind: 'removeField',
      id: 'nope',
    })
    expect(result.ok).toBe(false)
  })
})
