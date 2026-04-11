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
