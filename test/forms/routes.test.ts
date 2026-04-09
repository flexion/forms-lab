import { describe, expect, it } from 'bun:test'
import app from '../../src/server'

describe('Form routes', () => {
  it('GET /forms/benefits-app returns landing page', async () => {
    const res = await app.request('/forms/benefits-app')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Benefits Application Form')
    expect(html).toContain('Start Form')
  })

  it('GET /forms/nonexistent returns 404', async () => {
    const res = await app.request('/forms/nonexistent')
    expect(res.status).toBe(404)
  })

  it('POST /forms/benefits-app/sessions creates session and redirects', async () => {
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
    expect(confirmHtml).toContain('Submission Received')
  })

  it('validation errors re-render the page', async () => {
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

  it('returns 404 for invalid session ID', async () => {
    const res = await app.request('/forms/benefits-app/sessions/bad-id/pages/0')
    expect(res.status).toBe(404)
  })
})
