import { describe, expect, it } from 'bun:test'
import app from '../src/server'

describe('Catalog Stories', () => {
  describe('GET /catalog/stories', () => {
    it('returns 200', async () => {
      const res = await app.request('/catalog/stories')
      expect(res.status).toBe(200)

      const body = await res.text()
      expect(body).toContain('User Stories')
    })
  })
})
