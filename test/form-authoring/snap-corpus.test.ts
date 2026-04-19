// test/form-authoring/snap-corpus.test.ts
import { describe, expect, test } from 'bun:test'
import { loadPolicyCorpus } from '../../src/services/rag'

describe('SNAP Wisconsin corpus', () => {
  test('loads snap-wisconsin chunks', () => {
    const chunks = loadPolicyCorpus({ slug: 'snap-wisconsin' })
    expect(chunks.length).toBeGreaterThanOrEqual(8)
    expect(chunks.every((c) => c.formSlug === 'snap-wisconsin')).toBe(true)
  })

  test('each chunk has a regulatory source citation', () => {
    const chunks = loadPolicyCorpus({ slug: 'snap-wisconsin' })
    for (const chunk of chunks) {
      expect(chunk.source).toBeTruthy()
      expect(chunk.text.length).toBeGreaterThan(50)
    }
  })
})
