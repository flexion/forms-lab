import { describe, expect, it } from 'bun:test'
import { loadPolicyCorpus } from '../src/services/rag/corpus'

describe('loadPolicyCorpus', () => {
  it('loads the three fixture corpus files', () => {
    const chunks = loadPolicyCorpus()
    const slugs = new Set(chunks.map((c) => c.formSlug))
    expect(slugs.has('pardon-application')).toBe(true)
    expect(slugs.has('i-9')).toBe(true)
    expect(slugs.has('w-9')).toBe(true)
  })

  it('parses multiple sections per file as distinct chunks', () => {
    const chunks = loadPolicyCorpus()
    const pardonChunks = chunks.filter(
      (c) => c.formSlug === 'pardon-application',
    )
    expect(pardonChunks.length).toBeGreaterThanOrEqual(3)
  })

  it('assigns stable ids of the form {formSlug}/{index}', () => {
    const chunks = loadPolicyCorpus()
    for (const chunk of chunks) {
      expect(chunk.id.startsWith(`${chunk.formSlug}/`)).toBe(true)
    }
  })

  it('populates source from the section heading', () => {
    const chunks = loadPolicyCorpus()
    // Every chunk should have a non-empty source citation.
    for (const chunk of chunks) {
      expect(chunk.source.length).toBeGreaterThan(0)
    }
  })

  it('preserves the verbatim regulatory text', () => {
    const chunks = loadPolicyCorpus()
    const i9Chunks = chunks.filter((c) => c.formSlug === 'i-9')
    const combined = i9Chunks.map((c) => c.text).join('\n')
    // A distinctive verbatim phrase from 8 CFR 274a.2.
    expect(combined).toContain('three business days')
  })

  it('filters to a single fixture when slug is provided', () => {
    const chunks = loadPolicyCorpus({ slug: 'w-9' })
    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(chunk.formSlug).toBe('w-9')
    }
  })
})
