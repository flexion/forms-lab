import { describe, expect, it } from 'bun:test'
import { getComponents } from '../../src/design-system/registry'

describe('component metadata: kind and reference invariants', () => {
  for (const meta of getComponents()) {
    describe(meta.slug, () => {
      if (meta.kind === 'uswds-derived') {
        it('declares a USWDS reference URL', () => {
          expect(meta.reference).toBeDefined()
          expect(meta.reference).toMatch(
            /^https:\/\/designsystem\.digital\.gov\//,
          )
        })
      } else {
        it('does not declare a reference URL', () => {
          expect(meta.reference).toBeUndefined()
        })
      }
    })
  }
})

describe('custom components: variant/example alignment', () => {
  for (const meta of getComponents()) {
    if (meta.kind !== 'custom') continue

    it(`${meta.slug}: contract.variants matches examples.tsx exports`, async () => {
      const contractMod = await import(
        `../../src/design-system/components/${meta.slug}/contract.ts`
      )
      const examplesMod = await import(
        `../../src/design-system/components/${meta.slug}/examples.tsx`
      )

      const declaredVariants = new Set(
        contractMod.spec.variants.map((v: { name: string }) => v.name),
      )
      const exportedVariants = new Set(
        Object.keys(examplesMod).filter((k) => k !== 'default'),
      )

      expect([...declaredVariants].sort()).toEqual([...exportedVariants].sort())
    })
  }
})
