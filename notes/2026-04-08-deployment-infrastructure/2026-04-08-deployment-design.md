---
status: working
tags: [infrastructure, deployment, design]
---

# Deployment Infrastructure Design

Design specification for EC2 deployment with webhook-driven branch deploys, completing the infrastructure portion of [issue #1](https://github.com/flexion/forms-lab/issues/1).

## Overview

A single EC2 instance hosts all branch deployments. GitHub push webhooks trigger automated deploys. NixOS declaratively manages the entire server state — Caddy reverse proxy, per-branch app processes, and the webhook listener. Pulumi provisions the AWS resources. Each branch gets a subpath URL (e.g., `/main/`, `/slice-1/`) on the EC2 instance's public DNS hostname.

## Decisions

This design implements five existing ADRs:

- [EC2 with Pulumi](../../catalog/decisions/infrastructure/ec2-with-pulumi.md)
- [Caddy reverse proxy](../../catalog/decisions/infrastructure/caddy-reverse-proxy.md)
- [GitHub webhook deploys](../../catalog/decisions/infrastructure/github-webhook-deploys.md)
- [Subpath routing](../../catalog/decisions/infrastructure/subpath-routing.md)
- [Nix-built processes](../../catalog/decisions/infrastructure/nix-built-processes.md)

Additional decisions made during design:

- **HTTPS without a registered domain** — Use the AWS-assigned Elastic IP hostname (`ec2-x-x-x-x.compute-1.amazonaws.com`). Caddy handles auto-HTTPS via Let's Encrypt HTTP-01 challenge. Fallback: sslip.io if Let's Encrypt refuses the AWS hostname.
- **NixOS AMI** — Full NixOS on the instance (not regular Linux + Nix). Entire server state is a declarative Nix expression.
- **Pulumi S3 backend** — State stored in an S3 bucket (`forms-lab-pulumi-state`), not Pulumi Cloud.
- **Webhook listener in Bun/Hono** — Same stack as the app for consistency.
- **App owns the base path** — `app.basePath(BASE_PATH)` in Hono, Caddy forwards without rewriting. Single source of truth for URL prefix.
- **CLI as unified operations interface** — All deployment commands exposed via `bun run cli` for discoverability by both humans and Claude Code.

## Repository Reorganization

The repo moves from a single entrypoint to a multi-entrypoint layout:

```
src/
  app/
    main.ts              ← app entrypoint (builds CSS/JS, starts server)
    server.tsx           ← Hono app definition
    routes/              ← catalog and app routes
    components/          ← JSX components and design system
    public/              ← CSS source files and fonts
  webhook/
    main.ts              ← webhook listener entrypoint
    handler.ts           ← POST route, signature validation, event parsing
    deploy.ts            ← spawns deploy script with branch info
  lib/                   ← shared utilities (markdown, test-helpers, etc.)
  services/              ← shared services (github.ts)
  types/                 ← shared type definitions
  cli.ts                 ← CLI entrypoint
  commands/              ← CLI commands (sync-stories, infra, nixos, webhook)
infrastructure/
  pulumi/                ← Pulumi TypeScript project
  nixos/                 ← NixOS system configuration
```

What moves:

- `src/server.tsx` → `src/app/server.tsx`
- `src/dev.ts` → `src/app/main.ts`
- `src/routes/` → `src/app/routes/`
- `src/components/` → `src/app/components/`
- `src/public/` → `src/app/public/`

What stays at `src/` level (shared):

- `src/lib/`, `src/services/`, `src/types/`, `src/cli.ts`, `src/commands/`

Package.json script updates:

- `dev` → `bun run --watch src/app/main.ts`
- `start` → `bun run src/app/main.ts`
- New: `webhook` → `bun run src/webhook/main.ts`
- Build scripts update paths to `src/app/public/` and `src/app/components/`

## Pulumi Infrastructure

A standalone Pulumi TypeScript project at `infrastructure/pulumi/` with its own `package.json` and `Pulumi.yaml`.

### S3 Backend

A bootstrap script creates the S3 bucket for Pulumi state (`forms-lab-pulumi-state`) with versioning enabled. The bucket is not managed by Pulumi (bootstrap chicken-and-egg).

### Resources

1. **Security Group** — Inbound: 22 (SSH, restricted), 80 (HTTP), 443 (HTTPS), GitHub webhook IP ranges. Outbound: all.
2. **EC2 Instance** — NixOS community AMI (24.11 or latest stable), `t3.small`.
3. **Elastic IP** — Attached to the instance, provides stable public DNS hostname.
4. **SSH Key Pair** — Your existing public key registered with AWS.

### Stack Outputs

- Elastic IP address
- Public DNS hostname (`ec2-x-x-x-x.compute-1.amazonaws.com`)
- Instance ID
- SSH command string

### AWS Profile

Uses `AWS_PROFILE=llm-class`.

## NixOS Configuration

Declarative NixOS configuration at `infrastructure/nixos/` that defines the entire server state.

### Structure

```
infrastructure/nixos/
  flake.nix              ← entry point, defines the NixOS system
  flake.lock
  configuration.nix      ← top-level system config, imports modules
  modules/
    caddy.nix            ← Caddy reverse proxy service + config generation
    webhook.nix          ← webhook listener systemd service
    app.nix              ← per-branch app service template
    deploy.nix           ← deploy script (pull, build, restart, update Caddy)
    users.nix            ← SSH access, public key
```

### System Configuration

- NixOS 24.11 (or latest stable)
- Firewall: 22, 80, 443, plus GitHub webhook IPs
- System packages: git, bun
- Imports all modules

### Caddy Module

- Caddy service with auto-HTTPS using the EC2 public DNS hostname
- Routes subpath prefixes to per-branch app processes
- Routes `/.webhook` to the webhook listener on port 9000
- Config regenerated and reloaded atomically via admin API when branches are added/removed

### App Service Module

A NixOS function that, given a branch name and port, produces a systemd service:

- Working directory: `/srv/forms-lab/<branch>/`
- Environment: `PORT=<port>`, `BASE_PATH=/<branch>/`
- ExecStart: `bun run src/app/main.ts`
- Restart on failure

Active branches tracked in a config file or directory at `/srv/forms-lab/branches/`.

### Webhook Module

- Systemd service for the webhook listener
- Fixed port 9000
- Environment: `GITHUB_WEBHOOK_SECRET`, `PORT=9000`
- Caddy proxies `/.webhook` to this service

### Deploy Script

Nix-packaged script invoked by the webhook handler:

1. If no worktree exists for the branch, `git worktree add /srv/forms-lab/<branch> <branch>` from the bare repo at `/srv/forms-lab/repo.git`
2. If the worktree exists, `cd /srv/forms-lab/<branch> && git fetch origin && git reset --hard origin/<branch>`
3. `bun install`
4. `bun run build`
5. Create or restart the systemd unit for the branch (assign next available port if new)
6. Update Caddy config to include the branch route and reload via admin API

A bare clone at `/srv/forms-lab/repo.git` serves as the shared object store. Each branch gets its own worktree at `/srv/forms-lab/<branch>/` with its own `node_modules/` and `dist/`. Worktrees share git objects (lighter disk usage, single fetch updates all branches) and enforce one checkout per branch — which is exactly the constraint we want for deployments.

### Secrets Management

`GITHUB_WEBHOOK_SECRET` managed via sops-nix — encrypted in the repo, decrypted on the host. Keeps secrets versioned but safe.

### Declarative vs. Dynamic Boundary

- **Declarative (in Nix):** System packages, Caddy service, webhook service, user accounts, firewall, systemd service template, deploy script
- **Dynamic (at runtime):** Which branches are deployed, their port assignments, Caddy route entries — managed by the deploy script when webhooks arrive

## Webhook Listener Service

A small Bun/Hono service at `src/webhook/`.

### Handler (`handler.ts`)

- Single `POST /` route
- Validates `X-Hub-Signature-256` header against `GITHUB_WEBHOOK_SECRET` using HMAC-SHA256
- Parses push event payload: extracts branch name (`ref`), commit SHA
- Rejects non-push events and deleted branches (`deleted: true`)
- Returns 200 immediately, deploy runs asynchronously

### Deploy Orchestration (`deploy.ts`)

- Spawns the Nix-packaged deploy script as a child process
- Passes branch name and commit SHA as arguments
- Logs stdout/stderr for auditing

### Entrypoint (`main.ts`)

- Starts Hono on `PORT` (default 9000)
- Mounts webhook handler at `POST /`
- Health check at `GET /health`

### Security

- HMAC signature validation is the primary gate
- Caddy exposes only `/.webhook` publicly
- Deploy script runs as a dedicated system user with access to `/srv/forms-lab/`

### Testing

- Unit tests for signature validation (valid, invalid, missing)
- Unit tests for payload parsing (push, non-push, deleted branch)
- Integration test: mock deploy script, send valid webhook, verify invocation with correct args

## BASE_PATH Support

The app owns its URL prefix — single source of truth.

### Server

`app.basePath(process.env.BASE_PATH || '/')` in `src/app/server.tsx` before route definitions. Hono handles route matching relative to the base path.

### Caddy

Forwards requests with the prefix intact — no path rewriting:

```
@main path /main/*
reverse_proxy @main localhost:3001
```

### Asset and Link Generation

Layout component resolves asset/link paths relative to the base path using Hono's context. A small `basePath` utility in `src/lib/` reads `BASE_PATH` for use outside of request context.

### Dev Experience

- Locally: `BASE_PATH` unset → defaults to `/`, works at root as today
- On EC2: each branch process gets `BASE_PATH=/<branch>/`

## Developer Interface & CLI

All deployment operations exposed through `bun run cli` for discoverability by humans and Claude Code.

### CLI Commands

```bash
bun run cli infra up            # pulumi up (provision/update EC2)
bun run cli infra outputs       # show hostname, IP, SSH command
bun run cli infra ssh           # SSH into the instance
bun run cli nixos apply         # nixos-rebuild switch to remote host
bun run cli nixos status        # list active branch services, health checks
bun run cli webhook setup       # GitHub webhook configuration guide
```

### Initial Setup Sequence

1. Create S3 bucket for Pulumi state (bootstrap script or `bun run cli infra bootstrap`)
2. `bun run cli infra up` to provision EC2
3. `bun run cli nixos apply` to push NixOS config
4. Configure GitHub webhook in repo settings (URL, secret, push events)
5. First push to `main` triggers webhook → deploys the app

### Monitoring

```bash
ssh root@<hostname>
journalctl -u forms-lab-main -f         # app logs for main branch
journalctl -u forms-lab-webhook -f       # webhook listener logs
systemctl list-units 'forms-lab-*'       # all branch services
```

## Documentation

### CLAUDE.md

Add a deployment section with all CLI commands so Claude Code can discover and operate the deployment.

### Catalog

- **New:** `catalog/architecture/deployment.md` — durable overview of the deployment system, how the pieces fit together, links to all five infrastructure ADRs and the canonical infrastructure code. Includes `## Sources` section per meta-knowledge-base provenance policy.
- **Existing ADRs** — no changes needed, already cover the "why" for each decision.

### knowledge-base.yaml

Add `infrastructure/**` to write allow rules (except `infrastructure/secrets/**`).

### Session Notes

Planning and session notes for this work live in `notes/2026-04-08-deployment-infrastructure/`.

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
- [Skeleton plan](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-skeleton-plan.md)
- [Slice 0 PR 1 design](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-slice0-pr1-design.md)
- [meta-knowledge-base](https://github.com/danielnaab/meta-knowledge-base) — intent-revealing structure, authority, provenance, temporal layers
- Infrastructure ADRs in `catalog/decisions/infrastructure/`
