import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createFormRouter } from '../../src/entrypoints/app/routes/forms/index'
import { InMemoryFormSessionGateway } from '../../src/services/forms/session'
import { InMemorySubmissionGateway } from '../../src/services/forms/submission'
import { testDataSpec, testFormSpec } from './fixtures'

const TEST_SHA = 'abc1234567890def1234567890abc1234567890'

const TEST_USER = {
  login: 'testuser',
  name: 'Test User',
  avatarUrl: '',
}

function createProjectScopedApp() {
  const sessionGateway = new InMemoryFormSessionGateway()
  const submissionGateway = new InMemorySubmissionGateway()
  const specs = {
    dataSpec: testDataSpec,
    formSpec: testFormSpec,
    sha: TEST_SHA,
  }
  const app = new Hono()
  // Simulate authenticated user for all requests
  app.use('*', async (c, next) => {
    c.set('user', TEST_USER)
    await next()
  })
  app.route(
    '/:owner/:slug/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: async () => specs,
      listSpecs: async () => [specs],
      resolveOwnerSlug: (c) => ({
        owner: c.req.param('owner') ?? '',
        slug: c.req.param('slug') ?? '',
      }),
      getSpecsByProject: async (_owner, _slug, _ref) => specs,
    }),
  )
  return { app, sessionGateway, submissionGateway }
}

describe('Project-scoped form routes', () => {
  it('GET /:owner/:slug/forms returns landing page', async () => {
    const { app } = createProjectScopedApp()
    const res = await app.request('/acme/my-form/forms')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Benefits Application Form')
    expect(html).toContain('Start now')
  })

  it('POST /:owner/:slug/forms/sessions creates session and redirects', async () => {
    const { app } = createProjectScopedApp()
    const res = await app.request('/acme/my-form/forms/sessions', {
      method: 'POST',
    })
    expect(res.status).toBe(302)
    const location = res.headers.get('Location')
    expect(location).toMatch(
      /\/acme\/my-form\/forms\/sessions\/[\w-]+\/pages\/0/,
    )
  })

  it('GET /:owner/:slug/forms/sessions/:sid/pages/0 renders a form page', async () => {
    const { app } = createProjectScopedApp()

    // Create session first
    const createRes = await app.request('/acme/my-form/forms/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location') ?? ''
    const sessionId = location.split('/sessions/')[1].split('/pages/')[0]

    const res = await app.request(
      `/acme/my-form/forms/sessions/${sessionId}/pages/0`,
    )
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Personal Information')
  })

  it('GET /:owner/:slug/forms/sessions/:sid/review renders review page', async () => {
    const { app } = createProjectScopedApp()

    // Create session and fill pages
    const createRes = await app.request('/acme/my-form/forms/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location') ?? ''
    const sessionId = location.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/acme/my-form/forms/sessions/${sessionId}`

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

    const res = await app.request(`${baseUrl}/review`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Alice Johnson')
    expect(html).toContain('alice@example.com')
  })

  it('branch-qualified project-scoped routes work', async () => {
    const { app } = createProjectScopedApp()
    const res = await app.request('/acme/my-form/forms/branches/feature-x')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('flex-preview-banner')
    expect(html).toContain('feature-x')
    expect(html).toContain('Benefits Application Form')
    // Start link should use project-scoped branch-qualified URL
    expect(html).toContain('/acme/my-form/forms/branches/feature-x/sessions')
  })

  it('full flow: create, fill, review, submit, confirm', async () => {
    const { app } = createProjectScopedApp()

    // Create session
    const createRes = await app.request('/acme/my-form/forms/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location') ?? ''
    const sessionId = location.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/acme/my-form/forms/sessions/${sessionId}`

    // Fill pages
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

    // Submit
    const submitRes = await app.request(`${baseUrl}/submit`, {
      method: 'POST',
    })
    expect(submitRes.status).toBe(302)
    const confirmLocation = submitRes.headers.get('Location') ?? ''
    expect(confirmLocation).toContain('confirmation')
    expect(confirmLocation).toContain('submissionId=')

    // Confirmation
    const confirmRes = await app.request(confirmLocation)
    expect(confirmRes.status).toBe(200)
    const confirmHtml = await confirmRes.text()
    expect(confirmHtml).toContain('Your form has been submitted')
  })
})
