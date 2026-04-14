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
import { createFormProjectRepo } from '../../services/form-project-repo'
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
import {
  Dashboard,
  LandingPage,
  NewProjectPage,
} from './routes/owner/components'
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
      <LandingPage />
    </Layout>,
  )
})

// Mount owner routes LAST (catch-all pattern /:owner)
app.route('/', createOwnerRoutes(projectService, userStore))

export default app
