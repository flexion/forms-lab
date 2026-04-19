import { afterAll, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import { SqliteFormSessionGateway } from '../../src/services/forms'

const TEST_DB = 'data/test-form-sessions.sqlite'

afterAll(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {}
})

describe('SqliteFormSessionGateway', () => {
  it('creates and retrieves a session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    const session = gw.createSession('spec-1', 'form-1', 'alice', 'sha123')
    expect(session.id).toBeTruthy()
    expect(session.specId).toBe('spec-1')
    expect(session.formSpecId).toBe('form-1')
    expect(session.ownerId).toBe('alice')
    expect(session.specVersion).toBe('sha123')
    expect(session.status).toBe('active')
    expect(session.fields).toEqual({})
    const retrieved = gw.getSession(session.id)
    expect(retrieved).toEqual(session)
  })

  it('returns null for unknown session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    expect(gw.getSession('nonexistent')).toBeNull()
  })

  it('lists sessions by owner', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    gw.createSession('spec-1', 'form-1', 'bob', 'sha1')
    gw.createSession('spec-1', 'form-1', 'bob', 'sha1')
    gw.createSession('spec-1', 'form-1', 'carol', 'sha1')
    const bobSessions = gw.listByOwner('bob')
    expect(bobSessions.length).toBeGreaterThanOrEqual(2)
    expect(bobSessions.every((s) => s.ownerId === 'bob')).toBe(true)
  })

  it('writes and merges fields', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    const session = gw.createSession('spec-1', 'form-1', 'dave', 'sha1')
    gw.writeFields(session.id, {
      name: { value: 'Dave' },
      email: { value: 'dave@example.com' },
    })
    const updated = gw.getSession(session.id)
    expect(updated?.fields.name.value).toBe('Dave')
    expect(updated?.fields.email.value).toBe('dave@example.com')

    gw.writeFields(session.id, {
      email: { value: 'dave2@example.com' },
      phone: { value: '555-1234' },
    })
    const merged = gw.getSession(session.id)
    expect(merged?.fields.name.value).toBe('Dave')
    expect(merged?.fields.email.value).toBe('dave2@example.com')
    expect(merged?.fields.phone.value).toBe('555-1234')
  })

  it('throws on writeFields for unknown session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    expect(() => gw.writeFields('nonexistent', { x: { value: 1 } })).toThrow(
      'Session "nonexistent" not found',
    )
  })

  it('submits a session and returns a submission', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    const session = gw.createSession('spec-1', 'form-1', 'eve', 'sha456')
    gw.writeFields(session.id, {
      name: { value: 'Eve' },
      optional: { value: null },
    })
    const submission = gw.submit(session.id)
    expect(submission.id).toBeTruthy()
    expect(submission.sessionId).toBe(session.id)
    expect(submission.specId).toBe('spec-1')
    expect(submission.ownerId).toBe('eve')
    expect(submission.specVersion).toBe('sha456')
    expect(submission.data).toEqual({ name: 'Eve' })
    const updated = gw.getSession(session.id)
    expect(updated?.status).toBe('submitted')
  })

  it('throws on submit for unknown session', () => {
    const gw = new SqliteFormSessionGateway(TEST_DB)
    expect(() => gw.submit('nonexistent')).toThrow(
      'Session "nonexistent" not found',
    )
  })
})
