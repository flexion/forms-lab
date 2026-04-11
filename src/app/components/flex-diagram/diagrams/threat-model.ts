import type { GraphDefinition } from '../types'

export const threatModelGraph: GraphDefinition = {
  title: 'Threat Model: Trust Boundaries',
  description:
    'Trust boundary diagram showing the 7 boundaries where data crosses between components with different trust levels: browser to Caddy, Caddy to Hono app, Hono to git filesystem, Hono to Claude API, GitHub to webhook, webhook to deploy pipeline, and browser to Hono for authentication.',
  nodes: [
    { id: 'browser', label: 'Browser' },
    { id: 'caddy', label: 'Caddy' },
    { id: 'hono', label: 'Hono App' },
    { id: 'git-fs', label: 'Git Filesystem' },
    { id: 'claude-api', label: 'Claude API' },
    { id: 'github', label: 'GitHub' },
    { id: 'webhook', label: 'Webhook Listener' },
    { id: 'deploy', label: 'Deploy Pipeline' },
  ],
  edges: [
    { source: 'browser', target: 'caddy', label: 'TLS', style: 'dashed' },
    { source: 'caddy', target: 'hono', label: 'Proxy', style: 'dashed' },
    { source: 'hono', target: 'git-fs', label: 'File I/O', style: 'dashed' },
    { source: 'hono', target: 'claude-api', label: 'API', style: 'dashed' },
    { source: 'github', target: 'webhook', label: 'Push event', style: 'dashed' },
    { source: 'webhook', target: 'deploy', label: 'Branch + SHA', style: 'dashed' },
    { source: 'browser', target: 'hono', label: 'OAuth', style: 'dashed' },
  ],
  direction: 'TB',
}
