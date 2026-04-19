import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { notifyEvent } from '../src/services/notifications'

describe('notifyEvent', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('POSTs event to localhost notify service', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined

    const mockFetch = async (input: unknown, init?: RequestInit) => {
      capturedUrl = input as string
      capturedInit = init
      return new Response('ok', { status: 200 })
    }
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    await notifyEvent({
      type: 'deploy.success',
      title: 'Deployed main',
      status: 'success',
    })

    expect(capturedUrl).toBe('http://localhost:9001/event')
    expect(capturedInit?.method).toBe('POST')
    expect(capturedInit?.headers).toEqual({
      'Content-Type': 'application/json',
    })

    const body = JSON.parse(capturedInit?.body as string)
    expect(body.type).toBe('deploy.success')
    expect(body.title).toBe('Deployed main')
    expect(body.status).toBe('success')
  })

  it('does not throw on connection failure', async () => {
    const mockFetch = async (): Promise<Response> => {
      throw new Error('Connection refused')
    }
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    // Should not throw
    await notifyEvent({
      type: 'deploy.failure',
      title: 'Deploy failed',
      status: 'failure',
    })
  })

  it('does not throw on non-200 response', async () => {
    const mockFetch = async () => {
      return new Response('error', { status: 500 })
    }
    mockFetch.preconnect = (_url: string) => {}
    globalThis.fetch = mockFetch as typeof fetch

    // Should not throw
    await notifyEvent({
      type: 'test',
      title: 'Test',
      status: 'info',
    })
  })
})
