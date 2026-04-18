import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { Hono } from 'hono'
import { createEditRoutes } from '../../../src/entrypoints/app/routes/owner/edit'
import type { SessionUser } from '../../../src/services/auth/session'
import { createFormProjectRepo } from '../../../src/services/form-project-repo'
import type { FormShaper } from '../../../src/services/forms/shaping/types'
import { createProjectService } from '../../../src/services/project-service'
import { createProjectStore } from '../../../src/services/storage'
import { StrategyRegistry } from '../../../src/services/strategy-registry'
import { testDataSpec, testFormSpec } from '../fixtures'

const TEST_DIR = 'test-data/save-route'
const DB_PATH = `${TEST_DIR}/test.sqlite`
const REPOS_PATH = `${TEST_DIR}/repos`

const testUser: SessionUser = { login: 'testuser', name: 'Test', avatarUrl: '' }

const dummyExtractor = {
  async extract() {
    return {
      spec: testDataSpec,
      formSpec: testFormSpec,
      confidence: [],
      fieldMapping: {},
    }
  },
}

describe('POST /:owner/:slug/edit/:branch/save', () => {
  let app: Hono
  let service: ReturnType<typeof createProjectService>
  let slug: string
  const BRANCH = 'work-branch'

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
    await repo.mergeBranch(slug, 'import', 'main')
    await service.createBranch(slug, BRANCH, 'main', testUser)

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
    const view = await service.getProject(
      testUser.login,
      slug,
      testUser,
      BRANCH,
    )
    const firstPageId = view.formSpec!.pages[0].id

    const res = await app.request(
      `/${testUser.login}/${slug}/edit/${BRANCH}/save`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commands: [{ kind: 'renamePage', id: firstPageId, title: 'New' }],
          parentSha: view.currentSha,
          source: 'manual',
        }),
      },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { sha: string; state: unknown }
    expect(body.sha).toMatch(/^[0-9a-f]{40}$/)
    expect(body.sha).not.toBe(view.currentSha)
  })

  it('rejects stale parentSha with 409', async () => {
    const res = await app.request(
      `/${testUser.login}/${slug}/edit/${BRANCH}/save`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commands: [],
          parentSha: '0'.repeat(40),
          source: 'manual',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: string; currentSha: string }
    expect(body.error).toBe('stale')
    expect(body.currentSha).toMatch(/^[0-9a-f]{40}$/)
  })

  it('rejects edits on main with 403', async () => {
    const res = await app.request(`/${testUser.login}/${slug}/edit/main/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commands: [],
        parentSha: '0'.repeat(40),
        source: 'manual',
      }),
    })
    expect(res.status).toBe(403)
  })
})

describe('POST /:owner/:slug/edit/:branch/save ownership', () => {
  let service: ReturnType<typeof createProjectService>
  let slug: string
  const BRANCH = 'owner-branch'
  const owner: SessionUser = { login: 'owner', name: 'Owner', avatarUrl: '' }
  const intruder: SessionUser = {
    login: 'intruder',
    name: 'Intruder',
    avatarUrl: '',
  }

  const TEST_DIR_2 = 'test-data/save-route-ownership'
  const DB_PATH_2 = `${TEST_DIR_2}/test.sqlite`
  const REPOS_PATH_2 = `${TEST_DIR_2}/repos`

  beforeAll(async () => {
    rmSync(TEST_DIR_2, { recursive: true, force: true })
    mkdirSync(REPOS_PATH_2, { recursive: true })
    const store = createProjectStore(DB_PATH_2)
    const repo = createFormProjectRepo(REPOS_PATH_2)
    // biome-ignore lint/suspicious/noExplicitAny: dummy extractor
    service = createProjectService(store, repo, dummyExtractor as any)
    const project = await service.createProject(
      'test',
      Buffer.from('fake'),
      owner,
    )
    slug = project.slug
    await new Promise((r) => setTimeout(r, 500))
    await service.createBranch(slug, BRANCH, 'main', owner)
  })

  afterAll(() => rmSync(TEST_DIR_2, { recursive: true, force: true }))

  it('rejects non-owner with 403', async () => {
    const view = await service.getProject(owner.login, slug, owner, BRANCH)
    const intruderApp = new Hono()
    intruderApp.use('*', async (c, next) => {
      c.set('user', intruder)
      await next()
    })
    intruderApp.route(
      '/',
      createEditRoutes(service, new StrategyRegistry<FormShaper>()),
    )
    const res = await intruderApp.request(
      `/${owner.login}/${slug}/edit/${BRANCH}/save`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commands: [],
          parentSha: view.currentSha,
          source: 'manual',
        }),
      },
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('not allowed')
  })
})
