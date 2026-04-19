import { describe, expect, it } from 'bun:test'
import type { DataRequirement } from '../../../src/services/data-collection'

describe('DataRequirement.control', () => {
  it('accepts radio control for choice fields', () => {
    const req: DataRequirement = {
      id: 'r1',
      fieldName: 'color',
      label: 'Color',
      fieldType: 'choice',
      required: true,
      choices: ['red', 'blue'],
      control: 'radio',
    }
    expect(req.control).toBe('radio')
  })

  it('accepts select control for choice fields', () => {
    const req: DataRequirement = {
      id: 'r2',
      fieldName: 'state',
      label: 'State',
      fieldType: 'choice',
      required: true,
      control: 'select',
    }
    expect(req.control).toBe('select')
  })

  it('treats control as optional', () => {
    const req: DataRequirement = {
      id: 'r3',
      fieldName: 'x',
      label: 'X',
      fieldType: 'text',
      required: false,
    }
    expect(req.control).toBeUndefined()
  })
})
