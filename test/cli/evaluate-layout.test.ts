import { describe, expect, test } from 'bun:test'
import { evaluate } from '../../src/entrypoints/cli/commands/evaluate'

describe('evaluate layout subcommand', () => {
  test('prints usage when no variant-id given', async () => {
    const logs: string[] = []
    const origError = console.error
    console.error = (...args: unknown[]) => logs.push(args.join(' '))

    const code = await evaluate(['layout'])

    console.error = origError
    expect(code).toBe(1)
    expect(logs.some((l) => l.includes('Usage'))).toBe(true)
  })

  test('errors on unknown variant', async () => {
    const logs: string[] = []
    const origError = console.error
    console.error = (...args: unknown[]) => logs.push(args.join(' '))

    const code = await evaluate(['layout', 'nonexistent-variant'])

    console.error = origError
    expect(code).toBe(1)
    expect(logs.some((l) => l.includes('Unknown strategy'))).toBe(true)
  })
})
