export type NotifyStatus = 'success' | 'failure' | 'info'

export interface NotifyEvent {
  type: string
  title: string
  status: NotifyStatus
  details?: string
  timestamp?: string
  url?: string
}

const VALID_STATUSES: Set<string> = new Set(['success', 'failure', 'info'])

export function validateEvent(
  body: unknown,
): { valid: true; event: NotifyEvent } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, error: 'body must be a non-null object' }
  }

  const obj = body as Record<string, unknown>

  if (typeof obj.type !== 'string' || obj.type.length === 0) {
    return { valid: false, error: 'type must be a non-empty string' }
  }

  if (typeof obj.title !== 'string' || obj.title.length === 0) {
    return { valid: false, error: 'title must be a non-empty string' }
  }

  if (typeof obj.status !== 'string' || !VALID_STATUSES.has(obj.status)) {
    return {
      valid: false,
      error: 'status must be one of: success, failure, info',
    }
  }

  const event: NotifyEvent = {
    type: obj.type,
    title: obj.title,
    status: obj.status as NotifyStatus,
    timestamp:
      typeof obj.timestamp === 'string'
        ? obj.timestamp
        : new Date().toISOString(),
  }

  if (typeof obj.details === 'string') {
    event.details = obj.details
  }

  if (typeof obj.url === 'string') {
    event.url = obj.url
  }

  return { valid: true, event }
}
