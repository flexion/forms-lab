import { resolveUrl } from '../../../../lib/base-path'
import type { GraphDefinition } from '../types'

export const softwareArchitectureGraph: GraphDefinition = {
  title: 'Software Architecture',
  description:
    'Codebase organization showing the main modules and their dependencies. The app (routes, components, middleware) depends on services, libraries, and types. The webhook is a separate process that shares services and types with the app. The CLI uses services and libraries for operational commands. Libraries are pure utilities with no internal dependencies.',
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
    { source: 'app', target: 'lib' },
    { source: 'app', target: 'types' },
    { source: 'app', target: 'catalog', label: 'reads' },
    { source: 'webhook', target: 'services' },
    { source: 'webhook', target: 'lib' },
    { source: 'webhook', target: 'types' },
    { source: 'cli', target: 'services' },
    { source: 'cli', target: 'lib' },
    { source: 'cli', target: 'types' },
    { source: 'services', target: 'types' },
  ],
  direction: 'TB',
}
