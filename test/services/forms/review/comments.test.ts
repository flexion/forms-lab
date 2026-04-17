import { beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFormProjectRepo } from '../../../../src/services/form-project-repo'
import { createCommentsStore } from '../../../../src/services/forms/review/comments'

describe('comments store', () => {
  const slug = 'proj'
  let repo: ReturnType<typeof createFormProjectRepo>
  let store: ReturnType<typeof createCommentsStore>

  beforeEach(async () => {
    const base = mkdtempSync(join(tmpdir(), 'comments-'))
    repo = createFormProjectRepo(base)
    await repo.init(slug)
    await repo.commit(
      slug,
      [{ path: 'seed.txt', content: Buffer.from('x') }],
      'init',
      'tester',
    )
    await repo.createBranch(slug, 'feature', 'main')
    store = createCommentsStore(repo)
  })

  it('starts empty', async () => {
    const comments = await store.list({
      owner: 'o',
      slug,
      base: 'main',
      head: 'feature',
    })
    expect(comments).toEqual([])
  })

  it('adds and lists a comment', async () => {
    await store.add(
      { owner: 'o', slug, base: 'main', head: 'feature' },
      { body: 'Looks good', author: 'alice' },
    )
    const comments = await store.list({
      owner: 'o',
      slug,
      base: 'main',
      head: 'feature',
    })
    expect(comments).toHaveLength(1)
    expect(comments[0].body).toBe('Looks good')
    expect(comments[0].author).toBe('alice')
    expect(comments[0].id).toBeTruthy()
  })

  it('supports parentId on replies', async () => {
    const ref = { owner: 'o', slug, base: 'main', head: 'feature' }
    const first = await store.add(ref, { body: 'hi', author: 'alice' })
    await store.add(ref, { body: 'reply', author: 'bob', parentId: first.id })
    const comments = await store.list(ref)
    expect(comments).toHaveLength(2)
    expect(comments[1].parentId).toBe(first.id)
  })
})
