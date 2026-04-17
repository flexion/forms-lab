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
})
