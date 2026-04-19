import { describe, expect, it } from 'bun:test'
import { githubPermalink } from '../../../src/services/content/github-permalink'
import type { BuildInfo } from '../../../src/shared/build-info'

const clean: BuildInfo = {
  gitRef: 'abc1234',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: false,
}

const dirty: BuildInfo = {
  gitRef: 'dev-story-71/llm-integrations-catalog',
  repoUrl: 'https://github.com/flexion/forms-lab',
  isDirty: true,
}

describe('githubPermalink', () => {
  it('builds a URL with just a path', () => {
    expect(
      githubPermalink({ path: 'src/services/forms/index.ts' }, clean),
    ).toBe(
      'https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts',
    )
  })

  it('adds a single-line anchor when lines is a number', () => {
    expect(
      githubPermalink(
        { path: 'src/services/forms/index.ts', lines: 42 },
        clean,
      ),
    ).toBe(
      'https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts#L42',
    )
  })

  it('adds a line range anchor when lines is a tuple', () => {
    expect(
      githubPermalink(
        { path: 'src/services/forms/index.ts', lines: [42, 88] },
        clean,
      ),
    ).toBe(
      'https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts#L42-L88',
    )
  })

  it('uses the dirty gitRef verbatim (branch name already includes slashes)', () => {
    expect(githubPermalink({ path: 'src/shared/build-info.ts' }, dirty)).toBe(
      'https://github.com/flexion/forms-lab/blob/dev-story-71/llm-integrations-catalog/src/shared/build-info.ts',
    )
  })

  it('strips a leading slash on path if present', () => {
    expect(
      githubPermalink({ path: '/src/services/forms/index.ts' }, clean),
    ).toBe(
      'https://github.com/flexion/forms-lab/blob/abc1234/src/services/forms/index.ts',
    )
  })
})
