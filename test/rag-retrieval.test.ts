import { describe, expect, it } from 'bun:test'
import {
  createHashEmbedder,
  createInMemoryRetriever,
  cosineSimilarity,
  type Embedder,
  type PolicyChunk,
} from '../src/services/rag/retrieval'

/**
 * Stub embedder used to give tests full control over the vector space.
 * Each text is mapped to a fixed vector — the caller decides which
 * chunks should rank closer to the query by picking similar vectors.
 */
function stubEmbedder(map: Record<string, number[]>): Embedder {
  return {
    async embed(text: string): Promise<number[]> {
      const v = map[text]
      if (!v) {
        throw new Error(`stubEmbedder: unexpected input ${JSON.stringify(text)}`)
      }
      return v
    },
  }
}

const chunk = (id: string, text: string, extra: Partial<PolicyChunk> = {}): PolicyChunk => ({
  id,
  source: `src:${id}`,
  title: `title:${id}`,
  text,
  formSlug: extra.formSlug ?? 'test',
})

describe('cosineSimilarity', () => {
  it('returns 1 for identical unit vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns -1 for opposite unit vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('handles non-unit vectors', () => {
    // cos(0°) = 1 regardless of magnitude
    expect(cosineSimilarity([2, 0], [5, 0])).toBeCloseTo(1)
  })

  it('returns 0 when either vector is zero-length', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
    expect(cosineSimilarity([1, 1], [0, 0])).toBe(0)
  })
})

describe('createInMemoryRetriever', () => {
  it('retrieves the top-k chunks by cosine similarity', async () => {
    const chunks = [
      chunk('a', 'text-a'),
      chunk('b', 'text-b'),
      chunk('c', 'text-c'),
    ]
    const embedder = stubEmbedder({
      'text-a': [1, 0, 0],
      'text-b': [0, 1, 0],
      'text-c': [0.9, 0.1, 0], // close to query
      query: [1, 0, 0],
    })

    const retriever = await createInMemoryRetriever(chunks, embedder)
    const results = await retriever.retrieve('query', 2)

    expect(results.map((r) => r.id)).toEqual(['a', 'c'])
  })

  it('truncates to k results', async () => {
    const chunks = [chunk('a', 'text-a'), chunk('b', 'text-b')]
    const embedder = stubEmbedder({
      'text-a': [1, 0],
      'text-b': [0, 1],
      query: [1, 1],
    })

    const retriever = await createInMemoryRetriever(chunks, embedder)
    const results = await retriever.retrieve('query', 1)

    expect(results).toHaveLength(1)
  })

  it('returns empty array for an empty corpus', async () => {
    const embedder = stubEmbedder({ query: [1, 0] })
    const retriever = await createInMemoryRetriever([], embedder)
    const results = await retriever.retrieve('query', 5)

    expect(results).toEqual([])
  })

  it('returns all chunks when k exceeds corpus size', async () => {
    const chunks = [chunk('a', 'text-a')]
    const embedder = stubEmbedder({
      'text-a': [1, 0],
      query: [1, 0],
    })

    const retriever = await createInMemoryRetriever(chunks, embedder)
    const results = await retriever.retrieve('query', 10)

    expect(results).toHaveLength(1)
  })
})

describe('createHashEmbedder', () => {
  it('produces deterministic embeddings for the same input', async () => {
    const embedder = createHashEmbedder()
    const a = await embedder.embed('hello world')
    const b = await embedder.embed('hello world')
    expect(a).toEqual(b)
  })

  it('produces different embeddings for different inputs', async () => {
    const embedder = createHashEmbedder()
    const a = await embedder.embed('hello world')
    const b = await embedder.embed('goodbye world')
    expect(a).not.toEqual(b)
  })

  it('produces 256-dimensional embeddings', async () => {
    const embedder = createHashEmbedder()
    const v = await embedder.embed('anything')
    expect(v).toHaveLength(256)
  })

  it('produces L2-normalised embeddings', async () => {
    const embedder = createHashEmbedder()
    const v = await embedder.embed('anything')
    const magnitude = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    expect(magnitude).toBeCloseTo(1, 5)
  })
})
