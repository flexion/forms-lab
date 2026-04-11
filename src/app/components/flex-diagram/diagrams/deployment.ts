import { resolveUrl } from '../../../../lib/base-path'
import type { GraphDefinition } from '../types'

export const deploymentGraph: GraphDefinition = {
  title: 'Deployment Pipeline',
  description:
    'Deployment flow: a git push to GitHub triggers a webhook to the EC2 server, which runs the deploy script. The script creates a git worktree, builds the app, starts a systemd service, and updates Caddy routing so the branch is served at its subpath URL.',
  nodes: [
    { id: 'github-push', label: 'Git Push' },
    { id: 'webhook', label: 'Webhook Listener', href: resolveUrl('/catalog/decisions/infrastructure/github-webhook-deploys') },
    { id: 'deploy-script', label: 'Deploy Script' },
    { id: 'worktree', label: 'Git Worktree' },
    { id: 'build', label: 'Build' },
    { id: 'systemd', label: 'Systemd Service', href: resolveUrl('/catalog/decisions/infrastructure/nix-built-processes') },
    { id: 'caddy-route', label: 'Caddy Route', href: resolveUrl('/catalog/decisions/infrastructure/caddy-reverse-proxy') },
  ],
  edges: [
    { source: 'github-push', target: 'webhook', label: 'Push event' },
    { source: 'webhook', target: 'deploy-script', label: 'HMAC verified' },
    { source: 'deploy-script', target: 'worktree' },
    { source: 'worktree', target: 'build', label: 'bun install && build' },
    { source: 'build', target: 'systemd' },
    { source: 'systemd', target: 'caddy-route', label: 'Port assigned' },
  ],
  direction: 'LR',
}
