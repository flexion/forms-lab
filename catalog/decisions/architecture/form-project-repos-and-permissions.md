---
status: stable
tags: [architecture, persistence, permissions, git]
decided: 2026-04-14
---

# Form project repos and service-layer permissions

Each form project is a bare git repo managed by the app. A service layer owns the permission model, so route handlers are thin wrappers around `ProjectService` calls.

## Context

Story 3 required extracted specs to be persisted as a FormProject in git. A parallel requirement emerged for user-scoped URLs, ownership-based permissions, and forking. The existing `ProjectStore` kept specs, form specs, confidence arrays, and source PDFs as columns/blobs in SQLite. That worked for a prototype but did not give us the version history, branching, or collaboration semantics the platform needed, and it left no natural place to enforce permissions that did not leak into route handlers.

See the [git-as-persistence decision](git-as-persistence.md) for the higher-level principle this decision refines.

## Decision

**Form projects live in bare git repos.** Each project is a bare repo at `${REPOS_PATH}/<slug>.git`. The app never checks out a working tree — it operates on the bare repo directly via git plumbing commands (`hash-object`, `mktree`/`update-index`, `write-tree`, `commit-tree`, `update-ref`) invoked through `Bun.spawn`. A project's tree looks like:

```
forms/<form-slug>/{spec.json, form.json, confidence.json}
source/<filename>.pdf
project.json
```

**SQLite becomes an operational index.** The `ProjectStore` tracks project identity and status only: `id`, `slug` (unique), `name`, `status`, `error`, `created_by`, `forked_from`, timestamps. Spec content, PDFs, and confidence data live in the git repos. Reads for the project page fetch the SQLite row for status and metadata, then read file content from git via `FormProjectRepo.readFile(slug, rev, path)`.

**A `ProjectService` layer owns business logic and permissions.** Route handlers parse requests and call service methods; the service enforces ownership, orchestrates git and SQLite operations, and throws typed errors (`UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `BadRequestError`). Handlers catch these and map to HTTP status codes. The three permission levels are:

| Level | Who | Capabilities |
|-------|-----|-------------|
| Public | Anyone, no auth | View project, browse tree/blob, view history, clone via git HTTP |
| Authenticated | Logged in, not owner | Everything public + fork to own account |
| Owner | `createdBy === user.login` | Everything + settings (delete, rename, re-extract) |

Ownership is a string comparison against `createdBy`. There is no permissions table yet — collaborators and organizations are out of scope for this iteration.

**URLs are user-scoped.** Routes follow GitHub conventions: `/:owner/:slug` for the overview, `/:owner/:slug/tree/:ref/*` for browsing, `/:owner/:slug/commits` for history, `/:owner/:slug/settings` for owner administration, `/:owner/:slug/fork` for forking. The home page `/` shows a dashboard for authenticated users and a landing page for anonymous visitors. `/new` is the project creation page. Catalog, auth, health, static assets, and `/git/*` are specific routes that mount before the `/:owner` catch-all.

**Git HTTP is read-only.** Caddy serves the bare repo directory as static files with `file_server browse`. `git update-server-info` runs at the end of every commit so dumb-HTTP clients see fresh refs. The app is the sole writer to the bare repos. Projects are public by design; there is no visibility setting.

## Alternatives considered

- **Smart HTTP via `git-http-backend` CGI.** More efficient for large repos (pack negotiation) but requires CGI infrastructure Caddy does not natively provide. For read-only access to small form project repos, dumb HTTP is enough and simpler.
- **Check out a working tree per project.** Familiar filesystem API, but adds disk churn, requires locking for concurrent writes, and complicates the code path. Plumbing commands against a bare repo are more direct.
- **Route-handler permission checks.** Simpler on paper but moves business rules out of the service layer, making unit testing harder and risking drift between routes that enforce differently. The service layer is the right place for invariants.
- **File-scoped persistence (`projects/<slug>/` in the main repo).** The obvious first read of story 3's "persisted as a FormProject in git" AC. Rejected because it creates webhook loops (the app commits → webhook fires → redeploys → app commits), merge conflicts with app code, and pollutes the main repo history with user data.
- **GitHub as the forge.** Clean collaboration story and existing OAuth integration, but requires a GitHub account for every user, couples demo onboarding to GitHub's flow, and introduces API rate limits. Local bare repos are simpler for now; GitHub push mirroring can be added later without changing the storage model.
- **A permissions table.** Future-proofs for collaborators but is premature for a single-owner model. Added when the collaborator feature lands.

## Consequences

### Wins
- **Version history is visible.** Each project has a real commit log; the project page surfaces it, and clicking a commit renders the spec at that SHA.
- **Clone works.** Anyone can `git clone` a project URL and inspect or fork it locally. Transparency is a feature for government form specs.
- **Permission logic is centralized.** 25 service-layer unit tests exercise the full permission matrix independently of HTTP. Route integration tests verify the wiring. Adding a new mutation means adding one service method and one route handler; the permission rules live in the service.
- **Fork is cheap.** `git clone --bare` copies the source repo, then a single commit updates `project.json` with fork provenance.

### Costs
- **Two places to update.** Project creation touches both SQLite (index) and git (repo). The service makes this atomic by rolling back SQLite on git failure, but a server crash between the two operations can still leave a stuck row.
- **Disk usage grows monotonically.** Deleted projects do not reap their git repos or source blobs from disk. A reaper job is future work.
- **No migrations.** `CREATE TABLE IF NOT EXISTS` does not alter existing tables when columns change. Schema evolution on deployed instances currently requires manual database deletion until a migration system is added.
- **Slug collisions are global.** Uniqueness is enforced across all users, not per user. This is a simplification that works today but will need revisiting when multi-user becomes common.
- **Public-by-default surprises users.** The UI shows the clone URL prominently, but there is no explicit consent step during upload. Users may not realize uploads are publicly clonable. A visibility setting or consent banner is future work.

## Consequences for the threat model

See [threat model](../../architecture/threat-model.md) — this decision introduces three new trust boundaries:

- **Hono application to form project repos** (replaces the old filesystem boundary) — covers path traversal, command injection, atomic creation, orphaned rows, concurrent writes.
- **Browser to read-only git HTTP** — covers information disclosure, slug enumeration, stale refs.
- **Hono application to ProjectService** — covers permission enforcement, route handlers bypassing the service, TOCTOU on ownership.

## Sources

- [Git as persistence layer](git-as-persistence.md)
- [Story 3: Maya uploads a PDF and reviews the extracted specs](../../stories/3-maya-uploads-a-pdf-and-reviews-the-extracted-specs.md)
- [Threat model](../../architecture/threat-model.md)
