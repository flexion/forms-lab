import { describe, expect, it } from 'bun:test'
import app from '../src/app/server'

describe('Catalog Routes', () => {
  describe('GET /catalog/personas', () => {
    it('returns 200 and lists all personas', async () => {
      const res = await app.request('/catalog/personas')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Personas')
      expect(body).toContain('Maya')
      expect(body).toContain('Carlos')
      expect(body).toContain('Priya')
      expect(body).toContain('Developer')
      expect(body).toContain('Evaluator')
    })
  })

  describe('GET /catalog/personas/:id', () => {
    it('returns 200 and displays Maya persona', async () => {
      const res = await app.request('/catalog/personas/maya')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Maya')
      expect(body).toContain('Form Creator')
      expect(body).toContain('Program Officer')
    })

    it('returns 404 for unknown persona', async () => {
      const res = await app.request('/catalog/personas/unknown')
      expect(res.status).toBe(404)
    })
  })
})
