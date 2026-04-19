import { describe, expect, it } from 'bun:test'
import type { ExtractionResult } from '../src/services/form-documents'
import {
  createCachedPdfExtractor,
  type PdfExtractor,
} from '../src/services/form-documents'
import { createCacheStore } from '../src/services/storage'

const stubResult: ExtractionResult = {
  spec: {
    id: 'spec-1',
    title: 'Test Form',
    description: 'A test form',
    groups: [
      {
        id: 'g1',
        title: 'Personal Info',
        requirements: [
          {
            id: 'f1',
            fieldName: 'fullName',
            label: 'Full Name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  formSpec: {
    id: 'form-1',
    specId: 'spec-1',
    title: 'Test Form',
    pages: [
      {
        id: 'p1',
        title: 'Personal Info',
        groups: ['g1'],
      },
    ],
  },
  confidence: [{ fieldId: 'f1', confidence: 0.95 }],
  fieldMapping: {},
}

function createStubExtractor(
  result: ExtractionResult,
): PdfExtractor & { callCount: number } {
  const extractor = {
    callCount: 0,
    async extract(): Promise<ExtractionResult> {
      extractor.callCount++
      return result
    },
  }
  return extractor
}

describe('CachedPdfExtractor', () => {
  it('delegates to inner extractor on cache miss', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    const result = await cached.extract(Buffer.from('test-pdf'))
    expect(result.spec.title).toBe('Test Form')
    expect(inner.callCount).toBe(1)
  })

  it('returns cached result on cache hit', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    await cached.extract(Buffer.from('test-pdf'))
    const result = await cached.extract(Buffer.from('test-pdf'))
    expect(result.spec.title).toBe('Test Form')
    expect(inner.callCount).toBe(1) // Only called once
  })

  it('uses different cache keys for different PDFs', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    await cached.extract(Buffer.from('pdf-a'))
    await cached.extract(Buffer.from('pdf-b'))
    expect(inner.callCount).toBe(2)
  })

  it('includes model in cache key', async () => {
    const cacheStore = createCacheStore(':memory:')
    const inner = createStubExtractor(stubResult)
    const cached = createCachedPdfExtractor(inner, cacheStore)

    await cached.extract(Buffer.from('same-pdf'), { model: 'sonnet' })
    await cached.extract(Buffer.from('same-pdf'), { model: 'opus' })
    expect(inner.callCount).toBe(2)
  })
})
