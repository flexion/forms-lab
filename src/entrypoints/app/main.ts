/**
 * Dev server entry point — builds CSS and components on startup and exports
 * a Bun server config for --watch hot reload compatibility.
 */
import { copyFileSync } from 'node:fs'
import app from './server'

// Build CSS on startup
await Bun.build({
  entrypoints: ['./src/entrypoints/app/public/styles.css'],
  outdir: './dist',
  naming: 'styles.css',
  minify: false,
  external: ['/static/*'],
})

// Build component client scripts on startup
await Bun.build({
  entrypoints: ['./src/design-system/register.ts'],
  outdir: './dist',
  naming: 'components.js',
  target: 'browser',
  minify: false,
})

// Copy standalone client scripts to dist
copyFileSync(
  './src/entrypoints/app/public/conversational-form.js',
  './dist/conversational-form.js',
)

const port = process.env.PORT || 3000
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 120,
}
