import { describe, expect, test } from 'bun:test'
import {
  resolveShapingBadgeFromLog,
  resolveVariantBadge,
} from '../../../src/services/variant-preferences'

function fakeRegistry(items: Array<{ id: string; name: string }>): {
  list(): Array<{ id: string; metadata: { name: string } }>
} {
  return {
    list: () => items.map((i) => ({ id: i.id, metadata: { name: i.name } })),
  }
}

describe('resolveVariantBadge', () => {
  test('returns metadata name when variant exists', () => {
    const registry = fakeRegistry([{ id: 'v1', name: 'Variant One' }])
    const result = resolveVariantBadge(registry, 'v1')
    expect(result).toEqual({ variantId: 'v1', variantName: 'Variant One' })
  })

  test('falls back to variantId when variant is not found', () => {
    const registry = fakeRegistry([])
    const result = resolveVariantBadge(registry, 'unknown-id')
    expect(result).toEqual({
      variantId: 'unknown-id',
      variantName: 'unknown-id',
    })
  })
})

describe('resolveShapingBadgeFromLog', () => {
  test('returns badge from last LLM entry with variantId', () => {
    const registry = fakeRegistry([{ id: 'shaper-v2', name: 'Shaper V2' }])
    const log = [
      { source: 'manual' },
      { source: 'llm', variantId: 'shaper-v1' },
      { source: 'llm', variantId: 'shaper-v2' },
      { source: 'manual' },
    ]
    const result = resolveShapingBadgeFromLog(log, registry)
    expect(result).toEqual({ variantId: 'shaper-v2', variantName: 'Shaper V2' })
  })

  test('returns null when no LLM entries have variantId', () => {
    const registry = fakeRegistry([])
    const log = [{ source: 'manual' }, { source: 'llm' }]
    const result = resolveShapingBadgeFromLog(log, registry)
    expect(result).toBeNull()
  })

  test('returns null for empty log', () => {
    const registry = fakeRegistry([])
    const result = resolveShapingBadgeFromLog([], registry)
    expect(result).toBeNull()
  })

  test('uses variantId as name when variant not in registry', () => {
    const registry = fakeRegistry([])
    const log = [{ source: 'llm', variantId: 'missing-variant' }]
    const result = resolveShapingBadgeFromLog(log, registry)
    expect(result).toEqual({
      variantId: 'missing-variant',
      variantName: 'missing-variant',
    })
  })
})
