import { timingSafeEqual } from 'node:crypto'

export interface PushEvent {
  branch: string
  sha: string
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
}

export function parsePushEvent(payload: PushPayload): PushEvent | null {
  if (payload.deleted) return null
  if (!payload.ref.startsWith('refs/heads/')) return null
  const branch = payload.ref.slice('refs/heads/'.length)
  return { branch, sha: payload.after }
}
