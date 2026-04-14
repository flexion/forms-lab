import { Hono } from 'hono'
import {
  demoFixtures,
  getFixture,
  loadFixturePdf,
} from '../../../../fixtures/index'
import { resolveUrl } from '../../../lib/base-path'
import type { ProjectStore } from '../../../services/database'
import type { FormProjectRepo } from '../../../services/form-project-repo'
import type { PdfExtractor } from '../../../services/pdf-extractor'
import { slugify } from '../../../shared/slugify'
import type {
  DataCollectionSpec,
  FieldConfidence,
  FormSpec,
} from '../../../types/models'
import { Layout } from '../../components/flex-layout'
import { NewProjectPage, ProjectDetail, ProjectList } from './components'

export function createProjectRoutes(
  projectStore: ProjectStore,
  extractor: PdfExtractor,
  repo: FormProjectRepo,
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

    let slug = slugify(name)
    let suffix = 1
    while (projectStore.getBySlug(slug)) {
      suffix++
      slug = `${slugify(name)}-${suffix}`
    }
    const project = projectStore.create({
      name,
      slug,
      createdBy: user.login,
    })

    // Init git repo and commit source PDF + project.json
    await repo.init(slug)
    await repo.commit(
      slug,
      [
        {
          path: `source/${slug}.pdf`,
          content: pdf,
        },
        {
          path: 'project.json',
          content: Buffer.from(
            JSON.stringify({ name, slug, createdBy: user.login }, null, 2),
          ),
        },
      ],
      `Initialize project: ${name}`,
      user.login,
    )

    // Fire-and-forget extraction
    extractor
      .extract(pdf)
      .then(async (result) => {
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
          user.login,
        )
        projectStore.update(project.id, { status: 'ready' })
      })
      .catch((err) => {
        projectStore.update(project.id, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      })

    return c.redirect(resolveUrl(`/projects/${project.id}`))
  })

  projects.get('/:id', async (c) => {
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

    if (project.status === 'ready') {
      const { spec, formSpec, confidence, history } = await readProjectSpecs(
        repo,
        project.slug,
      )
      return c.html(
        <Layout currentPath="/projects" user={user}>
          <ProjectDetail
            project={project}
            spec={spec}
            formSpec={formSpec}
            confidence={confidence}
            history={history}
          />
        </Layout>,
      )
    }

    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectDetail project={project} />
      </Layout>,
    )
  })

  projects.get('/:id/version/:sha', async (c) => {
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

    const sha = c.req.param('sha')
    const { spec, formSpec, confidence, history } = await readProjectSpecs(
      repo,
      project.slug,
      sha,
    )

    return c.html(
      <Layout currentPath="/projects" user={user}>
        <ProjectDetail
          project={project}
          spec={spec}
          formSpec={formSpec}
          confidence={confidence}
          history={history}
          viewingSha={sha}
        />
      </Layout>,
    )
  })

  projects.post('/:id/retry', async (c) => {
    const user = c.get('user')
    if (!user) return c.redirect(resolveUrl('/auth/signin'))

    const project = projectStore.get(c.req.param('id'))
    if (!project) return c.notFound()

    // Read source PDF from git
    const pdfBuffer = await repo.readFile(
      project.slug,
      'main',
      `source/${project.slug}.pdf`,
    )
    if (!pdfBuffer) {
      projectStore.update(project.id, {
        status: 'error',
        error: 'Source PDF not found in repository',
      })
      return c.redirect(resolveUrl(`/projects/${project.id}`))
    }

    projectStore.update(project.id, { status: 'extracting', error: null })

    extractor
      .extract(pdfBuffer)
      .then(async (result) => {
        await repo.commit(
          project.slug,
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
          'Re-extract form specifications',
          user.login,
        )
        projectStore.update(project.id, { status: 'ready' })
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

/** Read spec, formSpec, confidence, and history from git at a given rev */
async function readProjectSpecs(
  repo: FormProjectRepo,
  slug: string,
  rev = 'main',
): Promise<{
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  history: Awaited<ReturnType<FormProjectRepo['log']>>
}> {
  const [specBuf, formBuf, confBuf, history] = await Promise.all([
    repo.readFile(slug, rev, 'forms/default/spec.json'),
    repo.readFile(slug, rev, 'forms/default/form.json'),
    repo.readFile(slug, rev, 'forms/default/confidence.json'),
    repo.log(slug, 'main'),
  ])

  return {
    spec: specBuf ? JSON.parse(specBuf.toString()) : null,
    formSpec: formBuf ? JSON.parse(formBuf.toString()) : null,
    confidence: confBuf ? JSON.parse(confBuf.toString()) : null,
    history,
  }
}
