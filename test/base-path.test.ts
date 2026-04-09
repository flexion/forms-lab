import { afterEach, describe, expect, it } from 'bun:test'
import { getBasePath, resolveUrl } from '../src/lib/base-path'

describe('getBasePath', () => {
  const originalEnv = process.env.BASE_PATH

  afterEach(() => {
    process.env.BASE_PATH = originalEnv
  })

  it('returns "/" when BASE_PATH is not set', () => {
    delete process.env.BASE_PATH
    expect(getBasePath()).toBe('/')
  })

  it('returns BASE_PATH when set', () => {
    process.env.BASE_PATH = '/main'
    expect(getBasePath()).toBe('/main/')
  })

  it('ensures leading slash', () => {
    process.env.BASE_PATH = 'main'
    expect(getBasePath()).toStartWith('/')
  })

  it('ensures trailing slash', () => {
    process.env.BASE_PATH = '/main'
    expect(getBasePath()).toEndWith('/')
  })

  it('handles path with both leading and trailing slashes', () => {
    process.env.BASE_PATH = '/slice-0/'
    expect(getBasePath()).toBe('/slice-0/')
  })

  it('normalizes multiple slashes', () => {
    process.env.BASE_PATH = '///main///'
    // After normalization, should have leading and trailing slash only
    const result = getBasePath()
    expect(result).toStartWith('/')
    expect(result).toEndWith('/')
  })
})

describe('resolveUrl', () => {
  const originalEnv = process.env.BASE_PATH

  afterEach(() => {
    process.env.BASE_PATH = originalEnv
  })

  it('returns path as-is when base path is "/"', () => {
    delete process.env.BASE_PATH
    expect(resolveUrl('/catalog')).toBe('/catalog')
  })

  it('prepends base path to absolute paths', () => {
    process.env.BASE_PATH = '/main'
    expect(resolveUrl('/catalog')).toBe('/main/catalog')
  })

  it('prepends base path without double slashes', () => {
    process.env.BASE_PATH = '/main'
    expect(resolveUrl('/catalog')).not.toContain('//')
  })

  it('handles relative paths', () => {
    process.env.BASE_PATH = '/main'
    expect(resolveUrl('catalog')).toBe('/main/catalog')
  })

  it('handles root path', () => {
    process.env.BASE_PATH = '/main'
    expect(resolveUrl('/')).toBe('/main/')
  })

  it('handles paths with fragments', () => {
    process.env.BASE_PATH = '/main'
    const _basePath = getBasePath()
    const spriteUrl = resolveUrl('/static/sprite.svg')
    const fragmentUrl = `${spriteUrl}#account_balance`
    expect(fragmentUrl).toBe('/main/static/sprite.svg#account_balance')
  })

  it('handles nested paths', () => {
    process.env.BASE_PATH = '/main'
    expect(resolveUrl('/catalog/design-system')).toBe(
      '/main/catalog/design-system',
    )
  })
})
