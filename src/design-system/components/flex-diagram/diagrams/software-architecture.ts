import { resolveUrl } from '../../../../shared/base-path'
import type { GraphDefinition } from '../types'

export const softwareArchitectureGraph: GraphDefinition = {
  title: 'Software Architecture',
  description:
    'Four layers with one-way dependencies (P2). shared is the leaf with no internal dependencies. services and design-system are peers at the middle layer. entrypoints is the composition root that wires everything together. Arrows point from each layer to what it depends on.',
  nodes: [
    {
      id: 'entrypoints',
      label: 'entrypoints',
      sublabel: 'composition root',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'services',
      label: 'services',
      sublabel: 'domain logic',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'design-system',
      label: 'design-system',
      sublabel: 'UI components',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'shared',
      label: 'shared',
      sublabel: 'pure utilities',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
  ],
  edges: [
    { source: 'entrypoints', target: 'services' },
    { source: 'entrypoints', target: 'design-system' },
    { source: 'services', target: 'shared' },
    { source: 'design-system', target: 'shared' },
  ],
  direction: 'TB',
  nodeWidth: 180,
  nodeHeight: 60,
  ranksep: 70,
  nodesep: 50,
}
