# Form Delivery UX Design

Story 6: Carlos fills out a published form

## Context

The form-filling flow (landing, page-by-page fill, review, submit, confirmation) is
fully implemented but has gaps in navigation, persistence, and post-submission UX.
This design addresses those gaps to make the end-to-end flow demoable.

## Decisions

- **SQLite persistence** for sessions and submissions (replaces in-memory gateways)
- **Auth required** for all form-filling routes (simplifies the demo)
- **Read-only review** for viewing completed submissions (reuses FormReview component)
- **Spec snapshots** cached by git SHA so submissions are self-describing

## Storage Schema

### spec_snapshots

Ephemeral cache keyed by git SHA. Can be rebuilt from git if cleared.

| Column | Type | Notes |
|--------|------|-------|
| spec_version | TEXT PK | Git SHA |
| spec_id | TEXT | Project spec identifier |
| data_collection_spec | TEXT | JSON blob |
| form_spec | TEXT | JSON blob |
| cached_at | TEXT | ISO timestamp |

### form_sessions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| spec_id | TEXT | Project spec identifier |
| form_spec_id | TEXT | Form spec identifier |
| owner_id | TEXT | GitHub user login |
| status | TEXT | 'active' or 'submitted' |
| fields | TEXT | JSON blob of field entries |
| spec_version | TEXT | Git SHA at session creation |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### form_submissions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| session_id | TEXT | FK to form_sessions |
| spec_id | TEXT | Project spec identifier |
| owner_id | TEXT | GitHub user login |
| data | TEXT | JSON blob of submitted field values |
| spec_version | TEXT | Git SHA, FK to spec_snapshots |
| submitted_at | TEXT | ISO timestamp |

### Implementation approach

- New `SqliteFormSessionGateway` and `SqliteSubmissionGateway` in `src/services/forms/`
- Implement the existing gateway interfaces
- Tables created via CREATE TABLE IF NOT EXISTS in constructor (same pattern as ProjectStore)
- In-memory implementations stay for tests
- New `SpecSnapshotCache` class for the snapshot table

## Navigation

### Header (logged in)

Home | Forms | Projects | Catalog

- **Forms** (`/forms`) -- form catalog and filling experience
- **Projects** (`/:login`) -- Maya's authoring workspace (unchanged)

### Header (anonymous)

Home | Forms | Catalog | Sign in

### Auth

All routes under `/forms` require authentication. The entire form router gets a single
auth middleware guard.

### /forms page (logged in)

- Form catalog table (existing)
- "My sessions" link/section at top, linking to `/forms/sessions`

### /forms/sessions page

- "In progress" section -- links to resume filling
- "Completed" section -- links to submission detail view

## Submission Detail View

### Route

GET /forms/sessions/:sessionId/submission

### Behavior

- Shows form title, submission date, submission ID as reference number
- Full review layout showing all answers organized by page/group
- Reuses FormReview component with a `readOnly` prop (suppresses "Change" links and submit button)
- Reads specs from spec_snapshots cache for the pinned spec_version
- Ownership check: session.ownerId must match logged-in user

## Out of Scope

- PDF download of completed submissions (story 7)
- Admin view of all submissions across users
- Submission search/filtering
- Anonymous form filling
