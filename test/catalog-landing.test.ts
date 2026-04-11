import { describe, expect, it } from 'bun:test'
import app from '../src/app/server'

describe('GET /catalog (landing page)', () => {
  it('renders grouped sections', async () => {
    const res = await app.request('/catalog')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('The System')
    expect(body).toContain('The Work')
    expect(body).toContain('The Craft')
  })

  it('renders descriptive text for each section card', async () => {
    const res = await app.request('/catalog')
    const body = await res.text()
    // Check for descriptions (apostrophes may be HTML-escaped)
    expect(body).toContain(
      'System overview, data model, deployment, threat model',
    )
    expect(body).toContain('Who the system serves')
    expect(body).toContain('being built')
    expect(body).toContain(
      'Tokens, components, compositions, and visual language',
    )
  })

  it('renders an orienting introduction', async () => {
    const res = await app.request('/catalog')
    const body = await res.text()
    expect(body).toContain('forms platform')
  })
})
