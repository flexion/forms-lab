import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createFormRouter } from '../../src/app/routes/forms/index'
import { InMemoryFormSessionGateway } from '../../src/services/form-session'
import { InMemorySubmissionGateway } from '../../src/services/submission'
import { testDataSpec, testFormSpec } from './fixtures'

const specRegistry = new Map([
  [testDataSpec.id, { dataSpec: testDataSpec, formSpec: testFormSpec }],
])

function createTestApp() {
  const sessionGateway = new InMemoryFormSessionGateway()
  const submissionGateway = new InMemorySubmissionGateway()
  const app = new Hono()
  app.route(
    '/forms',
    createFormRouter({
      sessionGateway,
      submissionGateway,
      getSpecs: (specId) => specRegistry.get(specId) ?? null,
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
})
