import { describe, expect, it } from 'bun:test'
import {
  HAIKU_MODEL_ID,
  OPUS_MODEL_ID,
  SONNET_MODEL_ID,
} from '../../../src/services/extraction'
import { createShapingRegistry } from '../../../src/services/forms/shaping/registry'

describe('shaping registry', () => {
  it('registers all three variants', () => {
    const registry = createShapingRegistry()
    const strategies = registry.list()
    expect(strategies.length).toBe(3)

    const ids = strategies.map((s) => s.id)
    expect(ids).toContain('bedrock-sonnet')
    expect(ids).toContain('bedrock-haiku')
    expect(ids).toContain('bedrock-opus')
  })

  it('sets bedrock-sonnet as the default', () => {
    const registry = createShapingRegistry()
    expect(registry.getDefaultId()).toBe('bedrock-sonnet')
  })

  it('records correct modelId in each variant metadata', () => {
    const registry = createShapingRegistry()
    const strategies = registry.list()

    const sonnet = strategies.find((s) => s.id === 'bedrock-sonnet')
    const haiku = strategies.find((s) => s.id === 'bedrock-haiku')
    const opus = strategies.find((s) => s.id === 'bedrock-opus')

    expect(sonnet?.metadata.modelId).toBe(SONNET_MODEL_ID)
    expect(haiku?.metadata.modelId).toBe(HAIKU_MODEL_ID)
    expect(opus?.metadata.modelId).toBe(OPUS_MODEL_ID)
  })

  it('returns a FormShaper with shape function from each variant', () => {
    const registry = createShapingRegistry()
    for (const { id } of registry.list()) {
      const shaper = registry.get(id)
      expect(shaper).toBeDefined()
      expect(typeof shaper.shape).toBe('function')
    }
  })

  it('includes catalogPath pointing to shaping-model-comparison suite', () => {
    const registry = createShapingRegistry()
    for (const { metadata } of registry.list()) {
      expect(metadata.catalogPath).toMatch(
        /\/catalog\/experiments\/shaping-model-comparison\//,
      )
    }
  })
})
