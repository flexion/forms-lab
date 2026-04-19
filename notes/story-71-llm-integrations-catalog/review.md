---
date: 2026-04-19
branch: story-71/llm-integrations-catalog
base: main
---

# Story 71 — Review

## AC coverage

All seven acceptance criteria met. Evidence:

| AC | Evidence |
|----|----------|
| Catalog page enumerates every LLM touchpoint with deep links | `catalog/architecture/llm-integrations.md` — 5 capability groups with pinned `src:` links for extraction, shaping, filling, evaluation; future RAG placeholder links to experiments roadmap |
| Each service has a single, obvious public-interface entrypoint | 12 `src/services/<name>/index.ts` files, each with a 3-line header comment stating the convention |
| Software-architecture doc describes "service public interface" convention | New subsection at `catalog/architecture/software-architecture.md` lines 119-130 |
| Internal helpers clearly internal; imports enforced via public entrypoint | `test/architecture/dependency-rule.test.ts` adds `service public interface rule` covering both runtime and type-only imports; 4/4 tests pass |
| Catalog pages link to the service's public entrypoint on GitHub (permalinked) | `src:` URL rewriter in `src/services/content/markdown.ts` substitutes against `BuildInfo.gitRef` at render time; `BUILD_GIT_SHA` wired through NixOS deploy |
| "How to navigate this codebase" section with LLM-integrations as example | `catalog/architecture/navigation.md` |
| No behavior change; `bun run check` passes | 1269 tests pass post-merge |

## Issues found and resolved

### During implementation

1. **Test-only exports leaked into public APIs (Task 10 review)** — 28 symbols from `forms/`, `evaluation/`, `form-documents/` `index.ts` files were only consumed by tests. Removed them; tests now deep-import those private helpers. Pattern documented in `navigation.md`: the convention covers production code only; tests unit-testing internals may deep-import.
2. **Type-only cross-service imports persisted after runtime-import pass (Task 11)** — Task 10 routed runtime imports through public APIs but left some type-only imports deep. Cleaned up in `8bfdcee` before landing the dep-rule test. The dep-rule test explicitly includes type-only imports (rationale: "public interface is about intent visibility, not just runtime coupling").
3. **`errors.ts` left as loose file (final review)** — moved to `src/shared/errors.ts` since it's a pure utility (AppError hierarchy, no domain content).
4. **Stale doc references after moves** — `software-architecture.md`, `data-model.md`, and `CLAUDE.md` all referenced paths like `services/ingestion/`, `services/storage.ts`, `services/user-store.ts`, `services/form-project-repo.ts` that no longer exist. Refreshed to match the final layout.

### During merge from main

Main added 8 commits (3 infra, 5 feature) during the story. Merge conflicts in 3 files resolved cleanly:

- `src/entrypoints/cli/commands/evaluate.ts`: main's new shaping-CLI uses evaluation fixtures + kinds that we'd removed as "test-only" in Task 10. They're now genuine public API (consumed by the CLI), so re-added to `services/evaluation/index.ts`: `fixtureProjectState`, `shapingIntentFixtures`, `shapingCommandsKind`, `RunResult`.
- `src/services/form-documents/extraction.ts`: main introduced new `services/rag/` service and extended `extraction.ts` to import `PolicyChunk`/`PolicyRetriever` deep-path; routed through `services/rag` public API.
- `src/entrypoints/webhook/main.ts`: main's new `teardownBranch` import merged with our public-API routing for `createGitHubClient`.

The dep-rule test caught two additional violations from main's code (`hybrid-extraction-prompt.ts`, two `examples.tsx` files) — fixed in the merge commit. This is precisely the signal the dep-rule test is meant to provide.

## Architectural concerns

None. The story aligns with all four principles:

- **P1 (intent over mechanism)**: `src/services/` now reads as 12 intent-named folders with no loose files.
- **P2 (one-way dependency)**: preserved and strengthened — dep-rule test now enforces both layer rule (existing) and cross-service public-interface rule (new).
- **P3 (services own their types)**: unchanged; this story only tightened visibility of the public API.
- **P4 (stateless presentation)**: unchanged.

## Security / threat model

Not security-relevant. Story is documentation + refactoring + catalog tooling.

## Remaining concerns / follow-ups

Flagged by the final-review reviewer as out of scope but worth tracking:

1. `dataCollectionSpecSchema` currently lives in `services/form-documents/` but is a data-collection-domain schema — arguably belongs in `services/data-collection/`. P3 concern, not blocking.
2. `src/services/projects/project-service.ts` is 822 lines with natural seams (CRUD, git-view, shaping, branches). Ripe for a decomposition pass.
3. `src/services/storage/index.ts` contains inline implementation rather than pure re-exports. Works today, could be split later.
4. `renderMarkdown` constructs a fresh `MarkdownIt` instance per call. Measurable but likely immaterial; could cache by `BuildInfo` if profiling shows it matters.
5. Catalog `src:` line ranges will drift as code evolves. The commit-SHA pinning mitigation is good — readers of a deployed page always see the exact code that produced it.
6. NixOS deploy changes (`BUILD_GIT_SHA`) are config-only; take effect on next deploy. Fallback is `git rev-parse HEAD` or `"unknown"` — app never crashes if env var is missing, only permalinks degrade.

## Commit summary

33 commits including one merge commit. Highlights:

- 10 `refactor(imports):` commits (one per target service) routing through `index.ts`
- 4 `refactor(services|shared|auth)` commits for orphan-file moves
- 4 `refactor(*): remove test-only symbols` commits trimming the public APIs
- 3 `feat(content|shared):` commits adding `BuildInfo`, `githubPermalink`, `src:` rewriter
- 1 `infra(nixos):` commit wiring `BUILD_GIT_SHA`
- 2 `test(architecture):` commits extending the dep-rule test
- 2 `docs(catalog):` commits adding the two new catalog pages
- 1 `docs:` commit refreshing stale path references
- 1 `Merge main` commit resolving 8 commits of upstream drift
