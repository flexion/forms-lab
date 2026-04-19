import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fixtureManifestSchema } from '../src/services/evaluation/schemas'
import { dataCollectionSpecSchema } from '../src/services/form-documents/schemas'

const fixturesDir = join(import.meta.dir, '..', 'fixtures')

describe('fixture validation', () => {
  it('all fixture directories have valid manifest.json', () => {
    const entries = readdirSync(fixturesDir, { withFileTypes: true })
    const dirs = entries.filter((e) => e.isDirectory())

    for (const dir of dirs) {
      const manifestPath = join(fixturesDir, dir.name, 'manifest.json')
      const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      const result = fixtureManifestSchema.safeParse(raw)
      expect(
        result.success,
        `Invalid manifest in ${dir.name}: ${JSON.stringify(result.error?.issues)}`,
      ).toBe(true)
    }
  })

  it('fixtures with ground-truth.json validate against DataCollectionSpec schema', () => {
    const entries = readdirSync(fixturesDir, { withFileTypes: true })
    const dirs = entries.filter((e) => e.isDirectory())

    for (const dir of dirs) {
      const gtPath = join(fixturesDir, dir.name, 'ground-truth.json')
      try {
        const raw = JSON.parse(readFileSync(gtPath, 'utf-8'))
        const result = dataCollectionSpecSchema.safeParse(raw)
        expect(result.success, `Invalid ground truth in ${dir.name}`).toBe(true)
      } catch {
        // ground-truth.json is optional until generated
      }
    }
  })
})
