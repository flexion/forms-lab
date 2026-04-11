import { resolveUrl } from '../../../../lib/base-path'
import type { GraphDefinition } from '../types'

export const systemOverviewGraph: GraphDefinition = {
  title: 'System Overview',
  description:
    'Forms Lab system architecture showing the browser, Caddy reverse proxy, Hono application, git filesystem, Claude API, and GitHub. Requests flow from the browser through Caddy to the Hono app, which reads and writes to the git filesystem and calls the Claude API for PDF extraction. GitHub delivers webhooks for deployment.',
  nodes: [
    { id: 'browser', label: 'Browser' },
    { id: 'caddy', label: 'Caddy', href: resolveUrl('/catalog/decisions/infrastructure/caddy-reverse-proxy') },
    { id: 'hono', label: 'Hono App', href: resolveUrl('/catalog/decisions/architecture/hono-on-bun') },
    { id: 'git-fs', label: 'Git Filesystem', href: resolveUrl('/catalog/decisions/architecture/git-as-persistence') },
    { id: 'claude-api', label: 'Claude API' },
    { id: 'github', label: 'GitHub', href: resolveUrl('/catalog/architecture/deployment') },
  ],
  edges: [
    { source: 'browser', target: 'caddy', label: 'HTTPS' },
    { source: 'caddy', target: 'hono', label: 'HTTP proxy' },
    { source: 'hono', target: 'git-fs', label: 'Read/write' },
    { source: 'hono', target: 'claude-api', label: 'PDF extraction' },
    { source: 'github', target: 'caddy', label: 'Webhook' },
  ],
  direction: 'TB',
}
