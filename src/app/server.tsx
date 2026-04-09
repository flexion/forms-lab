import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { getBasePath, resolveUrl } from '../lib/base-path'
import { getDeploymentSummary } from '../services/deployment-metadata'
import { DeploymentCard } from './components/deployment-card'
import { Layout } from './components/flex-layout'
import catalog from './routes/catalog/index'

const basePath = getBasePath()
const app = new Hono().basePath(basePath)

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
app.get('/', async (c) => {
  // If deployed at root (no basePath), show deployment dashboard
  if (!basePath || basePath === '/') {
    try {
      const summary = await getDeploymentSummary()

      return c.html(
        <Layout currentPath="/">
          <h1>Forms Lab — Deployment Dashboard</h1>
          <p>
            Automated branch deployments for the Forms Lab platform. Each push
            triggers a deployment.
          </p>

          {/* Summary statistics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--flex-space-2)',
              marginTop: 'var(--flex-space-4)',
              marginBottom: 'var(--flex-space-4)',
            }}
          >
            <div
              class="content-card"
              style={{ textAlign: 'center', padding: 'var(--flex-space-3)' }}
            >
              <div
                style={{
                  fontSize: 'var(--flex-text-2xl)',
                  fontWeight: 'var(--flex-font-weight-bold)',
                  color: 'var(--flex-color-primary)',
                }}
              >
                {summary.totalDeployments}
              </div>
              <div
                style={{
                  fontSize: 'var(--flex-text-sm)',
                  color: 'var(--flex-color-text-muted)',
                  marginTop: 'var(--flex-space-1)',
                }}
              >
                Total Deployments
              </div>
            </div>

            <div
              class="content-card"
              style={{ textAlign: 'center', padding: 'var(--flex-space-3)' }}
            >
              <div
                style={{
                  fontSize: 'var(--flex-text-2xl)',
                  fontWeight: 'var(--flex-font-weight-bold)',
                  color: 'var(--flex-color-success)',
                }}
              >
                {summary.healthyDeployments}
              </div>
              <div
                style={{
                  fontSize: 'var(--flex-text-sm)',
                  color: 'var(--flex-color-text-muted)',
                  marginTop: 'var(--flex-space-1)',
                }}
              >
                Healthy
              </div>
            </div>

            <div
              class="content-card"
              style={{ textAlign: 'center', padding: 'var(--flex-space-3)' }}
            >
              <div
                style={{
                  fontSize: 'var(--flex-text-2xl)',
                  fontWeight: 'var(--flex-font-weight-bold)',
                  color:
                    summary.failedDeployments > 0
                      ? 'var(--flex-color-error)'
                      : 'var(--flex-color-text-muted)',
                }}
              >
                {summary.failedDeployments}
              </div>
              <div
                style={{
                  fontSize: 'var(--flex-text-sm)',
                  color: 'var(--flex-color-text-muted)',
                  marginTop: 'var(--flex-space-1)',
                }}
              >
                Failed
              </div>
            </div>
          </div>

          {/* Deployment cards grid */}
          {summary.deployments.length > 0 ? (
            <div class="l-stack">
              <h2>Active Deployments</h2>
              <div class="l-grid">
                {summary.deployments.map((deployment) => (
                  <DeploymentCard
                    key={deployment.branch}
                    deployment={deployment}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p>No branches currently deployed.</p>
          )}
        </Layout>,
      )
    } catch (error) {
      // If deployment metadata can't be read, show fallback page
      console.error('Failed to load deployment summary:', error)
      return c.html(
        <Layout currentPath="/">
          <h1>Forms Lab</h1>
          <p>
            Upload a government PDF form, extract structured specs, deliver form
            experiences (static or conversational), and generate completed PDFs.
          </p>
          <p>
            <a href="/catalog">Browse the Catalog</a>
          </p>
        </Layout>,
      )
    }
  }

  // Branch-specific homepage
  return c.html(
    <Layout currentPath="/">
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
