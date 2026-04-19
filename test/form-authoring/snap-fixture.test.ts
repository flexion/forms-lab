import { describe, expect, test } from 'bun:test'

describe('SNAP Wisconsin fixture', () => {
  test('manifest.json is valid', async () => {
    const manifest = await Bun.file('fixtures/snap-wisconsin/manifest.json').json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.specVersion).toBeTruthy()
    expect(manifest.reviewed).toBe(true)
  })

  test('ground-truth.json has expected structure', async () => {
    const gt = await Bun.file('fixtures/snap-wisconsin/ground-truth.json').json()
    expect(gt.id).toBeTruthy()
    expect(gt.title).toBeTruthy()
    expect(gt.groups.length).toBeGreaterThanOrEqual(10)

    const totalFields = gt.groups.reduce(
      (sum: number, g: { requirements: unknown[] }) => sum + g.requirements.length,
      0,
    )
    expect(totalFields).toBeGreaterThanOrEqual(50)
  })

  test('all fields have required properties', async () => {
    const gt = await Bun.file('fixtures/snap-wisconsin/ground-truth.json').json()
    for (const group of gt.groups) {
      expect(group.id).toBeTruthy()
      expect(group.title).toBeTruthy()
      for (const field of group.requirements) {
        expect(field.id).toBeTruthy()
        expect(field.label).toBeTruthy()
        expect(field.fieldType).toBeTruthy()
        expect(typeof field.required).toBe('boolean')
      }
    }
  })
})
