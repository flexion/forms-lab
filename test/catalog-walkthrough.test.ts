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

  describe('Present mode', () => {
    it('returns 200 for walkthrough page in present mode', async () => {
      const res = await app.request(
        '/catalog/walkthrough/01-the-problem?present',
      )
      expect(res.status).toBe(200)
    })

    it('does not render catalog header in present mode', async () => {
      const res = await app.request(
        '/catalog/walkthrough/01-the-problem?present',
      )
      const body = await res.text()
      expect(body).not.toContain('flex-header')
      expect(body).toContain('flex-present-layout')
      expect(body).toContain('The Problem')
    })

    it('includes keyboard navigation script in present mode', async () => {
      const res = await app.request(
        '/catalog/walkthrough/01-the-problem?present',
      )
      const body = await res.text()
      expect(body).toContain('ArrowRight')
    })

    it('renders index as title slide in present mode', async () => {
      const res = await app.request('/catalog/walkthrough?present')
      expect(res.status).toBe(200)
      const body = await res.text()
      expect(body).toContain('flex-present-layout')
    })
  })
})
