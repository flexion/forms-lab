import { afterEach, describe, expect, it, mock } from 'bun:test'
import { createGitHubClient } from '../src/services/github'

describe('createDeployment', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends correct POST request to create a deployment', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (url: string, init?: RequestInit) => {
      capturedUrl = url
      capturedInit = init
      return new Response(
        JSON.stringify({
          id: 99,
          url: 'https://api.github.com/repos/flexion/forms-lab/deployments/99',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }) as unknown as typeof fetch

    const client = createGitHubClient('test-token')
    const result = await client.createDeployment(
      'flexion',
      'forms-lab',
      'abc123',
      'feature-branch',
      'Test deployment',
    )

    expect(capturedUrl).toBe(
      'https://api.github.com/repos/flexion/forms-lab/deployments',
    )
    expect(capturedInit?.method).toBe('POST')

    const headers = capturedInit?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer test-token')
    expect(headers.Accept).toBe('application/vnd.github+json')

    const body = JSON.parse(capturedInit?.body as string)
    expect(body.ref).toBe('abc123')
    expect(body.environment).toBe('feature-branch')
    expect(body.auto_merge).toBe(false)
    expect(body.required_contexts).toEqual([])
    expect(body.description).toBe('Test deployment')

    expect(result.id).toBe(99)
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = mock(async () => {
      return new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }) as unknown as typeof fetch

    const client = createGitHubClient('test-token')
    expect(
      client.createDeployment('flexion', 'forms-lab', 'abc123', 'env'),
    ).rejects.toThrow('Failed to create deployment: 404 Not Found')
  })

  it('works without token (no Authorization header)', async () => {
    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
      capturedInit = init
      return new Response(JSON.stringify({ id: 1, url: 'u' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const client = createGitHubClient()
    await client.createDeployment('o', 'r', 'sha', 'env')

    const headers = capturedInit?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })
})

describe('createDeploymentStatus', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends correct POST request to create a deployment status', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (url: string, init?: RequestInit) => {
      capturedUrl = url
      capturedInit = init
      return new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const client = createGitHubClient('test-token')
    await client.createDeploymentStatus(
      'flexion',
      'forms-lab',
      99,
      'success',
      'https://example.com/branch/',
      'Deployed successfully',
    )

    expect(capturedUrl).toBe(
      'https://api.github.com/repos/flexion/forms-lab/deployments/99/statuses',
    )
    expect(capturedInit?.method).toBe('POST')

    const body = JSON.parse(capturedInit?.body as string)
    expect(body.state).toBe('success')
    expect(body.auto_inactive).toBe(true)
    expect(body.environment_url).toBe('https://example.com/branch/')
    expect(body.description).toBe('Deployed successfully')
  })

  it('omits environment_url when not provided', async () => {
    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
      capturedInit = init
      return new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const client = createGitHubClient('test-token')
    await client.createDeploymentStatus('o', 'r', 1, 'in_progress')

    const body = JSON.parse(capturedInit?.body as string)
    expect(body.environment_url).toBeUndefined()
    expect(body.description).toBeUndefined()
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = mock(async () => {
      return new Response('Forbidden', { status: 403, statusText: 'Forbidden' })
    }) as unknown as typeof fetch

    const client = createGitHubClient('test-token')
    expect(
      client.createDeploymentStatus('o', 'r', 1, 'success'),
    ).rejects.toThrow('Failed to create deployment status: 403 Forbidden')
  })
})
