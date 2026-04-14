# Diagram Readability and Software Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix diagram readability for wide/flat LR layouts, add responsive SVG scaling, and create a new software architecture doc + diagram describing the codebase organization.

**Architecture:** Switch LR diagrams to TB. Remove explicit width/height from SVG output so viewBox + CSS handles responsive scaling. Write a new markdown architecture doc with a companion dagre graph definition, wired into the existing architecture route.

**Tech Stack:** Bun, Hono JSX, @dagrejs/dagre, CSS design tokens.

---

### Task 1: Fix DiagramRenderer SVG sizing

**Files:**
- Modify: `src/app/components/flex-diagram/index.tsx:52-60`

- [ ] **Step 1: Remove explicit width/height from SVG element**

In `src/app/components/flex-diagram/index.tsx`, the SVG element currently has `width={svgWidth}` and `height={svgHeight}` attributes (around line 58-59). Remove both attributes so the SVG relies on `viewBox` + CSS `max-width: 100%` for responsive scaling.

Change:

```tsx
    <svg
      class="flex-diagram"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width={svgWidth}
      height={svgHeight}
      xmlns="http://www.w3.org/2000/svg"
    >
```

To:

```tsx
    <svg
      class="flex-diagram"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
```

- [ ] **Step 2: Run tests to verify nothing breaks**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: All tests pass. Tests check for `<svg`, `role="img"`, content — not for width/height attributes.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add src/app/components/flex-diagram/index.tsx && git commit -m "fix(diagram): remove explicit SVG dimensions for responsive scaling"
```

---

### Task 2: Switch data-model diagram to TB layout

**Files:**
- Modify: `src/app/components/flex-diagram/diagrams/data-model.ts:19`

- [ ] **Step 1: Change direction from LR to TB**

In `src/app/components/flex-diagram/diagrams/data-model.ts`, change line 19:

From:
```typescript
  direction: 'LR',
```

To:
```typescript
  direction: 'TB',
```

- [ ] **Step 2: Run tests**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: All tests pass. No test checks direction.

- [ ] **Step 3: Commit**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add src/app/components/flex-diagram/diagrams/data-model.ts && git commit -m "fix(diagram): switch data model to TB layout for readability"
```

---

### Task 3: Switch deployment diagram to TB layout

**Files:**
- Modify: `src/app/components/flex-diagram/diagrams/deployment.ts:39`
- Modify: `test/flex-diagram.test.tsx` (update direction assertion)

- [ ] **Step 1: Change direction from LR to TB**

In `src/app/components/flex-diagram/diagrams/deployment.ts`, change line 39:

From:
```typescript
  direction: 'LR',
```

To:
```typescript
  direction: 'TB',
```

- [ ] **Step 2: Update the test assertion**

In `test/flex-diagram.test.tsx`, find the deploymentGraph test that asserts `direction === 'LR'` and change it:

From:
```typescript
  it('uses left-to-right layout for pipeline flow', () => {
    expect(deploymentGraph.direction).toBe('LR')
  })
```

To:
```typescript
  it('uses top-to-bottom layout for pipeline flow', () => {
    expect(deploymentGraph.direction).toBe('TB')
  })
```

- [ ] **Step 3: Run tests**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add src/app/components/flex-diagram/diagrams/deployment.ts test/flex-diagram.test.tsx && git commit -m "fix(diagram): switch deployment to TB layout for readability"
```

---

### Task 4: Create software architecture markdown doc

**Files:**
- Create: `catalog/architecture/software-architecture.md`

- [ ] **Step 1: Write the architecture document**

Create `catalog/architecture/software-architecture.md`:

```markdown
---
status: working
tags: [architecture, codebase, software]
---

# Software Architecture

How the Forms Lab codebase is organized. This complements the [system overview](system-overview.md), which describes the infrastructure topology. This document describes the code's internal structure, module boundaries, and dependency rules.

## Layers

### App (`src/app/`)

The web application. A Hono server with server-rendered JSX.

- **Routes** (`src/app/routes/`) — HTTP handlers organized by domain: catalog, projects, auth. Each route file is a Hono sub-app mounted on a path prefix.
- **Components** (`src/app/components/`) — Reusable JSX components following USWDS visual conformance. Each component lives in its own directory with `index.tsx`, `styles.css`, `meta.ts`, and optional `examples.tsx` and `conformance-spec.tsx`.
- **Middleware** (`src/app/middleware/`) — Cross-cutting concerns: authentication, base-path resolution.
- **Public** (`src/app/public/`) — Static assets: CSS (cascade layers), fonts, sprite SVG. Built by `scripts/build-css.ts`.

Entry points: `src/app/main.ts` (server startup), `src/app/server.tsx` (Hono app instance).

### Webhook (`src/webhook/`)

A separate Bun process that receives GitHub push events and triggers deployments. Shares types and services with the app but runs as an independent systemd service on EC2.

Entry point: `src/webhook/main.ts`.

### Services (`src/services/`)

Shared service clients used by both app and webhook.

- **GitHub client** (`github.ts`) — API interactions: OAuth token exchange, user info, repo permissions, deployment status.
- **Deployment metadata** (`deployment-metadata.ts`) — Branch deployment state.

### Libraries (`src/lib/`)

Pure utilities with no domain knowledge. These have no internal dependencies — they depend only on external packages or Node/Bun APIs.

- **Markdown** (`markdown.ts`) — Parsing and rendering via markdown-it.
- **Session** (`session.ts`) — AES-GCM cookie encryption and decryption.
- **OAuth** (`github-oauth.ts`) — GitHub OAuth flow helpers.
- **Base path** (`base-path.ts`) — URL resolution for subpath deployments.
- **Test helpers** (`test-helpers/`) — Shared test utilities.

### Types (`src/types/`)

Shared type definitions that cross module boundaries.

- **Models** (`models.ts`) — Domain types: DataCollectionSpec, FormSpec, Submission, Story, Decision, Persona.
- **Deployment** (`deployment.ts`) — Deployment-related types.

### CLI (`src/commands/`)

Operational commands invoked via `bun run cli <command>`.

- Infrastructure management (Pulumi up/outputs/ssh)
- NixOS configuration (apply/status)
- GitHub webhook setup
- Story sync from GitHub Issues
- Deployment commands

Entry point: `src/cli.ts`.

### Infrastructure (`infrastructure/`)

Not runtime code. Provisioning and server configuration.

- **Pulumi** (`infrastructure/pulumi/`) — AWS resource provisioning (EC2, EIP, security group).
- **NixOS** (`infrastructure/nixos/`) — Declarative server state: Caddy, systemd services, deploy script, sops secrets.

### Catalog Content (`catalog/`)

Structured content, not code. Markdown files with YAML frontmatter, read at runtime by app routes.

- **Architecture** — System documentation (this document and others).
- **Decisions** — Architectural decision records grouped by domain.
- **Personas** — User archetypes.
- **Stories** — User stories synced from GitHub Issues.
- **Experiments** — Exploration records.

## Dependency Rules

These rules describe the current dependency structure. Arrows mean "depends on."

- **Routes** → components, lib, services, types
- **Components** → lib, types (never routes or services)
- **Services** → types (never app or lib)
- **Lib** → nothing internal (pure utilities)
- **Webhook** → services, types, lib (never app)
- **CLI** → services, lib, types (never app or webhook)

## Sources

- [System overview](system-overview.md) — infrastructure topology
- [Data model](data-model.md) — domain types in detail
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
```

- [ ] **Step 2: Commit**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add catalog/architecture/software-architecture.md && git commit -m "docs: add software architecture document"
```

---

### Task 5: Create software architecture diagram

**Files:**
- Create: `src/app/components/flex-diagram/diagrams/software-architecture.ts`
- Modify: `test/flex-diagram.test.tsx` (add tests)

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.tsx`:

```typescript
import { softwareArchitectureGraph } from '../src/app/components/flex-diagram/diagrams/software-architecture'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: FAIL — cannot resolve `diagrams/software-architecture`

- [ ] **Step 3: Implement the graph definition**

Create `src/app/components/flex-diagram/diagrams/software-architecture.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add src/app/components/flex-diagram/diagrams/software-architecture.ts test/flex-diagram.test.tsx && git commit -m "feat(diagram): add software architecture graph definition"
```

---

### Task 6: Wire software architecture diagram into route

**Files:**
- Modify: `src/app/routes/catalog/architecture.tsx:9-24`
- Modify: `test/flex-diagram.test.tsx` (add route test)

- [ ] **Step 1: Write the failing test**

Add to `test/flex-diagram.test.tsx`:

```typescript
  it('renders a diagram on the software-architecture page', async () => {
    const res = await app.request('/catalog/architecture/software-architecture')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('class="flex-diagram"')
    expect(body).toContain('Software Architecture')
  })
```

Add this inside the existing `describe('Architecture route with diagrams', ...)` block.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: FAIL — response does not contain `class="flex-diagram"` for software-architecture (the page renders but without a diagram since it's not in the mapping yet).

- [ ] **Step 3: Add import and mapping entry**

In `src/app/routes/catalog/architecture.tsx`, add the import after the existing diagram imports (around line 13):

```typescript
import { softwareArchitectureGraph } from '../../components/flex-diagram/diagrams/software-architecture'
```

Add the mapping entry to `diagramsBySlug` (around line 24):

```typescript
const diagramsBySlug: Record<string, GraphDefinition> = {
  'system-overview': systemOverviewGraph,
  'data-model': dataModelGraph,
  deployment: deploymentGraph,
  'threat-model': threatModelGraph,
  'software-architecture': softwareArchitectureGraph,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun test test/flex-diagram.test.tsx`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add src/app/routes/catalog/architecture.tsx test/flex-diagram.test.tsx && git commit -m "feat(diagram): wire software architecture diagram into route"
```

---

### Task 7: Full check and push

- [ ] **Step 1: Run the full check suite**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun run check`
Expected: Lint, type check, and all tests pass. Only pre-existing warnings (combo-box, site-alert, step-indicator, summary-box conformance specs).

- [ ] **Step 2: Fix any issues**

If biome reports formatting issues: `cd /home/daniel/src/forms-lab-catalog-diagrams && bunx @biomejs/biome check --write .`
If type errors appear, fix them in the relevant files.

- [ ] **Step 3: Build CSS and visual verification**

Run: `cd /home/daniel/src/forms-lab-catalog-diagrams && bun run build:css && bun run dev`

Check in browser:
- `/catalog/architecture/data-model` — diagram is taller, narrower (TB layout)
- `/catalog/architecture/deployment` — diagram is taller, narrower (TB layout)
- `/catalog/architecture/software-architecture` — new diagram + prose renders
- `/catalog/architecture/system-overview` — unchanged, still renders correctly
- All diagrams scale responsively (resize browser window)

- [ ] **Step 4: Commit any remaining fixes and push**

```bash
cd /home/daniel/src/forms-lab-catalog-diagrams && git add -A && git commit -m "chore: fix lint and formatting" && git push
```
