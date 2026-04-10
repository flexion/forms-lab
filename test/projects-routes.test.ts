import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createProjectRoutes } from '../src/app/routes/projects/index'
import { createProjectStore } from '../src/services/database'
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

  it('lists existing projects', async () => {
    const { app, projectStore } = createTestApp()
    projectStore.create({
      name: 'Pardon App',
      description: 'Test',
      sourcePdf: Buffer.from('pdf'),
      createdBy: 'testuser',
    })
    const res = await app.request('/projects')
    const html = await res.text()
    expect(html).toContain('Pardon App')
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
