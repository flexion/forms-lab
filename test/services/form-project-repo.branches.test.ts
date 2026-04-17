import { beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFormProjectRepo } from '../../src/services/form-project-repo'

describe('FormProjectRepo branches', () => {
  let basePath: string
  let repo: ReturnType<typeof createFormProjectRepo>
  const slug = 'test-project'
  const author = 'tester'

  function repoDir(): string {
    return join(basePath, `${slug}.git`)
  }

  async function createBranchLowLevel(
    branch: string,
    base: string,
  ): Promise<void> {
    // Use plumbing to pre-create the branch ref before higher-level
    // createBranch() exists. Resolves base to a SHA then writes refs/heads/<branch>.
    const resolveProc = Bun.spawn(
      ['git', '--git-dir', repoDir(), 'rev-parse', '--verify', base],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const baseSha = (await new Response(resolveProc.stdout).text()).trim()
    if ((await resolveProc.exited) !== 0) {
      throw new Error(`failed to resolve base ${base}`)
    }
    const updateProc = Bun.spawn(
      [
        'git',
        '--git-dir',
        repoDir(),
        'update-ref',
        `refs/heads/${branch}`,
        baseSha,
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    if ((await updateProc.exited) !== 0) {
      throw new Error(`failed to create branch ${branch}`)
    }
  }

  beforeEach(async () => {
    basePath = mkdtempSync(join(tmpdir(), 'repo-branches-'))
    repo = createFormProjectRepo(basePath)
    await repo.init(slug)
    await repo.commit(
      slug,
      [{ path: 'a.txt', content: Buffer.from('hello') }],
      'init',
      author,
    )
  })

  it('lists only main for a fresh repo', async () => {
    const branches = await repo.listBranches(slug)
    expect(branches.map((b) => b.name)).toEqual(['main'])
  })

  it('getBranchDiff returns empty array when refs match', async () => {
    const diff = await repo.getBranchDiff(slug, 'main', 'main')
    expect(diff).toEqual([])
  })

  function findBranch<T extends { name: string }>(
    branches: T[],
    name: string,
  ): T {
    const entry = branches.find((b) => b.name === name)
    if (!entry) throw new Error(`branch ${name} not found`)
    return entry
  }

  it('commit can target a non-main branch', async () => {
    await createBranchLowLevel('feature', 'main')
    const sha = await repo.commit(
      slug,
      [{ path: 'a.txt', content: Buffer.from('changed') }],
      'edit on feature',
      author,
      { branch: 'feature' },
    )
    const branches = await repo.listBranches(slug)
    const mainSha = findBranch(branches, 'main').sha
    const featureSha = findBranch(branches, 'feature').sha
    expect(featureSha).toBe(sha)
    expect(mainSha).not.toBe(sha)
  })

  it('listBranches reports ahead count for branches ahead of main', async () => {
    await createBranchLowLevel('feature', 'main')
    await repo.commit(
      slug,
      [{ path: 'b.txt', content: Buffer.from('one') }],
      'first feature commit',
      author,
      { branch: 'feature' },
    )
    await repo.commit(
      slug,
      [{ path: 'c.txt', content: Buffer.from('two') }],
      'second feature commit',
      author,
      { branch: 'feature' },
    )

    const branches = await repo.listBranches(slug)
    const names = branches.map((b) => b.name).sort()
    expect(names).toEqual(['feature', 'main'])

    const main = findBranch(branches, 'main')
    const feature = findBranch(branches, 'feature')
    expect(main.ahead).toBe(0)
    expect(feature.ahead).toBe(2)
  })

  it('getBranchDiff lists files changed between branches', async () => {
    await createBranchLowLevel('feature', 'main')
    await repo.commit(
      slug,
      [
        { path: 'a.txt', content: Buffer.from('changed') },
        { path: 'new.txt', content: Buffer.from('brand new') },
      ],
      'edit a.txt and add new.txt',
      author,
      { branch: 'feature' },
    )

    const diff = await repo.getBranchDiff(slug, 'main', 'feature')
    expect(diff.sort()).toEqual(['a.txt', 'new.txt'])
  })
})
