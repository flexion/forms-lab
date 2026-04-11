import { Hono } from 'hono'
import { postToSlack } from './slack'
import { validateEvent } from './types'

const app = new Hono()

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
if (!slackWebhookUrl) {
  console.error('SLACK_WEBHOOK_URL environment variable is required')
  process.exit(1)
}

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'notify' })
})

app.post('/event', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const result = validateEvent(body)
  if (!result.valid) {
    return c.json({ error: result.error }, 400)
  }

  const slackResult = await postToSlack(slackWebhookUrl, result.event)
  if (!slackResult.ok) {
    console.error('Slack post failed:', slackResult.error)
    return c.json({ error: 'Failed to post to Slack' }, 502)
  }

  return c.json({ ok: true })
})

const port = process.env.PORT || 9001
console.log(`Notify service running on port ${port}`)

export default {
  port: Number(port),
  fetch: app.fetch,
}
