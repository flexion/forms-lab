import { describe, expect, it } from 'bun:test'
import {
  decryptSession,
  encryptSession,
  type SessionUser,
} from '../src/services/auth'

describe('Session', () => {
  const secret = 'test-secret-key-32-bytes-long!'
  const user: SessionUser = {
    login: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
  }

  it('encrypts and decrypts session data', async () => {
    const encrypted = await encryptSession(user, secret)
    expect(typeof encrypted).toBe('string')
    expect(encrypted.length).toBeGreaterThan(0)

    const decrypted = await decryptSession(encrypted, secret)
    expect(decrypted).toEqual(user)
  })

  it('returns null for invalid encrypted data', async () => {
    const result = await decryptSession('invalid-data', secret)
    expect(result).toBeNull()
  })

  it('returns null for wrong secret', async () => {
    const encrypted = await encryptSession(user, secret)
    const result = await decryptSession(encrypted, 'wrong-secret')
    expect(result).toBeNull()
  })
})
