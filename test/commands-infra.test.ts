import { describe, expect, it } from 'bun:test'
import { getCommand } from '../src/cli'

describe('CLI infrastructure commands', () => {
  it('registers infra command', () => {
    const cmd = getCommand('infra')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('infra')
  })

  it('registers nixos command', () => {
    const cmd = getCommand('nixos')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('nixos')
  })

  it('registers webhook command', () => {
    const cmd = getCommand('webhook')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('webhook')
  })
})
