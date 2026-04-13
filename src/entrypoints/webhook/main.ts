import { Hono } from 'hono'
import { createGitHubClient } from '../../services/deployment/github'
import { deployMainBranch, triggerDeployWithStatus } from './deploy'
import type { PushPayload } from './handler'
import { parseDeleteEvent, parsePushEvent, verifySignature } from './handler'

const app = new Hono()

const secret = process.env.GITHUB_WEBHOOK_SECRET
if (!secret) {
  console.error('GITHUB_WEBHOOK_SECRET environment variable is required')
  process.exit(1)
}

const githubToken = process.env.GITHUB_TOKEN
const githubClient = githubToken ? createGitHubClient(githubToken) : undefined
const hostname = process.env.DEPLOY_HOSTNAME

if (!githubToken) {
  console.warn(
    'GITHUB_TOKEN not set — deployment status updates will be skipped',
  )
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

  let payload: PushPayload
  try {
    payload = JSON.parse(body) as PushPayload
  } catch (err) {
    console.error('Invalid JSON in webhook payload:', err)
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // Handle branch deletion
  const deletion = parseDeleteEvent(payload)
  if (deletion) {
    if (githubClient && deletion.owner && deletion.repo) {
      markDeploymentInactive(
        deletion.owner,
        deletion.repo,
        deletion.branch,
      ).catch((err) => {
        console.error('Failed to mark deployment inactive:', err)
      })
    }
    return c.json(
      { accepted: true, branch: deletion.branch, action: 'delete' },
      202,
    )
  }

  const push = parsePushEvent(payload)
  if (!push) {
    return c.json({ ignored: true, reason: 'Tag push' }, 200)
  }

  // Handle main branch deployment (includes NixOS config updates)
  if (push.branch === 'main') {
    deployMainBranch(push.sha).catch((err) => {
      console.error('Main deployment failed:', err)
    })
    return c.json(
      { accepted: true, branch: 'main', sha: push.sha, type: 'production' },
      202,
    )
  }

  // Trigger branch deploy asynchronously with status updates
  triggerDeployWithStatus({
    branch: push.branch,
    sha: push.sha,
    owner: push.owner,
    repo: push.repo,
    githubClient,
    hostname,
  }).catch((err) => {
    console.error('Deploy trigger failed:', err)
  })

  return c.json({ accepted: true, branch: push.branch, sha: push.sha }, 202)
})

async function markDeploymentInactive(
  owner: string,
  repo: string,
  branch: string,
): Promise<void> {
  if (!githubClient) return
  const safeBranch = branch.replace(/\//g, '-')

  // List deployments for this environment and mark the latest inactive
  const url = `https://api.github.com/repos/${owner}/${repo}/deployments?environment=${encodeURIComponent(safeBranch)}&per_page=1`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
    },
  })

  if (!res.ok) return

  const deployments = (await res.json()) as Array<{ id: number }>
  if (deployments.length === 0) return

  await githubClient.createDeploymentStatus(
    owner,
    repo,
    deployments[0].id,
    'inactive',
    undefined,
    `Branch ${branch} deleted`,
  )
  console.log(`Marked deployment for ${branch} as inactive`)
}

const port = process.env.PORT || 9000
console.log(`Webhook listener running on port ${port}`)

export default {
  port: Number(port),
  fetch: app.fetch,
}
