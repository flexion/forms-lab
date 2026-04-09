import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const entrypoint = resolve(import.meta.dir, '../src/app/public/styles.css')
const outdir = resolve(import.meta.dir, '../dist')

await mkdir(outdir, { recursive: true })

const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  naming: 'styles.css',
  minify: false,
  // Don't resolve absolute URL paths (fonts served separately)
  external: ['/static/*'],
})

if (!result.success) {
  console.error('CSS build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('CSS built to dist/styles.css')
