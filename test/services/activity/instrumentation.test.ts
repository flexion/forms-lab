import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ActivityStore } from '../../../src/services/activity'
import {
  createActivityStore,
  trackLlmCall,
} from '../../../src/services/activity'

describe('LLM instrumentation helper', () => {
  let tmpDir: string
  let store: ActivityStore

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'activity-instr-'))
    store = createActivityStore(join(tmpDir, 'activity.sqlite'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('trackLlmCall records model, tokens, and duration', () => {
    trackLlmCall(store, {
      userId: 'daniel',
      projectId: 'snap-form',
      operation: 'extraction',
      model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      usage: { inputTokens: 1500, outputTokens: 800 },
      durationMs: 2340,
    })

    const events = store.query({})
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('llm_call')
    expect(events[0].metadata.model).toBe(
      'us.anthropic.claude-sonnet-4-20250514-v1:0',
    )
    expect(events[0].metadata.inputTokens).toBe(1500)
    expect(events[0].metadata.outputTokens).toBe(800)
    expect(events[0].metadata.durationMs).toBe(2340)
  })

  it('trackLlmCall works without optional userId and projectId', () => {
    trackLlmCall(store, {
      operation: 'shaping',
      model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      usage: { inputTokens: 500, outputTokens: 200 },
      durationMs: 1100,
    })

    const events = store.query({})
    expect(events).toHaveLength(1)
    expect(events[0].userId).toBeNull()
    expect(events[0].projectId).toBeNull()
    expect(events[0].operation).toBe('shaping')
  })
})
