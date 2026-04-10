# Story 3: Maya Uploads a PDF and Reviews Extracted Specs

Design spec for GitHub issue #3.

## Overview

Maya uploads a government PDF form (or selects a demo fixture) and the system extracts structured data and form specs using Claude on Bedrock via the Vercel AI SDK. Results are cached in a shared SQLite database to avoid redundant API calls. Maya reviews the extracted specs with confidence indicators flagging uncertain fields.

## Data Layer

### Two-tier SQLite setup

- **Shared database** (e.g., `/srv/forms-lab/shared.db`) -- extraction cache. All branch deployments share results so the same PDF is never re-extracted.
- **Branch database** (e.g., `/srv/forms-lab/<branch>/data.db`) -- projects and any future branch-specific data.

In development, both can be local files in `data/`. Tests use in-memory SQLite (`:memory:`) through the same interfaces.

### Tables

**`cache`** (shared):

| Column     | Type    | Notes                          |
|------------|---------|--------------------------------|
| key        | TEXT PK | sha256(pdf content) + model ID |
| model      | TEXT    | Model identifier               |
| result     | TEXT    | JSON ExtractionResult          |
| created_at | INTEGER | Unix timestamp                 |

**`projects`** (branch):

| Column         | Type    | Notes                      |
|----------------|---------|----------------------------|
| id             | TEXT PK | UUID                       |
| name           | TEXT    | Project display name       |
| description    | TEXT    | Brief description          |
| status         | TEXT    | extracting, ready, error   |
| source_pdf     | BLOB    | Original uploaded PDF      |
| spec           | TEXT    | JSON DataCollectionSpec    |
| form_spec      | TEXT    | JSON FormSpec              |
| confidence     | TEXT    | JSON FieldConfidence[]     |
| created_by     | TEXT    | GitHub user ID             |
| created_at     | INTEGER | Unix timestamp             |
| updated_at     | INTEGER | Unix timestamp             |

### Interfaces

```typescript
interface CacheStore {
  get(key: string): CacheEntry | null;
  set(key: string, model: string, result: string): void;
}

interface ProjectStore {
  create(project: NewProject): Project;
  get(id: string): Project | null;
  list(userId?: string): Project[];
  update(id: string, changes: Partial<Project>): Project;
}
```

## PDF Extraction Service

### Interface

```typescript
interface PdfExtractor {
  extract(pdf: Buffer, options?: ExtractionOptions): Promise<ExtractionResult>;
}

interface ExtractionResult {
  spec: DataCollectionSpec;
  formSpec: FormSpec;
  confidence: FieldConfidence[];
}

interface FieldConfidence {
  fieldId: string;
  confidence: number; // 0-1
  flags?: string[];   // e.g., "ambiguous-type", "conditional-logic-unclear"
}
```

### Extraction Options

```typescript
interface ExtractionOptions {
  model?: string; // Bedrock model ID, defaults to Sonnet
}
```

### Implementation: BedrockPdfExtractor

- Uses AI SDK (`ai` + `@ai-sdk/amazon-bedrock`) with `generateObject()`
- Two calls per extraction:
  1. PDF + Zod schema -> `DataCollectionSpec` with confidence scores
  2. Extracted spec -> Zod schema -> default `FormSpec` with delivery mode suggestions
- Model configurable (default Sonnet, option for Opus)

### Caching: CachedPdfExtractor

Wraps any `PdfExtractor` implementation. Cache key = `sha256(pdf content) + model ID`.

- On cache hit: returns stored `ExtractionResult` from shared database
- On cache miss: delegates to inner extractor, stores result, returns it

Composition allows independent testing and easy swapping.

## Routes and User Flow

All project routes are behind `requireAuth()` middleware.

### `GET /projects`

Lists Maya's projects. Shows project name, status, creation date. "New Project" action links to `/projects/new`.

### `GET /projects/new`

New project page with two options:

1. **Demo fixtures** -- selectable cards showing available test forms (pardon application, others added over time). Fixture manifest at `fixtures/index.ts` maps slug to metadata.
2. **Upload** -- file input accepting PDF, using the existing `flex-file-input` component with `accept="application/pdf"`.

### `POST /projects`

Receives PDF (from fixture selection or file upload). Creates project record with `status: "extracting"`, kicks off extraction asynchronously, redirects to project detail page.

### `GET /projects/:id`

Project review page. Behavior depends on project status:

- **`extracting`** -- progress indicator ("Extracting form structure..."), page auto-refreshes every 3 seconds via `<meta http-equiv="refresh" content="3">` until status changes.
- **`ready`** -- full display of extracted specs:
  - DataCollectionSpec: fields organized by requirement group, showing types, validation rules, conditions
  - FormSpec: page layout, section grouping, delivery modes
  - Confidence indicators on low-confidence fields (color-coded badges/flags)
- **`error`** -- error message with option to retry

## Demo Fixtures

Directory: `fixtures/`

Contains test PDFs and a manifest:

- `fixtures/pardon-application.pdf` -- DOJ Application for Pardon After Completion of Sentence (24 pages)
- `fixtures/index.ts` -- maps slug to `{ name, description, filename }`

Additional fixtures can be added over time.

## Test Strategy

### Fixtures and ground truth

The pardon application PDF serves as both a demo form and the test fixture. A hand-verified `ExtractionResult` for this form is the ground truth baseline for evaluation.

### Test layers

- **Database:** In-memory SQLite through `CacheStore` and `ProjectStore` interfaces. Real SQL, ephemeral storage.
- **Extraction service:** `StubPdfExtractor` returns the hand-crafted ground truth result. No Bedrock calls in CI.
- **Cached extractor:** Tests cache hit/miss behavior using in-memory SQLite + stub extractor.
- **Routes:** Integration tests via Hono test client with stub extractor injected. Covers: project creation from fixture, project creation from upload, project listing, project detail with results, project detail during extraction (progress state).
- **Confidence display:** Low-confidence fields render appropriate indicators.

### Manual testing

Real Bedrock extraction tested during development. Cached result becomes the test fixture after manual verification.

## Dependencies

New packages:

- `ai` -- Vercel AI SDK core
- `@ai-sdk/amazon-bedrock` -- Bedrock provider
- `zod` -- schema validation (used by AI SDK's generateObject)

No new packages for SQLite (`bun:sqlite` is built in).

## Out of Scope

- Catalog display of extracted specs (reconsidered later)
- Editing extracted specs (story #4)
- Publishing/review workflow (story #5)
- Session storage in database (handled separately)
- Submissions table (story #6)
