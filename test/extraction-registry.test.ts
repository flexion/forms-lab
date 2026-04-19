import { describe, expect, it } from 'bun:test'
import { createExtractorRegistry } from '../src/services/extraction/registry'

describe('createExtractorRegistry', () => {
  it('returns a registry with strategies registered', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    expect(strategies.length).toBeGreaterThanOrEqual(6)
  })

  it('registers opus as baseline', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    const opus = strategies.find((s) => s.id === 'opus-baseline')
    expect(opus).toBeDefined()
    expect(opus?.metadata.status).toBe('baseline')
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

  it('registers few-shot-sonnet as experimental', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    const fewShot = strategies.find((s) => s.id === 'few-shot-sonnet')
    expect(fewShot).toBeDefined()
    expect(fewShot?.metadata.status).toBe('experimental')
  })

  it('few-shot-sonnet has few-shot in courseTopics', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    const fewShot = strategies.find((s) => s.id === 'few-shot-sonnet')
    expect(fewShot).toBeDefined()
    expect(fewShot?.metadata.courseTopics).toContain('few-shot')
  })

  it('registers nova-pro with pricing metadata', () => {
    const registry = createExtractorRegistry()
    const strategies = registry.list()
    const nova = strategies.find((s) => s.id === 'nova-pro')
    expect(nova).toBeDefined()
    expect(nova?.metadata.status).toBe('experimental')
    expect(nova?.metadata.pricing).toEqual({
      inputPer1k: 0.0008,
      outputPer1k: 0.0032,
    })
    expect(nova?.metadata.courseTopics).toContain('cost-optimization')
  })

  it('all variants have pricing metadata', () => {
    const registry = createExtractorRegistry()
    for (const strategy of registry.list()) {
      expect(strategy.metadata.pricing).toBeDefined()
      expect(strategy.metadata.pricing!.inputPer1k).toBeGreaterThan(0)
    }
  })
})
