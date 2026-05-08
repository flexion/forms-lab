import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { projectsDirectoryHandler } from '../../src/entrypoints/app/routes/projects'
import type { SessionUser } from '../../src/services/auth'
import {
  createFormProjectRepo,
  createProjectService,
  type FormProjectRepo,
  type ProjectService,
} from '../../src/services/projects'
import { createProjectStore } from '../../src/services/storage'
import type { ExtractionResult } from '../../src/types/models'

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
  fieldMapping: {},
}

const aliceUser: SessionUser = {
  login: 'alice',
  name: 'Alice',
  avatarUrl: '',
}

let repoBasePath: string
let repo: FormProjectRepo

beforeEach(() => {
  repoBasePath = mkdtempSync(join(tmpdir(), 'projects-directory-route-test-'))
  repo = createFormProjectRepo(repoBasePath)
})

afterEach(() => {
  rmSync(repoBasePath, { recursive: true, force: true })
})

function createTestApp(
  service: ProjectService,
  authUser: SessionUser | null = aliceUser,
) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', authUser)
    await next()
  })
  app.get('/projects', projectsDirectoryHandler(service))
  return app
}

function makeService() {
  const projectStore = createProjectStore(':memory:')
  const extractor = {
    async extract() {
      return stubResult
    },
  }
  const service = createProjectService(projectStore, repo, {
    resolveExtractor: () => extractor,
    resolveVariant: () => ({ variantId: 'sonnet', modelId: 'test-model' }),
  })
  return { projectStore, service }
}

/** Wait until the project is in 'ready' status */
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

describe('GET /projects — projects directory route', () => {
  it('returns 200', async () => {
    const { service } = makeService()
    const app = createTestApp(service)

    const res = await app.request('/projects')
    expect(res.status).toBe(200)
  })

  it('shows "No projects yet." when there are no ready projects', async () => {
    const { service } = makeService()
    const app = createTestApp(service)

    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).toContain('No projects yet.')
  })

  it('shows project names and owner links for ready projects', async () => {
    const { projectStore, service } = makeService()
    const app = createTestApp(service)

    const pdfBuffer = Buffer.from('fake-pdf-content')
    const project = await service.createProject(
      'My Awesome Form',
      pdfBuffer,
      aliceUser,
    )
    await waitForReady(projectStore, project.id)

    const res = await app.request('/projects')
    expect(res.status).toBe(200)
    const html = await res.text()

    expect(html).toContain('My Awesome Form')
    expect(html).toContain('/alice/my-awesome-form')
    expect(html).toContain('/alice')
    expect(html).toContain('alice')
  })

  it('does not show projects that are not ready', async () => {
    const { service } = makeService()
    const app = createTestApp(service)

    // Create a project but don't wait for it to be ready
    const pdfBuffer = Buffer.from('fake-pdf-content')
    await service.createProject('Pending Form', pdfBuffer, aliceUser)

    // Query immediately — it should still be in 'extracting' state
    const res = await app.request('/projects')
    expect(res.status).toBe(200)
    const html = await res.text()

    expect(html).not.toContain('Pending Form')
    expect(html).toContain('No projects yet.')
  })

  it('renders page title as "Projects"', async () => {
    const { service } = makeService()
    const app = createTestApp(service)

    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).toContain('Projects | Forms Lab')
  })

  it('shows New Project button for logged-in users', async () => {
    const { service } = makeService()
    const app = createTestApp(service)

    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).toContain('New Project')
    expect(html).toContain('/new')
  })

  it('hides New Project button for anonymous users', async () => {
    const { service } = makeService()
    const app = createTestApp(service, null)

    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).not.toContain('New Project')
  })
})
