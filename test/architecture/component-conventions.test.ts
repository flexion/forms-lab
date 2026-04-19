import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
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

describe('component file conventions', () => {
  const componentsDir = join(process.cwd(), 'src/design-system/components')

  for (const meta of getComponents()) {
    describe(meta.slug, () => {
      const dir = join(componentsDir, meta.slug)

      it('has meta.ts', () => {
        expect(existsSync(join(dir, 'meta.ts'))).toBe(true)
      })

      it('has index.tsx', () => {
        expect(existsSync(join(dir, 'index.tsx'))).toBe(true)
      })

      it('has examples.tsx', () => {
        expect(existsSync(join(dir, 'examples.tsx'))).toBe(true)
      })

      it('has contract.ts or contract.tsx', () => {
        const hasTs = existsSync(join(dir, 'contract.ts'))
        const hasTsx = existsSync(join(dir, 'contract.tsx'))
        expect(hasTs || hasTsx).toBe(true)
      })

      it('has contract.test.ts', () => {
        expect(existsSync(join(dir, 'contract.test.ts'))).toBe(true)
      })
    })
  }
})
