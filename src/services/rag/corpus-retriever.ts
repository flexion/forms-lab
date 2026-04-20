/**
 * Per-corpus retriever for authoring-stage RAG.
 *
 * Gives the authoring pipeline a real retrieval call per stage —
 * criteria/structure get a broad top-k against a generic "what does
 * this form need" query; section generation gets a focused top-k
 * against the group title. All queries run through the same Titan
 * embedder the extraction RAG uses.
 *
 * Memoized per slug: the first stage of a build pays the embedding
 * cost (21 Titan calls for the SNAP corpus); subsequent stages (and
 * subsequent builds on the same process) hit warm memory.
 *
 * Fallback behaviour: when Titan access is unavailable the hash
 * embedder produces essentially random cosine scores for natural-
 * language queries — worse than just sending the full corpus. So
 * callers use `retrieveOrFullCorpus` which gracefully falls back to
 * the pre-RAG "all chunks for this slug" path when semantic
 * retrieval isn't available. This keeps the pipeline working when
 * Titan is denied and confines the RAG claim to runs that actually
 * did real retrieval.
 */

import {
  createInMemoryRetriever,
  createTitanEmbedder,
  type Embedder,
  loadPolicyCorpus,
  type PolicyChunk,
  type PolicyRetriever,
} from '.'

interface CorpusRetriever {
  retriever: PolicyRetriever
  embedderKind: 'titan'
}

// A per-slug promise that resolves to a working retriever or to
// null. Both outcomes are memoized — we don't want to re-probe
// Titan on every request.
const memoBySlug = new Map<string, Promise<CorpusRetriever | null>>()

async function tryTitan(): Promise<Embedder | null> {
  if (process.env.RAG_EMBEDDER === 'hash') return null
  const embedder = createTitanEmbedder()
  try {
    await embedder.embed('.')
    return embedder
  } catch (err) {
    console.warn(
      `[rag/authoring] Titan embedder unavailable; retrieval will fall back. Reason: ${String(
        (err as Error).message ?? err,
      )}`,
    )
    return null
  }
}

/**
 * Build or return a memoized retriever over the chunks of a single
 * corpus. Returns `null` when semantic retrieval isn't available —
 * callers should treat null as "fall back to full corpus." With
 * hash embeddings, cosine scores on natural-language queries are
 * essentially random, which is worse than just passing every chunk.
 */
export async function getCorpusRetriever(
  slug: string,
): Promise<CorpusRetriever | null> {
  const existing = memoBySlug.get(slug)
  if (existing) return existing

  const promise = (async (): Promise<CorpusRetriever | null> => {
    try {
      const chunks = loadPolicyCorpus({ slug })
      if (chunks.length === 0) return null

      const titan = await tryTitan()
      if (!titan) return null

      const retriever = await createInMemoryRetriever(chunks, titan)
      return { retriever, embedderKind: 'titan' }
    } catch (err) {
      console.warn(
        `[rag/authoring] retriever bootstrap failed for ${slug}:`,
        err,
      )
      return null
    }
  })()

  memoBySlug.set(slug, promise)
  return promise
}

/**
 * Retrieve top-k chunks for a natural-language query against the
 * named corpus. Falls back to the full corpus (all chunks for this
 * slug) when semantic retrieval isn't available — preserving the
 * pre-RAG behaviour rather than producing garbage retrievals.
 *
 * Returns the chunks and a tag describing how they were obtained so
 * callers (or logs) can tell a real retrieval from a fallback.
 */
export async function retrieveOrFullCorpus(
  slug: string,
  query: string,
  k: number,
): Promise<{
  chunks: PolicyChunk[]
  source: 'retrieval' | 'full-corpus'
}> {
  const cached = await getCorpusRetriever(slug)
  if (!cached) {
    return { chunks: loadPolicyCorpus({ slug }), source: 'full-corpus' }
  }
  const chunks = await cached.retriever.retrieve(query, k)
  if (chunks.length === 0) {
    return { chunks: loadPolicyCorpus({ slug }), source: 'full-corpus' }
  }
  return { chunks, source: 'retrieval' }
}

/** Test seam. Do not call from production code. */
export function resetCorpusRetrieverForTests(): void {
  memoBySlug.clear()
}
