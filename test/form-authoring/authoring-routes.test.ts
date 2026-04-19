import { describe, expect, test } from 'bun:test'

describe('authoring routes', () => {
  test('route module exports createAuthoringRoutes', async () => {
    const mod = await import(
      '../../src/entrypoints/app/routes/owner/edit/authoring'
    )
    expect(typeof mod.createAuthoringRoutes).toBe('function')
  })
})
