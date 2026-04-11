import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { testDataSpec, testFormSpec } from '../../test/forms/fixtures'
import { Layout } from '../design-system/components/flex-layout'
import { InMemoryFormSessionGateway } from '../services/forms/session'
import { InMemorySubmissionGateway } from '../services/forms/submission'
import {
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from '../services/ingestion/pdf-extractor'
import { createCacheStore, createProjectStore } from '../services/storage'
import { getBasePath, resolveUrl } from '../shared/base-path'
import { requireAuth, sessionReader } from './middleware/auth'
import auth from './routes/auth/index'
import catalog from './routes/catalog/index'
import { createFormRouter } from './routes/forms/index'
import { createProjectRoutes } from './routes/projects/index'

const basePath = getBasePath()
const app = new Hono().basePath(basePath)

const projectDbPath = process.env.PROJECT_DB_PATH ?? 'data/projects.sqlite'
const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite' // Shared across branches in production
mkdirSync(dirname(projectDbPath), { recursive: true })
mkdirSync(dirname(cacheDbPath), { recursive: true })

const projectStore = createProjectStore(projectDbPath)
const cacheStore = createCacheStore(cacheDbPath)
const extractor = createCachedPdfExtractor(
  createBedrockPdfExtractor(),
  cacheStore,
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
    root: './src/app/public',
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
app.route('/auth', auth)

// Mount projects routes with auth guard
app.use('/projects/*', requireAuth())
app.route('/projects', createProjectRoutes(projectStore, extractor))

// Form delivery routes (in-memory, using test fixtures for now)
const sessionGateway = new InMemoryFormSessionGateway()
const submissionGateway = new InMemorySubmissionGateway()

const specRegistry = new Map([
  [testDataSpec.id, { dataSpec: testDataSpec, formSpec: testFormSpec }],
])

const forms = createFormRouter({
  sessionGateway,
  submissionGateway,
  getSpecs: (specId) => specRegistry.get(specId) ?? null,
  listSpecs: () => [...specRegistry.values()],
})

app.route('/forms', forms)

// Mount catalog routes
app.route('/catalog', catalog)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Root page
app.get('/', (c) => {
  return c.html(
    <Layout currentPath="/" user={c.get('user')}>
      <h1>Forms Lab</h1>
      <p>
        Upload a government PDF form, extract structured specs, deliver form
        experiences (static or conversational), and generate completed PDFs.
      </p>
      <p>
        <a href={resolveUrl('/catalog')}>Browse the Catalog</a>
      </p>
    </Layout>,
  )
})

export default app
