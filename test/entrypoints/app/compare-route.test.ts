import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { createCompareRoutes } from '../../../src/entrypoints/app/routes/owner/compare/index'
import { createEditRoutes } from '../../../src/entrypoints/app/routes/owner/edit/index'
import type { SessionUser } from '../../../src/services/auth/session'
import type { FormProjectRepo } from '../../../src/services/form-project-repo'
import { createFormProjectRepo } from '../../../src/services/form-project-repo'
import { createReviewService } from '../../../src/services/forms/review'
import type { FormShaper } from '../../../src/services/forms/shaping/types'
import type { ProjectService } from '../../../src/services/project-service'
import { createProjectService } from '../../../src/services/project-service'
import { createProjectStore } from '../../../src/services/storage'
import { StrategyRegistry } from '../../../src/services/strategy-registry'
import type { ExtractionResult, ProjectIndex } from '../../../src/types/models'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const stubResult: ExtractionResult = {
  spec: {
    id: 'spec-1',
    title: 'Test Form',
    description: 'A test form',
    groups: [
      {
        id: 'g1',
        title: 'Personal Info',
        requirements: [
          {
            id: 'f1',
            fieldName: 'firstName',
            label: 'First name',
            fieldType: 'text',
            required: true,
          },
        ],
      },
    ],
  },
  formSpec: {
    id: 'f1',
    specId: 'spec-1',
    title: 'Test Form',
    pages: [
      {
        id: 'page-1',
        title: 'Personal Information',
        groups: ['g1'],
        deliveryMode: 'conversational',
      },
    ],
    createdAt: '2026-04-14',
    updatedAt: '2026-04-14',
  },
  confidence: [{ fieldId: 'f1', confidence: 0.95 }],
}

const danielUser: SessionUser = {
  login: 'danielnaab',
  name: 'Daniel',
  avatarUrl: '',
}

let repoBasePath: string
let repo: FormProjectRepo

beforeEach(() => {
  repoBasePath = mkdtempSync(join(tmpdir(), 'compare-route-test-'))
  repo = createFormProjectRepo(repoBasePath)
})

afterEach(() => {
  rmSync(repoBasePath, { recursive: true, force: true })
})

function createTestApp(authUser: SessionUser | null = danielUser) {
  const projectStore = createProjectStore(':memory:')
  const extractor = {
    async extract() {
      return stubResult
    },
  }
  const service = createProjectService(projectStore, repo, extractor)
  const reviewService = createReviewService(repo)
  // Empty shaping registry — integration test exercises manual commands,
  // not the LLM intent path.
  const shapingRegistry = new StrategyRegistry<FormShaper>()

  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', authUser)
    await next()
  })
  app.route('/', createEditRoutes(service, shapingRegistry))
  app.route('/', createCompareRoutes(service, reviewService))

  return { app, service, projectStore, repo, reviewService }
}

/** Wait for async extraction to complete. */
async function waitForReady(
  projectStore: ReturnType<typeof createProjectStore>,
  projectId: string,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const p = projectStore.get(projectId)
    if (p?.status === 'ready') return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(`Timed out waiting for project ${projectId} to become ready`)
}

async function createReadyProject(
  service: ProjectService,
  projectStore: ReturnType<typeof createProjectStore>,
  user: SessionUser = danielUser,
  name = 'Test Form',
): Promise<ProjectIndex> {
  const project = await service.createProject(
    name,
    Buffer.from('%PDF-1.4 sample'),
    user,
  )
  await waitForReady(projectStore, project.id)
  return projectStore.get(project.id) as ProjectIndex
}

// ---------------------------------------------------------------------------
// End-to-end review flow
// ---------------------------------------------------------------------------

describe('review flow end-to-end', () => {
  it('create branch -> edit -> review -> merge', async () => {
    const { app, service, projectStore, repo } = createTestApp()
    const project = await createReadyProject(service, projectStore)
    const slug = project.slug

    // 1. Create a branch "feature" off main via the edit route.
    const createBranchRes = await app.request(
      `/danielnaab/${slug}/edit/main/branch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'name=feature&startPoint=main',
        redirect: 'manual',
      },
    )
    expect(createBranchRes.status).toBe(302)
    expect(createBranchRes.headers.get('Location')).toContain(
      `/danielnaab/${slug}/edit/feature`,
    )

    // Confirm the branch exists and starts even with main.
    const afterCreate = await repo.listBranches(slug)
    const mainEntry = afterCreate.find((b) => b.name === 'main')
    const featureEntry = afterCreate.find((b) => b.name === 'feature')
    expect(mainEntry).toBeDefined()
    expect(featureEntry).toBeDefined()
    // biome-ignore lint/style/noNonNullAssertion: guarded by expect above
    expect(featureEntry!.sha).toBe(mainEntry!.sha)

    // 2. Make an edit on the feature branch — rename the only page.
    const acceptRes = await app.request(
      `/danielnaab/${slug}/edit/feature/accept`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { kind: 'renamePage', id: 'page-1', title: 'Contact Details' },
          ],
          explanation: 'Rename intro page',
          source: 'manual',
        }),
      },
    )
    expect(acceptRes.status).toBe(200)
    const acceptBody = (await acceptRes.json()) as {
      state: { formSpec: { pages: Array<{ title: string }> } }
      sha: string
    }
    expect(acceptBody.sha).toBeDefined()
    expect(acceptBody.state.formSpec.pages[0].title).toBe('Contact Details')

    // After the commit, feature should be ahead of main.
    const afterEdit = await repo.listBranches(slug)
    const mainAfterEdit = afterEdit.find((b) => b.name === 'main')
    const featureAfterEdit = afterEdit.find((b) => b.name === 'feature')
    // biome-ignore lint/style/noNonNullAssertion: guarded above
    expect(featureAfterEdit!.sha).not.toBe(mainAfterEdit!.sha)

    // 3. GET the compare page and confirm it renders the rename as a change.
    const compareRes = await app.request(
      `/danielnaab/${slug}/compare/main...feature`,
    )
    expect(compareRes.status).toBe(200)
    const compareHtml = await compareRes.text()
    expect(compareHtml).toContain(
      'Page renamed from &quot;Personal Information&quot; to &quot;Contact Details&quot;',
    )

    // 4. POST the merge endpoint and expect a redirect to the project page.
    const mergeRes = await app.request(
      `/danielnaab/${slug}/compare/main...feature/merge`,
      {
        method: 'POST',
        redirect: 'manual',
      },
    )
    expect(mergeRes.status).toBe(302)
    expect(mergeRes.headers.get('Location')).toContain(`/danielnaab/${slug}`)

    // 5. main should now be fast-forwarded to feature's SHA.
    const afterMerge = await repo.listBranches(slug)
    const mainAfterMerge = afterMerge.find((b) => b.name === 'main')
    const featureAfterMerge = afterMerge.find((b) => b.name === 'feature')
    expect(mainAfterMerge).toBeDefined()
    expect(featureAfterMerge).toBeDefined()
    // biome-ignore lint/style/noNonNullAssertion: guarded above
    expect(mainAfterMerge!.sha).toBe(featureAfterMerge!.sha)
    // biome-ignore lint/style/noNonNullAssertion: guarded above
    expect(mainAfterMerge!.sha).toBe(acceptBody.sha)
  })

  it('rejects edits on main', async () => {
    const { app, service, projectStore } = createTestApp()
    const project = await createReadyProject(service, projectStore)
    const slug = project.slug

    const res = await app.request(`/danielnaab/${slug}/edit/main/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { kind: 'renamePage', id: 'page-1', title: 'Illegal rename' },
        ],
        explanation: 'should be rejected',
        source: 'manual',
      }),
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toContain('main is read-only')
  })

  it('returns 400 for malformed compare range', async () => {
    const { app, service, projectStore } = createTestApp()
    const project = await createReadyProject(service, projectStore)
    const slug = project.slug

    const res = await app.request(`/danielnaab/${slug}/compare/main-feature`)
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('invalid compare range')
  })
})
