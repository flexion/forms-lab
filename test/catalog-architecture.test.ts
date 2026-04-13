import { describe, expect, it } from 'bun:test'
import app from '../src/entrypoints/app/server'

describe('Catalog Architecture', () => {
  describe('GET /catalog/architecture', () => {
    it('returns 200 and lists architecture docs', async () => {
      const res = await app.request('/catalog/architecture')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Architecture')
      expect(body).toContain('System Overview')
      expect(body).toContain('Data Model')
    })
  })

  describe('GET /catalog/architecture/:slug', () => {
    it('returns 200 for system overview', async () => {
      const res = await app.request('/catalog/architecture/system-overview')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('System Overview')
    })

    it('returns 404 for unknown doc', async () => {
      const res = await app.request('/catalog/architecture/nonexistent')
      expect(res.status).toBe(404)
    })
  })
})
