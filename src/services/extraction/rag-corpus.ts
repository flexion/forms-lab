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
 */

import {
  createInMemoryRetriever,
  createTitanEmbedder,
  loadPolicyCorpus,
  type PolicyRetriever,
} from '../rag'

let memo: Promise<PolicyRetriever> | null = null

export function getRagRetriever(): Promise<PolicyRetriever> {
  if (memo) return memo
  memo = (async () => {
    const chunks = loadPolicyCorpus()
    const embedder = createTitanEmbedder()
    return createInMemoryRetriever(chunks, embedder)
  })()
  return memo
}

/** Test seam. Do not call in production code. */
export function resetRagRetrieverForTests(): void {
  memo = null
}
