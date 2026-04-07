import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { Layout } from './components/flex-layout'
import catalog from './routes/catalog/index'

const app = new Hono()

// Static assets (CSS build output)
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
