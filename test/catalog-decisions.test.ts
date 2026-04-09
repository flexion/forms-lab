import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('Catalog Decisions', () => {
  describe('GET /catalog/decisions', () => {
    it('returns 200 and lists decision groups', async () => {
      const res = await app.request('/catalog/decisions')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Architectural Decisions')
      expect(body).toContain('architecture')
      expect(body).toContain('infrastructure')
      expect(body).toContain('design-system')
    })
  })

  describe('GET /catalog/decisions/:group/:slug', () => {
    it('returns 200 for a known decision', async () => {
      const res = await app.request(
        '/catalog/decisions/architecture/hono-on-bun',
      )
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('Hono')
      expect(body).toContain('stable')
    })

    it('returns 404 for unknown decision', async () => {
      const res = await app.request(
        '/catalog/decisions/architecture/nonexistent',
      )
      expect(res.status).toBe(404)
    })
  })
})
