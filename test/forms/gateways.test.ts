import { beforeEach, describe, expect, it } from 'bun:test'
import { InMemoryFormSessionGateway } from '../../src/services/forms/session'
import { InMemorySubmissionGateway } from '../../src/services/forms/submission'

describe('InMemoryFormSessionGateway', () => {
  let gateway: InMemoryFormSessionGateway

  beforeEach(() => {
    gateway = new InMemoryFormSessionGateway()
  })

  it('creates a session with a unique ID', () => {
    const session = gateway.createSession('spec-1', 'form-1', 'testuser')
    expect(session.id).toBeTruthy()
    expect(session.specId).toBe('spec-1')
    expect(session.formSpecId).toBe('form-1')
    expect(session.status).toBe('active')
    expect(session.fields).toEqual({})
  })

  it('retrieves a session by ID', () => {
    const session = gateway.createSession('spec-1', 'form-1', 'testuser')
    const retrieved = gateway.getSession(session.id)
    expect(retrieved).toEqual(session)
  })

  it('returns null for unknown session ID', () => {
    expect(gateway.getSession('nonexistent')).toBeNull()
  })

  it('writes fields to a session', () => {
    const session = gateway.createSession('spec-1', 'form-1', 'testuser')
    gateway.writeFields(session.id, {
      fullName: { value: 'Alice' },
      email: { value: 'alice@example.com' },
    })
    const updated = gateway.getSession(session.id)
    expect(updated?.fields.fullName.value).toBe('Alice')
    expect(updated?.fields.email.value).toBe('alice@example.com')
  })

  it('merges fields across multiple writes', () => {
    const session = gateway.createSession('spec-1', 'form-1', 'testuser')
    gateway.writeFields(session.id, { fullName: { value: 'Alice' } })
    gateway.writeFields(session.id, { email: { value: 'alice@example.com' } })
    const updated = gateway.getSession(session.id)
    expect(updated?.fields.fullName.value).toBe('Alice')
    expect(updated?.fields.email.value).toBe('alice@example.com')
  })

  it('submits a session and returns a submission', () => {
    const session = gateway.createSession('spec-1', 'form-1', 'testuser')
    gateway.writeFields(session.id, {
      fullName: { value: 'Alice' },
    })
    const submission = gateway.submit(session.id)
    expect(submission.id).toBeTruthy()
    expect(submission.specId).toBe('spec-1')
    expect(submission.formSpecId).toBe('form-1')
    expect(submission.data).toEqual({ fullName: 'Alice' })
    expect(submission.submittedAt).toBeTruthy()
  })

  it('marks session as submitted after submit', () => {
    const session = gateway.createSession('spec-1', 'form-1', 'testuser')
    gateway.submit(session.id)
    const updated = gateway.getSession(session.id)
    expect(updated?.status).toBe('submitted')
  })

  it('throws when submitting unknown session', () => {
    expect(() => gateway.submit('nonexistent')).toThrow()
  })
})

describe('InMemorySubmissionGateway', () => {
  it('stores and retrieves a submission', () => {
    const gateway = new InMemorySubmissionGateway()
    const submission = {
      id: 'sub-1',
      specId: 'spec-1',
      formSpecId: 'form-1',
      ownerId: 'testuser',
      data: { fullName: 'Alice' },
      submittedAt: new Date().toISOString(),
    }
    gateway.save(submission)
    expect(gateway.getSubmission('sub-1')).toEqual(submission)
  })

  it('returns null for unknown submission ID', () => {
    const gateway = new InMemorySubmissionGateway()
    expect(gateway.getSubmission('nonexistent')).toBeNull()
  })
})
