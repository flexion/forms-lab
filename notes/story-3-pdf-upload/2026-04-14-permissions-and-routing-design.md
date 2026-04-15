# Permissions, User-Scoped Routing, and Fork

> Design spec for GitHub-style user-scoped URLs, ownership-based permissions enforced at the service layer, and project forking.

## Context

Form projects are now git-backed repos. The app needs a permissions model that makes projects publicly viewable while restricting mutations to owners. URLs should follow GitHub's conventions -- user-scoped, with familiar nouns (tree, blob, commits, settings). A service layer owns business logic and permission enforcement; route handlers are thin wrappers.

## Permissions Model

Three levels, derived from `createdBy` on the ProjectIndex:

| Level | Who | Capabilities |
|-------|-----|-------------|
| Public | Anyone, no auth | View project overview, browse tree/blob, view history/commits, clone via git |
| Authenticated | Logged in, not owner | Everything public + fork to own account |
| Owner | `createdBy === user.login` | Everything + settings (delete, rename, re-extract) |

No permissions table. Ownership is a simple string comparison. The future collaborator model adds a table when needed.

## Route Structure

```
/                                        # Landing (anon) or dashboard (authed)
/new                                     # Create project (authed)
/:owner                                  # Public profile — avatar, name, project list
/:owner/:slug                            # Project overview (rich spec views)
/:owner/:slug/tree/:ref/*path            # Browse tree at ref
/:owner/:slug/blob/:ref/*path            # View file at ref
/:owner/:slug/commits                    # Full commit history
/:owner/:slug/commit/:sha                # Single commit detail
/:owner/:slug/settings                   # Owner admin page (GET + POST)
/:owner/:slug/fork                       # Fork to own account (POST, authed)
/catalog/*                               # Unchanged
/auth/*                                  # Unchanged
/git/:slug.git/*                         # Read-only git HTTP (unchanged)
/health                                  # Unchanged
/static/*                                # Unchanged
```

### Route registration order

Specific routes register first to avoid conflicts with the `/:owner` catch-all:

1. `/`, `/new`, `/catalog/*`, `/auth/*`, `/health`, `/git/*`, `/static/*`
2. `/:owner/:slug/tree/*`, `/:owner/:slug/blob/*`, `/:owner/:slug/commits`, `/:owner/:slug/commit/:sha`, `/:owner/:slug/settings`, `/:owner/:slug/fork`
3. `/:owner/:slug` (project overview)
4. `/:owner` (user profile)

If `/:owner` doesn't match any user in the system, return 404. Same for `/:owner/:slug` if the project doesn't exist or `project.createdBy !== owner` (prevents accessing a project via the wrong owner's URL).

### Auth guards

| Route | Auth | Permission |
|-------|------|-----------|
| `GET /` | Optional | Anon sees landing, authed sees dashboard |
| `GET /new` | Required | Any authenticated user |
| `POST /new` | Required | Any authenticated user |
| `GET /:owner` | None | Public |
| `GET /:owner/:slug` | None | Public |
| `GET /:owner/:slug/tree/*` | None | Public |
| `GET /:owner/:slug/blob/*` | None | Public |
| `GET /:owner/:slug/commits` | None | Public |
| `GET /:owner/:slug/commit/:sha` | None | Public |
| `GET /:owner/:slug/settings` | Required + owner | Service throws ForbiddenError if not owner |
| `POST /:owner/:slug/settings` | Required + owner | Service throws ForbiddenError if not owner |
| `POST /:owner/:slug/fork` | Required + not owner | Service throws if unauthenticated or is owner |

## Service Layer

A `ProjectService` sits between routes and stores. It owns business logic: permission checks, git operations, state transitions. Routes parse requests and render responses.

### Interface

```ts
interface ProjectService {
  // Public reads
  getProject(owner: string, slug: string): ProjectView
  listUserProjects(owner: string): ProjectIndex[]
  getFileContent(owner: string, slug: string, rev: string, path: string): Buffer | null
  getTree(owner: string, slug: string, rev: string, path: string): TreeEntry[]
  getHistory(owner: string, slug: string, limit?: number): CommitEntry[]
  getCommit(owner: string, slug: string, sha: string): CommitDetail

  // Authenticated actions
  createProject(name: string, pdf: Buffer, user: SessionUser): ProjectIndex
  forkProject(owner: string, slug: string, user: SessionUser): ProjectIndex

  // Owner-only actions (throw ForbiddenError if user is not owner)
  deleteProject(owner: string, slug: string, user: SessionUser): void
  retryExtraction(owner: string, slug: string, user: SessionUser): void
}
```

### Permission enforcement

Every mutating method checks permissions before acting:

```ts
createProject(name, pdf, user) {
  if (!user) throw new UnauthenticatedError()
  // ... create repo, commit, index
}

deleteProject(owner, slug, user) {
  if (!user) throw new UnauthenticatedError()
  const project = this.store.getBySlug(slug)
  if (project.createdBy !== user.login) throw new ForbiddenError()
  // ... delete
}

forkProject(owner, slug, user) {
  if (!user) throw new UnauthenticatedError()
  if (owner === user.login) throw new BadRequestError('Cannot fork your own project')
  // ... clone bare repo, update metadata, create index
}
```

### Error types

```ts
class UnauthenticatedError extends Error {}  // → 401 or redirect to signin
class ForbiddenError extends Error {}        // → 403
class NotFoundError extends Error {}         // → 404
class BadRequestError extends Error {}       // → 400
```

Route handlers catch these and render appropriate responses. A shared error-handling middleware can map error types to HTTP status codes and render error pages.

### ProjectView

The service returns a `ProjectView` for the overview page -- a composite of the SQLite index and git content:

```ts
interface ProjectView {
  project: ProjectIndex
  spec: DataCollectionSpec | null
  formSpec: FormSpec | null
  confidence: FieldConfidence[] | null
  history: CommitEntry[]
  isOwner: boolean
  forkedFrom: { owner: string; slug: string } | null
}
```

The `isOwner` flag drives UI rendering (show settings link vs fork button). The route handler passes the requesting user to the service so it can compute this.

## Data Model Changes

### ProjectIndex (SQLite)

Add `forked_from` column:

```sql
ALTER TABLE projects ADD COLUMN forked_from TEXT;  -- 'owner/slug' or null
```

No other schema changes. `createdBy` is the owner. `slug` is the project name.

### project.json (git repo)

Optional `forkedFrom` field:

```json
{
  "name": "Pardon Application",
  "createdBy": "maya",
  "createdAt": "2026-04-14T...",
  "forkedFrom": {
    "owner": "danielnaab",
    "slug": "pardon-application"
  }
}
```

## Fork Mechanics

`POST /:owner/:slug/fork`:

1. Service verifies user is authenticated and not the owner
2. Generate slug for the fork (same slug, or append `-2` etc. if user already has one)
3. `git clone --bare` source repo to `repos/<fork-slug>.git`
4. Read `project.json`, add `forkedFrom` field, commit the update
5. Create SQLite index entry with `createdBy = user.login` and `forkedFrom = owner/slug`
6. Redirect to `/:user/:slug`

The fork is a full copy. No remote link to the original. Provenance is metadata only.

## User Profile

`GET /:owner` renders a public page:

- GitHub avatar and display name (fetched from the session if the viewer is the owner, otherwise we need a lightweight user lookup -- see below)
- List of their projects (name, status, date)
- "Forked from" badge on forked projects

### User lookup

The current system only stores `createdBy` (GitHub login) in projects. To render a profile for a user who isn't currently logged in, we need their avatar and display name.

Options:
1. Store user profile data in SQLite on first login (name, avatar, login). Query from there.
2. Fetch from GitHub API on demand (rate limits, latency).

Option 1 is better. Add a `users` table populated on OAuth login:

```sql
CREATE TABLE IF NOT EXISTS users (
  login TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

Upserted on each login. The profile page queries this table.

## Interlinking

Every noun the UI mentions is a link to its canonical URL:

### From the overview page

- "Extracted Data Requirements" heading links to `/:owner/:slug/blob/main/forms/<form>/spec.json`
- "Form Layout" heading links to `/:owner/:slug/blob/main/forms/<form>/form.json`
- Source PDF links to `/:owner/:slug/blob/main/source/<file>.pdf`
- Each commit in the summary links to `/:owner/:slug/commit/:sha`
- "View all history" links to `/:owner/:slug/commits`
- "Forked from" badge links to the source project's overview

### From tree/blob views

- Breadcrumb navigation: `owner / slug / tree / main / forms / petition`
- Each breadcrumb segment is a link (owner -> profile, slug -> overview, directories -> tree)
- File entries in tree link to their blob view
- Directories link to their tree view
- blob view of spec.json has a "View as form spec" link back to the overview

### From commit views

- Files changed link to blob view at that ref
- "Browse repo at this point" links to `/:owner/:slug/tree/:sha`

### From the profile page

- Each project name links to `/:owner/:slug`
- Forked projects show "forked from owner/slug" linking to the source

## UI Behavior

### Project overview — owner vs non-owner

Both see the same content: spec viewer, form layout viewer, history summary, clone URL.

**Owner sees:**
- Settings link (gear icon or "Settings" in the header)
- No fork button (you can't fork your own project)

**Non-owner sees:**
- Fork button in the header
- No settings link
- If authed: fork button is active
- If anon: fork button links to signin with returnTo

### Dashboard (authenticated home page)

- List of the user's own projects (same as current `/projects` list)
- "New Project" button
- Forked projects show provenance badge

### Settings page

GET renders a form with:
- Re-extract from source PDF (submit button)
- Delete project (confirmation required, destructive styling)
- (Future: rename, visibility, collaborators)

POST dispatches based on `action` form field.

## Testing

### Permission tests (service layer, unit)

These test the business rules without HTTP. Clean, fast, high confidence:

```
ProjectService.deleteProject
  - owner can delete their own project
  - non-owner gets ForbiddenError
  - unauthenticated gets UnauthenticatedError

ProjectService.forkProject
  - authenticated non-owner can fork
  - owner cannot fork own project (BadRequestError)
  - unauthenticated gets UnauthenticatedError
  - fork preserves source content
  - fork records provenance in project.json and SQLite

ProjectService.retryExtraction
  - owner can retry
  - non-owner gets ForbiddenError

ProjectService.createProject
  - authenticated user can create
  - unauthenticated gets UnauthenticatedError
```

### Route integration tests

These verify HTTP status codes and response content:

```
GET /:owner/:slug (public)
  - returns 200 for any user (authed or not)
  - returns 404 for nonexistent owner or slug

POST /:owner/:slug/settings (owner only)
  - owner gets 200/302
  - non-owner gets 403
  - unauthenticated redirects to signin

POST /:owner/:slug/fork (authenticated non-owner)
  - non-owner gets 302 redirect to fork
  - owner gets 400
  - unauthenticated redirects to signin

GET /:owner/:slug/settings (owner only)
  - owner sees settings form
  - non-owner gets 403

GET /:owner (profile)
  - returns 200 with project list
  - returns 404 for nonexistent user
```

### UI behavior tests

Verify the right elements render for each permission level:

```
Project overview
  - owner sees settings link, no fork button
  - non-owner sees fork button, no settings link
  - anon sees fork button linking to signin

Dashboard
  - authed user sees their projects
  - anon sees landing page
```

## Migration

Existing projects already have `createdBy` and `slug`. The migration:

1. Add `forked_from` column to projects table (nullable, no migration of existing data)
2. Create `users` table
3. Move routes from `/projects/*` to the new structure
4. Add redirects from old URLs for any bookmarks (optional, low priority since this is pre-production)

## Out of Scope

- Collaborators / shared access (future: permissions table with user + project + role)
- Organization accounts
- Private/unlisted projects (visibility settings)
- Pull requests between forks
- File editing via the web UI (future, follows `/:owner/:slug/edit/:ref/*path` pattern)
- Notifications on fork
