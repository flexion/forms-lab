import { afterAll, describe, expect, it } from 'bun:test'
import { unlinkSync } from 'node:fs'
import type { Submission } from '../../src/services/forms'
import { SqliteSubmissionGateway } from '../../src/services/forms'

const TEST_DB = 'data/test-form-submissions.sqlite'

afterAll(() => {
  try {
    unlinkSync(TEST_DB)
  } catch {}
})

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: crypto.randomUUID(),
    sessionId: 'session-1',
    specId: 'spec-1',
    formSpecId: 'form-1',
    ownerId: 'alice',
    data: { name: 'Alice' },
    specVersion: 'sha123',
    submittedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('SqliteSubmissionGateway', () => {
  it('saves and retrieves a submission', () => {
    const gw = new SqliteSubmissionGateway(TEST_DB)
    const submission = makeSubmission()
    gw.save(submission)
    const retrieved = gw.getSubmission(submission.id)
    expect(retrieved).toEqual(submission)
  })

  it('returns null for unknown submission', () => {
    const gw = new SqliteSubmissionGateway(TEST_DB)
    expect(gw.getSubmission('nonexistent')).toBeNull()
  })

  it('lists submissions by owner', () => {
    const gw = new SqliteSubmissionGateway(TEST_DB)
    gw.save(makeSubmission({ ownerId: 'bob' }))
    gw.save(makeSubmission({ ownerId: 'bob' }))
    gw.save(makeSubmission({ ownerId: 'carol' }))
    const bobSubmissions = gw.listByOwner('bob')
    expect(bobSubmissions.length).toBeGreaterThanOrEqual(2)
    expect(bobSubmissions.every((s) => s.ownerId === 'bob')).toBe(true)
  })
})
