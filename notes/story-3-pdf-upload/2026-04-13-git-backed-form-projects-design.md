# Git-Backed Form Project Storage

> Design spec for persisting form projects as git repositories, serving them read-only over HTTP, and exposing version history in the UI.

## Context

Story 3 requires extracted specs to be persisted as a FormProject in git. The forms-lab app is an authoring tool -- form projects are the output artifacts. Rather than storing specs in SQLite, each form project gets its own bare git repo managed by the app. Git is the source of truth for form specs; SQLite is a lightweight operational index.

This positions forms-lab as a "forms forge" -- a platform where form projects live, get versioned, and can be cloned by anyone. GitHub integration, multi-form projects, and an SDK for self-hosting are future work enabled by this foundation.

## Architecture

### Form project repos

Each form project is a bare git repo at `/srv/forms-lab/repos/<slug>.git`. The tree on `main`:

```
forms/
  <form-slug>/
    spec.json           # DataCollectionSpec
    form.json           # FormSpec
    confidence.json     # FieldConfidence[]
source/
  <filename>.pdf        # Uploaded PDF
project.json            # { name, description, createdBy, createdAt }
```

For this story, each project contains one form. The `forms/<slug>/` structure supports adding more forms per project later.

### Git service layer

A thin service wraps git CLI operations against bare repos. The app never checks out a working tree -- it operates directly on the bare repo's object store.

Interface:

```ts
interface FormProjectRepo {
  init(slug: string, metadata: ProjectMetadata): void
  commit(slug: string, files: FileEntry[], message: string, author: string): string
  readFile(slug: string, rev: string, path: string): Buffer | null
  listTree(slug: string, rev: string, path: string): TreeEntry[]
  log(slug: string, rev: string, path?: string, limit?: number): CommitEntry[]
}

type FileEntry = { path: string; content: Buffer }
type TreeEntry = { name: string; type: 'blob' | 'tree'; sha: string }
type CommitEntry = { sha: string; message: string; author: string; date: string }
```

Implementation uses `Bun.spawn` to call git commands:

| Operation | Git commands |
|-----------|-------------|
| `init` | `git init --bare`, then commit `project.json` |
| `commit` | `git hash-object -w`, `git mktree`, `git commit-tree`, `git update-ref` |
| `readFile` | `git show <rev>:<path>` (rev can be branch name, tag, or SHA) |
| `listTree` | `git ls-tree <rev> <path>` |
| `log` | `git log --format=... <rev> [-- <path>]` |

The repo base path is configurable: `REPOS_PATH` env var, defaulting to `data/repos` in development and `/srv/forms-lab/repos` in production.

### SQLite as operational index

The ProjectStore in SQLite becomes a thin index. It no longer stores specs, formSpecs, confidence, or source PDFs.

Columns:

| Column | Purpose |
|--------|---------|
| `id` | Primary key (UUID) |
| `slug` | URL-safe project identifier, unique |
| `name` | Display name |
| `status` | `extracting` / `ready` / `error` |
| `error` | Error message if extraction failed |
| `created_by` | GitHub login |
| `created_at` | Unix timestamp |
| `updated_at` | Unix timestamp |

The extraction cache table is unchanged.

### Read-only git HTTP

Caddy serves bare repos via `git-http-backend` for read-only clone access.

NixOS module adds:
- A CGI wrapper script that sets `GIT_PROJECT_ROOT=/srv/forms-lab/repos` and `GIT_HTTP_EXPORT_ALL=1`
- Caddy route: `/git/*` proxied to the CGI handler
- No push authentication (read-only; the app is the only writer)

Clone URL pattern: `https://<host>/git/<slug>.git`

### Version history

The project detail page includes a commit history section showing:
- Commit message, author, date, short SHA
- Scoped to the form's directory (`forms/<slug>/`)
- Clicking a past commit renders the spec as it was at that SHA (reuses existing SpecViewer/FormSpecViewer with data read at that ref)

No rendered diff between versions in this story -- Maya sees "what it looked like then" by viewing past snapshots.

## Lifecycle

### Create project

1. Maya names a project on `/projects/new`
2. App generates slug from name
3. App calls `repo.init(slug, metadata)` -- creates bare repo, commits `project.json`
4. App inserts index row in SQLite (slug, name, status=extracting, created_by)
5. App kicks off extraction (unchanged from today)

### Extraction completes

1. Extraction returns `{ spec, formSpec, confidence }`
2. App commits to the bare repo:
   - `forms/<form-slug>/spec.json`
   - `forms/<form-slug>/form.json`
   - `forms/<form-slug>/confidence.json`
   - `source/<filename>.pdf`
   - Commit message: `"Extract <form-name> from <filename>.pdf"`
3. App updates SQLite index: `status = 'ready'`

### View project

1. App reads `project.json` from git via `readFile(slug, 'main', 'project.json')`
2. App reads form specs from git: `readFile(slug, 'main', 'forms/<form>/spec.json')` etc.
3. Renders with existing SpecViewer/FormSpecViewer components
4. Shows commit history via `log(slug, 'main', 'forms/<form>/')`

### View past version

1. Maya clicks a commit SHA in the history
2. App reads specs at that commit: `readFile(slug, sha, 'forms/<form>/spec.json')`
3. Renders the same viewers with a banner: "Viewing version from <date>"

### Clone project

1. Project detail page shows clone URL
2. Anyone can `git clone https://<host>/git/<slug>.git`

## What changes from today

| Area | Before | After |
|------|--------|-------|
| Spec storage | SQLite `projects.spec` column | Git bare repo `forms/*/spec.json` |
| PDF storage | SQLite `projects.source_pdf` blob | Git bare repo `source/*.pdf` |
| ProjectStore | Full model with spec/formSpec/confidence/pdf | Thin index: slug, status, owner |
| Detail page reads | `projectStore.get(id)` | `projectStore.get(id)` + `repo.readFile(...)` |
| Extraction writes | `projectStore.update(id, { spec, ... })` | `repo.commit(slug, files, ...)` + `projectStore.update(id, { status })` |
| Version history | None | `repo.log()` + snapshot viewer |
| Clone access | None | Read-only git HTTP |

## What stays the same

- Extraction cache in SQLite
- Auth and sessions
- UI components (SpecViewer, FormSpecViewer)
- Extraction pipeline logic
- Upload and fixture flow

## Out of scope

- Multiple forms per project (structure supports it; UI/extraction flow deferred)
- Rendered diffs between versions
- GitHub push mirror
- Platform SDK / self-hosting
- Write access to git HTTP (push)
- Branch/PR workflows within form projects

## Infrastructure

### NixOS changes

- New module: `modules/git-http.nix` -- configures `git-http-backend` CGI for read-only access
- Modify: `modules/caddy.nix` -- add `/git/*` route
- Modify: `modules/deploy.nix` -- ensure `/srv/forms-lab/repos` directory exists with correct ownership

### Environment

- New env var: `REPOS_PATH` -- base directory for bare repos (default: `data/repos` dev, `/srv/forms-lab/repos` prod)
- Remove from deploy `.env`: no longer need `PROJECT_DB_PATH` for spec storage (SQLite still used for index)

## Testing

- Git service layer: unit tests against temp directories with bare repos
- Route integration: mock git service (same pattern as current mock ProjectStore)
- Version history: test log parsing and snapshot reads
- NixOS: manual verification after `nixos apply`
