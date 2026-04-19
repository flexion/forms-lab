# Story 10 — Maya Chooses How Her Form Was Extracted

**Date:** 2026-04-18
**Status:** design
**Trunk of:** experiment roadmap (parent of stories 11–18)

## Problem

Forms Lab has several LLM touchpoints (extraction, shaping, filling, field-mapping) and multiple candidate models for each. Today, the choice is hard-coded (Sonnet for extraction) and invisible to Maya. To tell a compelling LLM story for the class presentation, Maya must be able to see *which* model produced each artifact, understand what that choice means, switch the choice, and re-run with the new variant. The experiments that demonstrate class techniques (model selection, RAG, fine-tuning, prompt optimization) hang off this picker.

This story delivers the picker for one task — extraction — and ships the reusable infrastructure every subsequent experiment story will reuse. Later stories plug their own tasks into the same picker, the same registry pattern, and the same provenance convention.

## User-visible behavior

Maya signs in, opens a project, and sees a new badge next to the extracted spec:

> **Extracted by Claude Sonnet 4** · [change →](/settings/variants?task=extraction)

She clicks the link and lands on **Settings → Variants**. The page shows a table of LLM tasks. Today only one task — `extraction` — is enabled. The row shows three variants (Opus, Sonnet, Haiku) with one-line descriptions and a "Learn more" link to each variant's catalog page. Maya selects Haiku and saves. A confirmation message notes the change takes effect on the next extraction.

Maya re-uploads a PDF. The new spec has the badge **Extracted by Claude Haiku 4.5**. Both extractions leave provenance in the project repo. The fixture-expanded evaluation suite in the catalog now has more PDFs to separate the variants meaningfully.

## Scope

### In scope

- Generic `VariantRegistry<T>` + per-task factory conventions
- `variant-preferences` service backed by SQLite (per user, per task)
- `/settings/variants` picker page, extraction tab only
- Inline "change" badge pattern used on spec display pages
- Provenance file convention at `forms/<slug>/provenance.json`
- Fixture expansion (2 additional PDFs with reviewed ground truth)
- Wiring extraction call sites to read variant from preferences
- Updated extraction catalog pages with links back to the picker

### Out of scope (shipped in later stories)

- Shaping picker tab (Story 11)
- Filling picker tab (Story 12, blocked on story 9)
- Field-mapping picker tab (Story 13, blocked on story 7)
- RAG, LoRA, few-shot, prompt-opt, tool-use variants (Stories 14-18)
- `start-experiment` and `run-experiment-roadmap` skills (deferred until the picker pattern exists in code)
- Live side-by-side variant comparison in the UI (comparisons live in the catalog)
- Per-action variant selection (picker is per-task only)

## Architecture

### Generic variant registry

Today `src/services/strategy-registry.ts` provides a generic `StrategyRegistry<T>` with `register`, `list`, `get`, `setDefault`, `getDefaultId`, and metadata including `name`, `description`, `status`, `courseTopics`, `catalogPath`, `modelId`. The existing shape already matches what we need. We keep the class and its metadata as-is, exporting a `VariantRegistry<T>` alias and a shared `VariantMetadata` type alias to name the concept at its new callers. No breaking change to today's extraction-registry consumers.

```typescript
// src/services/strategy-registry.ts (additive)
export type VariantRegistry<T> = StrategyRegistry<T>
export type VariantMetadata = StrategyMetadata
```

Per-task registries are plain factory functions that return `VariantRegistry<T>` with the task's variants registered. To avoid colliding with in-flight story-7 (which renames `ingestion/` to `form-documents/`), Story 10 leaves the extraction registry at its current path. Story 11+ pick the new name up after rebase.

- `src/services/extraction/registry.ts` (unchanged from main today; Story 10 adds `catalogPath` entries if missing, nothing else)
- `src/services/forms/shaping/registry.ts` — stub with Sonnet variant only (fleshed out in Story 11)
- `src/services/forms/filling/registry.ts` — stub (fleshed out in Story 12)
- `src/services/mapping/registry.ts` — stub (fleshed out in Story 13; relocated into form-documents when story 7 lands)

Only the extraction registry has variants wired to real implementations; the other three are empty stubs so the picker page can render empty tabs without crashing and so Stories 11–13 have a predictable place to extend.

**Task identifier.** A `Task` string union across the codebase:

```typescript
type Task = 'extraction' | 'shaping' | 'filling' | 'field-mapping'
```

Lives in `src/services/variant-preferences/types.ts` alongside the preferences service.

### Variant preferences service

A new service `src/services/variant-preferences/`:

```
src/services/variant-preferences/
  types.ts           — Task type, VariantPreference, VariantPreferencesGateway interface
  sqlite-gateway.ts  — SQLite-backed gateway
  service.ts         — createVariantPreferencesService(gateway, registries)
  index.ts           — public API
```

**Schema.** Added to existing SQLite instance:

```sql
CREATE TABLE IF NOT EXISTS user_variant_preferences (
  user_login TEXT NOT NULL,
  task TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_login, task)
);
```

**API.** The service exposes:

```typescript
interface VariantPreferencesService {
  get(userLogin: string, task: Task): string  // returns registry default if unset
  set(userLogin: string, task: Task, variantId: string): void  // validates variant exists in registry
  list(userLogin: string): Record<Task, string>
}
```

The service owns validation: `set` rejects unknown `variantId` for the given `task` by consulting the appropriate registry. This keeps the SQLite gateway dumb and the registries authoritative.

### Picker page

Route: `GET /settings/variants`, `POST /settings/variants`. Auth-required via existing middleware. Server-rendered JSX, no client runtime.

The page renders one section per `Task`. Each section lists the task's variants as radio buttons with name, description, and a "Learn more →" link to `variant.catalogPath`. The currently-selected variant is pre-checked. A single "Save changes" button POSTs the whole form; the handler updates each changed preference and redirects back with a flash confirmation.

For this story, only the `extraction` section has variants. The other three sections render an empty-state message: "No variants yet — coming in Story NN." This keeps the page structure stable so Stories 11–13 just fill in rows.

URL query `?task=extraction` scrolls / focuses that section. This is what the inline "change" badge links to.

### Inline badge

New component: `src/design-system/components/flex-variant-badge/`. Props:

```typescript
interface VariantBadgeProps {
  task: Task
  variantId: string
  variantName: string
}
```

Renders:

```
Extracted by Claude Sonnet 4 · <a href="/settings/variants?task=extraction">change →</a>
```

The verb is derived from the task (`extraction → "Extracted by"`, `shaping → "Shaped by"`, `filling → "Guided by"`, `field-mapping → "Mapped by"`). This keeps the badge reusable across Stories 11–13.

The badge is rendered wherever an LLM-produced artifact is shown. For this story, that means the spec preview page (`/edit/:slug` review pane and `/forms/<slug>` landing). Add the badge at a single insertion point per view, driven by reading provenance (see below).

### Provenance

Every LLM-produced artifact records which variant produced it. For extraction, provenance is persisted to the project's form repo at `forms/<slug>/provenance.json`:

```json
{
  "extraction": [
    {
      "variantId": "sonnet",
      "modelId": "us.anthropic.claude-sonnet-4-20250514-v1:0",
      "timestamp": "2026-04-18T21:30:00Z",
      "specVersion": "abc1234..."
    }
  ]
}
```

The file is a log, not a single record — every re-extraction appends. The most recent entry is what the badge reads. Keys under the root object are `Task` names, so Stories 11–13 append to `shaping`, `filling`, `mapping` sections of the same file.

Provenance writing lives in a tiny helper `src/services/variant-preferences/provenance.ts` that takes `{ projectSlug, task, entry }` and appends via the existing `form-project-repo` git gateway. Reading is via a mirror helper.

### Wiring the extraction call sites

Plan step one is to grep `createExtractorRegistry` / `createCachedPdfExtractor` / `registry.get(` to enumerate every call site and list them in the implementation plan. Each site:

```typescript
const variantId = variantPreferences.get(user.login, 'extraction')
const extractor = extractionRegistry.get(variantId)
const result = await extractor.extract(pdfBuffer)
await recordProvenance({ projectSlug, task: 'extraction', entry: { variantId, modelId, timestamp, specVersion } })
```

Plan captures the exact sites; design leaves this abstract so the plan step can enumerate current state against current code. This is the only behavior-change surface in the app for Story 10. Everything else is additive.

### Fixture expansion

Two more PDFs in `fixtures/`. Selection criteria:
1. AcroForm fields (so field-mapping experiments work later)
2. Varying complexity (one simpler than pardon, one comparable)
3. Public, government-origin, no PII concerns
4. Under ~20 pages so Opus ground-truth generation stays under a few minutes

Candidate list (first two that meet criteria):
- USCIS Form I-9 — simple, well-known, short
- IRS Form W-9 — very simple, AcroForm present, fast to evaluate
- SSA Form SS-5 — medium complexity
- VA Form 21-526EZ — comparable to pardon in complexity

Initial selection: **I-9 and W-9**. Both short, both AcroForm, both simple. If the ground-truth review surfaces a blocker, I'll swap in SS-5 or 21-526EZ.

Ground truth: generated via the existing `bun run cli evaluate ground-truth <slug>` using Opus, then reviewed manually per the existing workflow. Mark `manifest.reviewed = true` once done.

Expanded fixture set triggers one re-run of `evaluate compare` and updates to each existing variant's catalog page (`haiku.md`, `sonnet.md`, `opus-baseline.md`).

### Catalog updates

Each extraction variant's catalog page (`catalog/experiments/pdf-field-extraction/<variant>.md`) gains a short "Available via picker" paragraph pointing Maya to `/settings/variants?task=extraction`. The `_suite.md` gains a "Variants are user-selectable via the settings picker" note.

## Dependencies

**Library additions:** none. Uses existing Bun SQLite, Hono JSX, pdf-lib (already present).

**Services touched:**
- `src/services/storage.ts` — additive migration for `user_variant_preferences` table
- `src/services/strategy-registry.ts` — additive type aliases (`VariantRegistry`, `VariantMetadata`)
- `src/services/extraction/registry.ts` — unchanged for Story 10; gains new metadata entries in later stories
- App entrypoint `src/entrypoints/app/server.tsx` — wires the new preferences service into the app container

Story 10 branches from main. It can run in parallel with in-flight story-7/8/9 because changes don't overlap: a new service directory, a new settings route, a new SQLite table, and an additive type alias. Merge conflict surface is minimal.

**Blocks:** Stories 11, 12, 13, 14, 15, 16, 17, 18.

## Test strategy

**Unit tests:**
- `variant-preferences` service: set/get/list, unknown-variant rejection, default fallback
- `VariantRegistry` rename: existing tests still pass
- `flex-variant-badge` component: renders expected markup
- `provenance.ts` helpers: append + read via in-memory gateway

**Integration tests:**
- `GET /settings/variants` unauthenticated → redirect to sign-in
- `GET /settings/variants` authenticated → renders task sections, correct pre-selection
- `POST /settings/variants` updates preferences; redirect + flash
- New fixtures validate via `bun run cli evaluate validate`

**Manual verification before PR:**
- Upload a PDF, note badge shows "Sonnet 4"
- Change to Haiku on picker
- Upload another PDF, note badge shows "Haiku 4.5"
- Inspect `provenance.json` in the project repo, verify two entries
- Run `bun run cli evaluate compare` with fixtures, confirm each variant's catalog page updated

## Acceptance criteria

| AC | Implementation |
|----|----------------|
| Maya sees which variant extracted her spec | `flex-variant-badge` on spec display, reads last extraction provenance |
| Maya can change the extraction variant | `/settings/variants` picker, POST updates preference |
| Next extraction uses the chosen variant | Upload handler reads preferences service |
| Each extraction records provenance | `forms/<slug>/provenance.json` append on every extraction |
| Catalog explains each variant | Existing variant pages linked from picker and badge |
| Evaluation suite has more than one fixture | I-9 and W-9 added, ground truth reviewed |
| Subsequent experiment stories can reuse infra | Generic registry, generic preferences service, empty tabs stubbed |

## Open questions and deferred decisions

- **Multi-tenant semantics:** preferences are per-user, but extractions belong to projects. If Maya and a collaborator share a project, each re-extraction may use a different variant. Acceptable: provenance records the user's choice. Collaborators see honest history.
- **Caching:** extraction results are cached in `data/cache.sqlite` via `createCachedPdfExtractor`. The existing cache already keys on `modelId` — verify during implementation that switching variants (which changes `modelId`) produces a cache miss and real re-run. If it doesn't, add `variantId` to the cache key.
- **Empty-tab copy:** exact wording for empty task sections is a placeholder; finalize wording before merge.
- **Badge placement:** the design picks the spec preview page and the forms landing page as initial insertion sites; the implementation plan confirms the exact component files after reading current markup.

## Roadmap hook

This story is the trunk of the experiment roadmap. It does not create `notes/experiment-roadmap.yaml`, the `start-experiment` skill, or the coordinator skill — those are deferred to follow-on work after Story 10 lands, when the concrete pattern exists in code for them to codify.

A lightweight human-readable roadmap is included in this PR as `notes/experiment-roadmap.md` so Stories 11–18 have a shared reference and GitHub issues can link to it.
