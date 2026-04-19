import { describe, expect, it } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReviewService } from '../../../../src/services/forms'
import { createFormProjectRepo } from '../../../../src/services/projects'

describe('review service', () => {
  const slug = 'proj'

  async function setup() {
    const base = mkdtempSync(join(tmpdir(), 'review-'))
    const repo = createFormProjectRepo(base)
    await repo.init(slug)
    await repo.commit(
      slug,
      [{ path: 'a.txt', content: Buffer.from('1') }],
      'init',
      'alice',
    )
    await repo.createBranch(slug, 'feature', 'main')
    await repo.commit(
      slug,
      [{ path: 'a.txt', content: Buffer.from('2') }],
      'change',
      'alice',
      { branch: 'feature' },
    )
    return { repo, svc: createReviewService(repo) }
  }

  it('merges fast-forwardable branch', async () => {
    const { svc } = await setup()
    const res = await svc.merge({
      owner: 'o',
      slug,
      base: 'main',
      head: 'feature',
    })
    expect(res.status).toBe('merged')
  })

  it('reports conflict for non-fast-forward', async () => {
    const { repo, svc } = await setup()
    // make main diverge
    await repo.commit(
      slug,
      [{ path: 'a.txt', content: Buffer.from('3') }],
      'diverge',
      'alice',
    )
    const res = await svc.merge({
      owner: 'o',
      slug,
      base: 'main',
      head: 'feature',
    })
    expect(res.status).toBe('conflict')
  })

  it('reports missing-branch when source ref does not exist', async () => {
    const { svc } = await setup()
    const res = await svc.merge({
      owner: 'o',
      slug,
      base: 'main',
      head: 'does-not-exist',
    })
    expect(res.status).toBe('missing-branch')
  })

  it('close deletes the branch', async () => {
    const { repo, svc } = await setup()
    await svc.close({ owner: 'o', slug, base: 'main', head: 'feature' })
    const branches = await repo.listBranches(slug)
    expect(branches.map((b) => b.name)).toEqual(['main'])
  })

  it('changedFiles lists files differing between base and head', async () => {
    const { svc } = await setup()
    const files = await svc.changedFiles({
      owner: 'o',
      slug,
      base: 'main',
      head: 'feature',
    })
    expect(files).toContain('a.txt')
  })
})
