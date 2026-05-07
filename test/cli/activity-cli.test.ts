import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  formatEvents,
  formatSummary,
} from '../../src/entrypoints/cli/commands/activity'
import { createActivityStore } from '../../src/services/activity'

describe('activity CLI formatting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'activity-cli-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('formatSummary produces readable output', () => {
    const store = createActivityStore(join(tmpDir, 'activity.sqlite'))
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

    const now = Math.floor(Date.now() / 1000)
    const summary = store.summarize({ from: now - 86400, to: now + 60 })
    const output = formatSummary(summary)

    expect(output).toContain('daniel')
    expect(output).toContain('extraction')
    expect(output).toContain('snap-form')
    expect(output).toContain('$')
  })

  it('formatEvents produces readable output', () => {
    const store = createActivityStore(join(tmpDir, 'activity.sqlite'))
    store.track({ eventType: 'sign_in', userId: 'daniel' })

    const events = store.query({})
    const output = formatEvents(events)

    expect(output).toContain('sign_in')
    expect(output).toContain('daniel')
  })
})
