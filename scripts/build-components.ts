import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const entrypoint = resolve(import.meta.dir, '../src/app/components/register.ts')
const outdir = resolve(import.meta.dir, '../dist')

await mkdir(outdir, { recursive: true })

const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  naming: 'components.js',
  target: 'browser',
  minify: false,
})

if (!result.success) {
  console.error('Component build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('Components built to dist/components.js')
