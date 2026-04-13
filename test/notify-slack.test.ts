import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  formatSlackMessage,
  postToSlack,
} from '../src/entrypoints/notify/slack'
import type { NotifyEvent } from '../src/services/notifications/types'
import { validateEvent } from '../src/services/notifications/types'

describe('validateEvent', () => {
  it('accepts a valid event with all fields', () => {
    const result = validateEvent({
      type: 'deploy.success',
      title: 'Deployed main',
      status: 'success',
      details: 'Branch deployed in 42s',
      timestamp: '2026-04-11T12:00:00Z',
    })

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.event.type).toBe('deploy.success')
      expect(result.event.title).toBe('Deployed main')
      expect(result.event.status).toBe('success')
      expect(result.event.details).toBe('Branch deployed in 42s')
      expect(result.event.timestamp).toBe('2026-04-11T12:00:00Z')
    }
  })

  it('accepts a valid event with only required fields and defaults timestamp', () => {
    const before = new Date().toISOString()
    const result = validateEvent({
      type: 'service.crashed',
      title: 'Webhook down',
      status: 'failure',
    })
    const after = new Date().toISOString()

    expect(result.valid).toBe(true)
    if (result.valid) {
      const ts = result.event.timestamp ?? ''
      expect(ts).not.toBe('')
      expect(ts >= before).toBe(true)
      expect(ts <= after).toBe(true)
      expect(result.event.details).toBeUndefined()
    }
  })

  it('rejects non-object input', () => {
    const result = validateEvent('not an object')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('object')
    }
  })

  it('rejects null input', () => {
    const result = validateEvent(null)
    expect(result.valid).toBe(false)
  })

  it('rejects missing type', () => {
    const result = validateEvent({ title: 'x', status: 'info' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('type')
    }
  })

  it('rejects missing title', () => {
    const result = validateEvent({ type: 'x', status: 'info' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('title')
    }
  })

  it('rejects missing status', () => {
    const result = validateEvent({ type: 'x', title: 'y' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('status')
    }
  })

  it('rejects invalid status value', () => {
    const result = validateEvent({
      type: 'x',
      title: 'y',
      status: 'warning',
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('status')
    }
  })
})

describe('formatSlackMessage', () => {
  const baseEvent: NotifyEvent = {
    type: 'deploy.success',
    title: 'Deployed main',
    status: 'success',
    timestamp: '2026-04-11T12:00:00Z',
  }

  it('uses correct color for success', () => {
    const msg = formatSlackMessage(baseEvent) as {
      attachments: Array<{ color: string }>
    }
    expect(msg.attachments[0].color).toBe('#2eb886')
  })

  it('uses correct color for failure', () => {
    const msg = formatSlackMessage({ ...baseEvent, status: 'failure' }) as {
      attachments: Array<{ color: string }>
    }
    expect(msg.attachments[0].color).toBe('#dc3545')
  })

  it('uses correct color for info', () => {
    const msg = formatSlackMessage({ ...baseEvent, status: 'info' }) as {
      attachments: Array<{ color: string }>
    }
    expect(msg.attachments[0].color).toBe('#6c757d')
  })

  it('includes title in output', () => {
    const msg = formatSlackMessage(baseEvent)
    const text = JSON.stringify(msg)
    expect(text).toContain('Deployed main')
  })

  it('includes type in output', () => {
    const msg = formatSlackMessage(baseEvent)
    const text = JSON.stringify(msg)
    expect(text).toContain('deploy.success')
  })

  it('includes details when present', () => {
    const msg = formatSlackMessage({
      ...baseEvent,
      details: 'Took 42 seconds',
    })
    const text = JSON.stringify(msg)
    expect(text).toContain('Took 42 seconds')
  })

  it('omits details block when details absent', () => {
    const msg = formatSlackMessage(baseEvent) as {
      attachments: Array<{ blocks: Array<{ type: string }> }>
    }
    // Should have section + timestamp context only (2 blocks), no details context
    const contextBlocks = msg.attachments[0].blocks.filter(
      (b) => b.type === 'context',
    )
    expect(contextBlocks).toHaveLength(1) // only timestamp
  })

  it('includes details block when details present', () => {
    const msg = formatSlackMessage({
      ...baseEvent,
      details: 'Extra info',
    }) as {
      attachments: Array<{ blocks: Array<{ type: string }> }>
    }
    const contextBlocks = msg.attachments[0].blocks.filter(
      (b) => b.type === 'context',
    )
    expect(contextBlocks).toHaveLength(2) // details + timestamp
  })
})

describe('postToSlack', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends POST with correct payload on success', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined

    const mockFetch = async (input: unknown, init?: RequestInit) => {
      capturedUrl = input as string
      capturedInit = init
      return new Response('ok', { status: 200 })
    }
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    const event: NotifyEvent = {
      type: 'deploy.success',
      title: 'Deployed',
      status: 'success',
      timestamp: '2026-04-11T12:00:00Z',
    }

    const result = await postToSlack('https://hooks.slack.com/test', event)

    expect(result.ok).toBe(true)
    expect(capturedUrl).toBe('https://hooks.slack.com/test')
    expect(capturedInit?.method).toBe('POST')
    expect(capturedInit?.headers).toEqual({
      'Content-Type': 'application/json',
    })

    const body = JSON.parse(capturedInit?.body as string)
    expect(body.attachments).toBeDefined()
  })

  it('returns error on non-200 response', async () => {
    const mockFetch = async () => {
      return new Response('bad request', { status: 400 })
    }
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    const event: NotifyEvent = {
      type: 'test',
      title: 'Test',
      status: 'info',
      timestamp: '2026-04-11T12:00:00Z',
    }

    const result = await postToSlack('https://hooks.slack.com/test', event)

    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns error on fetch exception', async () => {
    const mockFetch = async (): Promise<Response> => {
      throw new Error('Network error')
    }
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    const event: NotifyEvent = {
      type: 'test',
      title: 'Test',
      status: 'info',
      timestamp: '2026-04-11T12:00:00Z',
    }

    const result = await postToSlack('https://hooks.slack.com/test', event)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Network error')
  })
})
