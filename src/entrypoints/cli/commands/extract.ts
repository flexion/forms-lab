import { resolve } from 'node:path'
import {
  createBedrockPdfExtractor,
  createCachedPdfExtractor,
} from '../../../services/ingestion/pdf-extractor'
import { createCacheStore } from '../../../services/storage'

const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli extract <subcommand>\n')
  console.log('Subcommands:')
  console.log(
    '  fixture <slug>     Extract from a demo fixture (e.g., pardon-application)',
  )
  console.log('  sync               Push local cache to EC2 server')
  console.log('  list               List cached extractions')
  console.log()
  console.log('Options:')
  console.log('  --no-cache         Skip cache lookup, force re-extraction')
  console.log()
  console.log(
    'Extractions are cached in data/cache.sqlite by PDF content hash + model.',
  )
  console.log(
    'Use `sync` to copy the cache to the server so deployed branches use it.',
  )
}

async function getHostname(): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname'], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}

export async function extract(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'fixture': {
      const slug = args[1]
      const noCache = args.includes('--no-cache')

      if (!slug) {
        const { demoFixtures } = await import('../../../../fixtures/index')
        console.log('Available fixtures:')
        for (const f of demoFixtures) {
          console.log(`  ${f.slug.padEnd(25)} ${f.name}`)
        }
        return 1
      }

      const { getFixture, loadFixturePdf } = await import(
        '../../../../fixtures/index'
      )
      const fixture = getFixture(slug)
      if (!fixture) {
        console.error(`Unknown fixture: ${slug}`)
        return 1
      }

      console.log(`Loading fixture: ${fixture.name}`)
      const pdf = loadFixturePdf(fixture)
      console.log(`PDF size: ${(pdf.length / 1024).toFixed(0)} KB`)

      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      const { mkdirSync } = await import('node:fs')
      const { dirname } = await import('node:path')
      mkdirSync(dirname(cacheDbPath), { recursive: true })
      const cacheStore = createCacheStore(cacheDbPath)

      const innerExtractor = createBedrockPdfExtractor()
      const extractor = noCache
        ? innerExtractor
        : createCachedPdfExtractor(innerExtractor, cacheStore)

      console.log(
        noCache
          ? 'Extracting (cache bypassed)...'
          : 'Extracting (checking cache first)...',
      )
      const start = Date.now()

      try {
        const result = await extractor.extract(pdf)
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        console.log(`\nExtraction complete in ${elapsed}s`)
        console.log(`  Groups: ${result.spec.groups.length}`)
        const fieldCount = result.spec.groups.reduce(
          (sum, g) => sum + g.requirements.length,
          0,
        )
        console.log(`  Fields: ${fieldCount}`)
        console.log(`  Pages: ${result.formSpec.pages.length}`)
        const lowConfidence = result.confidence.filter(
          (c) => c.confidence < 0.8,
        )
        console.log(`  Low confidence fields: ${lowConfidence.length}`)

        if (noCache) {
          // Manually cache the result
          const hasher = new Bun.CryptoHasher('sha256')
          hasher.update(pdf)
          hasher.update(
            process.env.BEDROCK_MODEL ??
              'us.anthropic.claude-sonnet-4-20250514-v1:0',
          )
          const key = hasher.digest('hex')
          cacheStore.set(
            key,
            process.env.BEDROCK_MODEL ??
              'us.anthropic.claude-sonnet-4-20250514-v1:0',
            JSON.stringify(result),
          )
          console.log('  Result cached')
        }

        // Print summary
        console.log('\nGroups:')
        for (const group of result.spec.groups) {
          console.log(`  ${group.title} (${group.requirements.length} fields)`)
        }

        console.log('\nPages:')
        for (const page of result.formSpec.pages) {
          console.log(`  ${page.title} (${page.groups.length} groups)`)
        }
      } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        console.error(`\nExtraction failed after ${elapsed}s`)
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`)
          if (err.cause) {
            console.error(`Cause: ${JSON.stringify(err.cause, null, 2)}`)
          }
        }
        return 1
      }

      return 0
    }

    case 'list': {
      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      try {
        const { Database } = await import('bun:sqlite')
        const db = new Database(cacheDbPath, { readonly: true })
        const rows = db
          .query(
            'SELECT key, model, length(result) as size, created_at FROM cache ORDER BY created_at DESC',
          )
          .all() as {
          key: string
          model: string
          size: number
          created_at: number
        }[]

        if (rows.length === 0) {
          console.log('No cached extractions')
          return 0
        }

        console.log(`${rows.length} cached extraction(s):\n`)
        for (const row of rows) {
          const date = new Date(row.created_at * 1000).toISOString()
          console.log(
            `  ${row.key.substring(0, 12)}...  ${row.model}  ${(row.size / 1024).toFixed(0)} KB  ${date}`,
          )
        }
      } catch {
        console.log('No cache database found')
      }
      return 0
    }

    case 'sync': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }

      const cacheDbPath = process.env.CACHE_DB_PATH ?? 'data/cache.sqlite'
      const { existsSync, unlinkSync } = await import('node:fs')
      if (!existsSync(cacheDbPath)) {
        console.error(`No local cache at ${cacheDbPath}`)
        return 1
      }

      const remotePath = '/srv/forms-lab/cache.sqlite'
      const exportPath = '/tmp/forms-lab-cache-export.sqlite'
      console.log(`Syncing cache to ${hostname}:${remotePath}`)

      // Export a clean copy (WAL-mode DBs can't be reliably copied via scp)
      const { Database } = await import('bun:sqlite')
      try {
        unlinkSync(exportPath)
      } catch {}
      const db = new Database(cacheDbPath, { readonly: true })
      db.run(`VACUUM INTO '${exportPath}'`)
      db.close()

      const scp = Bun.spawn(
        ['scp', exportPath, `root@${hostname}:${remotePath}`],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      const code = await scp.exited
      if (code !== 0) {
        console.error('Failed to copy cache')
        return 1
      }

      // Fix ownership
      const chown = Bun.spawn(
        ['ssh', `root@${hostname}`, `chown forms-lab:forms-lab ${remotePath}`],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      await chown.exited

      console.log('Cache synced. All branches read from this shared cache.')
      return 0
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
