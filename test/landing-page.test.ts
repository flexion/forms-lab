import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'

describe('GET / (anonymous landing page)', () => {
  it('communicates the value proposition', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.text()
    // Problem framing
    expect(body).toContain('Forms shouldn')
    expect(body).toContain('be this hard')
    // Capability blocks
    expect(body).toContain('Upload a PDF')
    expect(body).toContain('Shape the experience')
    expect(body).toContain('Deliver forms')
    expect(body).toContain('Own your data')
  })

  it('provides calls to action', async () => {
    const res = await app.request('/')
    const body = await res.text()
    expect(body).toContain('/auth/signin')
    expect(body).toContain('/catalog')
  })

  it('mentions origins', async () => {
    const res = await app.request('/')
    const body = await res.text()
    expect(body).toContain('LLMs In Production')
    expect(body).toContain('gsa-tts/forms')
  })

  it('preserves auth error display', async () => {
    const res = await app.request('/?error=access_denied')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Access denied')
  })
})
