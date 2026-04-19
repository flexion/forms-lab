import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { getBuildInfo, resetBuildInfoCache } from '../../src/shared/build-info'

describe('getBuildInfo', () => {
  const ORIGINAL_ENV = process.env.BUILD_GIT_SHA

  beforeEach(() => {
    resetBuildInfoCache()
  })

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.BUILD_GIT_SHA
    } else {
      process.env.BUILD_GIT_SHA = ORIGINAL_ENV
    }
  })

  it('returns env var sha when BUILD_GIT_SHA is set and non-empty', () => {
    process.env.BUILD_GIT_SHA = 'abc1234567890'
    const info = getBuildInfo()
    expect(info.gitRef).toBe('abc1234567890')
    expect(info.isDirty).toBe(false)
    expect(info.repoUrl).toBe('https://github.com/flexion/forms-lab')
  })

  it('falls back to git rev-parse HEAD when env var absent', () => {
    delete process.env.BUILD_GIT_SHA
    const info = getBuildInfo()
    // In a git worktree this will succeed — we just check shape.
    expect(info.gitRef).toMatch(/^[0-9a-f]{7,40}$|^dev-.+$/)
  })

  it('caches the result across calls', () => {
    process.env.BUILD_GIT_SHA = 'cached-sha'
    const first = getBuildInfo()
    delete process.env.BUILD_GIT_SHA
    const second = getBuildInfo()
    expect(second).toBe(first)
  })
})
