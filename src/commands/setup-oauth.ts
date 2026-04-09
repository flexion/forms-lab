import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface OAuthAppResponse {
  client_id: string
  client_secret: string
}

export async function setupOAuth(): Promise<number> {
  console.log('Setting up GitHub OAuth App...\n')

  // Prompt for callback URL
  const defaultCallback = 'http://localhost:3000/auth/callback'
  console.log(`Callback URL (default: ${defaultCallback}):`)
  // For now, use default - Bun doesn't have built-in prompts
  const callbackUrl = defaultCallback

  console.log(`Using callback URL: ${callbackUrl}\n`)

  // Create OAuth app via GitHub API
  console.log('Creating OAuth App on GitHub...')

  const response = await fetch('https://api.github.com/user/apps', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      Authorization: `token ${process.env.GITHUB_TOKEN || ''}`,
    },
    body: JSON.stringify({
      name: 'Forms Lab (dev)',
      url: 'http://localhost:3000',
      callback_url: callbackUrl,
      description: 'Forms Lab development OAuth app',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to create OAuth app:', error)
    console.error(
      '\nMake sure you have GITHUB_TOKEN environment variable set with a token that has admin:oauth_app scope.',
    )
    console.error(
      'Or create the OAuth app manually at https://github.com/settings/developers',
    )
    return 1
  }

  const app = (await response.json()) as OAuthAppResponse

  console.log(`Created OAuth App with client ID: ${app.client_id}\n`)

  // Update .env file
  const envPath = resolve(process.cwd(), '.env')
  let envContent = ''
  try {
    envContent = await readFile(envPath, 'utf-8')
  } catch {
    // .env doesn't exist yet
  }

  const updates: string[] = []

  if (!envContent.includes('GITHUB_CLIENT_ID')) {
    updates.push(`GITHUB_CLIENT_ID=${app.client_id}`)
  }

  if (!envContent.includes('GITHUB_CLIENT_SECRET')) {
    updates.push(`GITHUB_CLIENT_SECRET=${app.client_secret}`)
  }

  if (!envContent.includes('SESSION_SECRET')) {
    const sessionSecret = randomBytes(32).toString('base64')
    updates.push(`SESSION_SECRET=${sessionSecret}`)
  }

  if (updates.length > 0) {
    const newContent = envContent
      ? `${envContent.trim()}\n${updates.join('\n')}\n`
      : `${updates.join('\n')}\n`
    await writeFile(envPath, newContent)
    console.log('Updated .env file with:')
    for (const line of updates) {
      console.log(`  ${line.split('=')[0]}`)
    }
  } else {
    console.log('.env file already contains all required variables')
  }

  console.log('\nOAuth setup complete!')
  console.log('You can now start the dev server with: bun run dev')

  return 0
}
