export interface SessionUser {
  login: string
  name: string
  avatarUrl: string
}

export async function encryptSession(
  user: SessionUser,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(user))

  // Derive key from secret
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('forms-lab-session'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  )

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Base64 encode
  return btoa(String.fromCharCode(...combined))
}

export async function decryptSession(
  encrypted: string,
  secret: string,
): Promise<SessionUser | null> {
  try {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    // Base64 decode
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    // Derive key from secret
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('forms-lab-session'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    )

    const json = decoder.decode(decrypted)
    return JSON.parse(json) as SessionUser
  } catch {
    return null
  }
}

export const COOKIE_NAME = 'forms_lab_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
