# Forms Lab

LLM-Assisted Forms Platform for government forms.

## Quick Reference

```bash
bun run check                           # Lint + type check + tests (run before pushing)
bun test                                # Run tests
bun run dev                             # Dev server with watch
bun run build:css                       # Build CSS bundle
bun run cli sync-stories                # Sync stories from GitHub Issues
bun run --no-warnings tsc --noEmit      # Type check
bunx @biomejs/biome check .             # Lint + format check
bunx @biomejs/biome check --write .     # Lint + format fix
bun run lint:css                        # Stylelint CSS token enforcement
```

## Session Lifecycle

Use these commands to maintain a consistent workflow across sessions:

```bash
/create-story              # Create a new user story (GitHub issue + notes directory)
/start-story <description> # Initialize session for a story (worktree, context, skill routing)
/finish-story              # Run checks, code review, create PR, update flight board
/review-story <PR>         # Review another session's PR
```

Session artifacts are stored in `notes/story-N-name/` (design, plan, session log, review).
The flight board at `notes/flight-board.md` tracks in-flight work across sessions.

## Deployment

The deployment system consists of two parts:
1. **Homepage Service** — Deployment dashboard at root (`/`), runs from `/srv/forms-lab/main`
2. **Branch Apps** — Each branch deployed to `/<branch>/` via GitHub webhook

```bash
# Infrastructure management
bun run cli infra bootstrap     # Create S3 bucket for Pulumi state (one-time)
bun run cli infra up            # Provision/update EC2 via Pulumi
bun run cli infra outputs       # Show hostname, IP, SSH command
bun run cli infra ssh           # SSH into EC2 instance

# NixOS configuration
bun run cli nixos apply         # Push NixOS config to EC2
bun run cli nixos status        # Check running services

# GitHub webhook
bun run cli webhook setup       # GitHub webhook configuration guide

# Manual deployment
bun run cli deploy homepage     # Update homepage service (dashboard)

# Bedrock credentials (cross-account SSO)
bun run cli bedrock-credentials login   # Login to Flexion LLM AWS SSO
bun run cli bedrock-credentials push    # Copy SSO token to EC2 server
bun run cli bedrock-credentials status  # Check if credentials are valid
```

### Deployment Architecture

- **Webhook**: GitHub push events trigger branch deployments via `/srv/forms-lab/deploy.sh`
- **Homepage**: Separate service at port 3000, reverse-proxied to `/` by Caddy
- **Branch Apps**: Git worktrees at `/srv/forms-lab/<branch>`, each with assigned port
- **Routing**: Caddy routes `/<branch>/*` to branch apps, `/` to homepage
- **Auto-update**: Pushing to `main` triggers both branch deployment and homepage restart

## Setup

### GitHub OAuth

To enable authentication:

1. Create a GitHub OAuth app:
   ```bash
   bun run cli setup-oauth
   ```
   
   Or manually at https://github.com/settings/developers:
   - Application name: Forms Lab (dev)
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3000/auth/callback

2. Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```

3. Start the dev server:
   ```bash
   bun run dev
   ```

4. Visit http://localhost:3000 and click "Sign in"

### Git Hooks

Install project git hooks (pre-push checks, conventional commit validation):

```bash
bun run setup-hooks
```

## Conventions

- **Code is canonical** — when in doubt, follow existing patterns
- **Tests required** — new functionality needs tests in `test/`
- **Verify before pushing** — always run `bun run check` before `git push`. This runs lint, type check, and tests. The pre-push git hook enforces this automatically (install via `bun run setup-hooks`).
- **Server-rendered JSX** — Hono JSX components return HTML strings, no client runtime
- **TDD** — write failing test first, then implementation
- **Vertical slicing** — each story delivers complete user value through all layers
- **Design tokens** — all colors, spacing, fonts use `--flex-*` tokens, enforced by stylelint
- **Cascade layers** — CSS uses `@layer` (reset → tokens → composition → base → block → utility)

## Stacked Branch Workflow

### Branch Types

- **`main`** — Stable, deployed automatically to EC2 via webhook
- **`infra/YYYY-MM-DD-description`** — Infrastructure changes (PR to main, fast-track merge)
- **`story-N/name`** — Feature branches (stack on each other or main, PR when ready)

### Making Infrastructure Changes

When you need to change infrastructure (NixOS config, deploy scripts, webhook, secrets, etc.), follow this pattern:

**1. Create infra branch from main:**
```bash
git checkout main && git pull
git checkout -b infra/2026-04-10-description
```

**2. Make changes and commit with conventional format:**
```bash
# Edit files
git add -A
git commit -m "infra(scope): description

Detailed explanation of what changed and why.
"
```

**3. Push and open PR:**
```bash
git push -u origin infra/YYYY-MM-DD-description
gh pr create --base main \
  --title "infra(scope): description" \
  --body "## Context
Why this change? What problem does it solve?

## Changes
- Change 1
- Change 2

## Testing
- [ ] Tests pass
- [ ] Deployed and verified

## Related
- Enables: #X story branch work
"
```

**4. Merge triggers auto-deploy:**
- PR merges to main → webhook deploys to EC2 (~3 minutes)
- NixOS config rebuilt only if `infrastructure/nixos/` changed
- Main branch app deployed
- Homepage service restarted

**5. Rebase your story branch onto new main:**
```bash
git checkout story-N/name
git fetch && git rebase main
git push --force-with-lease
```

### Commit Convention

Use [conventional commits](https://www.conventionalcommits.org/) with scope:

- `infra(nixos):` — NixOS configuration changes
- `infra(webhook):` — Webhook or deployment logic
- `infra(secrets):` — Secrets management (sops-nix)
- `feat(component):` — New feature in a component
- `fix(bug):` — Bug fix
- `docs(arch):` — Documentation updates
- `test(unit):` — Test additions or fixes
- `chore:` — Maintenance tasks

### Example

See [PR #25](https://github.com/flexion/forms-lab/pull/25) for the pattern:
- Infra branch from main
- Detailed PR description with context, changes, testing
- Merge to main
- Auto-deploy via webhook

### Why This Workflow?

**Fast iteration:** Infrastructure changes merge and deploy in minutes, not hours  
**Clear history:** Conventional commits + PR descriptions = reconstructable narrative  
**No blocking:** Story branches continue working while infra changes deploy  
**Simple:** Branch types are clear, process is predictable  

## Architecture

- **Runtime:** Bun
- **Framework:** Hono (server-rendered JSX)
- **Data Model:** DataCollectionSpec (what to collect) → FormSpec (how to present) → Submission (collected data)
- **Persistence:** Git-based — specs and catalog content are markdown/JSON files in the repo
- **Catalog:** Self-documenting system at `/catalog` — personas, stories, architecture, decisions, experiments
- **CLI:** `bun run cli <command>` for operational tasks
- **CSS:** Two-tier tokens (USWDS 3.13), cascade layers, Bun.build() at build time, serveStatic

## Principles

The codebase is shaped by four architectural principles that exist to keep evolution cheap and safe. Before adding or moving code, read [catalog/architecture/software-architecture.md](catalog/architecture/software-architecture.md).

- **P1 — Intent over mechanism.** Names reveal domain, not framework. The tree should read as the business purpose of the system.
- **P2 — Dependency flows one way.** `shared → services/design-system → entrypoints`. Each layer is understood without knowing its callers; direction encodes stability. Enforced by `test/architecture/dependency-rule.test.ts`.
- **P3 — Services own their types.** Where a type lives answers "who decides when this changes?"
- **P4 — Presentation is stateless.** Components describe appearance; callers decide. Logic and data belong to the caller.

When adopting a third-party dependency, explicitly choose: isolate it (contain to one layer) or embrace it (accept a future refactoring cost). See "Dependencies and externalities" in the architecture doc.

When a situation doesn't fit a principle, propose an ADR amendment rather than silently diverging. See "When principles conflict" in the architecture doc.

Provenance: [catalog/decisions/architecture/architecture-principles.md](catalog/decisions/architecture/architecture-principles.md).

## Documentation Governance

Follows [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base) conventions:
- Lifecycle statuses in frontmatter: draft → working → stable → deprecated
- Provenance via `## Sources` sections in decisions and architecture docs
- Intent-revealing file and directory names
- Catalog as computed views over structured content
- See `knowledge-base.yaml` for configuration

## Project Structure

- `src/entrypoints/app/` — Forms platform web application (server, routes, middleware, public assets)
- `src/entrypoints/dashboard/` — Deployment dashboard (homepage service)
- `src/entrypoints/webhook/` — GitHub webhook listener service
- `src/entrypoints/notify/` — Notification delivery server
- `src/entrypoints/cli/` — CLI commands (sync-stories, infra, nixos, webhook, deploy)
- `src/services/data-collection/` — Core domain model: what data to collect
- `src/services/forms/` — Form resolution, delivery, sessions, submission
- `src/services/ingestion/` — PDF to structured spec pipeline
- `src/services/auth/` — Authentication and sessions (GitHub OAuth)
- `src/services/deployment/` — Deploy orchestration and metadata
- `src/services/notifications/` — Notification types and client
- `src/services/content/` — Content rendering (markdown, catalog types)
- `src/services/storage.ts` — Persistence layer (SQLite)
- `src/design-system/` — UI components (flex-* component library, conformance, registry)
- `src/shared/` — Pure utilities (base-path, format-html, test-helpers, visual-descriptor)
- `infrastructure/pulumi/` — EC2 provisioning (Pulumi TypeScript)
- `infrastructure/nixos/` — Server configuration (NixOS flake)
- `catalog/` — Catalog content (personas, stories, decisions, architecture, experiments)
- `projects/` — Form project directories (specs + assets)
- `test/` — Test files
- `scripts/` — Build scripts
- `notes/` — Session logs and exploration notes
- `dist/` — Built assets (gitignored)

## Related

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Skeleton plan](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-skeleton-plan.md)
- [PR 1 design](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-slice0-pr1-design.md)
- [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base)
