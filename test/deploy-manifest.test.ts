import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const manifest = await Bun.file(join(process.cwd(), 'deploy.json')).json()

describe('deploy.json', () => {
  it('has an entrypoints object', () => {
    expect(manifest.entrypoints).toBeDefined()
    expect(typeof manifest.entrypoints).toBe('object')
  })

  for (const [role, path] of Object.entries(
    manifest.entrypoints as Record<string, string>,
  )) {
    it(`entrypoint "${role}" points at an existing file`, () => {
      const fullPath = join(process.cwd(), path)
      expect(existsSync(fullPath)).toBe(true)
    })
  }
})
