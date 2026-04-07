/**
 * Dev server entry point — builds CSS on startup and exports
 * a Bun server config for --watch hot reload compatibility.
 */
import app from './server'

// Build CSS on startup
await Bun.build({
  entrypoints: ['./src/public/styles.css'],
  outdir: './dist',
  naming: 'styles.css',
  minify: false,
})

const port = process.env.PORT || 3000
console.log(`Server running on http://localhost:${port}`)

// Export server config for Bun's native --watch reload
export default {
  port,
  fetch: app.fetch,
}
