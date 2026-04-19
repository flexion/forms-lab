import { describe, expect, it } from 'bun:test'
import { createExtractorRegistry } from '../src/services/extraction/registry'

describe('createExtractorRegistry', () => {
  it('returns a registry with strategies registered', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    expect(strategies.length).toBeGreaterThanOrEqual(4)
  })

  it('registers opus as baseline', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    const opus = strategies.find((s) => s.id === 'opus-baseline')
    expect(opus).toBeDefined()
    expect(opus!.metadata.status).toBe('baseline')
  })

  it('registers sonnet as production default', () => {
    const registry = createExtractorRegistry()
    expect(registry.getDefaultId()).toBe('sonnet')
  })

  it('registers tool-use-sonnet as experimental', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    const toolUse = strategies.find((s) => s.id === 'tool-use-sonnet')
    expect(toolUse).toBeDefined()
    expect(toolUse!.metadata.status).toBe('experimental')
    expect(toolUse!.metadata.courseTopics).toContain('tool-use')
    expect(toolUse!.metadata.courseTopics).toContain('constrained-generation')
    expect(toolUse!.metadata.catalogPath).toBe(
      '/catalog/experiments/pdf-field-extraction/tool-use-sonnet',
    )
  })

  it('each strategy has courseTopics and catalogPath', () => {
    const registry = createExtractorRegistry()
    for (const strategy of registry.list()) {
      expect(strategy.metadata.courseTopics.length).toBeGreaterThan(0)
      expect(strategy.metadata.catalogPath).toBeDefined()
    }
  })
})
