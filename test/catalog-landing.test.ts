import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('GET /catalog', () => {
  it('returns 200 and shows content type overview', async () => {
    const res = await app.request('/catalog')
    expect(res.status).toBe(200)

    const body = await res.text()
    expect(body).toContain('Catalog')
    expect(body).toContain('Personas')
    expect(body).toContain('Decisions')
    expect(body).toContain('Architecture')
    expect(body).toContain('Stories')
    expect(body).toContain('Experiments')
  })
})
