import { Hono } from 'hono'
import catalog from './routes/catalog'

const app = new Hono()

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
</head>
<body>
  <h1>Forms Lab</h1>
  <p>LLM-Assisted Forms Platform</p>
  <nav>
    <a href="/catalog/personas">Personas</a>
  </nav>
</body>
</html>`,
  )
})

// Start server when run directly
if (import.meta.main) {
  Bun.serve({
    port: process.env.PORT || 3000,
    fetch: app.fetch,
  })
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`)
}

export default app
