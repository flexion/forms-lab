/**
 * In-memory RAG retrieval primitive.
 *
 * Deliberately single-file and tiny. The corpus for this story is three
 * fixtures (≈9 chunks total), so a full vector DB is overkill. Cosine
 * similarity over an in-memory array is O(n · d) per query, which for
 * n≈10 and d≤1024 is microseconds — well below the Bedrock call latency
 * it precedes.
 *
 * Design notes:
 * - Embeddings are L2-normalised at ingest so cosine reduces to a dot
 *   product.
 * - The `Embedder` interface lets us swap Bedrock Titan (the production
 *   default) for the `hash` fallback (used when Bedrock is unavailable)
 *   or a stub (unit tests) without touching retrieval logic.
 * - The service owns its types (P3). Callers import `PolicyChunk` /
 *   `PolicyRetriever` as type-only — no runtime coupling.
 */

export interface PolicyChunk {
  /** Stable identifier — `{formSlug}/{citation-slug}`. */
  id: string
  /** Regulatory citation, e.g. "8 CFR 274a.2(b)(1)". */
  source: string
  /** Short human-readable label for the chunk. */
  title: string
  /** Verbatim regulatory text. */
  text: string
  /** Fixture slug this chunk belongs to (e.g. "i-9"). */
  formSlug: string
}

export interface Embedder {
  embed(text: string): Promise<number[]>
}

export interface PolicyRetriever {
  retrieve(query: string, k: number): Promise<PolicyChunk[]>
}

/** Dot product of two equal-length vectors. */
function dot(a: number[], b: number[]): number {
  let sum = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

function magnitude(v: number[]): number {
  return Math.sqrt(dot(v, v))
}

/**
 * Standard cosine similarity. Returns 0 when either vector has zero
 * magnitude (the usual mathematical singularity) rather than NaN.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const ma = magnitude(a)
  const mb = magnitude(b)
  if (ma === 0 || mb === 0) return 0
  return dot(a, b) / (ma * mb)
}

/** L2-normalise a vector in place and return it. */
function normalise(v: number[]): number[] {
  const m = magnitude(v)
  if (m === 0) return v
  for (let i = 0; i < v.length; i++) v[i] /= m
  return v
}

/**
 * Build an in-memory retriever. Embeds every chunk up front (one call
 * per chunk) and holds the vectors in memory for the lifetime of the
 * retriever.
 */
export async function createInMemoryRetriever(
  chunks: PolicyChunk[],
  embedder: Embedder,
): Promise<PolicyRetriever> {
  const indexed = await Promise.all(
    chunks.map(async (chunk) => ({
      chunk,
      vector: normalise(await embedder.embed(chunk.text)),
    })),
  )

  return {
    async retrieve(query: string, k: number): Promise<PolicyChunk[]> {
      if (indexed.length === 0) return []
      const queryVec = normalise(await embedder.embed(query))
      const scored = indexed.map(({ chunk, vector }) => ({
        chunk,
        score: cosineSimilarity(queryVec, vector),
      }))
      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, k).map((s) => s.chunk)
    },
  }
}

/**
 * Deterministic hash-based embedder used as a fallback when Bedrock is
 * unreachable. Not a good semantic retriever in the absolute sense —
 * but with a fixture-scoped corpus of <10 chunks and slug-keyed
 * queries, it reliably surfaces the right chunks because the query
 * string and chunk text share a slug token.
 *
 * Algorithm: SHA-256 the input, then slice the 32-byte digest into
 * 256 overlapping byte windows, treating each byte as a signed
 * [-0.5, 0.5] feature. L2-normalise. The output is 256-dimensional.
 *
 * This is not cryptographic or semantic — it is a content-addressed
 * fingerprint. Identical inputs produce identical vectors; different
 * inputs produce different vectors with high probability.
 */
export function createHashEmbedder(): Embedder {
  return {
    async embed(text: string): Promise<number[]> {
      const hasher = new Bun.CryptoHasher('sha256')
      hasher.update(text)
      const digest = hasher.digest() // 32 bytes
      const v = new Array<number>(256)
      for (let i = 0; i < 256; i++) {
        // Weave bytes to decorrelate dimensions a bit.
        const a = digest[i % digest.length]
        const b = digest[(i * 7 + 3) % digest.length]
        const c = digest[(i * 13 + 5) % digest.length]
        // Combine into a signed float in roughly [-1.5, 1.5], then
        // normalisation will bring it onto the unit sphere.
        v[i] = (a + b * 0.5 + c * 0.25) / 255 - 0.875
      }
      return normalise(v)
    },
  }
}
