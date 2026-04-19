import { expect, test } from 'bun:test'
import {
  appendProvenance,
  type ProvenanceFile,
  readProvenance,
} from '../../src/services/variant-preferences/provenance'

test('appendProvenance creates a new file when none exists', () => {
  const next = appendProvenance(null, 'extraction', {
    variantId: 'sonnet',
    modelId: 'claude-sonnet-4',
    timestamp: '2026-04-18T12:00:00Z',
    specVersion: 'abc123',
  })
  expect(next.extraction).toHaveLength(1)
  expect(next.extraction?.[0]?.variantId).toBe('sonnet')
})

test('appendProvenance appends to existing task entries', () => {
  const existing: ProvenanceFile = {
    extraction: [
      {
        variantId: 'sonnet',
        modelId: 'claude-sonnet-4',
        timestamp: '2026-04-18T11:00:00Z',
        specVersion: 'aaa',
      },
    ],
  }
  const next = appendProvenance(existing, 'extraction', {
    variantId: 'haiku',
    modelId: 'claude-haiku-4.5',
    timestamp: '2026-04-18T12:00:00Z',
    specVersion: 'bbb',
  })
  expect(next.extraction).toHaveLength(2)
  expect(next.extraction?.[1]?.variantId).toBe('haiku')
})

test('appendProvenance preserves unrelated task entries', () => {
  const existing: ProvenanceFile = {
    shaping: [
      {
        variantId: 'bedrock-sonnet',
        timestamp: '2026-04-18T10:00:00Z',
      },
    ],
  }
  const next = appendProvenance(existing, 'extraction', {
    variantId: 'haiku',
    timestamp: '2026-04-18T12:00:00Z',
  })
  expect(next.shaping).toHaveLength(1)
  expect(next.extraction).toHaveLength(1)
})

test('readProvenance returns the latest entry for a task', () => {
  const file: ProvenanceFile = {
    extraction: [
      { variantId: 'sonnet', timestamp: '2026-04-18T11:00:00Z' },
      { variantId: 'haiku', timestamp: '2026-04-18T12:00:00Z' },
    ],
  }
  expect(readProvenance(file, 'extraction')?.variantId).toBe('haiku')
})

test('readProvenance returns null when task has no entries', () => {
  expect(readProvenance({}, 'extraction')).toBeNull()
  expect(readProvenance(null, 'extraction')).toBeNull()
})
