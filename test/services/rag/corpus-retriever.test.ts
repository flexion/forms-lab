import { beforeEach, describe, expect, test } from 'bun:test'
import {
  resetCorpusRetrieverForTests,
  retrieveOrFullCorpus,
} from '../../../src/services/rag'

describe('retrieveOrFullCorpus', () => {
  beforeEach(() => {
    resetCorpusRetrieverForTests()
    // Force the hash-path (no Titan probe) so the test is offline.
    process.env.RAG_EMBEDDER = 'hash'
  })

  test('falls back to full corpus when semantic retrieval is disabled', async () => {
    const result = await retrieveOrFullCorpus('snap-wisconsin', 'any query', 5)
    expect(result.source).toBe('full-corpus')
    // The SNAP corpus currently has 21 chunks; guard against off-by-a-few
    // but assert we got the full set, not a top-k.
    expect(result.chunks.length).toBeGreaterThan(15)
    for (const chunk of result.chunks) {
      expect(chunk.formSlug).toBe('snap-wisconsin')
    }
  })

  test('returns an empty full-corpus result for an unknown slug', async () => {
    const result = await retrieveOrFullCorpus('does-not-exist', 'q', 3)
    expect(result.source).toBe('full-corpus')
    expect(result.chunks).toEqual([])
  })
})
