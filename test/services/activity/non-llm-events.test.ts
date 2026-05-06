import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ActivityStore } from '../../../src/services/activity'
import { createActivityStore } from '../../../src/services/activity'

describe('Non-LLM event tracking', () => {
  let tmpDir: string
  let store: ActivityStore

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'activity-nonllm-'))
    store = createActivityStore(join(tmpDir, 'activity.sqlite'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('tracks project_created event', () => {
    store.track({
      eventType: 'project_created',
      userId: 'daniel',
      projectId: 'snap-form',
    })

    const events = store.query({ eventType: 'project_created' })
    expect(events).toHaveLength(1)
    expect(events[0].userId).toBe('daniel')
    expect(events[0].projectId).toBe('snap-form')
  })

  it('tracks sign_in event', () => {
    store.track({ eventType: 'sign_in', userId: 'daniel' })

    const events = store.query({ eventType: 'sign_in' })
    expect(events).toHaveLength(1)
    expect(events[0].userId).toBe('daniel')
  })

  it('tracks pdf_uploaded event', () => {
    store.track({
      eventType: 'pdf_uploaded',
      userId: 'daniel',
      projectId: 'i-9',
    })

    const events = store.query({ eventType: 'pdf_uploaded' })
    expect(events).toHaveLength(1)
  })
})
