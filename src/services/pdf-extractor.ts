import type { CacheStore } from './database'
import type { ExtractionOptions, ExtractionResult } from '../types/models'

export interface PdfExtractor {
  extract(pdf: Buffer, options?: ExtractionOptions): Promise<ExtractionResult>
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

function cacheKey(pdf: Buffer, model: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(pdf)
  hasher.update(model)
  return hasher.digest('hex')
}

export function createCachedPdfExtractor(
  inner: PdfExtractor,
  cacheStore: CacheStore,
): PdfExtractor {
  return {
    async extract(
      pdf: Buffer,
      options?: ExtractionOptions,
    ): Promise<ExtractionResult> {
      const model = options?.model ?? DEFAULT_MODEL
      const key = cacheKey(pdf, model)

      const cached = cacheStore.get(key)
      if (cached) {
        return JSON.parse(cached.result) as ExtractionResult
      }

      const result = await inner.extract(pdf, options)
      cacheStore.set(key, model, JSON.stringify(result))
      return result
    },
  }
}
