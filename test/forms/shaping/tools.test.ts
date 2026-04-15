import { describe, expect, it } from 'bun:test'
import { commandTools } from '../../../src/services/forms/shaping/tools'

describe('commandTools', () => {
  it('exposes a tool for every command kind', () => {
    const keys = Object.keys(commandTools)
    expect(keys).toContain('swapPages')
    expect(keys).toContain('addField')
    expect(keys).toContain('setDeliveryMode')
    expect(keys.length).toBeGreaterThanOrEqual(25)
  })

  it('each tool has a description and a parameters schema', () => {
    for (const [_name, toolDef] of Object.entries(commandTools)) {
      expect(typeof toolDef.description).toBe('string')
      expect(toolDef.description.length).toBeGreaterThan(0)
      expect(toolDef.inputSchema).toBeDefined()
    }
  })
})
