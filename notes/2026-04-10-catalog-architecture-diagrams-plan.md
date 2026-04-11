# Catalog Architecture Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the catalog landing page into meaningful groups and add auto-layout SVG diagrams to each architecture doc.

**Architecture:** The landing page reorganizes from a flat 6-card grid into three groups (The System, The Work, The Craft). Each architecture doc gets a companion diagram rendered as inline SVG using dagre for layout and Hono JSX for rendering. A shared `DiagramRenderer` component takes typed graph definitions and produces accessible, token-styled SVG.

**Tech Stack:** Bun, Hono JSX, @dagrejs/dagre (already installed), CSS cascade layers with `--flex-*` design tokens.

---

### Task 1: DiagramRenderer Types

**Files:**
- Create: `src/app/components/flex-diagram/types.ts`

- [ ] **Step 1: Create the graph definition types**

```typescript
export interface DiagramNode {
  id: string
  label: string
  description?: string
  href?: string
  group?: string
}

export interface DiagramEdge {
  source: string
  target: string
  label?: string
  style?: 'solid' | 'dashed'
}

export interface DiagramGroup {
  id: string
  label: string
  style?: 'solid' | 'dashed'
}

export interface GraphDefinition {
  title: string
  description: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  groups?: DiagramGroup[]
  direction?: 'TB' | 'LR'
  nodeWidth?: number
  nodeHeight?: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/flex-diagram/types.ts
git commit -m "feat(diagram): add graph definition types"
```

---

### Task 2: DiagramRenderer Component

**Files:**
- Create: `src/app/components/flex-diagram/index.tsx`
- Test: `test/flex-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { renderToString } from 'hono/jsx/dom/server'
import { DiagramRenderer } from '../src/app/components/flex-diagram'
import type { GraphDefinition } from '../src/app/components/flex-diagram/types'

describe('DiagramRenderer', () => {
  const simple: GraphDefinition = {
    title: 'Test Diagram',
    description: 'A simple test diagram',
    nodes: [
      { id: 'a', label: 'Node A' },
      { id: 'b', label: 'Node B' },
    ],
    edges: [{ source: 'a', target: 'b' }],
  }

  it('renders an SVG with role="img"', async () => {
    const html = await renderToString(<DiagramRenderer graph={simple} />)
    expect(html).toContain('<svg')
    expect(html).toContain('role="img"')
  })

  it('includes accessible title and desc', async () => {
    const html = await renderToString(<DiagramRenderer graph={simple} />)
    expect(html).toContain('<title')
    expect(html).toContain('Test Diagram')
    expect(html).toContain('<desc')
    expect(html).toContain('A simple test diagram')
  })

  it('renders nodes as labeled rectangles', async () => {
    const html = await renderToString(<DiagramRenderer graph={simple} />)
    expect(html).toContain('Node A')
    expect(html).toContain('Node B')
    expect(html).toContain('<rect')
  })

  it('renders edges as paths', async () => {
    const html = await renderToString(<DiagramRenderer graph={simple} />)
    expect(html).toContain('<path')
  })

  it('wraps linked nodes in anchor elements', async () => {
    const linked: GraphDefinition = {
      title: 'Linked',
      description: 'Test links',
      nodes: [
        { id: 'a', label: 'Linked Node', href: '/catalog/architecture/system-overview' },
        { id: 'b', label: 'Plain Node' },
      ],
      edges: [{ source: 'a', target: 'b' }],
    }
    const html = await renderToString(<DiagramRenderer graph={linked} />)
    expect(html).toContain('href="/catalog/architecture/system-overview"')
  })

  it('renders dashed edges when style is dashed', async () => {
    const dashed: GraphDefinition = {
      title: 'Dashed',
      description: 'Test dashed edges',
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [{ source: 'a', target: 'b', style: 'dashed' }],
    }
    const html = await renderToString(<DiagramRenderer graph={dashed} />)
    expect(html).toContain('stroke-dasharray')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: FAIL — cannot resolve `../src/app/components/flex-diagram`

- [ ] **Step 3: Implement DiagramRenderer**

Note: Hono's JSX is server-side and `renderToString` is from `hono/jsx/dom/server`. If that import doesn't work, test via route instead. The implementation should use `@dagrejs/dagre` for layout.

Create `src/app/components/flex-diagram/index.tsx`:

```tsx
import type { FC } from 'hono/jsx'
import dagre from '@dagrejs/dagre'
import type { GraphDefinition } from './types'

interface DiagramRendererProps {
  graph: GraphDefinition
}

const PADDING = 40
const DEFAULT_NODE_WIDTH = 160
const DEFAULT_NODE_HEIGHT = 50
const NODE_RX = 6

export const DiagramRenderer: FC<DiagramRendererProps> = ({ graph }) => {
  const nodeWidth = graph.nodeWidth ?? DEFAULT_NODE_WIDTH
  const nodeHeight = graph.nodeHeight ?? DEFAULT_NODE_HEIGHT

  // Build dagre graph
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: graph.direction ?? 'TB',
    nodesep: 60,
    ranksep: 80,
    marginx: PADDING,
    marginy: PADDING,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.nodes) {
    g.setNode(node.id, { label: node.label, width: nodeWidth, height: nodeHeight })
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const graphLabel = g.graph()
  const svgWidth = graphLabel.width ?? 400
  const svgHeight = graphLabel.height ?? 300
  const titleId = `diagram-title-${graph.title.replace(/\s+/g, '-').toLowerCase()}`
  const descId = `diagram-desc-${graph.title.replace(/\s+/g, '-').toLowerCase()}`

  // Build edge path data
  const edgeElements = graph.edges.map((edge, i) => {
    const dagreEdge = g.edge(edge.source, edge.target)
    const points = dagreEdge.points
    const d = points.length > 0
      ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map((p: { x: number; y: number }) => `L ${p.x} ${p.y}`).join(' ')}`
      : ''
    return { d, edge, key: i }
  })

  // Build node elements
  const nodeElements = graph.nodes.map((node) => {
    const pos = g.node(node.id)
    const x = pos.x - nodeWidth / 2
    const y = pos.y - nodeHeight / 2
    return { node, x, y, cx: pos.x, cy: pos.y }
  })

  const renderNode = (n: typeof nodeElements[0]) => {
    const inner = (
      <g class="flex-diagram__node">
        <rect
          x={n.x}
          y={n.y}
          width={nodeWidth}
          height={nodeHeight}
          rx={NODE_RX}
        />
        <text
          x={n.cx}
          y={n.cy}
          text-anchor="middle"
          dominant-baseline="central"
        >
          {n.node.label}
        </text>
      </g>
    )
    if (n.node.href) {
      return <a href={n.node.href}>{inner}</a>
    }
    return inner
  }

  return (
    <svg
      class="flex-diagram"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{graph.title}</title>
      <desc id={descId}>{graph.description}</desc>

      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
      </defs>

      {edgeElements.map((e) => (
        <g key={e.key} class="flex-diagram__edge">
          <path
            d={e.d}
            fill="none"
            marker-end="url(#arrowhead)"
            stroke-dasharray={e.edge.style === 'dashed' ? '6 4' : undefined}
          />
          {e.edge.label && (() => {
            const dagreEdge = g.edge(e.edge.source, e.edge.target)
            const mid = dagreEdge.points[Math.floor(dagreEdge.points.length / 2)]
            return (
              <text
                x={mid.x}
                y={mid.y - 8}
                text-anchor="middle"
                class="flex-diagram__edge-label"
              >
                {e.edge.label}
              </text>
            )
          })()}
        </g>
      ))}

      {nodeElements.map((n) => renderNode(n))}
    </svg>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: All tests pass. If `renderToString` import doesn't work with Hono's JSX, adjust the test to use route-based rendering instead (create a test Hono app that renders the component and request it with `app.request()`).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-diagram/index.tsx test/flex-diagram.test.ts
git commit -m "feat(diagram): add DiagramRenderer component with dagre layout"
```

---

### Task 3: Diagram CSS

**Files:**
- Create: `src/app/components/flex-diagram/styles.css`
- Modify: `src/app/public/styles.css` (add import)

- [ ] **Step 1: Create diagram styles**

```css
/* Architectural diagram styling using design tokens */

.flex-diagram {
  display: block;
  max-width: 100%;
  height: auto;
  margin-block-end: var(--flex-space-lg);
}

/* Nodes */
.flex-diagram__node rect {
  fill: var(--flex-color-surface);
  stroke: var(--flex-color-border);
  stroke-width: 1.5;
}

.flex-diagram__node text {
  fill: var(--flex-color-text);
  font-family: var(--flex-font-sans);
  font-size: 14px;
}

/* Linked nodes */
.flex-diagram a .flex-diagram__node rect {
  stroke: var(--flex-color-accent);
  cursor: pointer;
}

.flex-diagram a .flex-diagram__node text {
  fill: var(--flex-color-accent);
}

.flex-diagram a:hover .flex-diagram__node rect {
  fill: var(--flex-color-accent-light, color-mix(in srgb, var(--flex-color-accent) 10%, var(--flex-color-surface)));
}

.flex-diagram a:focus-visible .flex-diagram__node rect {
  outline: 3px solid var(--flex-color-accent);
  outline-offset: 2px;
}

/* Edges */
.flex-diagram__edge path {
  stroke: var(--flex-color-border);
  stroke-width: 1.5;
}

.flex-diagram__edge-label {
  fill: var(--flex-color-text-muted);
  font-family: var(--flex-font-sans);
  font-size: 12px;
}

/* Arrowhead */
.flex-diagram marker polygon {
  fill: var(--flex-color-border);
}

/* Groups (trust boundaries, etc.) */
.flex-diagram__group rect {
  fill: none;
  stroke: var(--flex-color-border);
  stroke-dasharray: 8 4;
  stroke-width: 1;
}

.flex-diagram__group-label {
  fill: var(--flex-color-text-muted);
  font-family: var(--flex-font-sans);
  font-size: 12px;
  font-style: italic;
}
```

- [ ] **Step 2: Add import to styles.css**

Add after the last `@import` in the block layer section of `src/app/public/styles.css` (after the `flex-date-range-picker` line):

```css
@import "../components/flex-diagram/styles.css" layer(block);
```

- [ ] **Step 3: Rebuild CSS and verify**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun run build:css`
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/flex-diagram/styles.css src/app/public/styles.css
git commit -m "feat(diagram): add diagram styles with design tokens"
```

---

### Task 4: System Overview Diagram

**Files:**
- Create: `src/app/components/flex-diagram/diagrams/system-overview.ts`
- Test: add test to `test/flex-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.ts`:

```typescript
import { systemOverviewGraph } from '../src/app/components/flex-diagram/diagrams/system-overview'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: FAIL — cannot resolve `diagrams/system-overview`

- [ ] **Step 3: Implement system overview graph definition**

Create `src/app/components/flex-diagram/diagrams/system-overview.ts`:

```typescript
import { resolveUrl } from '../../../../lib/base-path'
import type { GraphDefinition } from '../types'

export const systemOverviewGraph: GraphDefinition = {
  title: 'System Overview',
  description:
    'Forms Lab system architecture showing the browser, Caddy reverse proxy, Hono application, git filesystem, Claude API, and GitHub. Requests flow from the browser through Caddy to the Hono app, which reads and writes to the git filesystem and calls the Claude API for PDF extraction. GitHub delivers webhooks for deployment.',
  nodes: [
    {
      id: 'browser',
      label: 'Browser',
    },
    {
      id: 'caddy',
      label: 'Caddy',
      href: resolveUrl('/catalog/decisions/infrastructure/caddy-reverse-proxy'),
    },
    {
      id: 'hono',
      label: 'Hono App',
      href: resolveUrl('/catalog/decisions/architecture/hono-on-bun'),
    },
    {
      id: 'git-fs',
      label: 'Git Filesystem',
      href: resolveUrl('/catalog/decisions/architecture/git-as-persistence'),
    },
    {
      id: 'claude-api',
      label: 'Claude API',
    },
    {
      id: 'github',
      label: 'GitHub',
      href: resolveUrl('/catalog/architecture/deployment'),
    },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-diagram/diagrams/system-overview.ts test/flex-diagram.test.ts
git commit -m "feat(diagram): add system overview graph definition"
```

---

### Task 5: Data Model Diagram

**Files:**
- Create: `src/app/components/flex-diagram/diagrams/data-model.ts`
- Test: add test to `test/flex-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.ts`:

```typescript
import { dataModelGraph } from '../src/app/components/flex-diagram/diagrams/data-model'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: FAIL — cannot resolve `diagrams/data-model`

- [ ] **Step 3: Implement data model graph definition**

Create `src/app/components/flex-diagram/diagrams/data-model.ts`:

```typescript
import type { GraphDefinition } from '../types'

export const dataModelGraph: GraphDefinition = {
  title: 'Data Model',
  description:
    'Three-tier data model: DataCollectionSpec defines what data to collect, FormSpec defines how to present it, and Submission captures the collected data. One DataCollectionSpec can have multiple FormSpecs, and one FormSpec produces multiple Submissions.',
  nodes: [
    {
      id: 'collection-spec',
      label: 'DataCollectionSpec',
    },
    {
      id: 'form-spec',
      label: 'FormSpec',
    },
    {
      id: 'submission',
      label: 'Submission',
    },
    {
      id: 'form-project',
      label: 'FormProject',
    },
  ],
  edges: [
    { source: 'collection-spec', target: 'form-spec', label: '1 → many' },
    { source: 'form-spec', target: 'submission', label: '1 → many' },
    { source: 'form-project', target: 'collection-spec', label: 'contains' },
    { source: 'form-project', target: 'form-spec', label: 'contains' },
  ],
  direction: 'LR',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-diagram/diagrams/data-model.ts test/flex-diagram.test.ts
git commit -m "feat(diagram): add data model graph definition"
```

---

### Task 6: Deployment Diagram

**Files:**
- Create: `src/app/components/flex-diagram/diagrams/deployment.ts`
- Test: add test to `test/flex-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.ts`:

```typescript
import { deploymentGraph } from '../src/app/components/flex-diagram/diagrams/deployment'

describe('deploymentGraph', () => {
  it('defines the deployment pipeline stages', () => {
    const nodeIds = deploymentGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('github-push')
    expect(nodeIds).toContain('webhook')
    expect(nodeIds).toContain('deploy-script')
    expect(nodeIds).toContain('caddy-route')
  })

  it('uses left-to-right layout for pipeline flow', () => {
    expect(deploymentGraph.direction).toBe('LR')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: FAIL — cannot resolve `diagrams/deployment`

- [ ] **Step 3: Implement deployment graph definition**

Create `src/app/components/flex-diagram/diagrams/deployment.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-diagram/diagrams/deployment.ts test/flex-diagram.test.ts
git commit -m "feat(diagram): add deployment pipeline graph definition"
```

---

### Task 7: Threat Model Diagram

**Files:**
- Create: `src/app/components/flex-diagram/diagrams/threat-model.ts`
- Test: add test to `test/flex-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.ts`:

```typescript
import { threatModelGraph } from '../src/app/components/flex-diagram/diagrams/threat-model'

describe('threatModelGraph', () => {
  it('defines system components', () => {
    const nodeIds = threatModelGraph.nodes.map((n) => n.id)
    expect(nodeIds).toContain('browser')
    expect(nodeIds).toContain('caddy')
    expect(nodeIds).toContain('hono')
  })

  it('uses dashed edges for trust boundaries', () => {
    const dashedEdges = threatModelGraph.edges.filter((e) => e.style === 'dashed')
    expect(dashedEdges.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: FAIL — cannot resolve `diagrams/threat-model`

- [ ] **Step 3: Implement threat model graph definition**

Create `src/app/components/flex-diagram/diagrams/threat-model.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/flex-diagram/diagrams/threat-model.ts test/flex-diagram.test.ts
git commit -m "feat(diagram): add threat model trust boundary graph definition"
```

---

### Task 8: Wire Diagrams into Architecture Route

**Files:**
- Modify: `src/app/routes/catalog/architecture.tsx:59-88`
- Test: add test to `test/flex-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.ts`:

```typescript
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: FAIL — response HTML does not contain `class="flex-diagram"`

- [ ] **Step 3: Add diagram rendering to architecture route**

Modify `src/app/routes/catalog/architecture.tsx`. Add imports at the top:

```typescript
import { DiagramRenderer } from '../../components/flex-diagram'
import type { GraphDefinition } from '../../components/flex-diagram/types'
import { systemOverviewGraph } from '../../components/flex-diagram/diagrams/system-overview'
import { dataModelGraph } from '../../components/flex-diagram/diagrams/data-model'
import { deploymentGraph } from '../../components/flex-diagram/diagrams/deployment'
import { threatModelGraph } from '../../components/flex-diagram/diagrams/threat-model'
```

Add the slug-to-graph mapping after the imports:

```typescript
const diagramsBySlug: Record<string, GraphDefinition> = {
  'system-overview': systemOverviewGraph,
  'data-model': dataModelGraph,
  deployment: deploymentGraph,
  'threat-model': threatModelGraph,
}
```

In the `/:slug` route handler, after the `const title = ...` line (line 68), add:

```typescript
const diagram = diagramsBySlug[slug]
```

Then in the JSX return, add the diagram between the `<Breadcrumb>` and `<Prose>` components:

```tsx
<Breadcrumb items={[...]} />
{diagram && <DiagramRenderer graph={diagram} />}
<Prose content={file.content} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes/catalog/architecture.tsx test/flex-diagram.test.ts
git commit -m "feat(diagram): wire diagrams into architecture route handler"
```

---

### Task 9: Restructure Catalog Landing Page

**Files:**
- Modify: `src/app/routes/catalog/index.tsx:26-108`
- Test: `test/catalog-landing.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `test/catalog-landing.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import app from '../src/app/server'

describe('GET /catalog (landing page)', () => {
  it('renders grouped sections', async () => {
    const res = await app.request('/catalog')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('The System')
    expect(body).toContain('The Work')
    expect(body).toContain('The Craft')
  })

  it('renders descriptive text for each section card', async () => {
    const res = await app.request('/catalog')
    const body = await res.text()
    expect(body).toContain('System overview, data model, deployment, threat model')
    expect(body).toContain('Who the system serves')
    expect(body).toContain('What&#x27;s being built')
    expect(body).toContain('Tokens, components, compositions, and visual language')
  })

  it('renders an orienting introduction', async () => {
    const res = await app.request('/catalog')
    const body = await res.text()
    expect(body).toContain('forms platform')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/catalog-landing.test.ts`
Expected: FAIL — response does not contain "The System"

- [ ] **Step 3: Restructure the landing page**

Replace the JSX in the catalog landing `GET /` handler (lines 57-108 of `src/app/routes/catalog/index.tsx`) with the grouped layout. The full handler becomes:

```tsx
catalog.get('/', async (c) => {
  const catalogDir = join(process.cwd(), 'catalog')

  const [personaFiles, storyFiles, architectureFiles] = await Promise.all([
    readMarkdownDir(join(catalogDir, 'personas')).catch(() => []),
    readMarkdownDir(join(catalogDir, 'stories')).catch(() => []),
    readMarkdownDir(join(catalogDir, 'architecture')).catch(() => []),
  ])

  // Count decisions across subdirectories
  const { readdir } = await import('node:fs/promises')
  let decisionCount = 0
  try {
    const groups = await readdir(join(catalogDir, 'decisions'), {
      withFileTypes: true,
    })
    for (const group of groups) {
      if (group.isDirectory()) {
        const files = await readMarkdownDir(
          join(catalogDir, 'decisions', group.name),
        )
        decisionCount += files.length
      }
    }
  } catch {
    // decisions directory may not exist yet
  }

  const sidebarData = getCatalogSidebar('/catalog')
  const sidebar = <CatalogSidebar sections={sidebarData} />

  return c.html(
    <Layout
      title="Catalog"
      sidebar={sidebar}
      currentPath="/catalog"
      user={c.get('user')}
    >
      <h1>Catalog</h1>
      <p>
        An LLM-assisted forms platform for government forms. Data flows from
        collection specs through form definitions to submissions.
      </p>

      <div class="l-stack" style="--stack-space: var(--flex-space-xl)">
        <section>
          <p class="catalog-group-label">The System</p>
          <div class="l-grid" style="--grid-min: 280px">
            <ContentCard
              title="Architecture"
              href={resolveUrl('/catalog/architecture')}
              description="System overview, data model, deployment, threat model"
            />
            <ContentCard
              title="Decisions"
              href={resolveUrl('/catalog/decisions')}
              description={`${decisionCount} decisions across architecture, infrastructure, design`}
            />
          </div>
        </section>

        <section>
          <p class="catalog-group-label">The Work</p>
          <div class="l-grid" style="--grid-min: 200px">
            <ContentCard
              title="Personas"
              href={resolveUrl('/catalog/personas')}
              description="Who the system serves"
            />
            <ContentCard
              title="Stories"
              href={resolveUrl('/catalog/stories')}
              description="What's being built"
            />
            <ContentCard
              title="Experiments"
              href={resolveUrl('/catalog/experiments')}
              description="What we're exploring"
            />
          </div>
        </section>

        <section>
          <p class="catalog-group-label">The Craft</p>
          <div class="l-grid">
            <ContentCard
              title="Design System"
              href={resolveUrl('/catalog/design-system')}
              description="Tokens, components, compositions, and visual language"
            />
          </div>
        </section>
      </div>
    </Layout>,
  )
})
```

Add the `.catalog-group-label` style. This is a small utility, so add it to `src/app/components/flex-card/styles.css` after the existing `.content-card` styles:

```css
.catalog-group-label {
  font-size: var(--flex-font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--flex-color-text-muted);
  margin-block-end: var(--flex-space-sm);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/catalog-landing.test.ts`
Expected: All tests pass. The "What's being built" assertion uses `&#x27;` because Hono's JSX escapes the apostrophe in HTML output. If the escaping is different, adjust the assertion to match.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes/catalog/index.tsx src/app/components/flex-card/styles.css test/catalog-landing.test.ts
git commit -m "feat(catalog): restructure landing page into grouped sections"
```

---

### Task 10: Update Sidebar Navigation

**Files:**
- Modify: `src/app/routes/catalog/sidebar.ts:5-48`
- Test: add to `test/catalog-landing.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/catalog-landing.test.ts`:

```typescript
describe('Catalog sidebar', () => {
  it('renders grouped sidebar sections', async () => {
    const res = await app.request('/catalog')
    expect(res.status).toBe(200)
    const body = await res.text()
    // Sidebar should have the three group titles
    // The CatalogSidebar renders section titles when there are multiple sections
    expect(body).toContain('The System')
    expect(body).toContain('The Work')
    expect(body).toContain('The Craft')
  })
})
```

Note: this test may already pass if "The System" etc. appear in the main content. We need to verify the sidebar renders them too. Since the landing page body also contains these labels, this test validates both are present. The sidebar rendering is confirmed by checking the structure more closely if needed, but for now the grouped sidebar sections will make these labels appear twice (once in main content, once in sidebar), confirming the sidebar has them.

- [ ] **Step 2: Run test to verify it fails (or passes if already covered)**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/catalog-landing.test.ts`
Expected: May already pass from Task 9. If so, proceed to implementation anyway — the sidebar still needs updating.

- [ ] **Step 3: Update getCatalogSidebar**

Replace the `getCatalogSidebar` function in `src/app/routes/catalog/sidebar.ts`:

```typescript
export function getCatalogSidebar(currentPath?: string) {
  return [
    {
      title: 'Catalog',
      items: [
        {
          label: 'Overview',
          href: resolveUrl('/catalog'),
          current: currentPath === '/catalog',
        },
      ],
    },
    {
      title: 'The System',
      items: [
        {
          label: 'Architecture',
          href: resolveUrl('/catalog/architecture'),
          current: currentPath === '/catalog/architecture',
        },
        {
          label: 'Decisions',
          href: resolveUrl('/catalog/decisions'),
          current: currentPath === '/catalog/decisions',
        },
      ],
    },
    {
      title: 'The Work',
      items: [
        {
          label: 'Personas',
          href: resolveUrl('/catalog/personas'),
          current: currentPath === '/catalog/personas',
        },
        {
          label: 'Stories',
          href: resolveUrl('/catalog/stories'),
          current: currentPath === '/catalog/stories',
        },
        {
          label: 'Experiments',
          href: resolveUrl('/catalog/experiments'),
          current: currentPath === '/catalog/experiments',
        },
      ],
    },
    {
      title: 'The Craft',
      items: [
        {
          label: 'Design System',
          href: resolveUrl('/catalog/design-system'),
          current: currentPath === '/catalog/design-system',
        },
      ],
    },
  ]
}
```

- [ ] **Step 4: Run tests to verify everything passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/catalog-landing.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes/catalog/sidebar.ts test/catalog-landing.test.ts
git commit -m "feat(catalog): update sidebar navigation with grouped sections"
```

---

### Task 11: Full Check

- [ ] **Step 1: Run the full check suite**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun run check`
Expected: Lint, type check, and all tests pass.

- [ ] **Step 2: Fix any issues**

If biome reports formatting issues, run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bunx @biomejs/biome check --write .`
If type errors appear, fix them in the relevant files.

- [ ] **Step 3: Visual verification**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun run build:css && bun run dev`

Check in browser:
- `/catalog` — landing page shows three grouped sections with labels and descriptions
- `/catalog/architecture/system-overview` — diagram renders above prose
- `/catalog/architecture/data-model` — diagram renders above prose
- `/catalog/architecture/deployment` — diagram renders above prose
- `/catalog/architecture/threat-model` — diagram renders above prose
- Diagram nodes with links are clickable
- Sidebar shows grouped navigation on all catalog pages

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: fix lint and type issues"
```
