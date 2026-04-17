import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { Hono } from 'hono'
import { createEditRoutes } from '../../src/entrypoints/app/routes/owner/edit'
import type { SessionUser } from '../../src/services/auth/session'
import { createFormProjectRepo } from '../../src/services/form-project-repo'
import { createProjectService } from '../../src/services/project-service'
import { createProjectStore } from '../../src/services/storage'
import { StrategyRegistry } from '../../src/services/strategy-registry'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_DIR = 'test-data/edit-flow'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = { login: 'maya', name: 'Maya', avatarUrl: '' }
const dummyExtractor = {
  async extract() {
    return { spec: testDataSpec, formSpec: testFormSpec, confidence: [] }
  },
}

describe('edit flow: mixed inline + chat batch produces one commit', () => {
  let app: Hono
  let service: ReturnType<typeof createProjectService>
  let slug: string

  beforeAll(async () => {
    rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(REPOS_PATH, { recursive: true })
    const store = createProjectStore(DB_PATH)
    const repo = createFormProjectRepo(REPOS_PATH)
    // biome-ignore lint/suspicious/noExplicitAny: dummy extractor
    service = createProjectService(store, repo, dummyExtractor as any)
    const project = await service.createProject(
      'maya',
      Buffer.from('fake'),
      testUser,
    )
    slug = project.slug
    await new Promise((r) => setTimeout(r, 500))
    await repo.mergeBranch(slug, 'import', 'main')
    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', testUser)
      await next()
    })
    app.route(
      '/',
      // biome-ignore lint/suspicious/noExplicitAny: registry not used by save
      createEditRoutes(service, new StrategyRegistry<any>()),
    )
  })

  afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

  it('saves a buffer of mixed-source commands as one commit', async () => {
    const branch = 'feature-branch'
    await service.createBranch(slug, branch, 'main', testUser)
    const view = await service.getProject('maya', slug, testUser, branch)
    const firstPageId = view.formSpec!.pages[0].id

    const res = await app.request(`/maya/${slug}/edit/${branch}/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { kind: 'renamePage', id: firstPageId, title: 'Edited inline' },
          {
            kind: 'setDeliveryMode',
            pageId: firstPageId,
            mode: 'conversational',
          },
        ],
        parentSha: view.currentSha,
        source: 'manual',
      }),
    })
    expect(res.status).toBe(200)

    const log = await service.getShapingLog('maya', slug, branch)
    const last = log[0]
    expect(last.commands).toHaveLength(2)
    expect(last.explanation).toContain('Rename page')
    expect(last.explanation).toContain('delivery mode')
  })
})
