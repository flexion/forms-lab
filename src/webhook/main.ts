import { Hono } from 'hono'
import { triggerDeploy } from './deploy'
import { parsePushEvent, verifySignature } from './handler'

const app = new Hono()

const secret = process.env.GITHUB_WEBHOOK_SECRET
if (!secret) {
  console.error('GITHUB_WEBHOOK_SECRET environment variable is required')
  process.exit(1)
}

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'webhook' })
})

app.post('/', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-hub-signature-256') || ''

  const valid = await verifySignature(body, signature, secret)
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const event = c.req.header('x-github-event')
  if (event !== 'push') {
    return c.json({ ignored: true, reason: `Event type: ${event}` }, 200)
  }

  const payload = JSON.parse(body)
  const push = parsePushEvent(payload)
  if (!push) {
    return c.json({ ignored: true, reason: 'Deleted branch or tag push' }, 200)
  }

  // Trigger deploy asynchronously
  triggerDeploy(push.branch, push.sha).catch((err) => {
    console.error('Deploy trigger failed:', err)
  })

  return c.json({ accepted: true, branch: push.branch, sha: push.sha }, 202)
})

const port = process.env.PORT || 9000
console.log(`Webhook listener running on port ${port}`)

export default {
  port: Number(port),
  fetch: app.fetch,
}
