import { timingSafeEqual } from 'node:crypto'

export interface PushEvent {
  branch: string
  sha: string
  owner: string
  repo: string
}

export async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature?.startsWith('sha256=')) return false
  const expected = signature.slice('sha256='.length)
  const hmac = new Bun.CryptoHasher('sha256', secret)
  hmac.update(payload)
  const computed = hmac.digest('hex')
  // Constant-time comparison
  if (expected.length !== computed.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(computed))
}

export interface PushPayload {
  ref: string
  after: string
  deleted: boolean
  repository?: {
    full_name: string
  }
}

export interface DeleteEvent {
  branch: string
  owner: string
  repo: string
}

export function parsePushEvent(payload: PushPayload): PushEvent | null {
  if (payload.deleted) return null
  if (!payload.ref.startsWith('refs/heads/')) return null
  const branch = payload.ref.slice('refs/heads/'.length)
  const [owner, repo] = parseRepoFullName(payload.repository?.full_name)
  return { branch, sha: payload.after, owner, repo }
}

export function parseDeleteEvent(payload: PushPayload): DeleteEvent | null {
  if (!payload.deleted) return null
  if (!payload.ref.startsWith('refs/heads/')) return null
  const branch = payload.ref.slice('refs/heads/'.length)
  const [owner, repo] = parseRepoFullName(payload.repository?.full_name)
  return { branch, owner, repo }
}

function parseRepoFullName(fullName: string | undefined): [string, string] {
  if (fullName?.includes('/')) {
    const [owner, repo] = fullName.split('/')
    return [owner, repo]
  }
  return ['', '']
}
