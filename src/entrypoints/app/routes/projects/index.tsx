import { Hono } from 'hono'
import {
  demoFixtures,
  getFixture,
  loadFixturePdf,
} from '../../../../../fixtures/index'
import { Layout } from '../../../../design-system/components/flex-layout'
import type { PdfExtractor } from '../../../../services/ingestion/pdf-extractor'
import type { ProjectStore } from '../../../../services/storage'
import { resolveUrl } from '../../../../shared/base-path'
import { NewProjectPage, ProjectDetail, ProjectList } from './components'

export function createProjectRoutes(
  projectStore: ProjectStore,
  extractor: PdfExtractor,
): Hono {
  const projects = new Hono()

  projects.get('/', (c) => {
    const user = c.get('user')
    const userProjects = projectStore.list(user?.login)
    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectList projects={userProjects} />
      </Layout>,
    )
  })

  projects.get('/new', (c) => {
    const user = c.get('user')
    return c.html(
      <Layout currentPath="/projects" user={user}>
        <NewProjectPage fixtures={demoFixtures} />
      </Layout>,
    )
  })

  projects.post('/', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const contentType = c.req.header('content-type') ?? ''
    let pdf: Buffer
    let name: string

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody()
      const file = body.pdf
      if (!(file instanceof File) || file.size === 0) {
        return c.html(
          <Layout currentPath="/projects" user={user}>
            <NewProjectPage fixtures={demoFixtures} />
          </Layout>,
          400,
        )
      }
      pdf = Buffer.from(await file.arrayBuffer())
      name = file.name.replace(/\.pdf$/i, '')
    } else {
      const body = await c.req.parseBody()
      const fixtureSlug = body.fixture as string
      const fixture = getFixture(fixtureSlug)
      if (!fixture) {
        return c.html(
          <Layout currentPath="/projects" user={user}>
            <NewProjectPage fixtures={demoFixtures} />
          </Layout>,
          400,
        )
      }
      pdf = loadFixturePdf(fixture)
      name = fixture.name
    }

    const project = projectStore.create({
      name,
      description: `Extracted from ${name}`,
      sourcePdf: pdf,
      createdBy: user.login,
    })

    // Fire-and-forget extraction
    extractor
      .extract(pdf)
      .then((result) => {
        projectStore.update(project.id, {
          status: 'ready',
          spec: result.spec,
          formSpec: result.formSpec,
          confidence: result.confidence,
        })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  projects.get('/:id', (c) => {
    const user = c.get('user')
    const project = projectStore.get(c.req.param('id'))
    if (!project) {
      return c.html(
        <Layout currentPath="/projects" user={user}>
          <h1>Project not found</h1>
        </Layout>,
        404,
      )
    }
    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectDetail project={project} />
      </Layout>,
    )
  })

  projects.post('/:id/retry', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    projectStore.update(project.id, { status: 'extracting', error: null })

    extractor
      .extract(project.sourcePdf)
      .then((result) => {
        projectStore.update(project.id, {
          status: 'ready',
          spec: result.spec,
          formSpec: result.formSpec,
          confidence: result.confidence,
        })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  projects.post('/:id/delete', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    projectStore.delete(project.id)
    return c.redirect(resolveUrl('/projects'))
  })

  return projects
}
