# Clean Architecture Refactoring

Route-driven refactoring of the entire codebase to enforce thin controllers, rich services, and correct dependency direction per P1-P4 architecture principles.

## Context

Audit identified business logic leaked into route handlers, duplicated cross-cutting patterns, and service public interfaces that expose implementation details. The forms route (927 lines) is the worst offender, with page visibility logic, submission orchestration, conversation management, and PDF generation all living in the controller layer.

## Approach

Route-driven (Option C): start from caller needs to define service interfaces. Work bottom-up within four phases: cross-cutting cleanup, forms domain extraction, owner/authoring extraction, infrastructure service cleanup.

## Constraints

- Branch off story-87/rag-authoring-pipeline (never touch main or deployed server)
- Every extraction is a pure refactoring (same behavior, different location)
- `bun run check` must pass after each phase
- Dependency-rule test catches P2 violations automatically

---

## Phase 1: Cross-cutting cleanup

### 1a. Owner project guard middleware

Create `src/entrypoints/app/middleware/require-project-owner.ts`.

Responsibilities:
- Extract `owner`, `slug`, `branch` from route params
- Verify authentication (throw UnauthenticatedError if missing)
- Reject main-branch writes (return 403)
- Load project view via ProjectService, check `isOwner`
- Set `view` on Hono context for downstream handlers

Used by: authoring routes, edit mutation routes. NOT used by compare/read-only routes (different access rules).

### 1b. Badge resolution utility

Add to `src/services/variant-preferences/`:

```typescript
resolveVariantBadge(registry: VariantRegistry, variantId: string): { variantId: string; variantName: string }

resolveShapingBadgeFromLog(log: ShapingLogEntry[], registry: StrategyRegistry): { variantId: string; variantName: string } | null
```

Eliminates 3 duplicated implementations across owner/index.tsx, edit/index.tsx, compare/index.tsx. Each currently reimplements: find entry in registry list, extract name, fall back to raw ID.

### 1c. JSON API error middleware

Create `src/entrypoints/app/middleware/json-errors.ts`.

Hono error handler for JSON API routes:
- Catches thrown errors
- Maps AppError subclasses to status codes
- Returns `{ error: string }` JSON responses
- Logs with route context

Replaces ~60 lines of duplicated try/catch across authoring.tsx and edit/index.tsx JSON endpoints.

---

## Phase 2: Forms domain extraction

### 2a. Move visibility functions into forms service

Move `filterVisibleGroups()` and `buildReviewPages()` from `src/entrypoints/app/routes/forms/index.tsx` into `src/services/forms/visibility.ts`.

These are pure functions composing `evaluateCondition` — they belong alongside the existing navigation exports (countVisiblePages, findNextPage, findPrevPage, visiblePageNumber).

Export from `src/services/forms/index.ts`.

### 2b. submitForm() orchestration

New file: `src/services/forms/submission.ts`

```typescript
interface SubmitFormDeps {
  sessionGateway: FormSessionGateway
  submissionGateway: SubmissionGateway
  specSnapshotStore?: SpecSnapshotStore
}

function submitForm(deps: SubmitFormDeps, sessionId: string, specs: ResolvedSpecs): Submission
```

Encapsulates: session submit, submission save, spec snapshot cache. Route calls this one function and redirects.

### 2c. getSubmissionContext() retrieval

Same file (`submission.ts`):

```typescript
interface GetSubmissionContextDeps {
  specSnapshotStore?: SpecSnapshotStore
  getSpecs: (specId: string, ref?: string) => Promise<ResolvedSpecs | null>
  sessionGateway: FormSessionGateway
}

function getSubmissionContext(deps, sessionId: string): { dataSpec, formSpec, session, submission? } | null
```

Encapsulates snapshot-first-then-live-fallback lookup + session ownership verification.

### 2d. generateFilledPdf() orchestration

Same file (`submission.ts`):

```typescript
async function generateFilledPdf(
  submission: Submission,
  getSourcePdf: (specId, specVersion) => Promise<Buffer | null>,
  getFieldMapping: (specId, specVersion) => Promise<FieldMapping | null>,
): Promise<Buffer | null>
```

Chains: fetch source PDF, fetch field mapping, call fillPdf. Route just sets response headers.

### 2e. Conversation service methods

New file: `src/services/forms/conversation.ts`

```typescript
function initializeConversation(
  gateway: ConversationGateway,
  agent: FillingAgent,
  sessionId: string,
  page: ResolvedPage,
  fields: Record<string, FieldEntry>,
): Promise<ConversationMessage[]>

function advanceConversation(
  gateway: ConversationGateway,
  agent: FillingAgent,
  sessionGateway: FormSessionGateway,
  sessionId: string,
  page: ResolvedPage,
  fields: Record<string, FieldEntry>,
  userMessage: string,
): Promise<{ message: string; finished: boolean }>

function isConversationFinished(messages: ConversationMessage[]): boolean
```

Moves: initial greeting generation, message appending, field update, completion detection (currently string-matching "complete"/"all set" in the route).

---

## Phase 3: Owner/authoring domain extraction

### 3a. Apply owner guard middleware to authoring routes

Replace the repeated 8-line auth/permission/branch check in all 7 authoring handlers with the `requireProjectOwner` middleware from Phase 1. Each handler reads `view` from context.

### 3b. Authoring pipeline owns corpus loading

Currently each authoring route handler calls `loadPolicyCorpus({ slug: 'snap-wisconsin' })` directly. Move corpus loading into the form-authoring service:

```typescript
createAuthoringPipeline(options: { projectSlug: string }): AuthoringPipeline
```

The pipeline resolves its own corpus internally. Routes pass project context, not raw policy chunks. This also makes it possible to support per-project corpora without changing routes.

### 3c. Move composeExplanation to forms/shaping

`composeExplanation()` (edit/index.tsx lines 325-340) iterates commands, humanizes each, executes batch to track progressive state. This is shaping business logic.

Move to `src/services/forms/shaping/humanize.ts` (alongside existing `humanize` function). Export from forms service index.

### 3d. Extract shapeWithPreference orchestration

The intent handler (edit/index.tsx lines 171-193) resolves user variant preference, gets shaper from registry, calls shape, looks up metadata. Extract to forms/shaping:

```typescript
async function shapeWithPreference(
  registry: StrategyRegistry<FormShaper>,
  preferences: VariantPreferencesService | undefined,
  userLogin: string,
  intent: string,
  state: ProjectState,
  previousAttempt?: { commands: Command[]; feedback: string },
): Promise<{ commands: Command[]; explanation: string; variantId: string; modelId?: string }>
```

Route just parses the request body and calls this.

---

## Phase 4: Infrastructure service cleanup

### 4a. Storage service — separate interface from implementation

Current `index.ts` imports `Database` from `bun:sqlite` at module level, exposing the implementation choice.

Refactor:
- Create `src/services/storage/types.ts` — define `CacheStore` and `ProjectStore` interfaces
- Move SQLite code to `src/services/storage/sqlite-cache-store.ts` and `sqlite-project-store.ts`
- `index.ts` re-exports interfaces + factory functions only

Result: callers import `CacheStore`/`ProjectStore` types and `createCacheStore()`/`createProjectStore()` factories without seeing SQLite.

### 4b. Extraction service — hide model constants

Current public exports include `HAIKU_MODEL_ID`, `NOVA_PRO_MODEL_ID`, `OPUS_MODEL_ID`, `SONNET_MODEL_ID`. These are infrastructure configuration.

Usage: consumed by `src/entrypoints/cli/commands/evaluate.ts` and `src/services/forms/shaping/registry.ts` (both are entrypoint-level or cross-service configuration). Since these are consumed at the composition root (CLI) and registry setup, they are appropriate as public exports. Keep them but move from a raw constants export to a `models` namespace or object:

```typescript
export const models = { HAIKU: '...', SONNET: '...', OPUS: '...', NOVA_PRO: '...' } as const
```

This groups them under a single intent-revealing export rather than 4 separate constants.

### 4c. Evaluation service — semantic export grouping

Reorder `index.ts` exports with clear sections:

```typescript
// Harness
export { runEvaluation } from './harness'
export { evaluationRunSchema } from './schemas'
export type { RunResult } from './types'

// Kinds (pluggable evaluation strategies)
export { pdfFieldExtractionKind } from './kinds/pdf-field-extraction'
export { createLlmJudgeKind } from './kinds/pdf-field-extraction-judge'
export { shapingCommandsKind } from './kinds/shaping-commands'

// Judges
export { createBedrockFieldJudge } from './judge'

// Fixtures (test infrastructure — consider moving to test/)
export { fixtureProjectState, shapingIntentFixtures } from './fixtures/shaping-intents'
```

Assess whether fixtures belong in the public interface or should move to `test/fixtures/`.

### 4d. Forms service — reorganize index.ts

Group 28+ exports into semantic sections:

```typescript
// Navigation & visibility
export { countVisiblePages, filterVisibleGroups, ... } from './navigation'
export { buildReviewPages } from './visibility'

// Resolution & validation
export { evaluateCondition, resolveFormSpec } from './resolver'
export { validateFields } from './validation'

// Submission & sessions
export { submitForm, getSubmissionContext, generateFilledPdf } from './submission'
export { createSessionGateway } from './sqlite-session-gateway'
export { createSubmissionGateway } from './sqlite-submission-gateway'
export { createSpecSnapshotStore } from './spec-snapshot-store'

// Conversation (filling)
export { initializeConversation, advanceConversation, ... } from './conversation'
export { createConversationGateway } from './filling-agent'
export { createFillingRegistry } from './filling/registry'

// Shaping
export { commandSchema, executeBatch, humanize, composeExplanation } from './shaping/...'
export { shapeWithPreference } from './shaping/...'
export { createShapingRegistry } from './shaping/registry'

// Comparison
export { compareSpecs } from './comparison'

// Review
export { createReviewService } from './review'

// Types
export type { ... } from './types'
```

Rename concrete class exports to factory functions:
- `SqliteConversationGateway` → `createConversationGateway`
- `SqliteFormSessionGateway` → `createSessionGateway`
- `SqliteSubmissionGateway` → `createSubmissionGateway`

Callers use the factory; the Sqlite prefix disappears from the public API.

### 4e. Deployment and notifications — no changes

Both services are infrastructure-specific with single consumers and single deployment targets. Their coupling to systemd, git paths, and HTTP is appropriate context. Abstracting them would add complexity without benefit.

---

## Phase 5: Form-authoring integration

### 5a. Form-authoring service owns orchestration

After Phase 3b, the authoring service creates its own pipeline with corpus. Extend this to fully own the workflow:

```typescript
interface AuthoringService {
  analyzeCriteria(projectSlug: string): Promise<CriteriaSet>
  updateCriteria(current: CriteriaSet, edits: CriteriaEdits): CriteriaSet
  approveCriteria(current: CriteriaSet, approver: string): CriteriaSet
  planStructure(projectSlug: string, criteria: Criterion[], state: ProjectState | null): Promise<PipelineResult>
  generateSection(projectSlug: string, groupId: string, groupTitle: string, criteria: Criterion[]): Promise<PipelineResult>
  evaluateSection(groupId: string, state: ProjectState, criteria: Criterion[]): Promise<EvalResults>
  detectStage(input: StageDetectionInput): AuthoringStage
}
```

Routes become thin: parse request, call service, serialize response. The service handles corpus loading, pipeline construction, and result formatting.

### 5b. RAG service — internal dependency

After 5a, `loadPolicyCorpus` is called by form-authoring service, not by routes. The RAG public interface stays clean for other potential consumers but is no longer a direct route dependency.

---

## What stays unchanged

- **Auth service** — clean interface, appropriate abstractions
- **Content service** — clean, single-responsibility
- **Data-collection service** — pure domain types
- **Design-system** — P4 already enforced by dependency rule test
- **Catalog routes** — already well-structured thin controllers
- **Settings route** — already thin
- **Deployment/notifications** — infrastructure services appropriate for their context

## Success criteria

- All route handlers are thin: parse request, call service, render/return response
- No business logic in routes (condition evaluation, orchestration, data assembly)
- Service public interfaces are intent-revealing (no Sqlite/Bedrock in export names)
- No duplicated cross-cutting patterns
- `bun run check` passes (lint + types + tests + dependency rule)
- File count increase is minimal (new files are mostly splits of existing logic)
