import type { NotifyEvent } from '../services/notifications/types'

const STATUS_COLORS: Record<string, string> = {
  success: '#2eb886',
  failure: '#dc3545',
  info: '#6c757d',
}

export function formatSlackMessage(event: NotifyEvent): object {
  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*[${event.type}]* ${event.title}`,
      },
    },
  ]

  if (event.details) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: event.details,
        },
      ],
    })
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: event.timestamp ?? new Date().toISOString(),
      },
    ],
  })

  return {
    attachments: [
      {
        color: STATUS_COLORS[event.status] ?? STATUS_COLORS.info,
        fallback: event.title,
        blocks,
      },
    ],
  }
}

export async function postToSlack(
  webhookUrl: string,
  event: NotifyEvent,
): Promise<{ ok: boolean; error?: string }> {
  const payload = formatSlackMessage(event)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `Slack responded with ${response.status}: ${await response.text()}`,
      }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
