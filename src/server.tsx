import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { Layout } from './components/flex-layout'
import catalog from './routes/catalog/index'

const app = new Hono()

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

// USWDS flag image for banner component
app.get('/static/img/us_flag_small.png', async (c) => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const png = await readFile(
    resolve(
      process.cwd(),
      'node_modules/@uswds/uswds/dist/img/us_flag_small.png',
    ),
  )
  c.header('Content-Type', 'image/png')
  c.header('Cache-Control', 'public, max-age=31536000')
  return c.body(png)
})

// Font files (self-hosted, matching USWDS)
app.use(
  '/static/fonts/*',
  serveStatic({
    root: './src/public',
    rewriteRequestPath: (path) => path.replace('/static/', ''),
  }),
)

// Static assets (CSS + JS build output)
app.use(
  '/static/*',
  serveStatic({
    root: './dist',
    rewriteRequestPath: (path) => path.replace('/static', ''),
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
app.get('/', (c) => {
  return c.html(
    <Layout>
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
})

export default app
