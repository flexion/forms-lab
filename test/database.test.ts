import { describe, expect, it } from 'bun:test'
import { createCacheStore } from '../src/services/database'

describe('CacheStore', () => {
  it('returns null for missing key', () => {
    const store = createCacheStore(':memory:')
    expect(store.get('nonexistent')).toBeNull()
  })

  it('stores and retrieves a cache entry', () => {
    const store = createCacheStore(':memory:')
    store.set('abc123', 'sonnet-4', '{"spec":{}}')
    const entry = store.get('abc123')
    expect(entry).not.toBeNull()
    expect(entry!.key).toBe('abc123')
    expect(entry!.model).toBe('sonnet-4')
    expect(entry!.result).toBe('{"spec":{}}')
    expect(entry!.createdAt).toBeGreaterThan(0)
  })

  it('overwrites existing entry on same key', () => {
    const store = createCacheStore(':memory:')
    store.set('abc123', 'sonnet-4', '{"v":1}')
    store.set('abc123', 'opus-4', '{"v":2}')
    const entry = store.get('abc123')
    expect(entry!.model).toBe('opus-4')
    expect(entry!.result).toBe('{"v":2}')
  })
})
