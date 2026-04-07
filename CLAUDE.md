# Forms Lab

LLM-Assisted Forms Platform for government forms.

## Quick Reference

```bash
bun test               # Run tests
bun run dev            # Dev server with watch
bun run --no-warnings tsc --noEmit  # Type check
bunx @biomejs/biome check .         # Lint + format check
bunx @biomejs/biome check --write . # Lint + format fix
```

## Conventions

- **Code is canonical** — when in doubt, follow existing patterns
- **Tests required** — new functionality needs tests in `test/`
- **Server-rendered JSX** — Hono JSX components return HTML strings, no client runtime
- **TDD** — write failing test first, then implementation
- **Vertical slicing** — each story delivers complete user value through all layers

## Architecture

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX)
- **Data Model:** DataCollectionSpec (what to collect) → FormSpec (how to present) → Submission (collected data)
- **Persistence:** Git-based — specs and catalog content are markdown/JSON files in the repo
- **Catalog:** Self-documenting system at `/catalog` — personas, stories, architecture, experiments

## Project Structure

- `src/` — Application code (routes, services, components, types, lib)
- `catalog/` — Catalog content (personas, stories synced from GitHub issues, architecture, decisions)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files

## Related

- Design spec: `/home/daniel/src/llm-class-2026-winter-cohort/notes/final-project/2026-04-07-design.md`
- Skeleton plan: `/home/daniel/src/llm-class-2026-winter-cohort/notes/final-project/2026-04-07-skeleton-plan.md`
