# Forms Lab

LLM-Assisted Forms Platform for government forms.

## Quick Reference

```bash
bun test                                # Run tests
bun run dev                             # Dev server with watch
bun run build:css                       # Build CSS bundle
bun run cli sync-stories                # Sync stories from GitHub Issues
bun run --no-warnings tsc --noEmit      # Type check
bunx @biomejs/biome check .             # Lint + format check
bunx @biomejs/biome check --write .     # Lint + format fix
bun run lint:css                        # Stylelint CSS token enforcement
```

## Deployment

```bash
bun run cli infra bootstrap     # Create S3 bucket for Pulumi state (one-time)
bun run cli infra up            # Provision/update EC2 via Pulumi
bun run cli infra outputs       # Show hostname, IP, SSH command
bun run cli infra ssh           # SSH into EC2 instance
bun run cli nixos apply         # Push NixOS config to EC2
bun run cli nixos status        # Check running services
bun run cli webhook setup       # GitHub webhook configuration guide
```

## Conventions

- **Code is canonical** — when in doubt, follow existing patterns
- **Tests required** — new functionality needs tests in `test/`
- **Server-rendered JSX** — Hono JSX components return HTML strings, no client runtime
- **TDD** — write failing test first, then implementation
- **Vertical slicing** — each story delivers complete user value through all layers
- **Design tokens** — all colors, spacing, fonts use `--flex-*` tokens, enforced by stylelint
- **Cascade layers** — CSS uses `@layer` (reset → tokens → composition → base → block → utility)

## Architecture

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX)
- **Data Model:** DataCollectionSpec (what to collect) → FormSpec (how to present) → Submission (collected data)
- **Persistence:** Git-based — specs and catalog content are markdown/JSON files in the repo
- **Catalog:** Self-documenting system at `/catalog` — personas, stories, architecture, decisions, experiments
- **CLI:** `bun run cli <command>` for operational tasks
- **CSS:** Two-tier tokens (USWDS 3.13), cascade layers, Bun.build() at build time, serveStatic

## Documentation Governance

Follows [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base) conventions:
- Lifecycle statuses in frontmatter: draft → working → stable → deprecated
- Provenance via `## Sources` sections in decisions and architecture docs
- Intent-revealing file and directory names
- Catalog as computed views over structured content
- See `knowledge-base.yaml` for configuration

## Project Structure

- `src/app/` — Web application (server, routes, components, public assets)
- `src/webhook/` — GitHub webhook listener service
- `src/lib/` — Shared utilities (markdown, base-path, test-helpers)
- `src/services/` — Shared services (GitHub API client)
- `src/types/` — Shared type definitions
- `src/commands/` — CLI commands (sync-stories, infra, nixos, webhook)
- `infrastructure/pulumi/` — EC2 provisioning (Pulumi TypeScript)
- `infrastructure/nixos/` — Server configuration (NixOS flake)
- `catalog/` — Catalog content (personas, stories, decisions, architecture, experiments)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files
- `scripts/` — Build scripts
- `notes/` — Session logs and exploration notes
- `dist/` — Built assets (gitignored)

## Related

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Skeleton plan](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-skeleton-plan.md)
- [PR 1 design](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-slice0-pr1-design.md)
- [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base)
