import type { NotifyEvent } from './types'

const NOTIFY_PORT = process.env.NOTIFY_PORT || '9001'
const NOTIFY_URL = `http://localhost:${NOTIFY_PORT}/event`

export async function notifyEvent(event: NotifyEvent): Promise<void> {
  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch {
    // Fire-and-forget: log but don't throw
    console.error(`Failed to send notification: ${event.type}`)
  }
}
