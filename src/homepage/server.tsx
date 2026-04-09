import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { DeploymentCard } from '../app/components/deployment-card'
import { Layout } from '../app/components/flex-layout'
import { getDeploymentSummary } from '../services/deployment-metadata'

const app = new Hono()

// Serve static assets (CSS, JS, images) from app build
app.use(
  '/static/sprite.svg',
  serveStatic({
    path: './node_modules/@uswds/uswds/dist/img/sprite.svg',
  }),
)

app.use(
  '/static/img/:name',
  serveStatic({
    root: './node_modules/@uswds/uswds/dist/img',
    rewriteRequestPath: (path) => path.replace('/static/img', ''),
  }),
)

app.use(
  '/static/fonts/*',
  serveStatic({
    root: './src/app/public',
    rewriteRequestPath: (path) => path.replace('/static/', ''),
  }),
)

app.use(
  '/static/*',
  serveStatic({
    root: './dist',
    rewriteRequestPath: (path) => path.replace('/static', ''),
  }),
)

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Deployment dashboard at root
app.get('/', async (c) => {
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
          class="l-grid"
          style={{
            '--grid-min': '200px',
            '--grid-space': 'var(--flex-space-2)',
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
    // If deployment metadata can't be read, show error page
    console.error('Failed to load deployment summary:', error)
    return c.html(
      <Layout currentPath="/">
        <h1>Deployment Dashboard Unavailable</h1>
        <p>
          Unable to load deployment information. This is normal in development
          mode.
        </p>
      </Layout>,
    )
  }
})

export default app
