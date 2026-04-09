import { describe, expect, it } from 'bun:test'
import app from '../src/app/server'

describe('Server', () => {
  it('responds to health check', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
  })

  it('responds to root path', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = await res.text()
    expect(body).toContain('Forms Lab')
  })
})
