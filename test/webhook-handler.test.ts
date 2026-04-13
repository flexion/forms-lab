import { describe, expect, it } from 'bun:test'
import {
  parseDeleteEvent,
  parsePushEvent,
  verifySignature,
} from '../src/entrypoints/webhook/handler'

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
  it('extracts branch name, SHA, and repo info from push payload', () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'abc123def456',
      deleted: false,
      repository: { full_name: 'flexion/forms-lab' },
    }
    const result = parsePushEvent(payload)
    expect(result).toEqual({
      branch: 'main',
      sha: 'abc123def456',
      owner: 'flexion',
      repo: 'forms-lab',
    })
  })

  it('extracts branch with slashes in name', () => {
    const payload = {
      ref: 'refs/heads/slice-0/skeleton',
      after: 'xyz789',
      deleted: false,
      repository: { full_name: 'flexion/forms-lab' },
    }
    const result = parsePushEvent(payload)
    expect(result).toEqual({
      branch: 'slice-0/skeleton',
      sha: 'xyz789',
      owner: 'flexion',
      repo: 'forms-lab',
    })
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

  it('handles missing repository field', () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'abc123',
      deleted: false,
    }
    const result = parsePushEvent(payload)
    expect(result).toEqual({
      branch: 'main',
      sha: 'abc123',
      owner: '',
      repo: '',
    })
  })
})

describe('parseDeleteEvent', () => {
  it('extracts branch and repo info from delete payload', () => {
    const payload = {
      ref: 'refs/heads/feature/test',
      after: '0000000000000000000000000000000000000000',
      deleted: true,
      repository: { full_name: 'flexion/forms-lab' },
    }
    const result = parseDeleteEvent(payload)
    expect(result).toEqual({
      branch: 'feature/test',
      owner: 'flexion',
      repo: 'forms-lab',
    })
  })

  it('returns null for non-deleted push', () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'abc123',
      deleted: false,
    }
    const result = parseDeleteEvent(payload)
    expect(result).toBeNull()
  })

  it('returns null for tag deletion', () => {
    const payload = {
      ref: 'refs/tags/v1.0.0',
      after: '0000000',
      deleted: true,
    }
    const result = parseDeleteEvent(payload)
    expect(result).toBeNull()
  })
})
