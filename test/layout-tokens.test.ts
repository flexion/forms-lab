import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('layout tokens', () => {
  const css = readFileSync(resolve(process.cwd(), 'dist/styles.css'), 'utf-8')

  it('declares content-width tokens', () => {
    expect(css).toContain('--flex-content-narrow: 45ch')
    expect(css).toContain('--flex-content-default: 60rem')
    expect(css).toContain('--flex-content-wide: 85ch')
  })

  it('declares sidebar-width token', () => {
    expect(css).toContain('--flex-sidebar-width: 15rem')
  })

  it('declares breakpoint tokens', () => {
    expect(css).toContain('--flex-bp-sm: 37.5rem')
    expect(css).toContain('--flex-bp-md: 48rem')
    expect(css).toContain('--flex-bp-lg: 64rem')
  })

  it('declares --flex-content-max-width as page-level max-width', () => {
    expect(css).toContain('--flex-content-max-width: 60rem')
  })
})
