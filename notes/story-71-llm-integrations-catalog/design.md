---
title: Developer navigates LLM integrations via a screaming service layer
status: working
story: 71
date: 2026-04-19
---

# Story 71 — Design

## Problem

A developer new to the repository cannot quickly answer two questions: "where does this system call an LLM?" and "what does service `<X>` do?" Services today mix public helpers with internal implementation files, several orphan `.ts` files sit loose at `src/services/`, and catalog pages describe capabilities without linking to the code that implements them. The directory tree whispers; we want it to scream.

## Goal

1. `src/services/` reads as a pure list of intents, one folder per intent, with a single obvious public entrypoint per service.
2. One catalog page enumerates every LLM call site in the system, with deep links to the exact source lines pinned to the deployed commit.
3. Cross-service and entrypoint imports route only through each service's public entrypoint, enforced by a test.
4. No behavior change: `bun run check` stays green throughout.

## Scope

### In scope

- Add `src/services/<name>/index.ts` (public interface) to every service that lacks one.
- Fold five orphan files at `src/services/*.ts` into appropriate services.
- Rewrite entrypoint and cross-service imports to route through `index.ts`.
- Extend `test/architecture/dependency-rule.test.ts` to forbid deep cross-service imports.
- New catalog page `catalog/architecture/llm-integrations.md` grouped by capability.
- New catalog page `catalog/architecture/navigation.md` documenting the convention.
- One-paragraph update to `catalog/architecture/software-architecture.md` introducing the "service public interface" convention.
- Build-time commit SHA config (`src/shared/build-info.ts`) plus a `githubPermalink()` helper and a markdown `src:` URL rewriter so catalog links pin to the deployed commit.
- Deploy script sets `BUILD_GIT_SHA` env var for each branch app.

### Out of scope

- Renaming services (e.g. `form-documents` → `pdf-extraction`) or splitting `forms/` into multiple services.
- Refactoring LLM call sites themselves; no behavior change.
- Threat model changes — navigation/docs work is not security-relevant.
- Per-service README files.

## Target `src/services/` layout

Final tree — one folder per intent, no loose files:

```
src/services/
  auth/                   (existing; absorbs user-store)
  content/                (existing; gains github-permalink helper)
  data-collection/        (existing)
  deployment/             (existing)
  evaluation/             (existing, already has index.ts)
  extraction/             (existing)
  form-documents/         (existing, already has index.ts)
  forms/                  (existing; sub-modules stay internal)
  notifications/          (existing)
  projects/               (new; absorbs project-service.ts + form-project-repo.ts)
  storage/                (promoted from storage.ts)
  variant-preferences/    (existing)
```

Each folder contains an `index.ts` that re-exports the service's public API.

## Orphan file migration

| Current path | Destination | Public? |
|---|---|---|
| `src/services/storage.ts` | `src/services/storage/index.ts` + split internal files as needed | Yes (promoted) |
| `src/services/user-store.ts` | `src/services/auth/user-store.ts`, re-exported from `auth/index.ts` | Yes |
| `src/services/project-service.ts` | `src/services/projects/project-service.ts`, re-exported from `projects/index.ts` | Yes |
| `src/services/form-project-repo.ts` | `src/services/projects/form-project-repo.ts` | Internal to `projects` |
| `src/services/strategy-registry.ts` | `src/shared/strategy-registry.ts` | Pure utility; belongs in `shared/` |

Judgment calls:

- **`strategy-registry.ts` → `shared/`.** No domain content; pure `Map<key, factory>` pattern used across services. Fits `shared/`'s "pure utilities" mandate.
- **New `projects/` service.** Operates on on-disk form-project directories under `/projects/`. Real domain boundary, not a leftovers bin.

## Service public interface convention

**The rule.** Every service has `src/services/<name>/index.ts`. External code imports only from `'<path>/services/<name>'` — never a deeper path. Code inside `services/<name>/` may import from any sibling file freely.

**What `index.ts` contains.** Re-exports only, no logic. A top-of-file comment states the rule:

```ts
// Public interface for the <name> service.
// External imports (other services, entrypoints, design-system) MUST come
// through this file. Enforced by test/architecture/dependency-rule.test.ts.

export { createXxx } from './xxx'
export type { YyyType } from './types'
```

**What counts as "external."** Any import whose source file lives outside the target service's folder. That includes other services, entrypoints, and design-system.

**`forms/` sub-modules stay internal.** `forms/` contains `comparison/`, `filling/`, `filling-agent/`, `shaping/`, `review/`. These are forms-internal; the `forms` service has exactly one public entrypoint: `services/forms/index.ts`. Its re-export list will be long (~20-30 symbols) — that's the intended "screaming" signal.

**Catalog links target entrypoints.** Catalog pages link to `services/<name>/index.ts` on GitHub, not internal files, so readers always land on the public surface first.

## Build-time commit SHA and permalinks

### `src/shared/build-info.ts`

New pure module:

```ts
export interface BuildInfo {
  gitRef: string          // commit SHA, or branch name if dirty
  repoUrl: string         // "https://github.com/flexion/forms-lab"
  isDirty: boolean
}

export function getBuildInfo(): BuildInfo
```

Resolution order at server startup:

1. `BUILD_GIT_SHA` env var (set by deploy script / CI) — preferred.
2. `git rev-parse HEAD` plus `git status --porcelain` and `git rev-parse --abbrev-ref HEAD` — local dev fallback.
3. `"unknown"` with `console.warn` — last resort.

When the worktree is dirty, `isDirty: true` flips the helper to use the branch name instead of the SHA, so devs see current (uncommitted-ish) code.

### Deploy integration

The existing deploy path (`/srv/forms-lab/deploy.sh` on the EC2 instance, plus the webhook handler that drives it) passes the commit SHA to the service env as `BUILD_GIT_SHA`. Each branch app gets its own SHA. No Pulumi/NixOS changes — purely a service-env change.

### `src/services/content/github-permalink.ts`

```ts
export interface PermalinkOptions {
  path: string                         // "src/services/forms/index.ts"
  lines?: [number, number] | number
}

export function githubPermalink(
  opts: PermalinkOptions,
  build: BuildInfo
): string
```

Returns `https://github.com/flexion/forms-lab/blob/<ref>/<path>#L<n>-L<m>` where `<ref>` is the SHA (clean) or branch (dirty). Re-exported from `services/content/index.ts`.

### Markdown `src:` URL rewriter

Authoring syntax: `[label](src:src/services/forms/index.ts#L42-L88)`.

The existing markdown renderer in `services/content/markdown.ts` gains a post-processing step that rewrites any link with a `src:` scheme to a full GitHub permalink computed against the current `BuildInfo`. Non-`src:` links pass through untouched.

Zero ceremony for authors, zero staleness for readers — every deployed page links to the exact source it describes.

## New catalog pages

### `catalog/architecture/llm-integrations.md`

Grouped by capability. Each entry is ~6 lines: purpose, model, public entrypoint link, invocation-site link (with line range), prompt link, experiment cross-link.

```
---
title: LLM Integrations
status: working
---

Intro: what counts as an LLM integration and how to read this page.

## Extraction
### PDF field extraction (form-documents)
### Tool-use extraction (form-documents)

## Shaping
### Form shaping (forms/shaping)

## Filling
### Conversational form filling (forms/filling-agent)

## Evaluation
### LLM-as-judge (evaluation)

## Future
### Retrieval-augmented generation
  - Not yet implemented; tracked in experiments roadmap.
```

The full capability list to document on first pass:

- Extraction → `form-documents/extraction.ts`, `form-documents/tool-use-extraction.ts`, `extraction/registry.ts`
- Shaping → `forms/shaping/bedrock-shaper.ts` (plus registry)
- Filling → `forms/filling-agent/bedrock.ts`
- Evaluation → `evaluation/judge.ts`
- Future → RAG placeholder with link to `catalog/experiments/_roadmap.md`

### `catalog/architecture/navigation.md`

```
---
title: Navigating the codebase
status: working
---

## The three layers
One sentence each, matching software-architecture.md.

## Service public interface
`src/services/<name>/index.ts` is the only public entrypoint.
External code imports from 'services/<name>', never deeper.

## Finding things
- "Where does X live?" → `src/services/` folder names are intents.
- "What can service Y do?" → `services/<Y>/index.ts` re-export list is the API.
- "Find every X in the system" → see the catalog. Example: LLM integrations.

## When to add a service
Pointer to architecture principles.
```

### `catalog/architecture/software-architecture.md` update

Add a subsection under "Structure" titled "Service public interface" (3-5 sentences) stating the convention, pointing at `navigation.md` for the full explainer and `test/architecture/dependency-rule.test.ts` for enforcement.

## Dependency-rule test extension

Extend `test/architecture/dependency-rule.test.ts` with a new rule (in addition to the existing layer rule):

> Files under `src/services/<A>/**` (with `A !== B`), `src/entrypoints/**`, and `src/design-system/**` may import from `src/services/<B>/` only via the public entrypoint — i.e. the resolved specifier must end at `services/<B>` or `services/<B>/index.ts`. Deeper paths fail.

Intra-service imports (`services/<A>/**` importing `services/<A>/**`) remain unrestricted.

Implementation sketch: for each parsed import, if the target resolves inside a different service's folder, assert the specifier targets the service root (no trailing path segments).

Violation format: `file:line: deep import 'services/forms/shaping/registry' — use 'services/forms' instead`.

## Order of operations

To keep `bun run check` green at every commit:

1. Add `index.ts` to every service that lacks one — pure additions, no consumers change.
2. Move orphan files (`storage.ts`, `user-store.ts`, `project-service.ts`, `form-project-repo.ts`) into services; update re-exports; rewrite imports of the moved paths.
3. Move `strategy-registry.ts` to `src/shared/`; rewrite imports.
4. Add `build-info.ts` and `githubPermalink()` helper; wire `BUILD_GIT_SHA` through deploy script; add markdown `src:` rewriter.
5. Rewrite remaining entrypoint and cross-service imports to go through service `index.ts` files.
6. Write `catalog/architecture/llm-integrations.md` (using `src:` links).
7. Write `catalog/architecture/navigation.md` and update `software-architecture.md`.
8. Extend `dependency-rule.test.ts` with the new cross-service rule — last, since it would fail before step 5 completes.

## Acceptance criteria mapping

- AC 1 (catalog page enumerates every LLM touchpoint with deep links) → step 6.
- AC 2 (single public-interface entrypoint per service) → steps 1, 2.
- AC 3 (architecture doc updated) → step 7.
- AC 4 (imports enforced through public entrypoint) → steps 5, 8.
- AC 5 (catalog pages link to public entrypoint on GitHub, permalinked) → steps 4, 6.
- AC 6 ("how to navigate" section with LLM page as example) → step 7.
- AC 7 (no behavior change; tests pass) → preserved by the order of operations.

## Testing

- **Unit: `githubPermalink()`** — SHA path, branch path (dirty), with/without line range, single-line vs range.
- **Unit: markdown `src:` rewriter** — plain link, link with line range, non-`src:` links pass through, malformed `src:` URLs emit a warning.
- **Unit: `getBuildInfo()`** — env-var path, git-fallback path, dirty-detection path. Mock `child_process` for the git calls.
- **Architecture: extended dependency-rule test** — positive cases (deep cross-service import fails), negative cases (intra-service import OK, entrypoint-to-`index.ts` OK).
- **Existing tests** — `bun run check` stays green at every commit.

## Risks and mitigations

- **Risk: circular imports when collapsing re-exports.** Each new `index.ts` may re-export types that previously came from cross-service deep imports. Mitigation: land `index.ts` additions before rewriting callers (step 1 before step 5); `tsc --noEmit` catches cycles.
- **Risk: `forms/index.ts` becomes an unreadable wall of re-exports.** Mitigation: group by sub-module with comment headers (`// --- resolver`, `// --- session`, `// --- shaping`, etc.). The length is itself the signal, but it should scan.
- **Risk: `BUILD_GIT_SHA` not set in production.** Mitigation: fall back to `git rev-parse HEAD` at startup (the deployed worktree is a git worktree, so this works even if the env var is missing); `"unknown"` is the last resort, with a visible warning.
- **Risk: merge conflicts with in-flight branches.** Mitigation: this story reshapes imports across many files; coordinate merge order with `story-9/fixes` (the only other in-flight branch). Prefer to land this after story-9 fixes merge.

## Open questions

None.
