import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { DiagramRenderer } from '../src/app/components/flex-diagram'
import type { GraphDefinition } from '../src/app/components/flex-diagram/types'

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
