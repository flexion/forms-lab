import { afterEach, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { createUserStore } from '../src/services/user-store'

const TEST_DB = '/tmp/test-user-store.sqlite'

function cleanup() {
  try {
    unlinkSync(TEST_DB)
  } catch {
    // ignore if file doesn't exist
  }
  try {
    unlinkSync(`${TEST_DB}-wal`)
  } catch {
    // ignore
  }
  try {
    unlinkSync(`${TEST_DB}-shm`)
  } catch {
    // ignore
  }
}

describe('UserStore', () => {
  afterEach(cleanup)

  it('upserts and retrieves a user', () => {
    const store = createUserStore(TEST_DB)
    store.upsert({
      login: 'octocat',
      name: 'Octo Cat',
      avatarUrl: 'https://example.com/octocat.png',
    })

    const user = store.get('octocat')
    expect(user).not.toBeNull()
    expect(user?.login).toBe('octocat')
    expect(user?.name).toBe('Octo Cat')
    expect(user?.avatarUrl).toBe('https://example.com/octocat.png')
    expect(typeof user?.createdAt).toBe('number')
    expect(typeof user?.updatedAt).toBe('number')
  })

  it('updates existing user on upsert', () => {
    const store = createUserStore(TEST_DB)
    store.upsert({
      login: 'octocat',
      name: 'Octo Cat',
      avatarUrl: 'https://example.com/old.png',
    })
    const first = store.get('octocat')

    store.upsert({
      login: 'octocat',
      name: 'Octo Cat Updated',
      avatarUrl: 'https://example.com/new.png',
    })
    const second = store.get('octocat')

    expect(second).not.toBeNull()
    expect(second?.name).toBe('Octo Cat Updated')
    expect(second?.avatarUrl).toBe('https://example.com/new.png')
    expect(second?.createdAt).toBe(first?.createdAt)
    expect(second?.updatedAt).toBeGreaterThanOrEqual(first?.updatedAt ?? 0)
  })

  it('returns null for unknown user', () => {
    const store = createUserStore(TEST_DB)
    expect(store.get('nonexistent')).toBeNull()
  })

  it('checks if user exists', () => {
    const store = createUserStore(TEST_DB)
    expect(store.exists('octocat')).toBe(false)

    store.upsert({
      login: 'octocat',
      name: 'Octo Cat',
      avatarUrl: 'https://example.com/octocat.png',
    })
    expect(store.exists('octocat')).toBe(true)
  })
})
