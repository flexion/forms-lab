/**
 * Acceptance test against the deployed main app.
 *
 * More thorough than scripts/smoke-check.ts — exercises the paths a
 * visitor would walk through during the April 20 presentation:
 *
 *   - Homepage + dashboard service
 *   - Catalog and its experiment surfaces
 *   - Presentation deck
 *   - Owner/project routes (unauthenticated read paths)
 *   - Auth guard
 *   - Key pages for the hybrid-v1 default story
 *
 * Does NOT exercise authenticated-only flows (PDF upload, shaping,
 * review, publish, completed PDF) — those need an OAuth cookie we can't
 * easily script. Those must be verified manually; this script calls out
 * the checklist at the end.
 *
 * Usage:
 *   BASE_URL=https://forms.labs.flexion.us bun run scripts/test-main-deployment.ts
 *
 * Exit 0 on success, 1 on any failure.
 */

export {}

const baseUrl = (process.env.BASE_URL ?? '').replace(/\/$/, '')
if (!baseUrl) {
  console.error('ERROR: BASE_URL env var required')
  console.error(
    '  Example: BASE_URL=https://forms.labs.flexion.us bun run scripts/test-main-deployment.ts',
  )
  process.exit(1)
}

// Branch apps sit under /<branch>/, the dashboard sits at root. For
// acceptance we test BOTH: the dashboard AND the main branch app.
const mainApp = `${baseUrl}/main`
const dashboard = baseUrl

interface Check {
  name: string
  run(): Promise<void>
}

function mustContain(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: expected "${needle}" in response`)
  }
}

function mustNotContain(haystack: string, needle: string, label: string): void {
  if (haystack.includes(needle)) {
    throw new Error(`${label}: response unexpectedly contains "${needle}"`)
  }
}

// EC2 DNS names (compute-1.amazonaws.com) don't have matching TLS
// certs. Callers can opt into insecure TLS with INSECURE_TLS=1.
const insecureTls = process.env.INSECURE_TLS === '1'
if (insecureTls) {
  // Bun respects NODE_TLS_REJECT_UNAUTHORIZED as well.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const fetchInit: RequestInit & { tls?: { rejectUnauthorized: boolean } } =
  insecureTls ? { tls: { rejectUnauthorized: false } } : {}

async function get(
  url: string,
  options: { expectStatus?: number; redirect?: 'follow' | 'manual' } = {},
): Promise<{ status: number; html: string; location?: string }> {
  const res = await fetch(url, {
    ...fetchInit,
    redirect: options.redirect ?? 'follow',
  })
  const expected = options.expectStatus ?? 200
  if (res.status !== expected) {
    throw new Error(`GET ${url} → ${res.status} (expected ${expected})`)
  }
  return {
    status: res.status,
    html: await res.text(),
    location: res.headers.get('Location') ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Dashboard (homepage service at /)
// ---------------------------------------------------------------------------

const dashboardChecks: Check[] = [
  {
    name: 'dashboard: GET / renders deployment dashboard',
    async run() {
      const { html } = await get(`${dashboard}/`)
      mustContain(html, 'Forms Lab', '/')
    },
  },
  {
    name: 'dashboard: lists the main branch deployment',
    async run() {
      const { html } = await get(`${dashboard}/`)
      // Dashboard renders branch apps; main should be present.
      mustContain(html.toLowerCase(), 'main', 'dashboard branch list')
    },
  },
]

// ---------------------------------------------------------------------------
// Main branch app — read paths (anonymous)
// ---------------------------------------------------------------------------

const mainAppChecks: Check[] = [
  {
    name: 'main: GET /main/ renders',
    async run() {
      const { html } = await get(`${mainApp}/`)
      mustContain(html, 'Forms Lab', '/main/')
    },
  },
  {
    name: 'main: GET /main/health responds ok',
    async run() {
      const res = await fetch(`${mainApp}/health`, fetchInit)
      if (!res.ok) throw new Error(`GET /main/health → ${res.status}`)
      const data = (await res.json()) as { status?: string }
      if (data.status !== 'ok') {
        throw new Error(`/main/health status: ${data.status}`)
      }
    },
  },
  {
    name: 'main: GET /main/presentation renders slide deck',
    async run() {
      const { html } = await get(`${mainApp}/presentation`)
      mustContain(html, 'Forms Lab', '/presentation title')
      mustContain(html, 'data-slide="0"', '/presentation slide 0')
      mustContain(html, 'data-slide="9"', '/presentation slide 9')
      mustContain(html, 'Hybrid v1', '/presentation Key Findings')
    },
  },
  {
    name: 'main: presentation numbers reflect current catalog',
    async run() {
      const { html } = await get(`${mainApp}/presentation`)
      // Post-fix slide 7 numbers (see #96).
      mustContain(html, '73%', 'hybrid-v1 recall')
      mustContain(html, '99%', 'hybrid-v1 precision')
      mustNotContain(
        html,
        '<td>Sonnet baseline</td>\n                  <td>55%',
        'pre-fix sonnet baseline row still present',
      )
    },
  },
  {
    name: 'main: GET /main/catalog renders catalog landing',
    async run() {
      const { html } = await get(`${mainApp}/catalog`)
      mustContain(html.toLowerCase(), 'catalog', '/catalog page')
    },
  },
  {
    name: 'main: catalog surfaces the extraction experiment suite',
    async run() {
      const { html } = await get(`${mainApp}/catalog/experiments`)
      mustContain(
        html.toLowerCase(),
        'pdf-field-extraction',
        'experiments index',
      )
    },
  },
  {
    name: 'main: hybrid-v1 experiment page is reachable',
    async run() {
      const { html } = await get(
        `${mainApp}/catalog/experiments/pdf-field-extraction/sonnet-hybrid-v1`,
      )
      mustContain(html, 'hybrid', 'hybrid-v1 experiment page')
    },
  },
  {
    name: 'main: GET /main/catalog/walkthrough renders',
    async run() {
      const { html } = await get(`${mainApp}/catalog/walkthrough`)
      mustContain(html.toLowerCase(), 'walkthrough', 'walkthrough page')
    },
  },
  {
    name: 'main: anonymous owner profile shows empty-state without 404',
    async run() {
      // Post-#95: we render an empty profile instead of 404 for unknown
      // usernames so shareable URLs don't break across deployments.
      const { html } = await get(`${mainApp}/danielnaab`)
      mustContain(html, 'danielnaab', 'owner profile identity')
      mustNotContain(html, 'User not found', 'owner profile 404 message')
    },
  },
  {
    name: 'main: auth guard redirects /new to signin',
    async run() {
      const res = await fetch(`${mainApp}/new`, {
        ...fetchInit,
        redirect: 'manual',
      })
      if (res.status < 300 || res.status >= 400) {
        throw new Error(`/main/new → ${res.status} (expected 3xx)`)
      }
      const location = res.headers.get('Location') ?? ''
      if (!location.includes('/auth/signin')) {
        throw new Error(
          `/main/new redirect → ${location} (expected /auth/signin)`,
        )
      }
    },
  },
  {
    name: 'main: auth guard redirects /settings/variants to signin',
    async run() {
      const res = await fetch(`${mainApp}/settings/variants?task=extraction`, {
        ...fetchInit,
        redirect: 'manual',
      })
      if (res.status < 300 || res.status >= 400) {
        throw new Error(
          `/main/settings/variants → ${res.status} (expected 3xx)`,
        )
      }
      const location = res.headers.get('Location') ?? ''
      if (!location.includes('/auth/signin')) {
        throw new Error(
          `/main/settings/variants redirect → ${location} (expected /auth/signin)`,
        )
      }
    },
  },
]

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const allChecks = [...dashboardChecks, ...mainAppChecks]

let passed = 0
let failed = 0
const failures: { name: string; message: string }[] = []

console.log(`Acceptance test against ${baseUrl}\n`)

for (const check of allChecks) {
  try {
    await check.run()
    console.log(`  PASS  ${check.name}`)
    passed++
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  FAIL  ${check.name}: ${message}`)
    failures.push({ name: check.name, message })
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)

console.log('\n--- Manual checklist (anonymous script cannot cover these) ---')
console.log(
  [
    '  [ ] Sign in via GitHub OAuth at /main/auth/signin',
    '  [ ] Create a new project from a PDF (Pardon, I-9, or W-9 fixture)',
    '  [ ] Provenance badge on the project page shows "Claude Sonnet 4 (hybrid prompt)"',
    '  [ ] Choice fields on the Pardon form render as radios (not null or single checkbox)',
    '  [ ] Shape a form via chat (e.g. "rename the first page")',
    '  [ ] Direct-edit UI lets you add a field without an explicit id',
    '  [ ] Review page shows pending changes, accept/reject works',
    '  [ ] Publish → form delivery route renders',
    '  [ ] Completed PDF download works',
    '  [ ] /main/settings/variants?task=extraction lets you switch variants',
    '  [ ] Empty profile CTA looks right: "New Project" button only appears with projects',
  ].join('\n'),
)

if (failed > 0) {
  console.error(
    `\n${failed} automated check(s) failed — see above for details.`,
  )
  process.exit(1)
}

console.log('\nAll automated checks passed.')
