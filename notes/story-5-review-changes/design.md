# Story 5: Maya Reviews Her Proposed Changes Before Publishing

## Overview

Maya needs to understand the impact of her form edits before promoting them to production. This story introduces a branch-based editing model, a PR-style review page with semantic diffs and side-by-side previews, and branch-qualified form URLs for testing non-production forms.

## Branch Model

Each project's bare git repo (`data/repos/<slug>.git`) gains multi-branch semantics:

- **`main`** is the published state. It is read-only in the editor. Forms served from `main` are production.
- **Named branches** are working copies Maya creates for editing. Multiple can coexist. Named freely (e.g., `add-military-service`, `reorder-pages`).
- When Maya opens the editor on `main`, she is prompted to create or select a branch before editing.

### Changes to story 4

Story 4 currently commits all shaping changes directly to `main`. With story 5, the editor commits to the active branch instead. The editor routes gain a branch parameter, and `FormProjectRepo` gains branch management methods: `createBranch`, `deleteBranch`, `mergeBranch`, `listBranches`.

### Impact on story 6

Form delivery reads specs from a git ref. Production forms use `main`; branch forms use the branch name. The delivery layer resolves the ref and is otherwise unaware of the distinction.

## Editor Branch UI

### Branch indicator in the editor header

When on a working branch:
- Green branch icon and name (e.g., `add-military-service`)
- Commits-ahead count (e.g., "3 commits ahead of main")
- "Create PR" button linking to the review page

When on `main`:
- Neutral branch icon with "published" badge
- "New Branch" button (editing is gated behind creating a branch)

### Branch switcher dropdown

Clicking the branch indicator opens a dropdown with:
- Search/filter input
- List of branches with ahead counts
- `main` labeled as "published"
- Current branch highlighted
- "Create new branch" action at the bottom

### Change indicators

The editor sidebar shows change markers on resources that differ from the base branch:
- Orange dot for modified resources (DataCollectionSpec, FormSpec, individual pages)
- "new" label for added pages

## Review Page

Located at `/:owner/:slug/compare/:base...:branch` following GitHub conventions.

### Header

- Branch name as title
- Merge direction indicator (e.g., "main <- add-military-service")
- Commit count and resource change count
- "Merge to main" and "Close" action buttons
- Link back to the editor ("Open in editor")

### Tabs

Four tabs: **Changes**, **Preview**, **History**, **Comments**

#### Changes tab (semantic diff)

Displays a structural comparison between the two refs, grouped by resource:

**DataCollectionSpec changes:**
- Requirement groups: added, removed, renamed
- Fields within groups: added, removed, reordered, modified (required, type, sensitivity, conditions, label)

**FormSpec changes:**
- Pages: added, removed, reordered, renamed
- Group assignments within pages: moved groups between pages
- Delivery mode changes per page
- Condition changes

Each change shows a category badge (ADDED, REMOVED, MODIFIED, MOVED, RENAMED) and a human-readable description.

#### Preview tab (side-by-side)

Two rendered form previews side by side:
- Left: base branch (e.g., `main`) labeled with branch name and "published" badge
- Right: head branch labeled with branch name
- Added/changed elements highlighted on the right side

#### History tab (command log)

Timeline of shaping log entries between the two refs:
- Timestamp and source (LLM-assisted or manual)
- Human-readable explanation of each change
- Provides narrative context for why changes were made

#### Comments tab

Threaded comments with author, timestamp, and markdown body. Supports replies via `parentId`. Comments are stored in the branch's bare repo at `reviews/<base>---<branch>/comments.json` and committed to the source branch.

### Actions

- **Merge**: Fast-forward merge of the source branch into the target branch in the bare project repo. The branch is retained after merge (can be deleted separately).
- **Close**: Deletes the source branch and its review artifacts.

## Semantic Diff Engine

Located in `src/services/forms/comparison/`.

### Design

The comparison service is pure: it takes two spec snapshots and returns a list of changes. No git awareness -- the route handler resolves refs to snapshots before calling it.

### SpecChange type

Each change has:
- `category`: ADDED | REMOVED | MODIFIED | MOVED | RENAMED
- `resource`: which spec (DataCollectionSpec or FormSpec)
- `path`: hierarchical path to the changed element (e.g., page > group > field)
- `description`: human-readable description of the change
- `details`: optional additional context (e.g., field count for added groups)

### Algorithms

**DataCollectionSpec differ:**
1. Compare requirement groups by ID
2. For each matched group, compare fields by ID
3. Detect: added/removed groups, renamed groups, added/removed/reordered/modified fields

**FormSpec differ:**
1. Compare pages by ID
2. For each matched page, compare group assignments and properties
3. Detect: added/removed/reordered/renamed pages, moved groups, delivery mode changes, condition changes

## Branch-Qualified Form Testing

- **Production URL**: `/:owner/:slug/forms` (serves from `main`)
- **Branch URL**: `/:owner/:slug/forms/:branch` (serves from that branch's specs)

Non-production forms display a persistent amber banner: "You are viewing a preview on branch **{branch}**. Submissions will reference this version."

Submissions work identically to production. The `specVersion` field records the exact commit SHA from the branch, making submissions traceable to the source version.

## Comments

Comments are stored in the bare project repo at `reviews/<base>---<branch>/comments.json`, committed to the source branch. Each comment has:

- `id`: unique identifier
- `author`: user who wrote the comment
- `timestamp`: ISO 8601
- `body`: markdown content
- `parentId`: optional, for threading

Comments travel with the branch and are cleaned up when the branch is deleted. The agentic extension (LLM reads comments to drive form evolution) is deferred to issue #52.

## New Service Boundaries

- **`src/services/forms/comparison/`** -- Structural diff engine for DataCollectionSpec and FormSpec. Pure functions, no side effects.
- **`src/services/forms/review/`** -- Review/PR management: create, list, merge, close reviews. Comment CRUD. Depends on `FormProjectRepo` for git operations.
- **Branch management on `FormProjectRepo`** -- `createBranch`, `deleteBranch`, `mergeBranch`, `listBranches`, `getBranchDiff` (list changed files between refs).

## URL Routes

| Route | Purpose |
|-------|---------|
| `/:owner/:slug/compare/:base...:branch` | Review page |
| `/:owner/:slug/compare/:base...:branch/changes` | Changes tab data (JSON) |
| `/:owner/:slug/compare/:base...:branch/preview` | Preview tab data |
| `/:owner/:slug/compare/:base...:branch/comments` | Comments CRUD |
| `/:owner/:slug/forms/:branch` | Branch-qualified form delivery |
| `/:owner/:slug/edit` | Editor (gains branch parameter) |

## Open Questions

- Exact UX for the semantic diff will need iteration once we see it with real data.
- Branch naming conventions: enforce any restrictions, or free-form?
- Merge conflict handling: what happens if `main` has advanced since the branch was created? For now, merge only if fast-forwardable; otherwise show a message.
