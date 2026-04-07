import { describe, expect, it } from 'bun:test'
import { getCommand, parseArgs } from '../src/cli'

describe('CLI', () => {
  describe('parseArgs', () => {
    it('extracts command name from args', () => {
      const result = parseArgs(['sync-stories'])
      expect(result.command).toBe('sync-stories')
    })

    it('returns help for --help flag', () => {
      const result = parseArgs(['--help'])
      expect(result.command).toBe('help')
    })

    it('returns help for no args', () => {
      const result = parseArgs([])
      expect(result.command).toBe('help')
    })
  })

  describe('getCommand', () => {
    it('returns sync-stories command', () => {
      const cmd = getCommand('sync-stories')
      expect(cmd).toBeDefined()
      expect(cmd!.name).toBe('sync-stories')
      expect(cmd!.description).toBe('Sync user stories from GitHub Issues')
    })

    it('returns undefined for unknown command', () => {
      const cmd = getCommand('nonexistent')
      expect(cmd).toBeUndefined()
    })
  })
})
