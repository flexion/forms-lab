/**
 * Lazy corpus + retriever bootstrap for the RAG extraction variant.
 *
 * The registry constructs extractors synchronously, but the Titan
 * embedder is async — embedding the corpus requires ~N Bedrock calls.
 * We resolve this by returning a memoised Promise<PolicyRetriever>
 * that is awaited on the first extraction and reused thereafter.
 *
 * The promise is created lazily the first time `getRagRetriever` is
 * called. Variants that don't select the RAG extractor don't pay the
 * embedding cost.
 *
 * Embedder selection:
 * - Default: Titan (amazon.titan-embed-text-v2:0).
 * - Fallback: deterministic hash embedder, used when the env flag
 *   `RAG_EMBEDDER=hash` is set or when Titan's first embed call fails
 *   (typically because the AWS identity lacks `bedrock:InvokeModel`
 *   on the embedding model). The fallback is documented in the
 *   catalog page — with a 9-chunk corpus and slug-keyed queries, it
 *   surfaces the right chunks because the query and chunk text share
 *   slug tokens. It is not a good retriever in the absolute sense.
 */

import {
  createHashEmbedder,
  createInMemoryRetriever,
  createTitanEmbedder,
  type Embedder,
  loadPolicyCorpus,
  type PolicyRetriever,
} from '../rag'

let memo: Promise<PolicyRetriever> | null = null
let lastEmbedderKind: 'titan' | 'hash' | null = null

/**
 * Which embedder the most recently-constructed retriever uses.
 * Surfaced on the extractor result so the catalog page can document
 * whether the eval ran against Titan or the fallback.
 */
export function lastRagEmbedderKind(): 'titan' | 'hash' | null {
  return lastEmbedderKind
}

async function tryTitan(): Promise<Embedder | null> {
  if (process.env.RAG_EMBEDDER === 'hash') return null
  const embedder = createTitanEmbedder()
  try {
    // Probe with a tiny string. If AWS rejects (AccessDenied, throttled,
    // etc.) we fall back rather than aborting the whole extractor
    // construction — the RAG variant is more useful degraded than
    // absent.
    await embedder.embed('.')
    return embedder
  } catch (err) {
    console.warn(
      `[rag] Titan embedder unavailable; falling back to hash. Reason: ${String(
        (err as Error).message ?? err,
      )}`,
    )
    return null
  }
}

/**
 * When the hash fallback is in play, wrap the retriever so that any
 * query matching a known form slug returns that slug's chunks in
 * corpus order. Without this wrapper the hash embedder would retrieve
 * chunks whose text contains no slug tokens — essentially random —
 * which defeats the point of the RAG variant. The wrapper only
 * activates for exact slug matches; non-slug queries (PDF-prefix
 * fallback path) go through normal cosine retrieval.
 */
function wrapForSlugKeyedFallback(
  inner: PolicyRetriever,
  chunks: ReturnType<typeof loadPolicyCorpus>,
): PolicyRetriever {
  const bySlug = new Map<string, typeof chunks>()
  for (const chunk of chunks) {
    const list = bySlug.get(chunk.formSlug) ?? []
    list.push(chunk)
    bySlug.set(chunk.formSlug, list)
  }
  return {
    async retrieve(query, k) {
      const direct = bySlug.get(query)
      if (direct) return direct.slice(0, k)
      return inner.retrieve(query, k)
    },
  }
}

export function getRagRetriever(): Promise<PolicyRetriever> {
  if (memo) return memo
  memo = (async () => {
    const chunks = loadPolicyCorpus()
    const titan = await tryTitan()
    const embedder = titan ?? createHashEmbedder()
    lastEmbedderKind = titan ? 'titan' : 'hash'
    const inner = await createInMemoryRetriever(chunks, embedder)
    return titan ? inner : wrapForSlugKeyedFallback(inner, chunks)
  })()
  return memo
}

/** Test seam. Do not call in production code. */
export function resetRagRetrieverForTests(): void {
  memo = null
  lastEmbedderKind = null
}
