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
})
