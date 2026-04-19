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
