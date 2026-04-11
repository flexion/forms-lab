# Catalog Architecture Diagrams Design

## Problem

The catalog landing page presents six content sections as equal-weight cards in a flat grid. This communicates "here are six unrelated buckets" when there is a natural structure: architecture and decisions are foundational, stories and personas drive the work, and the design system serves implementation. A visitor gets no orientation about what the system is, how its parts relate, or where to start.

The architecture docs (system overview, data model, deployment, threat model) are detailed prose with no visual representations. Concepts like component topology, data flow, deployment pipelines, and trust boundaries are inherently spatial and benefit from diagrams.

## Solution

Two changes that work together:

1. Restructure the catalog landing page from a flat grid into meaningful groups with descriptions
2. Add auto-layout SVG diagrams to each architecture doc

## Part 1: Catalog Landing Page Restructure

### Current state

Six equal-weight cards in a 3-column grid: Personas, Decisions, Architecture, Stories, Experiments, Design System. Each shows a title and count. A generic introductory sentence reads "The catalog is the system's self-documentation."

### Proposed state

Replace the flat grid with three grouped sections. Each group has an uppercase label and contains cards with brief descriptions instead of bare counts.

**The System** (2-column row)
- Architecture -- System overview, data model, deployment, threat model
- Decisions -- N decisions across architecture, infrastructure, design

**The Work** (3-column row)
- Personas -- Who the system serves
- Stories -- What's being built
- Experiments -- What we're exploring

**The Craft** (full-width)
- Design System -- Tokens, components, compositions, and visual language

The introductory sentence changes to something that describes the actual system: "An LLM-assisted forms platform for government forms. Data flows from collection specs through form definitions to submissions."

### Sidebar update

The catalog sidebar (`getCatalogSidebar`) changes from a flat list to three sections matching the landing page groupings: The System, The Work, The Craft. The existing `CatalogSidebar` component already supports multiple titled sections.

## Part 2: Architecture Diagrams

### Approach

Each architecture doc gets a companion JSX SVG diagram component rendered above its prose content by the architecture route handler. Diagrams use dagre (a directed graph layout library, pure JS, ~30 KB) to compute node positions from a TypeScript graph definition, then render as inline SVG with full accessibility and design token integration.

### Diagram inventory

**System Overview** -- Component/data-flow diagram showing Browser, Caddy, Hono App, Git Filesystem, Claude API, GitHub. Arrows show request and data flow. Nodes link to relevant architecture docs and decisions.

**Data Model** -- Entity-relationship diagram showing DataCollectionSpec, FormSpec, and Submission with key fields and cardinality. Nodes link to relevant sections of the data model doc.

**Deployment** -- Pipeline flow diagram showing GitHub push, webhook, deploy.sh, git worktree, bun install/build, systemd service, Caddy route. Linear left-to-right or top-to-bottom flow.

**Threat Model** -- Trust boundary diagram. Same components as system overview, with dashed boundary lines showing the 8 trust boundaries. Clicking a boundary links to its section in the threat model doc.

### DiagramRenderer component

A shared JSX component that takes a graph definition and produces accessible SVG:

**Input:** A typed graph definition object containing:
- Nodes: id, label, description, href (optional link), group (optional cluster)
- Edges: source, target, label (optional)
- Groups: id, label (for visual clustering like trust boundaries)
- Layout options: direction (TB/LR), node spacing, rank spacing

**Output:** Inline `<svg>` with:
- `role="img"` and `aria-labelledby` pointing to `<title>` and `<desc>` elements
- `var(--flex-*)` design tokens for all fills, strokes, and text colors
- `<a>` wrappers on nodes with `href` values for drill-down navigation
- Readable text labels using the app's font stack
- Consistent visual language: rounded rectangles for components, arrows for flow, dashed lines for boundaries

**Layout:** dagre computes positions at server render time. Zero client-side JavaScript.

### Architecture route handler changes

The architecture route handler (`src/app/routes/catalog/architecture.tsx`) checks if a diagram component exists for the current slug. If so, it renders the diagram above the prose content. The mapping is a simple slug-to-component lookup:

```
system-overview → SystemOverviewDiagram
data-model → DataModelDiagram
deployment → DeploymentDiagram
threat-model → ThreatModelDiagram
```

### File structure

```
src/app/components/flex-diagram/
  index.tsx          -- DiagramRenderer component
  styles.css         -- Diagram styling (tokens, hover states, focus rings)
  types.ts           -- GraphDefinition, Node, Edge, Group types

src/app/components/flex-diagram/diagrams/
  system-overview.ts   -- Graph definition for system overview
  data-model.ts        -- Graph definition for data model
  deployment.ts        -- Graph definition for deployment pipeline
  threat-model.ts      -- Graph definition for threat model
```

## Testing

- DiagramRenderer: given a graph definition, produces valid SVG with correct ARIA attributes, links, and token-based styling
- Graph definitions: each diagram's definition is a valid GraphDefinition (type checking covers this)
- Landing page: renders grouped sections with correct headings and links
- Sidebar: renders three groups matching the landing page structure
- Architecture route: renders diagram above prose for slugs that have one, prose only for those that don't

## Accessibility

- Diagrams use `role="img"` with `<title>` (short label) and `<desc>` (longer description explaining what the diagram shows)
- Linked nodes are wrapped in `<a>` elements, focusable via keyboard tab
- Focus rings use `--flex-color-accent` for visibility
- Diagrams are supplementary -- all information is also available in the prose below

## Out of scope

- Diagrams in non-architecture pages
- Client-side interactivity (zoom, pan, tooltips)
- Markdown-level diagram syntax (e.g., mermaid code blocks)
- Changes to the design system section
- Inline diagrams within prose flow (diagrams are above prose, not within it)
