import { describe, expect, test } from 'bun:test'
import { createExtractorRegistry } from '../../src/services/extraction'

describe('layout variant registration', () => {
  test('sonnet-hybrid-layout-v1 is registered', () => {
    const registry = createExtractorRegistry()
    const variants = registry.list()
    const layout = variants.find((v) => v.id === 'sonnet-hybrid-layout-v1')

    expect(layout).toBeDefined()
    expect(layout!.metadata.name).toContain('layout')
    expect(layout!.metadata.status).toBe('experimental')
  })

  test('sonnet-hybrid-layout-v1 creates an extractor', () => {
    const registry = createExtractorRegistry()
    const extractor = registry.get('sonnet-hybrid-layout-v1')
    expect(extractor).toBeDefined()
    expect(typeof extractor.extract).toBe('function')
  })
})
