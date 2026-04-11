import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { DiagramRenderer } from '../src/design-system/components/flex-diagram'
import { dataModelGraph } from '../src/design-system/components/flex-diagram/diagrams/data-model'
import { deploymentGraph } from '../src/design-system/components/flex-diagram/diagrams/deployment'
import { softwareArchitectureGraph } from '../src/design-system/components/flex-diagram/diagrams/software-architecture'
import { systemOverviewGraph } from '../src/design-system/components/flex-diagram/diagrams/system-overview'
import { threatModelGraph } from '../src/design-system/components/flex-diagram/diagrams/threat-model'
import type { GraphDefinition } from '../src/design-system/components/flex-diagram/types'

const simple: GraphDefinition = {
  title: 'Test Diagram',
  description: 'A simple test diagram',
  nodes: [
    { id: 'a', label: 'Node A' },
    { id: 'b', label: 'Node B' },
  ],
  edges: [{ source: 'a', target: 'b' }],
}

const linked: GraphDefinition = {
  title: 'Linked',
  description: 'Test links',
  nodes: [
    {
      id: 'a',
      label: 'Linked Node',
      href: '/catalog/architecture/system-overview',
    },
    { id: 'b', label: 'Plain Node' },
  ],
  edges: [{ source: 'a', target: 'b' }],
}

const dashed: GraphDefinition = {
  title: 'Dashed',
  description: 'Test dashed edges',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: [{ source: 'a', target: 'b', style: 'dashed' }],
}

const testApp = new Hono()
testApp.get('/simple', (c) => c.html(<DiagramRenderer graph={simple} />))
testApp.get('/linked', (c) => c.html(<DiagramRenderer graph={linked} />))
testApp.get('/dashed', (c) => c.html(<DiagramRenderer graph={dashed} />))

describe('DiagramRenderer', () => {
  it('renders an SVG with role="img"', async () => {
    const res = await testApp.request('/simple')
    const html = await res.text()
    expect(html).toContain('<svg')
    expect(html).toContain('role="img"')
  })

  it('includes accessible title and desc', async () => {
    const res = await testApp.request('/simple')
    const html = await res.text()
    expect(html).toContain('<title')
    expect(html).toContain('Test Diagram')
    expect(html).toContain('<desc')
    expect(html).toContain('A simple test diagram')
  })

  it('renders nodes as labeled rectangles', async () => {
    const res = await testApp.request('/simple')
    const html = await res.text()
    expect(html).toContain('Node A')
    expect(html).toContain('Node B')
    expect(html).toContain('<rect')
  })

  it('renders edges as paths', async () => {
    const res = await testApp.request('/simple')
    const html = await res.text()
    expect(html).toContain('<path')
  })

  it('wraps linked nodes in anchor elements', async () => {
    const res = await testApp.request('/linked')
    const html = await res.text()
    expect(html).toContain('href="/catalog/architecture/system-overview"')
  })

  it('renders dashed edges when style is dashed', async () => {
    const res = await testApp.request('/dashed')
    const html = await res.text()
    expect(html).toContain('stroke-dasharray')
  })
})

describe('systemOverviewGraph', () => {
  it('defines all system components', () => {
    const nodeIds = systemOverviewGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('browser')
    expect(nodeIds).toContain('caddy')
    expect(nodeIds).toContain('hono')
    expect(nodeIds).toContain('git-fs')
    expect(nodeIds).toContain('claude-api')
    expect(nodeIds).toContain('github')
  })

  it('has edges connecting the components', () => {
    expect(systemOverviewGraph.edges.length).toBeGreaterThan(0)
  })

  it('links nodes to relevant catalog pages', () => {
    const linkedNodes = systemOverviewGraph.nodes.filter((n) => n.href)
    expect(linkedNodes.length).toBeGreaterThan(0)
  })
})

describe('dataModelGraph', () => {
  it('defines the three-tier data model', () => {
    const nodeIds = dataModelGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('collection-spec')
    expect(nodeIds).toContain('form-spec')
    expect(nodeIds).toContain('submission')
  })

  it('shows the relationships between tiers', () => {
    expect(dataModelGraph.edges.length).toBeGreaterThanOrEqual(2)
  })
})

describe('deploymentGraph', () => {
  it('defines the deployment pipeline stages', () => {
    const nodeIds = deploymentGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('github-push')
    expect(nodeIds).toContain('webhook')
    expect(nodeIds).toContain('deploy-script')
    expect(nodeIds).toContain('caddy-route')
  })

  it('uses top-to-bottom layout for pipeline flow', () => {
    expect(deploymentGraph.direction).toBe('TB')
  })
})

describe('threatModelGraph', () => {
  it('defines system components', () => {
    const nodeIds = threatModelGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('browser')
    expect(nodeIds).toContain('caddy')
    expect(nodeIds).toContain('hono')
  })

  it('uses dashed edges for trust boundaries', () => {
    const dashedEdges = threatModelGraph.edges.filter(
      (e) => e.style === 'dashed',
    )
    expect(dashedEdges.length).toBeGreaterThan(0)
  })
})

describe('softwareArchitectureGraph', () => {
  it('defines the main codebase modules', () => {
    const nodeIds = softwareArchitectureGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('app')
    expect(nodeIds).toContain('webhook')
    expect(nodeIds).toContain('services')
    expect(nodeIds).toContain('lib')
    expect(nodeIds).toContain('types')
    expect(nodeIds).toContain('cli')
  })

  it('shows dependency edges', () => {
    expect(softwareArchitectureGraph.edges.length).toBeGreaterThan(0)
    const appEdges = softwareArchitectureGraph.edges.filter(
      (e) => e.source === 'app',
    )
    expect(appEdges.length).toBeGreaterThan(0)
  })

  it('uses top-to-bottom layout', () => {
    expect(softwareArchitectureGraph.direction).toBe('TB')
  })
})

import app from '../src/app/server'

describe('Architecture route with diagrams', () => {
  it('renders a diagram on the system-overview page', async () => {
    const res = await app.request('/catalog/architecture/system-overview')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="flex-diagram"')
    expect(body).toContain('role="img"')
    expect(body).toContain('System Overview')
  })

  it('renders a diagram on the data-model page', async () => {
    const res = await app.request('/catalog/architecture/data-model')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="flex-diagram"')
    expect(body).toContain('Data Model')
  })

  it('renders a diagram on the deployment page', async () => {
    const res = await app.request('/catalog/architecture/deployment')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="flex-diagram"')
    expect(body).toContain('Deployment Pipeline')
  })

  it('renders a diagram on the threat-model page', async () => {
    const res = await app.request('/catalog/architecture/threat-model')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="flex-diagram"')
    expect(body).toContain('Threat Model')
  })

  it('renders a diagram on the software-architecture page', async () => {
    const res = await app.request('/catalog/architecture/software-architecture')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="flex-diagram"')
    expect(body).toContain('Software Architecture')
  })
})
