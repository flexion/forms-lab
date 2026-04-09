import { describe, expect, it } from 'bun:test'
import { parsePushEvent, verifySignature } from '../src/webhook/handler'

describe('verifySignature', () => {
  const secret = 'test-secret'
  const payload = JSON.stringify({ ref: 'refs/heads/main', after: 'abc123' })

  it('returns true for valid signature', async () => {
    const hmac = new Bun.CryptoHasher('sha256', secret)
    hmac.update(payload)
    const computed = hmac.digest('hex')
    const signature = `sha256=${computed}`

    const result = await verifySignature(payload, signature, secret)
    expect(result).toBe(true)
  })

  it('returns false for invalid signature', async () => {
    const invalidSignature = 'sha256=invalid'
    const result = await verifySignature(payload, invalidSignature, secret)
    expect(result).toBe(false)
  })

  it('returns false for missing signature', async () => {
    const result = await verifySignature(payload, '', secret)
    expect(result).toBe(false)
  })

  it('returns false for non-sha256 prefix', async () => {
    const signature = 'md5=somethingelse'
    const result = await verifySignature(payload, signature, secret)
    expect(result).toBe(false)
  })
})

describe('parsePushEvent', () => {
  it('extracts branch name and SHA from push payload', () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'abc123def456',
      deleted: false,
    }
    const result = parsePushEvent(payload)
    expect(result).toEqual({ branch: 'main', sha: 'abc123def456' })
  })

  it('extracts branch with slashes in name', () => {
    const payload = {
      ref: 'refs/heads/slice-0/skeleton',
      after: 'xyz789',
      deleted: false,
    }
    const result = parsePushEvent(payload)
    expect(result).toEqual({ branch: 'slice-0/skeleton', sha: 'xyz789' })
  })

  it('returns null for deleted branch', () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'abc123',
      deleted: true,
    }
    const result = parsePushEvent(payload)
    expect(result).toBeNull()
  })

  it('returns null for tag push', () => {
    const payload = {
      ref: 'refs/tags/v1.0.0',
      after: 'abc123',
      deleted: false,
    }
    const result = parsePushEvent(payload)
    expect(result).toBeNull()
  })
})
