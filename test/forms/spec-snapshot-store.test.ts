import { afterAll, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { createSpecSnapshotStore } from '../../src/services/forms'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_DB = 'data/test-spec-snapshots.sqlite'
const TEST_SHA = 'abc1234567890def'

afterAll(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {}
})

describe('SpecSnapshotStore', () => {
  it('returns null for unknown SHA', () => {
    const store = createSpecSnapshotStore(TEST_DB)
    expect(store.get('nonexistent')).toBeNull()
  })

  it('round-trips a snapshot', () => {
    const store = createSpecSnapshotStore(TEST_DB)
    store.put(TEST_SHA, 'benefits-app', testDataSpec, testFormSpec)
    const result = store.get(TEST_SHA)
    expect(result).not.toBeNull()
    expect(result?.specId).toBe('benefits-app')
    expect(result?.dataCollectionSpec.id).toBe(testDataSpec.id)
    expect(result?.formSpec.id).toBe(testFormSpec.id)
  })

  it('overwrites existing snapshot for same SHA', () => {
    const store = createSpecSnapshotStore(TEST_DB)
    store.put(TEST_SHA, 'benefits-app', testDataSpec, testFormSpec)
    store.put(TEST_SHA, 'benefits-app', testDataSpec, {
      ...testFormSpec,
      title: 'Updated Title',
    })
    const result = store.get(TEST_SHA)
    expect(result?.formSpec.title).toBe('Updated Title')
  })
})
