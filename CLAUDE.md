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

- `src/` — Application code (routes, services, components, types, lib)
- `src/public/` — Design system CSS source files
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
