import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createFormRouter } from '../../src/entrypoints/app/routes/forms/index'
import { ScriptedFillingAgent } from '../../src/services/forms/filling-agent/scripted'
import type {
  ConversationGateway,
  ConversationMessage,
} from '../../src/services/forms/filling-agent/types'
import { InMemoryFormSessionGateway } from '../../src/services/forms/session'
import { InMemorySubmissionGateway } from '../../src/services/forms/submission'
import { testDataSpec, testFormSpec } from './fixtures'

/**
 * In-memory conversation gateway for testing
 */
class InMemoryConversationGateway implements ConversationGateway {
  private messages: Map<string, ConversationMessage[]> = new Map()

  appendMessage(sessionId: string, message: ConversationMessage): void {
    const existing = this.messages.get(sessionId) ?? []
    this.messages.set(sessionId, [...existing, message])
  }

  getMessages(sessionId: string): ConversationMessage[] {
    return this.messages.get(sessionId) ?? []
  }

  clear(sessionId: string): void {
    this.messages.delete(sessionId)
  }
}

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
  const conversationGateway = new InMemoryConversationGateway()
  const fillingAgent = new ScriptedFillingAgent()

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
      conversationGateway,
      fillingAgent,
      getSpecs: async (specId) => specRegistry.get(specId) ?? null,
      listSpecs: async () => [...specRegistry.values()],
    }),
  )
  return { app, sessionGateway, conversationGateway }
}

describe('Conversational form filling integration', () => {
  it('full flow: create session, fill static page, fill conversational page, review, submit', async () => {
    const { app, sessionGateway, conversationGateway } = createTestApp()

    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    expect(location).toBeTruthy()
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // Page 0: Static page (Personal Information)
    const page0Get = await app.request(`${baseUrl}/pages/0`)
    expect(page0Get.status).toBe(200)
    const page0Html = await page0Get.text()
    expect(page0Html).toContain('Personal Information')
    // Verify not conversational
    expect(page0Html).not.toContain('chat-panel')

    // Fill page 0
    const page0Post = await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-1234',
      }),
    })
    expect(page0Post.status).toBe(302)
    // Should redirect to page 1 (which is conversational, but redirects to page route)
    expect(page0Post.headers.get('Location')).toBe(`${baseUrl}/pages/1`)

    // Page 1: Navigate to page route first to see toggle
    const page1Get = await app.request(`${baseUrl}/pages/1`)
    expect(page1Get.status).toBe(200)
    const page1Html = await page1Get.text()
    expect(page1Html).toContain('Employment')
    // Should show toggle to switch to chat view
    expect(page1Html).toContain('Switch to Chat View')

    // Now navigate to chat view
    const page1ChatGet = await app.request(`${baseUrl}/pages/1/chat`)
    expect(page1ChatGet.status).toBe(200)
    const page1ChatHtml = await page1ChatGet.text()
    expect(page1ChatHtml).toContain('Employment')
    expect(page1ChatHtml).toContain('chat-panel')

    // Verify conversation is empty
    let messages = conversationGateway.getMessages(sessionId!)
    expect(messages).toHaveLength(0)

    // Send first message - agent will collect it as answer to first field ('employed')
    // and then ask for the next field ('employmentType')
    const chat1 = await app.request(`${baseUrl}/pages/1/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-Live-Chat': 'true',
      },
      body: new URLSearchParams({ message: 'Yes' }),
    })
    expect(chat1.status).toBe(200)
    const chat1Json = await chat1.json()
    expect(chat1Json.response).toContain('Employment Type')
    expect(chat1Json.finished).toBe(false)

    // Verify conversation has 2 messages (user 'Yes' + assistant asking for employment type)
    messages = conversationGateway.getMessages(sessionId!)
    expect(messages.length).toBeGreaterThanOrEqual(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Yes')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toContain('Employment Type')

    // Verify 'employed' field was collected
    let session = sessionGateway.getSession(sessionId!)
    expect(session?.fields.employed?.value).toBe('Yes')

    // Answer employment type question
    const chat2 = await app.request(`${baseUrl}/pages/1/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-Live-Chat': 'true',
      },
      body: new URLSearchParams({ message: 'Full-time' }),
    })
    expect(chat2.status).toBe(200)
    const chat2Json = await chat2.json()
    expect(chat2Json.response).toContain('Monthly Income')
    expect(chat2Json.finished).toBe(false)

    // Verify 'employmentType' field was collected
    session = sessionGateway.getSession(sessionId!)
    expect(session?.fields.employmentType?.value).toBe('Full-time')

    // Answer monthly income (completes conversational page)
    const chat3 = await app.request(`${baseUrl}/pages/1/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-Live-Chat': 'true',
      },
      body: new URLSearchParams({ message: '5000' }),
    })
    expect(chat3.status).toBe(200)
    const chat3Json = await chat3.json()
    expect(chat3Json.finished).toBe(true)
    expect(chat3Json.response).toContain('complete')

    // Verify 'monthlyIncome' field was collected
    session = sessionGateway.getSession(sessionId!)
    expect(session?.fields.monthlyIncome?.value).toBe(5000)

    // Verify all messages were persisted (3 user messages + 3 assistant responses)
    messages = conversationGateway.getMessages(sessionId!)
    expect(messages.length).toBeGreaterThanOrEqual(6)

    // Navigate to next page (should be page 2, static)
    const page2Get = await app.request(`${baseUrl}/pages/2`)
    expect(page2Get.status).toBe(200)
    const page2Html = await page2Get.text()
    expect(page2Html).toContain('Additional Details')
    expect(page2Html).not.toContain('chat-panel')

    // Fill page 2
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
    // Verify all collected fields appear in review
    expect(reviewHtml).toContain('Alice Johnson')
    expect(reviewHtml).toContain('alice@example.com')
    expect(reviewHtml).toContain('Full-time')
    expect(reviewHtml).toContain('5000')
    expect(reviewHtml).toContain('2026-05-01')

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
  })

  it('conversational page shows toggle to switch between form and chat', async () => {
    const { app } = createTestApp()

    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // Fill page 0 to get to page 1 (conversational)
    await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Bob Smith',
        email: 'bob@example.com',
      }),
    })

    // GET page 1 shows form with toggle to chat
    const page1Get = await app.request(`${baseUrl}/pages/1`)
    expect(page1Get.status).toBe(200)
    const page1Html = await page1Get.text()
    expect(page1Html).toContain('Switch to Chat View')
    expect(page1Html).toContain(`${baseUrl}/pages/1/chat`)
  })

  it('conversational page shows both form and chat views', async () => {
    const { app } = createTestApp()

    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // Fill page 0
    await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Charlie Davis',
        email: 'charlie@example.com',
      }),
    })

    // GET form view for page 1 - shows form with toggle to chat
    const formGet = await app.request(`${baseUrl}/pages/1`)
    expect(formGet.status).toBe(200)
    const formHtml = await formGet.text()
    expect(formHtml).toContain('Switch to Chat View')
    expect(formHtml).not.toContain('chat-panel')

    // GET chat view for page 1 - shows chat interface
    const chatGet = await app.request(`${baseUrl}/pages/1/chat`)
    expect(chatGet.status).toBe(200)
    const chatHtml = await chatGet.text()
    expect(chatHtml).toContain('chat-panel')
    // For pure conversational mode, there's no toggle back to form
    // (that would require hybrid mode)
  })

  it('handles skipped conditional fields in conversational mode', async () => {
    const { app, sessionGateway } = createTestApp()

    // Create session
    const createRes = await app.request('/forms/benefits-app/sessions', {
      method: 'POST',
    })
    const location = createRes.headers.get('Location')
    const sessionId = location?.split('/sessions/')[1].split('/pages/')[0]
    const baseUrl = `/forms/benefits-app/sessions/${sessionId}`

    // Fill page 0
    await app.request(`${baseUrl}/pages/0`, {
      method: 'POST',
      body: new URLSearchParams({
        fullName: 'Diana Evans',
        email: 'diana@example.com',
      }),
    })

    // Answer 'No' to employment (should skip employmentType and monthlyIncome)
    const chat = await app.request(`${baseUrl}/pages/1/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-Live-Chat': 'true',
      },
      body: new URLSearchParams({ message: 'No' }),
    })
    const chatJson = await chat.json()

    // Should finish immediately since no conditional fields apply
    expect(chatJson.finished).toBe(true)
    expect(chatJson.response).toContain('complete')

    // Verify only 'employed' was collected
    const session = sessionGateway.getSession(sessionId!)
    expect(session?.fields.employed?.value).toBe('No')
    expect(session?.fields.employmentType).toBeUndefined()
    expect(session?.fields.monthlyIncome).toBeUndefined()
  })
})
