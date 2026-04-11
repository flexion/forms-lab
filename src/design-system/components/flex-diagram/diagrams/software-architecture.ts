import { resolveUrl } from '../../../../shared/base-path'
import type { GraphDefinition } from '../types'

export const softwareArchitectureGraph: GraphDefinition = {
  title: 'Software Architecture',
  description:
    'Codebase organization showing the main modules and their dependencies. The app, webhook, and CLI are top-level entry points that depend on shared services, libraries, and types. The app reads catalog content at runtime. Libraries are pure utilities with no internal dependencies.',
  nodes: [
    {
      id: 'app',
      label: 'App',
      href: resolveUrl('/catalog/decisions/architecture/hono-on-bun'),
    },
    { id: 'webhook', label: 'Webhook' },
    { id: 'cli', label: 'CLI' },
    { id: 'services', label: 'Services' },
    { id: 'lib', label: 'Libraries' },
    {
      id: 'types',
      label: 'Types',
      href: resolveUrl('/catalog/architecture/data-model'),
    },
    { id: 'catalog', label: 'Catalog Content' },
    { id: 'infrastructure', label: 'Infrastructure' },
  ],
  edges: [
    { source: 'app', target: 'services' },
    { source: 'app', target: 'catalog', label: 'reads' },
    { source: 'webhook', target: 'services' },
    { source: 'cli', target: 'services' },
    { source: 'services', target: 'types' },
    { source: 'app', target: 'lib' },
    { source: 'lib', target: 'types' },
  ],
  direction: 'TB',
  nodeWidth: 140,
  nodeHeight: 36,
  ranksep: 40,
  nodesep: 40,
}
