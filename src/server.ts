import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
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
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forms Lab</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <header class="site-header">
    <h1>Forms Lab</h1>
    <p>LLM-Assisted Forms Platform</p>
    <nav class="site-nav">
      <a href="/catalog">Catalog</a>
    </nav>
  </header>
  <main class="l-center">
    <div class="l-stack">
      <p>LLM-Assisted Forms Platform for government forms.</p>
    </div>
  </main>
</body>
</html>`,
  )
})

export default app
