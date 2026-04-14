import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'

describe('Walkthrough Routes', () => {
  describe('GET /catalog/walkthrough', () => {
    it('returns 200 and lists walkthrough pages', async () => {
      const res = await app.request('/catalog/walkthrough')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Walkthrough')
      expect(body).toContain('The Problem')
    })
  })

  describe('GET /catalog/walkthrough/:slug', () => {
    it('returns 200 and renders walkthrough page', async () => {
      const res = await app.request('/catalog/walkthrough/01-the-problem')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('The Problem')
      expect(body).toContain('Government Forms')
    })

    it('shows progress indicator', async () => {
      const res = await app.request('/catalog/walkthrough/01-the-problem')
      const body = await res.text()
      expect(body).toContain('1 of')
    })

    it('returns 404 for unknown slug', async () => {
      const res = await app.request('/catalog/walkthrough/nonexistent')
      expect(res.status).toBe(404)
    })
  })

  describe('Sidebar Integration', () => {
    it('shows walkthrough link in catalog sidebar', async () => {
      const res = await app.request('/catalog')
      const body = await res.text()
      expect(body).toContain('Walkthrough')
      expect(body).toContain('/catalog/walkthrough')
    })

    it('shows contextual sidebar on walkthrough pages', async () => {
      const res = await app.request('/catalog/walkthrough/01-the-problem')
      const body = await res.text()
      expect(body).toContain('← Back to Catalog')
    })
  })
})
