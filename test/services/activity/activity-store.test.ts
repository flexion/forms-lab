import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createActivityStore } from '../../../src/services/activity'

describe('ActivityStore', () => {
  let tmpDir: string
  let store: ReturnType<typeof createActivityStore>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'activity-test-'))
    store = createActivityStore(join(tmpDir, 'activity.sqlite'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('tracks an event and retrieves it via query', () => {
    store.track({
      eventType: 'llm_call',
      userId: 'daniel',
      projectId: 'snap-form',
      operation: 'extraction',
      metadata: {
        model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        inputTokens: 1500,
        outputTokens: 800,
        durationMs: 2000,
      },
    })

    const events = store.query({})
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('llm_call')
    expect(events[0].userId).toBe('daniel')
    expect(events[0].projectId).toBe('snap-form')
    expect(events[0].operation).toBe('extraction')
    expect(events[0].metadata.inputTokens).toBe(1500)
  })

  it('filters by userId', () => {
    store.track({ eventType: 'sign_in', userId: 'daniel' })
    store.track({ eventType: 'sign_in', userId: 'maya' })

    const events = store.query({ userId: 'daniel' })
    expect(events).toHaveLength(1)
    expect(events[0].userId).toBe('daniel')
  })

  it('filters by time range', () => {
    store.track({ eventType: 'sign_in', userId: 'daniel' })

    const future = Math.floor(Date.now() / 1000) + 3600
    const events = store.query({ from: future })
    expect(events).toHaveLength(0)
  })

  it('filters by eventType and operation', () => {
    store.track({
      eventType: 'llm_call',
      userId: 'daniel',
      operation: 'extraction',
    })
    store.track({
      eventType: 'llm_call',
      userId: 'daniel',
      operation: 'shaping',
    })
    store.track({ eventType: 'project_created', userId: 'daniel' })

    const extractions = store.query({
      eventType: 'llm_call',
      operation: 'extraction',
    })
    expect(extractions).toHaveLength(1)
  })

  it('respects limit', () => {
    store.track({ eventType: 'sign_in', userId: 'a' })
    store.track({ eventType: 'sign_in', userId: 'b' })
    store.track({ eventType: 'sign_in', userId: 'c' })

    const events = store.query({ limit: 2 })
    expect(events).toHaveLength(2)
  })

  it('summarizes events for a time period', () => {
    const now = Math.floor(Date.now() / 1000)
    store.track({
      eventType: 'llm_call',
      userId: 'daniel',
      projectId: 'snap-form',
      operation: 'extraction',
      metadata: {
        model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: 1500,
      },
    })
    store.track({
      eventType: 'llm_call',
      userId: 'maya',
      projectId: 'i-9',
      operation: 'shaping',
      metadata: {
        model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        inputTokens: 2000,
        outputTokens: 1000,
        durationMs: 3000,
      },
    })
    store.track({
      eventType: 'project_created',
      userId: 'daniel',
      projectId: 'snap-form',
    })

    const summary = store.summarize({ from: now - 60, to: now + 60 })
    expect(summary.totalEvents).toBe(3)
    expect(summary.estimatedCost).toBeGreaterThan(0)
    expect(summary.byUser).toHaveLength(2)
    expect(summary.byOperation).toHaveLength(2)
    expect(summary.byProject).toHaveLength(2)
  })
})
