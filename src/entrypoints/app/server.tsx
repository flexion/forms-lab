import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import {
  demoFixtures,
  getFixture,
  loadFixturePdf,
} from '../../../fixtures/index'
import { Layout } from '../../design-system/components/flex-layout'
import type { DataCollectionSpec } from '../../services/data-collection/types'
import { createFormProjectRepo } from '../../services/form-project-repo'
import { createReviewService } from '../../services/forms/review'
import { SqliteFormSessionGateway } from '../../services/forms/sqlite-session-gateway'
import { createShapingRegistry } from '../../services/forms/shaping/registry'
import { createSpecSnapshotStore } from '../../services/forms/spec-snapshot-store'
import { SqliteSubmissionGateway } from '../../services/forms/sqlite-submission-gateway'
import type { FormSpec } from '../../services/forms/types'
import {
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from '../../services/pdf-extractor'
import { createProjectService } from '../../services/project-service'
import { createCacheStore, createProjectStore } from '../../services/storage'
import { createUserStore } from '../../services/user-store'
import { getBasePath, resolveUrl } from '../../shared/base-path'
import { requireAuth, sessionReader } from './middleware/auth'
import { createAuthRoutes } from './routes/auth/index'
import catalog from './routes/catalog/index'
import { createFormRouter } from './routes/forms/index'
import { createCompareRoutes } from './routes/owner/compare/index'
import {
  Dashboard,
  LandingPage,
  NewProjectPage,
} from './routes/owner/components'
import { createEditRoutes } from './routes/owner/edit/index'
import { createOwnerRoutes } from './routes/owner/index'

const basePath = getBasePath()
const app = new Hono().basePath(basePath)

const projectDbPath = process.env.PROJECT_DB_PATH ?? 'data/projects.sqlite'
const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite' // Shared across branches in production
const reposPath = process.env.REPOS_PATH ?? 'data/repos'
mkdirSync(dirname(projectDbPath), { recursive: true })
mkdirSync(dirname(cacheDbPath), { recursive: true })
mkdirSync(reposPath, { recursive: true })

const projectStore = createProjectStore(projectDbPath)
const cacheStore = createCacheStore(cacheDbPath)
const userStore = createUserStore(projectDbPath)
const formProjectRepo = createFormProjectRepo(reposPath)
const extractor = createCachedPdfExtractor(
  createBedrockPdfExtractor(),
  cacheStore,
)
const projectService = createProjectService(
  projectStore,
  formProjectRepo,
  extractor,
)
const shapingRegistry = createShapingRegistry()
const reviewService = createReviewService(formProjectRepo)
const formsDbPath = process.env.FORMS_DB_PATH ?? 'data/forms.sqlite'
mkdirSync(dirname(formsDbPath), { recursive: true })
const sessionGateway = new SqliteFormSessionGateway(formsDbPath)
const submissionGateway = new SqliteSubmissionGateway(formsDbPath)
const specSnapshotStore = createSpecSnapshotStore(formsDbPath)

/**
 * Adapter: resolve a DataCollectionSpec id to (owner, slug, spec, formSpec)
 * by scanning ready projects. specId is assigned by the extractor and is
 * independent of the project slug, so we scan all projects and read their
 * main-branch spec to build the mapping. Slow-ish for many projects; fine
 * at current scale. Branch-qualified refs are supported via the `ref`
 * argument to `getSpecs`.
 */
async function readProjectSpecs(
  slug: string,
  ref: string,
): Promise<{
  dataSpec: DataCollectionSpec
  formSpec: FormSpec
  sha: string
} | null> {
  const [specBuf, formBuf, history] = await Promise.all([
    formProjectRepo.readFile(slug, ref, 'forms/default/spec.json'),
    formProjectRepo.readFile(slug, ref, 'forms/default/form.json'),
    formProjectRepo.log(slug, ref, undefined, 1),
  ])
  if (!specBuf || !formBuf || history.length === 0) return null
  return {
    dataSpec: JSON.parse(specBuf.toString()) as DataCollectionSpec,
    formSpec: JSON.parse(formBuf.toString()) as FormSpec,
    sha: history[0].sha,
  }
}

// Cached specId -> (owner, slug) mapping. Populated as a side effect of
// `findProjectBySpecId` and consulted synchronously by `getEditHref`. This
// is best-effort: newly-created projects won't have an entry until a
// request for that spec lands. Acceptable for the demo; revisit if the
// catalog grows large.
const specIdIndex = new Map<string, { owner: string; slug: string }>()

async function findProjectBySpecId(
  specId: string,
): Promise<{ slug: string; owner: string } | null> {
  for (const project of projectStore.list()) {
    if (project.status !== 'ready') continue
    try {
      const resolved = await readProjectSpecs(project.slug, 'main')
      if (resolved) {
        specIdIndex.set(resolved.dataSpec.id, {
          owner: project.createdBy,
          slug: project.slug,
        })
        if (resolved.dataSpec.id === specId) {
          return { slug: project.slug, owner: project.createdBy }
        }
      }
    } catch {
      // Ignore repos that fail to read — project may be mid-extraction
      // or have been externally removed.
    }
  }
  return null
}

// Apply session reader globally
app.use('*', sessionReader())

// USWDS icon sprite
app.get('/static/sprite.svg', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const svg = await readFile(
    resolve(process.cwd(), 'node_modules/@uswds/uswds/dist/img/sprite.svg'),
    'utf-8',
  )
  c.header('Content-Type', 'image/svg+xml')
  c.header('Cache-Control', 'public, max-age=31536000')
  return c.body(svg)
})

// USWDS images (flag, banner icons, etc.)
app.get('/static/img/:name', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const name = c.req.param('name')
  // Only serve known USWDS image files
  const allowed = [
    'us_flag_small.png',
    'icon-dot-gov.svg',
    'icon-https.svg',
    'logo-img.png',
    'hero.jpg',
  ]
  if (!allowed.includes(name)) return c.notFound()
  const filePath = resolve(
    process.cwd(),
    `node_modules/@uswds/uswds/dist/img/${name}`,
  )
  try {
    const data = await readFile(filePath)
    const ext = name.split('.').pop()
    const contentType =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream'
    c.header('Content-Type', contentType)
    c.header('Cache-Control', 'public, max-age=31536000')
    return c.body(data)
  } catch {
    return c.notFound()
  }
})

// Font files (self-hosted, matching USWDS)
app.use(
  '/static/fonts/*',
  serveStatic({
    root: './src/entrypoints/app/public',
    rewriteRequestPath: (path) => {
      // Strip basePath if present, then strip /static/
      let normalized = path
      if (basePath && path.startsWith(basePath)) {
        normalized = path.slice(basePath.length)
      }
      // Ensure leading slash
      if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`
      }
      return normalized.replace('/static/', '')
    },
  }),
)

// Static assets (CSS + JS build output)
app.use(
  '/static/*',
  serveStatic({
    root: './dist',
    rewriteRequestPath: (path) => {
      // Strip basePath if present, then strip /static
      let normalized = path
      if (basePath && path.startsWith(basePath)) {
        normalized = path.slice(basePath.length)
      }
      // Ensure leading slash
      if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`
      }
      return normalized.replace('/static', '')
    },
  }),
)

// Mount auth routes
app.route('/auth', createAuthRoutes(userStore))

// Mount catalog routes
app.route('/catalog', catalog)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// New project routes (requires auth)
app.use('/new', requireAuth())
app.get('/new', (c) => {
  const user = c.get('user')
  return c.html(
    <Layout currentPath="/new" user={user}>
      <NewProjectPage fixtures={demoFixtures} />
    </Layout>,
  )
})
app.post('/new', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect(resolveUrl('/auth/signin'))

  // Parse form body - fixture or file upload
  const contentType = c.req.header('content-type') ?? ''
  let pdf: Buffer
  let name: string

  if (contentType.includes('multipart/form-data')) {
    const body = await c.req.parseBody()
    const file = body.pdf
    if (!(file instanceof File) || file.size === 0) {
      return c.html(
        <Layout currentPath="/new" user={user}>
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
        <Layout currentPath="/new" user={user}>
          <NewProjectPage fixtures={demoFixtures} />
        </Layout>,
        400,
      )
    }
    pdf = loadFixturePdf(fixture)
    name = fixture.name
  }

  const project = await projectService.createProject(name, pdf, user)
  return c.redirect(resolveUrl(`/${user.login}/${project.slug}`))
})

// Root page - dashboard for authenticated users, landing for anonymous
app.get('/', (c) => {
  const user = c.get('user')
  const error = c.req.query('error') ?? null
  if (user) {
    const projects = projectService.listUserProjects(user.login)
    return c.html(
      <Layout currentPath="/" user={user}>
        <Dashboard projects={projects} user={user} />
      </Layout>,
    )
  }
  return c.html(
    <Layout currentPath="/" user={user}>
      <LandingPage error={error} />
    </Layout>,
  )
})

// Mount edit routes BEFORE owner routes (more specific patterns first)
app.route('/', createEditRoutes(projectService, shapingRegistry))

// Mount compare routes BEFORE owner routes (more specific patterns first)
app.route('/', createCompareRoutes(projectService, reviewService))

// Mount form delivery routes under /forms. Fills and submissions are
// git-backed; preview banner links back to the editor on non-main
// branches.
app.route(
  '/forms',
  createFormRouter({
    sessionGateway,
    submissionGateway,
    specSnapshotStore,
    async getSpecs(specId, ref) {
      const project = await findProjectBySpecId(specId)
      if (!project) return null
      return readProjectSpecs(project.slug, ref ?? 'main')
    },
    async listSpecs() {
      const result: {
        dataSpec: DataCollectionSpec
        formSpec: FormSpec
        sha: string
      }[] = []
      for (const project of projectStore.list()) {
        if (project.status !== 'ready') continue
        try {
          const resolved = await readProjectSpecs(project.slug, 'main')
          if (resolved) {
            specIdIndex.set(resolved.dataSpec.id, {
              owner: project.createdBy,
              slug: project.slug,
            })
            result.push(resolved)
          }
        } catch {
          // Skip unreadable projects — best-effort listing.
        }
      }
      return result
    },
    getEditHref(specId, branch) {
      // Consult the cached specId -> (owner, slug) map populated by
      // `findProjectBySpecId`. If there's no entry (e.g. the cache is
      // cold or the spec is unknown) we omit the link rather than block
      // rendering on an async lookup.
      const entry = specIdIndex.get(specId)
      if (!entry) return null
      return resolveUrl(`/${entry.owner}/${entry.slug}/edit/${branch}`)
    },
  }),
)

// Mount owner routes LAST (catch-all pattern /:owner)
app.route('/', createOwnerRoutes(projectService, userStore))

export default app
