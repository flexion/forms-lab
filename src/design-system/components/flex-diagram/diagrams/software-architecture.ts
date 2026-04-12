import { resolveUrl } from '../../../../shared/base-path'
import type { GraphDefinition } from '../types'

export const softwareArchitectureGraph: GraphDefinition = {
  title: 'Software Architecture',
  description:
    'Four layers with one-way dependencies. shared has no internal dependencies. services and design-system are peers, both depending only on shared. entrypoints is the composition root — it wires services, design-system, and shared together. This structure is a consequence of four architecture principles (P1-P4) documented in the software architecture doc: intent over mechanism, dependency flows one way, services own their types, and presentation is stateless.',
  nodes: [
    {
      id: 'entrypoints',
      label: 'entrypoints',
      description: 'Runnable processes: app, dashboard, webhook, notify, cli',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'services',
      label: 'services',
      description:
        'Core domain services, each owning its types (P3): auth, content, data-collection, deployment, forms, ingestion, notifications, storage',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'design-system',
      label: 'design-system',
      description:
        'UI components. Stateless — receives ready-to-render data (P4).',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'shared',
      label: 'shared',
      description: 'Pure utilities. Zero internal dependencies.',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
  ],
  edges: [
    { source: 'entrypoints', target: 'services', label: 'depends on' },
    { source: 'entrypoints', target: 'design-system', label: 'depends on' },
    { source: 'entrypoints', target: 'shared', label: 'depends on' },
    { source: 'services', target: 'shared', label: 'depends on' },
    { source: 'design-system', target: 'shared', label: 'depends on' },
  ],
  direction: 'TB',
  nodeWidth: 160,
  nodeHeight: 44,
  ranksep: 60,
  nodesep: 40,
}
