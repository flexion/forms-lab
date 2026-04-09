# Slice 0 PR 1: Complete Application Design

**Date:** 2026-04-07
**Status:** Approved
**Story:** flexion/forms-lab#1
**Branch:** `slice-0/skeleton`
**Repository:** flexion/forms-lab

## Overview

PR 1 delivers the complete forms-lab application: design system foundation, catalog routes for all content types, CLI with story sync, initial ADRs, and meta-knowledge-base integration. PR 2 (separate design) covers infrastructure and deployment.

## Repository Structure

```
forms-lab/
├── catalog/
│   ├── personas/                    # 5 persona files (existing)
│   │   ├── maya.md
│   │   ├── carlos.md
│   │   ├── priya.md
│   │   ├── developer.md
│   │   └── evaluator.md
│   ├── stories/                     # synced from GitHub Issues
│   ├── decisions/
│   │   ├── architecture/
│   │   │   ├── hono-on-bun.md
│   │   │   ├── git-as-persistence.md
│   │   │   └── github-issues-for-stories.md
│   │   ├── infrastructure/
│   │   │   ├── ec2-with-pulumi.md
│   │   │   ├── caddy-reverse-proxy.md
│   │   │   ├── subpath-routing.md
│   │   │   ├── nix-built-processes.md
│   │   │   └── github-webhook-deploys.md
│   │   └── design-system/
│   │       ├── selective-uswds-adoption.md
│   │       ├── two-tier-token-architecture.md
│   │       ├── cascade-layers.md
│   │       ├── css-build-and-delivery.md
│   │       └── markdown-rendering.md
│   ├── architecture/
│   │   ├── system-overview.md
│   │   └── data-model.md
│   └── experiments/                 # empty, routes ready
├── src/
│   ├── cli.ts                       # CLI dispatcher
│   ├── server.ts                    # Hono app entry point
│   ├── commands/
│   │   └── sync-stories.ts
│   ├── routes/catalog/
│   │   ├── index.tsx                # /catalog landing page
│   │   ├── personas.tsx             # /catalog/personas/*
│   │   ├── decisions.tsx            # /catalog/decisions/*
│   │   ├── architecture.tsx         # /catalog/architecture/*
│   │   ├── stories.tsx              # /catalog/stories/*
│   │   └── experiments.tsx          # /catalog/experiments/*
│   ├── services/
│   │   └── github.ts               # GitHub API client (raw fetch)
│   ├── components/
│   │   ├── Layout.tsx               # migrated to design system CSS
│   │   ├── StatusBadge.tsx
│   │   ├── ContentCard.tsx
│   │   ├── TagList.tsx
│   │   └── Prose.tsx
│   ├── types/
│   │   └── models.ts               # existing
│   ├── lib/
│   │   └── markdown.ts             # existing, shared by routes and CLI
│   └── public/                      # design system CSS source
│       ├── styles.css               # master cascade layers
│       ├── tokens.css               # two-tier token architecture
│       ├── reset.css
│       ├── base.css
│       ├── compositions.css         # l-stack, l-cluster, l-center, etc.
│       ├── utilities.css
│       └── components/              # per-component CSS files
├── test/
│   ├── server.test.ts               # existing
│   ├── catalog.test.ts              # expanded for all content types
│   ├── cli.test.ts
│   ├── sync-stories.test.ts
│   └── markdown.test.ts
├── notes/
│   └── 2026-04-07-bootstrapping.md  # session log
├── knowledge-base.yaml
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── biome.json
├── .stylelintrc.json
└── .claude/                         # Claude Code config referencing meta-knowledge-base
```

## Design System

### Approach

Selective adoption from the class repo's design system. Foundation layers included in the skeleton; components adopted as catalog routes need them, each audited for full USWDS 3.13 fidelity.

### Foundation Layers

Ported from the class repo and audited:

- **tokens.css** — two-tier architecture: palette tokens (`--flex-{family}-{grade}`) from USWDS 3.13, semantic tokens (`--flex-color-*`, `--flex-space-*`, `--flex-text-*`, `--flex-radius-*`)
- **reset.css** — browser normalization
- **base.css** — base element styles using semantic tokens
- **compositions.css** — layout primitives (l-stack, l-cluster, l-center, l-sidebar, l-grid), spacing only
- **utilities.css** — utility classes (.u-visually-hidden, .u-text-muted, etc.)
- **styles.css** — master file declaring cascade layer order: reset → tokens → composition → base → block → utility

### Components for Catalog

Brought in as needed for catalog rendering:

- Navigation (header, links)
- Content rendering (prose/markdown display)
- Tags/badges (decision status, story state, milestone labels)
- Cards (listing personas, decisions, stories)

Each component gets its own CSS file in `src/public/components/`, uses `--flex-*` tokens exclusively, and is checked against the full USWDS spec for that component type.

### CSS Build and Delivery

- `bun run build:css` uses `Bun.build()` once to resolve `@import` chains into `dist/styles.css`
- `serveStatic` from `hono/bun` serves `dist/` directory
- Dev mode: build once at startup, watch for changes and rebuild
- `dist/` is gitignored
- stylelint enforces token usage — no hardcoded colors, fonts, spacing

### Token Migration from Class Repo

No `@uswds/uswds` npm dependency. Token values maintained directly, same as the class repo post-migration. Visual conformance with USWDS maintained through manual audit per component.

## Catalog Routes

### Content Types

| Content type | List route | Detail route | Frontmatter schema | Grouping |
|---|---|---|---|---|
| Personas | `/catalog/personas` | `/catalog/personas/:id` | id, name, role | Flat list |
| Decisions | `/catalog/decisions` | `/catalog/decisions/:group/:slug` | status, tags, decided | By subdirectory (architecture, infrastructure, design-system) |
| Architecture | `/catalog/architecture` | `/catalog/architecture/:slug` | status, tags | Flat list |
| Stories | `/catalog/stories` | `/catalog/stories/:slug` | issue, title, milestone, labels, state, synced_at | By milestone |
| Experiments | `/catalog/experiments` | `/catalog/experiments/:slug` | status, tags, baseline | Flat list (empty for skeleton) |

### Route Organization

One route file per content type in `src/routes/catalog/`. Each imports shared utilities from `src/lib/markdown.ts` and shared components.

### Catalog Landing Page

`/catalog` provides an overview: counts per content type, recent decisions, current milestone progress. A computed view over all catalog content.

### Markdown Rendering

`markdown-it` with HTML disabled by default (safe defaults, no sanitization dependency needed). `@types/markdown-it` for TypeScript support. GFM-like features via plugins as needed.

### Shared Components

- **Layout.tsx** — page chrome, navigation, migrated from inline CSS to design system tokens
- **StatusBadge.tsx** — lifecycle status (draft/working/stable/deprecated)
- **ContentCard.tsx** — reusable card for listing any content type
- **TagList.tsx** — tag arrays as styled badges
- **Prose.tsx** — wraps markdown-rendered HTML with typography styles

## CLI

### Dispatcher

Entry point at `src/cli.ts`, invoked via `bun run cli <command> [options]`.

Thin dispatcher that imports command modules from `src/commands/`. Each command is a function that receives parsed args and returns an exit code. Handles `--help`, unknown commands, and errors.

```json
{
  "scripts": {
    "cli": "bun run src/cli.ts"
  }
}
```

### sync-stories Command

`bun run cli sync-stories`

- Calls GitHub REST API via raw `fetch` (no `@octokit/rest` — minimal dependencies)
- Lists issues labeled `user-story` from `flexion/forms-lab`
- Writes to `catalog/stories/<number>-<slug>.md` with frontmatter:

```yaml
---
issue: 42
title: Maya uploads a PDF and reviews the extracted specs
milestone: "Slice 2: Maya Uploads PDF"
labels: [user-story, llm-integration]
state: open
synced_at: 2026-04-07T14:30:00Z
---
```

- Issue body becomes markdown content
- Idempotent — re-running overwrites with latest
- Removes local files for issues that no longer match the label
- Auth: `GITHUB_TOKEN` env var or falls back to `gh auth token`

### Testing

GitHub client has an interface so tests use a fake returning fixture data. Sync command tested end-to-end: given these issues, expect these files with this content.

## Architectural Decision Records

### Format

```markdown
---
status: stable
tags: [infrastructure]
decided: 2026-04-07
---

# Decision Title

One-paragraph summary.

## Context

What prompted this decision.

## Decision

What we chose and key details.

## Alternatives considered

What else we looked at and why not.

## Consequences

Trade-offs, constraints, future implications.

## Sources

- [Links to design docs, discussions, brainstorming]
```

### Initial Set (13 decisions)

**architecture/**
- `hono-on-bun.md` — Hono framework on Bun runtime for server-rendered JSX
- `git-as-persistence.md` — Git as persistence layer for form specs and catalog content
- `github-issues-for-stories.md` — GitHub Issues as story source of truth, synced to repo

**infrastructure/**
- `ec2-with-pulumi.md` — Single EC2 instance managed by Pulumi (TypeScript)
- `caddy-reverse-proxy.md` — Caddy for reverse proxy
- `subpath-routing.md` — Branch-per-subpath routing with app-aware base path
- `nix-built-processes.md` — Nix-built bare processes, no containers
- `github-webhook-deploys.md` — GitHub webhook triggers deploys on EC2

**design-system/**
- `selective-uswds-adoption.md` — Selective adoption from class repo with full USWDS fidelity per component
- `two-tier-token-architecture.md` — Palette + semantic token layers
- `cascade-layers.md` — CSS cascade layers for specificity management
- `css-build-and-delivery.md` — Bun.build() at build time, serveStatic for delivery
- `markdown-rendering.md` — markdown-it with HTML disabled by default

All start as `status: stable`, `decided: 2026-04-07`.

## Architecture Documentation

Two initial docs:

- **system-overview.md** — high-level platform description, data flow, component boundaries, links to decisions for rationale
- **data-model.md** — DataCollectionSpec / FormSpec / Submission relationships, where they live, how they're versioned

## meta-knowledge-base Integration

- Cloned to `~/src/meta-knowledge-base` (already done)
- Referenced from forms-lab `.claude/settings.json` via `allowedTools` or project-level includes so Claude Code sessions have access to governance conventions
- `knowledge-base.yaml` at repo root configures:
  - Entrypoints (human: README.md, agent: CLAUDE.md)
  - Lifecycle statuses (draft, working, stable, deprecated)
  - Provenance requirements for decisions and architecture docs
  - Write boundaries
  - Metadata schemas per content type

Conventions applied from meta-knowledge-base:
- Intent-revealing file/directory names
- Lifecycle status in frontmatter
- Provenance via `## Sources` sections
- Catalog as computed views over structured content (UI evolution ladder level 3)
- Evidence-driven evolution — add structure when pain is observed

## Dependencies Added

- `markdown-it` — markdown rendering (HTML disabled by default)
- `@types/markdown-it` — TypeScript types

No other new runtime dependencies. Dev dependencies added: `stylelint`, `stylelint-declaration-strict-value` for CSS token enforcement.

## Testing Strategy

- **Catalog routes:** Each content type has tests verifying list and detail routes render expected content
- **CLI dispatcher:** Tests for command routing, help output, unknown commands
- **sync-stories:** End-to-end test with fake GitHub client, verifies file output
- **Markdown parsing:** Tests for frontmatter extraction, quote stripping, missing frontmatter
- **Existing tests:** Server health check and root page tests remain

## Definition of Done

- [ ] `bun test` passes
- [ ] `tsc --noEmit` passes
- [ ] `bunx @biomejs/biome check .` passes
- [ ] stylelint passes
- [ ] `bun run build:css` produces `dist/styles.css`
- [ ] `bun run dev` → all catalog routes render with design system styling
- [ ] `bun run cli sync-stories` pulls GitHub issues and writes story files
- [ ] All 13 decisions browsable at `/catalog/decisions`
- [ ] Architecture docs browsable at `/catalog/architecture`
- [ ] Stories browsable at `/catalog/stories` grouped by milestone
- [ ] Personas browsable at `/catalog/personas` (existing, restyled)
- [ ] `/catalog` landing page shows overview of all content types

## Out of Scope (PR 2)

- Pulumi stack (EC2, Elastic IP, security group)
- Caddy configuration
- Nix build configuration
- Webhook listener for deploy triggers
- CI deploy step
- Base path configuration for subpath routing
