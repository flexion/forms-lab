import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { createProjectRoutes } from '../src/app/routes/projects/index'
import type { ProjectStore } from '../src/services/database'
import { createProjectStore } from '../src/services/database'
import {
  createFormProjectRepo,
  type FormProjectRepo,
} from '../src/services/form-project-repo'
import type { PdfExtractor } from '../src/services/pdf-extractor'
import type { ExtractionResult } from '../src/types/models'

const stubResult: ExtractionResult = {
  spec: {
    id: 'spec-1',
    title: 'Test Form',
    description: 'A test form',
    groups: [],
  },
  formSpec: {
    id: 'form-1',
    specId: 'spec-1',
    title: 'Test Form',
    pages: [],
    createdAt: '2026-04-09',
    updatedAt: '2026-04-09',
  },
  confidence: [],
}

let repoBasePath: string
let repo: FormProjectRepo

beforeEach(() => {
  repoBasePath = mkdtempSync(join(tmpdir(), 'form-repos-test-'))
  repo = createFormProjectRepo(repoBasePath)
})

afterEach(() => {
  rmSync(repoBasePath, { recursive: true, force: true })
})

function createTestApp(overrides?: { extractor?: PdfExtractor }) {
  const projectStore = createProjectStore(':memory:')
  const extractor: PdfExtractor = overrides?.extractor ?? {
    async extract(): Promise<ExtractionResult> {
      return stubResult
    },
  }
  const app = new Hono()
  // Simulate auth by setting user in context
  app.use('*', async (c, next) => {
    c.set('user', { login: 'testuser', name: 'Test User', avatarUrl: '' })
    await next()
  })
  app.route('/projects', createProjectRoutes(projectStore, extractor, repo))
  return { app, projectStore, extractor }
}

/** Helper: create a project in SQLite and init its git repo with source PDF */
async function createIndexedProject(
  projectStore: ProjectStore,
  opts: { name: string; slug: string },
) {
  const project = projectStore.create({
    name: opts.name,
    slug: opts.slug,
    createdBy: 'testuser',
  })
  await repo.init(opts.slug)
  await repo.commit(
    opts.slug,
    [
      {
        path: `source/${opts.slug}.pdf`,
        content: Buffer.from('fake-pdf'),
      },
      {
        path: 'project.json',
        content: Buffer.from(
          JSON.stringify({
            name: opts.name,
            slug: opts.slug,
            createdBy: 'testuser',
          }),
        ),
      },
    ],
    `Initialize project: ${opts.name}`,
    'testuser',
  )
  return project
}

/** Helper: commit spec data into a project's git repo */
async function commitSpecs(
  slug: string,
  result: ExtractionResult = stubResult,
) {
  await repo.commit(
    slug,
    [
      {
        path: 'forms/default/spec.json',
        content: Buffer.from(JSON.stringify(result.spec, null, 2)),
      },
      {
        path: 'forms/default/form.json',
        content: Buffer.from(JSON.stringify(result.formSpec, null, 2)),
      },
      {
        path: 'forms/default/confidence.json',
        content: Buffer.from(JSON.stringify(result.confidence, null, 2)),
      },
    ],
    'Extract form specifications',
    'testuser',
  )
}

describe('GET /projects', () => {
  it('renders empty project list', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('My Projects')
    expect(html).toContain('New Project')
  })

  it('lists existing projects in a table', async () => {
    const { app, projectStore } = createTestApp()
    await createIndexedProject(projectStore, {
      name: 'Pardon App',
      slug: 'pardon-app',
    })
    projectStore.update(projectStore.list('testuser')[0].id, {
      status: 'ready',
    })
    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).toContain('Pardon App')
    expect(html).toContain('flex-table')
    expect(html).toContain('Delete')
  })
})

describe('GET /projects/new', () => {
  it('renders new project page with fixture options', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/new')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('New Project')
    expect(html).toContain('pardon-application')
    expect(html).toContain('Upload')
  })
})

describe('POST /projects', () => {
  it('creates project from fixture selection', async () => {
    const { app, projectStore } = createTestApp()
    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'fixture=pardon-application',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/projects/')

    const projects = projectStore.list('testuser')
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe(
      'Application for Pardon After Completion of Sentence',
    )
    // Stub extractor resolves immediately, so status transitions to 'ready'
    expect(['extracting', 'ready']).toContain(projects[0].status)
  })

  it('commits project.json to git on creation', async () => {
    const { app, projectStore } = createTestApp()
    await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'fixture=pardon-application',
    })

    const projects = projectStore.list('testuser')
    const slug = projects[0].slug
    const projectJson = await repo.readFile(slug, 'main', 'project.json')
    expect(projectJson).not.toBeNull()
    // biome-ignore lint/style/noNonNullAssertion: asserted not null above
    const parsed = JSON.parse(projectJson!.toString())
    expect(parsed.name).toBe(
      'Application for Pardon After Completion of Sentence',
    )
  })

  it('returns 400 for unknown fixture', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'fixture=nonexistent',
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /projects/:id', () => {
  it('shows extracting status with auto-refresh', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Test',
      slug: 'test',
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Extracting form structure')
    expect(html).toContain('http-equiv="refresh"')
  })

  it('shows ready project with spec details from git', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Test Form',
      slug: 'test-form',
    })
    await commitSpecs('test-form')
    projectStore.update(project.id, { status: 'ready' })

    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Test Form')
    expect(html).toContain('Extracted Data Requirements')
  })

  it('returns 404 for missing project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/nonexistent')
    expect(res.status).toBe(404)
  })
})

describe('GET /projects/:id (error state)', () => {
  it('shows error message and retry button', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Failed Project',
      slug: 'failed-project',
    })
    projectStore.update(project.id, {
      status: 'error',
      error: 'Model timeout after 60 seconds',
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Extraction failed')
    expect(html).toContain('Model timeout after 60 seconds')
    expect(html).toContain('Retry')
  })
})

describe('POST /projects/:id/retry', () => {
  it('resets status to extracting and redirects', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Retry Test',
      slug: 'retry-test',
    })
    projectStore.update(project.id, { status: 'error', error: 'timeout' })

    const res = await app.request(`/projects/${project.id}/retry`, {
      method: 'POST',
    })
    expect(res.status).toBe(302)

    // Give async extraction a tick to complete
    await new Promise((r) => setTimeout(r, 100))
    const updated = projectStore.get(project.id)
    // Status should be 'ready' since stub extractor resolves immediately
    expect(updated?.status).toBe('ready')
  })

  it('commits extracted specs to git on retry', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Retry Commit Test',
      slug: 'retry-commit-test',
    })
    projectStore.update(project.id, { status: 'error', error: 'timeout' })

    await app.request(`/projects/${project.id}/retry`, { method: 'POST' })

    // Wait for async extraction
    await new Promise((r) => setTimeout(r, 100))

    const specBuf = await repo.readFile(
      'retry-commit-test',
      'main',
      'forms/default/spec.json',
    )
    expect(specBuf).not.toBeNull()
    // biome-ignore lint/style/noNonNullAssertion: asserted not null above
    const spec = JSON.parse(specBuf!.toString())
    expect(spec.id).toBe('spec-1')
  })
})

describe('POST /projects/:id/delete', () => {
  it('deletes project and redirects to list', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Delete Test',
      slug: 'delete-test',
    })
    expect(projectStore.get(project.id)).not.toBeNull()

    const res = await app.request(`/projects/${project.id}/delete`, {
      method: 'POST',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('/projects')
    expect(projectStore.get(project.id)).toBeNull()
  })

  it('returns 404 for missing project', async () => {
    const { app } = createTestApp()
    const res = await app.request('/projects/nonexistent/delete', {
      method: 'POST',
    })
    expect(res.status).toBe(404)
  })
})

describe('Project detail - ready state', () => {
  async function createReadyProject() {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Summary Test',
      slug: 'summary-test',
    })
    const detailedResult: ExtractionResult = {
      spec: {
        id: 'spec-1',
        title: 'Test',
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
              {
                id: 'f2',
                fieldName: 'maidenName',
                label: 'Maiden name',
                fieldType: 'text',
                required: false,
                condition: {
                  field: 'marital-status',
                  operator: 'equals',
                  value: 'married',
                },
              },
            ],
          },
        ],
      },
      formSpec: {
        id: 'form-1',
        specId: 'spec-1',
        title: 'Test',
        pages: [
          {
            id: 'page-1',
            title: 'Personal Information',
            groups: ['g1'],
            deliveryMode: 'conversational',
          },
        ],
        createdAt: '2026-04-11',
        updatedAt: '2026-04-11',
      },
      confidence: [
        { fieldId: 'f1', confidence: 0.95 },
        {
          fieldId: 'f2',
          confidence: 0.6,
          flags: ['conditional-logic-unclear'],
        },
      ],
    }
    await commitSpecs('summary-test', detailedResult)
    projectStore.update(project.id, { status: 'ready' })
    return { app, project }
  }

  it('shows summary bar with counts', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('project-summary')
  })

  it('shows back link', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Back to projects')
  })

  it('shows condition for conditional fields', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('marital-status')
    expect(html).toContain('equals')
  })

  it('shows form layout with resolved group names', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('form-page-card')
    expect(html).toContain('Personal Information')
    expect(html).toContain('Personal Info')
  })

  it('shows version history', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Version History')
    expect(html).toContain('Initialize project')
  })

  it('shows clone URL', async () => {
    const { app, project } = await createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('/git/summary-test.git')
    expect(html).toContain('git clone')
  })
})

describe('Confidence indicators', () => {
  it('shows badge for low-confidence fields', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Confidence Test',
      slug: 'confidence-test',
    })
    await commitSpecs('confidence-test', {
      spec: {
        id: 'spec-1',
        title: 'Test',
        description: '',
        groups: [
          {
            id: 'g1',
            title: 'Group',
            requirements: [
              {
                id: 'low-conf',
                fieldName: 'ambiguous',
                label: 'Ambiguous Field',
                fieldType: 'text',
                required: true,
              },
              {
                id: 'high-conf',
                fieldName: 'clear',
                label: 'Clear Field',
                fieldType: 'text',
                required: true,
              },
            ],
          },
        ],
      },
      formSpec: {
        id: 'form-1',
        specId: 'spec-1',
        title: 'Test',
        pages: [],
        createdAt: '',
        updatedAt: '',
      },
      confidence: [
        { fieldId: 'low-conf', confidence: 0.3, flags: ['ambiguous-type'] },
        { fieldId: 'high-conf', confidence: 0.95 },
      ],
    })
    projectStore.update(project.id, { status: 'ready' })

    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Low confidence')
  })
})

describe('GET /projects/:id/version/:sha', () => {
  it('shows snapshot at specific SHA', async () => {
    const { app, projectStore } = createTestApp()
    const project = await createIndexedProject(projectStore, {
      name: 'Version Test',
      slug: 'version-test',
    })
    const sha = await repo.commit(
      'version-test',
      [
        {
          path: 'forms/default/spec.json',
          content: Buffer.from(JSON.stringify(stubResult.spec, null, 2)),
        },
        {
          path: 'forms/default/form.json',
          content: Buffer.from(JSON.stringify(stubResult.formSpec, null, 2)),
        },
        {
          path: 'forms/default/confidence.json',
          content: Buffer.from(JSON.stringify(stubResult.confidence, null, 2)),
        },
      ],
      'Extract form specifications',
      'testuser',
    )
    projectStore.update(project.id, { status: 'ready' })

    const res = await app.request(`/projects/${project.id}/version/${sha}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Viewing snapshot')
    expect(html).toContain(sha.slice(0, 8))
    expect(html).toContain('View latest')
  })
})
