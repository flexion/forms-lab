/**
 * Deployment smoke check — run after deploy to verify the app is wired up.
 * Exits non-zero if any check fails, which should halt the deployment.
 *
 * Usage: BASE_URL=http://localhost:3001 bun run scripts/smoke-check.ts
 */

const baseUrl = process.env.BASE_URL
if (!baseUrl) {
  console.error('ERROR: BASE_URL environment variable required')
  process.exit(1)
}

interface Check {
  name: string
  run: () => Promise<void>
}

const checks: Check[] = [
  {
    name: 'Health endpoint responds',
    async run() {
      const res = await fetch(`${baseUrl}/health`)
      if (!res.ok) throw new Error(`GET /health returned ${res.status}`)
      const data = await res.json()
      if (data.status !== 'ok') throw new Error(`Health status: ${data.status}`)
    },
  },
  {
    name: 'Root page renders',
    async run() {
      const res = await fetch(`${baseUrl}/`)
      if (!res.ok) throw new Error(`GET / returned ${res.status}`)
      const html = await res.text()
      if (!html.includes('Forms Lab'))
        throw new Error('Root page missing "Forms Lab"')
    },
  },
  {
    name: 'Auth guard protects /projects',
    async run() {
      const res = await fetch(`${baseUrl}/projects`, { redirect: 'manual' })
      if (res.status !== 302) throw new Error(`Expected 302, got ${res.status}`)
      const location = res.headers.get('Location') ?? ''
      if (!location.includes('/auth/signin'))
        throw new Error(`Expected redirect to /auth/signin, got ${location}`)
    },
  },
  {
    name: 'AWS_REGION is configured',
    async run() {
      if (!process.env.AWS_REGION)
        throw new Error('AWS_REGION not set — Bedrock extraction will fail')
    },
  },
  {
    name: 'AWS credentials are available',
    async run() {
      // Try the AWS SDK credential chain (env vars, instance profile, etc.)
      const { fromNodeProviderChain } = await import(
        '@aws-sdk/credential-providers'
      )
      const provider = fromNodeProviderChain()
      const creds = await provider()
      if (!creds.accessKeyId)
        throw new Error(
          'No AWS credentials found — check instance profile or env vars',
        )
    },
  },
]

let passed = 0
let failed = 0

for (const check of checks) {
  try {
    await check.run()
    console.log(`  PASS  ${check.name}`)
    passed++
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL  ${check.name}: ${msg}`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error('\nSmoke check failed — deployment may be broken')
  process.exit(1)
}
