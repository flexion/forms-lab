# Diagram Readability and Software Architecture Design

## Problem

Two issues with the current catalog architecture diagrams:

1. **Readability** -- The data-model (960x163) and deployment (1680x130) diagrams use LR layout, producing ultra-wide, short SVGs that are hard to read. The system-overview and threat-model diagrams use TB and render well.

2. **Missing software architecture content** -- The existing system-overview describes the system from an infrastructure topology perspective (browser, Caddy, Hono, git, Claude API). There is no description of how the codebase itself is organized: module boundaries, layer responsibilities, dependency rules. This is important both for human understanding and for agentic development -- agents reading the catalog need to know where to put code and what boundaries to respect.

## Solution

### Part 1: Diagram Readability

**Switch LR diagrams to TB.** Both data-model and deployment diagrams change from `direction: 'LR'` to `direction: 'TB'`. dagre's auto-layout handles the rest -- nodes stack vertically rather than horizontally, producing diagrams with reasonable aspect ratios.

**Remove explicit width/height SVG attributes.** The DiagramRenderer currently sets `width` and `height` attributes on the SVG element equal to dagre's computed dimensions. This prevents responsive scaling. Remove these attributes and rely on `viewBox` + the existing CSS `max-width: 100%` rule. The SVG scales to fit its container while preserving aspect ratio.

### Part 2: Software Architecture Content

**New architecture doc:** `catalog/architecture/software-architecture.md`

Content describes the codebase's internal layers and their responsibilities:

- **App** (`src/app/`) -- Web application: routes, components, middleware, public assets. Server-rendered JSX via Hono.
- **Webhook** (`src/webhook/`) -- Separate Bun process for GitHub push events. Shares types and services with app, runs independently.
- **Services** (`src/services/`) -- Shared service clients: GitHub API (used by app for OAuth/stories and webhook for deployment status), deployment metadata.
- **Libraries** (`src/lib/`) -- Pure utilities with no domain knowledge: markdown rendering, session encryption, OAuth, base-path, test helpers.
- **Types** (`src/types/`) -- Shared type definitions: data model (DataCollectionSpec, FormSpec, Submission), other cross-cutting types.
- **CLI** (`src/commands/`) -- Operational commands: infra, nixos, webhook, sync-stories, deploy. Entry point at `src/cli.ts`.
- **Infrastructure** (`infrastructure/`) -- Pulumi provisioning and NixOS config. Not runtime code.
- **Catalog content** (`catalog/`) -- Markdown + frontmatter content. Read at runtime by app routes.

The doc also makes explicit the dependency rules that are currently implicit:

- Routes depend on components, lib, services, types
- Components depend on lib, types (never on routes or services)
- Lib depends on nothing internal (pure utilities)
- Services depend on types only
- Webhook depends on services, types, lib (never on app)

**New diagram:** `software-architecture.ts` graph definition with TB layout showing the modules as nodes and dependency edges between them. Nodes link to relevant directories or docs. Wired into the architecture route via the `diagramsBySlug` mapping.

### Feedback loops between documentation and implementation

The dependency rules section is the foundation for positive feedback loops between catalog documentation and the codebase. During implementation planning, three options will be evaluated:

**Lightweight (recommended starting point):** The dependency rules exist as prose in the architecture doc. CLAUDE.md points agents to the catalog for orientation. Agents reading the doc before working naturally respect the boundaries. The doc stays current because agents updating code are positioned to update the doc. Low cost, immediate value.

**Medium:** A test that reads the software architecture doc's module list and verifies each described module exists on the filesystem. Flags when new top-level directories appear that aren't documented. Low maintenance cost, catches drift.

**Structural:** Import restriction tests that enforce the dependency rules (e.g., "files in src/lib/ must not import from src/app/"). Higher cost to set up, but makes violations impossible rather than unlikely.

The planning phase will recommend which level to implement based on trade-offs between maintenance burden, value for agentic development, and current project maturity.

## Testing

- Existing diagram tests continue to pass (direction change doesn't affect test assertions)
- New test for software-architecture graph definition (node IDs, edges, links)
- Route test: `/catalog/architecture/software-architecture` renders diagram + prose
- Visual verification: data-model and deployment diagrams render with reasonable aspect ratios

## Out of scope

- Diagrams on other branches (story-3 projects page)
- Enforcement mechanism for dependency rules (evaluated during planning, not committed to in spec)
- Changes to other architecture docs
