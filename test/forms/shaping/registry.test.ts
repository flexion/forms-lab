import { describe, expect, it } from 'bun:test'
import { createShapingRegistry } from '../../../src/services/forms/shaping/registry'

describe('shaping registry', () => {
  it('registers and retrieves the default strategy', () => {
    const registry = createShapingRegistry()
    const strategies = registry.list()
    expect(strategies.length).toBeGreaterThan(0)
    expect(strategies[0].metadata.name).toBeDefined()
  })

  it('returns a FormShaper from the default strategy', () => {
    const registry = createShapingRegistry()
    const shaper = registry.getDefault()
    expect(shaper).toBeDefined()
    expect(typeof shaper.shape).toBe('function')
  })
})
