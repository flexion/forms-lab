import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createFormRouter } from '../../src/entrypoints/app/routes/forms/index'
import { InMemoryFormSessionGateway } from '../../src/services/forms/session'
import { InMemorySubmissionGateway } from '../../src/services/forms/submission'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_SHA = 'abc1234567890def1234567890abc1234567890'

const specRegistry = new Map([
  [
    testDataSpec.id,
    { dataSpec: testDataSpec, formSpec: testFormSpec, sha: TEST_SHA },
  ],
])

const TEST_USER = {
  login: 'testuser',
  name: 'Test User',
  avatarUrl: '',
}

function createTestApp() {
  const sessionGateway = new InMemoryFormSessionGateway()
  const submissionGateway = new InMemorySubmissionGateway()
  const app = new Hono()
  // Simulate authenticated user for all requests
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER)
    await next()
  })
  app.route(
    '/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: async (specId) => specRegistry.get(specId) ?? null,
      listSpecs: async () => [...specRegistry.values()],
    }),
  )
  return app
}

function createUnauthTestApp() {
  const sessionGateway = new InMemoryFormSessionGateway()
  const submissionGateway = new InMemorySubmissionGateway()
  const app = new Hono()
  // No user set — unauthenticated
  app.use('*', async (c, next) => {
    c.set('user', null)
    await next()
  })
  app.route(
    '/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: async (specId) => specRegistry.get(specId) ?? null,
      listSpecs: async () => [...specRegistry.values()],
    }),
  )
  return app
}

describe('Form routes', () => {
  it('GET /forms/benefits-app returns landing page', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/benefits-app')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Benefits Application Form')
    expect(html).toContain('Start now')
    expect(html).toContain('class="flex-form"')
    expect(html).toContain('3 sections')
  })

  it('GET /forms/nonexistent returns 404', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/nonexistent')
    expect(res.status).toBe(404)
  })

  it('POST /forms/benefits-app/sessions creates session and redirects', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toMatch(
      /\/forms\/benefits-app\/sessions\/[\w-]+\/pages\/0/,
    )
  })

  it('full flow: create session, fill pages, review, submit', async () => {
    const app = createTestApp()

    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    expect(location).toBeTruthy()
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // GET page 0
    const page0Get = await app.request(`${baseUrl}/pages/0`)
    expect(page0Get.status).toBe(200)
    const page0Html = await page0Get.text()
    expect(page0Html).toContain('Personal Information')

    // POST page 0 with valid data
    const page0Post = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-1234',
      }),
    })
    expect(page0Post.status).toBe(302)
    expect(page0Post.headers.get('Location')).toBe(`${baseUrl}/pages/1`)

    // POST page 1 with employment data
    const page1Post = await app.request(`${baseUrl}/pages/1`, {
      method: 'POST',
      body: new URLSearchParams({
        employed: 'Yes',
        employmentType: 'Full-time',
        monthlyIncome: '5000',
      }),
    })
    expect(page1Post.status).toBe(302)
    expect(page1Post.headers.get('Location')).toBe(`${baseUrl}/pages/2`)

    // POST page 2 with additional info
    const page2Post = await app.request(`${baseUrl}/pages/2`, {
      method: 'POST',
      body: new URLSearchParams({
        startDate: '2026-05-01',
        dependents: '2',
        agreeTerms: 'on',
      }),
    })
    expect(page2Post.status).toBe(302)
    expect(page2Post.headers.get('Location')).toBe(`${baseUrl}/review`)

    // GET review page
    const reviewGet = await app.request(`${baseUrl}/review`)
    expect(reviewGet.status).toBe(200)
    const reviewHtml = await reviewGet.text()
    expect(reviewHtml).toContain('Alice Johnson')
    expect(reviewHtml).toContain('alice@example.com')
    expect(reviewHtml).toContain('Full-time')

    // POST submit
    const submitRes = await app.request(`${baseUrl}/submit`, {
      method: 'POST',
    })
    expect(submitRes.status).toBe(302)
    const confirmLocation = submitRes.headers.get('Location')
    expect(confirmLocation).toBeTruthy()
    expect(confirmLocation).toContain('confirmation')
    expect(confirmLocation).toContain('submissionId=')

    // GET confirmation
    if (!confirmLocation) throw new Error('Missing confirmation location')
    const confirmRes = await app.request(confirmLocation)
    expect(confirmRes.status).toBe(200)
    const confirmHtml = await confirmRes.text()
    expect(confirmHtml).toContain('Your form has been submitted')
    expect(confirmHtml).toContain('flex-alert')
  })

  it('validation errors re-render the page', async () => {
    const app = createTestApp()
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    expect(location).toBeTruthy()
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // POST page 0 with missing required fields
    const res = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({}),
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('is required')
  })

  it('validation errors show error summary with links', async () => {
    const app = createTestApp()
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    const res = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({}),
    })
    const html = await res.text()
    expect(html).toContain('There is a problem')
    expect(html).toContain('href="#fullName"')
    expect(html).toContain('href="#email"')
  })

  it('validation errors prefix page title with Error:', async () => {
    const app = createTestApp()
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    const res = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({}),
    })
    const html = await res.text()
    expect(html).toContain(
      '<title>Error: Personal Information | Forms Lab</title>',
    )
  })

  it('renders step text on form pages', async () => {
    const app = createTestApp()
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    const res = await app.request(`${baseUrl}/pages/0`)
    const html = await res.text()
    expect(html).toContain('Page 1 of 3')
  })

  it('returns 404 for invalid session ID', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/benefits-app/sessions/bad-id/pages/0')
    expect(res.status).toBe(404)
  })

  it('rejects double submission', async () => {
    const app = createTestApp()

    // Create session and fill all pages
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
      }),
    })
    await app.request(`${baseUrl}/pages/1`, {
      method: 'POST',
      body: new URLSearchParams({
        employed: 'Yes',
        employmentType: 'Full-time',
        monthlyIncome: '5000',
      }),
    })
    await app.request(`${baseUrl}/pages/2`, {
      method: 'POST',
      body: new URLSearchParams({
        startDate: '2026-05-01',
        dependents: '2',
        agreeTerms: 'on',
      }),
    })

    // First submit succeeds
    const submitRes1 = await app.request(`${baseUrl}/submit`, {
      method: 'POST',
    })
    expect(submitRes1.status).toBe(302)

    // Second submit returns 409
    const submitRes2 = await app.request(`${baseUrl}/submit`, {
      method: 'POST',
    })
    expect(submitRes2.status).toBe(409)
  })

  it('unauthenticated users are redirected from session routes', async () => {
    const app = createUnauthTestApp()
    const res = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toContain('/auth/signin')
  })

  it('landing page requires auth', async () => {
    const app = createUnauthTestApp()
    const res = await app.request('/forms/benefits-app')
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toContain('/auth/signin')
  })

  it('GET /forms shows available forms', async () => {
    const app = createTestApp()
    const res = await app.request('/forms')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Available Forms')
    expect(html).toContain('Benefits Application Form')
  })

  it('forms index requires auth', async () => {
    const app = createUnauthTestApp()
    const res = await app.request('/forms')
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toContain('/auth/signin')
  })

  it('GET /forms/sessions shows user sessions', async () => {
    const app = createTestApp()
    // Create a session first
    await app.request('/forms/benefits-app/sessions', { method: 'POST' })
    const res = await app.request('/forms/sessions')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('My Sessions')
    expect(html).toContain('In Progress')
    expect(html).toContain('Benefits Application Form')
  })

  it('sessions page shows empty state when no sessions', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/sessions')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('You have no form sessions')
  })

  it('sessions page requires auth', async () => {
    const app = createUnauthTestApp()
    const res = await app.request('/forms/sessions')
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toContain('/auth/signin')
  })

  it('sessions page only shows own sessions', async () => {
    const app = createTestApp()
    // testuser creates a session
    await app.request('/forms/benefits-app/sessions', { method: 'POST' })

    // Create a separate app with a different user
    const sessionGateway = new InMemoryFormSessionGateway()
    const submissionGateway = new InMemorySubmissionGateway()
    const otherApp = new Hono()
    otherApp.use('*', async (c, next) => {
      c.set('user', { login: 'otheruser', name: 'Other', avatarUrl: '' })
      await next()
    })
    otherApp.route(
      '/forms',
      createFormRouter({
        sessionGateway,
        submissionGateway,
        getSpecs: async (specId) => specRegistry.get(specId) ?? null,
        listSpecs: async () => [...specRegistry.values()],
      }),
    )
    // otheruser creates a session in the same gateway
    await otherApp.request('/forms/benefits-app/sessions', { method: 'POST' })

    // otheruser should only see their own session
    const res = await otherApp.request('/forms/sessions')
    const html = await res.text()
    expect(html).toContain('In Progress')
    // Verify it shows exactly one session (their own)
    const matches = html.match(/Benefits Application Form/g)
    expect(matches).toHaveLength(1)
  })

  it('GET /forms/:specId/branches/:branch shows preview banner', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/benefits-app/branches/feature-x')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('flex-preview-banner')
    expect(html).toContain('feature-x')
    expect(html).toContain('Benefits Application Form')
    // Start link should be branch-qualified
    expect(html).toContain('/forms/benefits-app/branches/feature-x/sessions')
  })

  it('GET /forms/:specId (main) does not show the preview banner', async () => {
    const app = createTestApp()
    const res = await app.request('/forms/benefits-app')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).not.toContain('flex-preview-banner')
  })

  it('branch-qualified session flow pins submission specVersion to SHA', async () => {
    const sessionGateway = new InMemoryFormSessionGateway()
    const submissionGateway = new InMemorySubmissionGateway()
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', TEST_USER)
      await next()
    })
    app.route(
      '/forms',
      createFormRouter({
        sessionGateway,
        submissionGateway,
        getSpecs: async (specId) => specRegistry.get(specId) ?? null,
        listSpecs: async () => [...specRegistry.values()],
      }),
    )

    const createRes = await app.request(
      '/forms/benefits-app/branches/feature-x/sessions',
      { method: 'POST' },
    )
    expect(createRes.status).toBe(302)
    const location = createRes.headers.get('Location') ?? ''
    expect(location).toContain('/branches/feature-x/')
    const sessionId = location.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/branches/feature-x/sessions/${sessionId}`

    // Fill all pages
    await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
      }),
    })
    await app.request(`${baseUrl}/pages/1`, {
      method: 'POST',
      body: new URLSearchParams({
        employed: 'Yes',
        employmentType: 'Full-time',
        monthlyIncome: '5000',
      }),
    })
    await app.request(`${baseUrl}/pages/2`, {
      method: 'POST',
      body: new URLSearchParams({
        startDate: '2026-05-01',
        dependents: '2',
        agreeTerms: 'on',
      }),
    })

    // The page render on the branch URL should include the preview banner
    const pageGet = await app.request(`${baseUrl}/pages/0`)
    const pageHtml = await pageGet.text()
    expect(pageHtml).toContain('flex-preview-banner')
    expect(pageHtml).toContain('feature-x')

    // Submit and verify the submission is pinned to the test SHA
    const submitRes = await app.request(`${baseUrl}/submit`, { method: 'POST' })
    expect(submitRes.status).toBe(302)
    const confirmLocation = submitRes.headers.get('Location') ?? ''
    const submissionId = new URL(
      confirmLocation,
      'http://localhost',
    ).searchParams.get('submissionId')
    expect(submissionId).toBeTruthy()
    const submission = submissionGateway.getSubmission(submissionId ?? '')
    expect(submission).not.toBeNull()
    expect(submission?.specVersion).toBe(TEST_SHA)
  })

  it('user cannot access another user session', async () => {
    // Set up shared gateways
    const sessionGateway = new InMemoryFormSessionGateway()
    const submissionGateway = new InMemorySubmissionGateway()
    const routerDeps = {
      sessionGateway,
      submissionGateway,
      getSpecs: async (specId: string) => specRegistry.get(specId) ?? null,
      listSpecs: async () => [...specRegistry.values()],
    } as const

    // User A creates a session
    const appA = new Hono()
    appA.use('*', async (c, next) => {
      c.set('user', { login: 'userA', name: 'User A', avatarUrl: '' })
      await next()
    })
    appA.route('/forms', createFormRouter(routerDeps))
    const createRes = await appA.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]

    // User B tries to access User A's session
    const appB = new Hono()
    appB.use('*', async (c, next) => {
      c.set('user', { login: 'userB', name: 'User B', avatarUrl: '' })
      await next()
    })
    appB.route('/forms', createFormRouter(routerDeps))
    const res = await appB.request(
      `/forms/benefits-app/sessions/${sessionId}/pages/0`,
    )
    expect(res.status).toBe(404)
  })
})
