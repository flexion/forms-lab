import { describe, expect, it } from 'bun:test'
import type { FieldCondition, FieldEntry } from '../../src/types/models'
import { evaluateCondition } from '../../src/services/form-resolver'

describe('evaluateCondition', () => {
  const fields: Record<string, FieldEntry> = {
    employed: { value: 'Yes' },
    age: { value: 25 },
    name: { value: 'Alice Johnson' },
  }

  it('returns true when condition is undefined', () => {
    expect(evaluateCondition(undefined, fields)).toBe(true)
  })

  it('equals: returns true when field matches', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'equals', value: 'Yes' }
    expect(evaluateCondition(cond, fields)).toBe(true)
  })

  it('equals: returns false when field does not match', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'equals', value: 'No' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('notEquals: returns true when field differs', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'notEquals', value: 'No' }
    expect(evaluateCondition(cond, fields)).toBe(true)
  })

  it('notEquals: returns false when field matches', () => {
    const cond: FieldCondition = { field: 'employed', operator: 'notEquals', value: 'Yes' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('contains: returns true when string contains value', () => {
    const cond: FieldCondition = { field: 'name', operator: 'contains', value: 'Alice' }
    expect(evaluateCondition(cond, fields)).toBe(true)
  })

  it('contains: returns false when string does not contain value', () => {
    const cond: FieldCondition = { field: 'name', operator: 'contains', value: 'Bob' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('contains: returns false for non-string field values', () => {
    const cond: FieldCondition = { field: 'age', operator: 'contains', value: '25' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('returns false when referenced field does not exist', () => {
    const cond: FieldCondition = { field: 'missing', operator: 'equals', value: 'x' }
    expect(evaluateCondition(cond, fields)).toBe(false)
  })

  it('handles null field values', () => {
    const fieldsWithNull: Record<string, FieldEntry> = { status: { value: null } }
    const cond: FieldCondition = { field: 'status', operator: 'equals', value: 'active' }
    expect(evaluateCondition(cond, fieldsWithNull)).toBe(false)
  })
})
