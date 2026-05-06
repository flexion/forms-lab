import { afterEach, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { createAccessStore } from '../src/services/auth'

const TEST_DB = '/tmp/test-access-store.sqlite'

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      unlinkSync(`${TEST_DB}${suffix}`)
    } catch {
      /* ignore */
    }
  }
}

describe('AccessStore', () => {
  afterEach(cleanup)

  it('returns null for unknown user', () => {
    const store = createAccessStore(TEST_DB)
    expect(store.get('unknown')).toBeNull()
  })

  it('sets a user to pending via requestAccess', () => {
    const store = createAccessStore(TEST_DB)
    store.requestAccess('octocat')
    const entry = store.get('octocat')
    expect(entry).not.toBeNull()
    expect(entry?.status).toBe('pending')
    expect(entry?.source).toBe('request')
    expect(entry?.requestedAt).toBeGreaterThan(0)
    expect(entry?.decidedAt).toBeNull()
    expect(entry?.decidedBy).toBeNull()
  })

  it('approves a pending user', () => {
    const store = createAccessStore(TEST_DB)
    store.requestAccess('octocat')
    store.approve('octocat', 'admin1')
    const entry = store.get('octocat')
    expect(entry?.status).toBe('approved')
    expect(entry?.source).toBe('request')
    expect(entry?.decidedBy).toBe('admin1')
    expect(entry?.decidedAt).toBeGreaterThan(0)
  })

  it('revokes an approved user', () => {
    const store = createAccessStore(TEST_DB)
    store.setApproved('octocat', 'admin')
    store.revoke('octocat', 'admin1')
    const entry = store.get('octocat')
    expect(entry?.status).toBe('revoked')
    expect(entry?.decidedBy).toBe('admin1')
  })

  it('denies a pending user', () => {
    const store = createAccessStore(TEST_DB)
    store.requestAccess('octocat')
    store.deny('octocat', 'admin1')
    const entry = store.get('octocat')
    expect(entry?.status).toBe('revoked')
    expect(entry?.decidedBy).toBe('admin1')
  })

  it('sets a user as approved with a given source', () => {
    const store = createAccessStore(TEST_DB)
    store.setApproved('octocat', 'domain')
    const entry = store.get('octocat')
    expect(entry?.status).toBe('approved')
    expect(entry?.source).toBe('domain')
  })

  it('does not downgrade an approved user on setApproved with same source', () => {
    const store = createAccessStore(TEST_DB)
    store.setApproved('octocat', 'admin')
    store.setApproved('octocat', 'domain')
    const entry = store.get('octocat')
    expect(entry?.status).toBe('approved')
    expect(entry?.source).toBe('admin')
  })

  it('lists users by status', () => {
    const store = createAccessStore(TEST_DB)
    store.requestAccess('pending1')
    store.requestAccess('pending2')
    store.setApproved('approved1', 'domain')
    store.setApproved('approved2', 'admin')

    const pending = store.listByStatus('pending')
    expect(pending).toHaveLength(2)

    const approved = store.listByStatus('approved')
    expect(approved).toHaveLength(2)
  })

  it('requestAccess is idempotent for pending users', () => {
    const store = createAccessStore(TEST_DB)
    store.requestAccess('octocat')
    const first = store.get('octocat')
    store.requestAccess('octocat')
    const second = store.get('octocat')
    expect(second?.requestedAt).toBe(first?.requestedAt)
  })
})
