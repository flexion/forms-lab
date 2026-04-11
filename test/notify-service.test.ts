import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

// The service reads SLACK_WEBHOOK_URL at import time, so set it before importing
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test'
process.env.PORT = '0' // let OS pick a port

describe('notify service', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('GET /health returns ok', async () => {
    const { default: app } = await import('../src/notify/main')
    const res = await app.fetch(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('notify')
  })

  it('POST /event with valid payload returns 200', async () => {
    const mockFetch = async () => new Response('ok', { status: 200 })
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    const { default: app } = await import('../src/notify/main')
    const res = await app.fetch(
      new Request('http://localhost/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deploy.success',
          title: 'Deployed main',
          status: 'success',
        }),
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('POST /event with invalid JSON returns 400', async () => {
    const { default: app } = await import('../src/notify/main')
    const res = await app.fetch(
      new Request('http://localhost/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    )

    expect(res.status).toBe(400)
  })

  it('POST /event with missing fields returns 400', async () => {
    const { default: app } = await import('../src/notify/main')
    const res = await app.fetch(
      new Request('http://localhost/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test' }),
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('POST /event returns 502 when Slack fails', async () => {
    const mockFetch = async () =>
      new Response('internal error', { status: 500 })
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    const { default: app } = await import('../src/notify/main')
    const res = await app.fetch(
      new Request('http://localhost/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          title: 'Test',
          status: 'info',
        }),
      }),
    )

    expect(res.status).toBe(502)
  })
})
