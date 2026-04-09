import { describe, expect, it } from 'bun:test'
import type { FieldEntry } from '../../src/types/models'
import { resolveFormSpec } from '../../src/services/form-resolver'
import { findNextPage, findPrevPage } from '../../src/services/form-navigation'
import { testDataSpec, testFormSpec, conditionalPageFormSpec } from './fixtures'

describe('findNextPage', () => {
  it('returns next page index in linear form', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findNextPage(resolved, 0, {})).toBe(1)
    expect(findNextPage(resolved, 1, {})).toBe(2)
  })

  it('returns null after last page', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findNextPage(resolved, 2, {})).toBeNull()
  })

  it('skips pages whose condition is not met', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    const fields: Record<string, FieldEntry> = {
      employed: { value: 'No' },
    }
    expect(findNextPage(resolved, 0, fields)).toBe(2)
  })

  it('does not skip pages whose condition is met', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    const fields: Record<string, FieldEntry> = {
      employed: { value: 'Yes' },
    }
    expect(findNextPage(resolved, 0, fields)).toBe(1)
  })
})

describe('findPrevPage', () => {
  it('returns previous page index', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findPrevPage(resolved, 2, {})).toBe(1)
    expect(findPrevPage(resolved, 1, {})).toBe(0)
  })

  it('returns null before first page', () => {
    const resolved = resolveFormSpec(testFormSpec, testDataSpec)
    expect(findPrevPage(resolved, 0, {})).toBeNull()
  })

  it('skips pages whose condition is not met', () => {
    const resolved = resolveFormSpec(conditionalPageFormSpec, testDataSpec)
    const fields: Record<string, FieldEntry> = {
      employed: { value: 'No' },
    }
    expect(findPrevPage(resolved, 2, fields)).toBe(0)
  })
})
