import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createProjectRoutes } from '../src/app/routes/projects/index'
import type { PdfExtractor } from '../src/services/ingestion/pdf-extractor'
import { createProjectStore } from '../src/services/storage'
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
  },
  confidence: [],
}

function createTestApp() {
  const projectStore = createProjectStore(':memory:')
  const extractor: PdfExtractor = {
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
  app.route('/projects', createProjectRoutes(projectStore, extractor))
  return { app, projectStore, extractor }
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
    const p = projectStore.create({
      name: 'Pardon App',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(p.id, { status: 'ready' })
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
    const project = projectStore.create({
      name: 'Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Extracting form structure')
    expect(html).toContain('http-equiv="refresh"')
  })

  it('shows ready project with spec details', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Test Form',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'ready',
      spec: stubResult.spec,
      formSpec: stubResult.formSpec,
      confidence: stubResult.confidence,
    })
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
    const project = projectStore.create({
      name: 'Failed Project',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
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
    const project = projectStore.create({
      name: 'Retry Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, { status: 'error', error: 'timeout' })

    const res = await app.request(`/projects/${project.id}/retry`, {
      method: 'POST',
    })
    expect(res.status).toBe(302)

    // Give async extraction a tick to start
    await new Promise((r) => setTimeout(r, 50))
    const updated = projectStore.get(project.id)
    // Status should be 'ready' since stub extractor resolves immediately
    expect(updated?.status).toBe('ready')
  })
})

describe('POST /projects/:id/delete', () => {
  it('deletes project and redirects to list', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Delete Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
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
  function createReadyProject() {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Summary Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'ready',
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
          },
        ],
      },
      confidence: [
        { fieldId: 'f1', confidence: 0.95 },
        {
          fieldId: 'f2',
          confidence: 0.6,
          flags: ['conditional-logic-unclear'],
        },
      ],
    })
    return { app, project }
  }

  it('shows summary bar with counts', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('project-summary')
  })

  it('shows back link', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Back to projects')
  })

  it('shows condition for conditional fields', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('marital-status')
    expect(html).toContain('equals')
  })

  it('shows form layout with resolved group names', async () => {
    const { app, project } = createReadyProject()
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('form-page-card')
    expect(html).toContain('Personal Information')
    expect(html).toContain('Personal Info')
  })
})

describe('Confidence indicators', () => {
  it('shows badge for low-confidence fields', async () => {
    const { app, projectStore } = createTestApp()
    const project = projectStore.create({
      name: 'Confidence Test',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    projectStore.update(project.id, {
      status: 'ready',
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
      },
      confidence: [
        { fieldId: 'low-conf', confidence: 0.3, flags: ['ambiguous-type'] },
        { fieldId: 'high-conf', confidence: 0.95 },
      ],
    })
    const res = await app.request(`/projects/${project.id}`)
    const html = await res.text()
    expect(html).toContain('Low confidence')
  })
})
