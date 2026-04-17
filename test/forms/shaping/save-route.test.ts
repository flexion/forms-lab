import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { Hono } from 'hono'
import type { SessionUser } from '../../../src/services/auth/session'
import { createFormProjectRepo } from '../../../src/services/form-project-repo'
import { createProjectService } from '../../../src/services/project-service'
import { StrategyRegistry } from '../../../src/services/strategy-registry'
import { createProjectStore } from '../../../src/services/storage'
import type { FormShaper } from '../../../src/services/forms/shaping/types'
import { createEditRoutes } from '../../../src/entrypoints/app/routes/owner/edit'
import { testDataSpec, testFormSpec } from '../fixtures'

const TEST_DIR = 'test-data/save-route'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = { login: 'testuser', name: 'Test', avatarUrl: '' }

const dummyExtractor = {
  async extract() {
    return { spec: testDataSpec, formSpec: testFormSpec, confidence: [] }
  },
}

describe('POST /:owner/:slug/edit/save', () => {
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
      'test',
      Buffer.from('fake'),
      testUser,
    )
    slug = project.slug
    await new Promise((r) => setTimeout(r, 500))

    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', testUser)
      await next()
    })
    app.route(
      '/',
      createEditRoutes(service, new StrategyRegistry<FormShaper>()),
    )
  })

  afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

  it('commits a batch and returns new sha', async () => {
    const view = await service.getProject(testUser.login, slug, testUser)
    const firstPageId = view.formSpec!.pages[0].id

    const res = await app.request(`/${testUser.login}/${slug}/edit/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [{ kind: 'renamePage', id: firstPageId, title: 'New' }],
        parentSha: view.currentSha,
        source: 'manual',
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { sha: string; state: unknown }
    expect(body.sha).toMatch(/^[0-9a-f]{40}$/)
    expect(body.sha).not.toBe(view.currentSha)
  })

  it('rejects stale parentSha with 409', async () => {
    const res = await app.request(`/${testUser.login}/${slug}/edit/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [],
        parentSha: '0'.repeat(40),
        source: 'manual',
      }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: string; currentSha: string }
    expect(body.error).toBe('stale')
    expect(body.currentSha).toMatch(/^[0-9a-f]{40}$/)
  })
})
