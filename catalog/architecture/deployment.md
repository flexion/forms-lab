---
status: working
tags: [infrastructure, deployment, architecture]
---

# Deployment Architecture

How the forms-lab application is deployed and served.

## Overview

A single EC2 instance hosts all branch deployments. GitHub push webhooks trigger automated deploys. NixOS declaratively manages the server state — Caddy reverse proxy, per-branch application processes, and the webhook listener. Pulumi provisions the AWS resources.

## How It Works

1. **Push to GitHub** — A developer pushes to any branch.
2. **Webhook fires** — GitHub sends a push event to the webhook listener on EC2.
3. **Deploy script runs** — The listener validates the signature, creates a GitHub Deployment (status: `in_progress`), and spawns the deploy script.
4. **Build and serve** — The script creates/updates a git worktree, runs `bun install && bun run build`, starts/restarts the systemd service, and updates Caddy routing.
5. **Status updated** — On success, the deployment status is set to `success` with a link to the branch URL. On failure, it is set to `failure`. PRs show a "View deployment" link in the sidebar.
6. **Traffic routes** — Caddy proxies `/<branch>/` to the branch's Bun process on its assigned port.
7. **Branch deleted** — When a branch is deleted, the webhook marks its deployment as `inactive`.

## Components

| Component | Location | Role |
|-----------|----------|------|
| Pulumi project | `infrastructure/pulumi/` | Provisions EC2, EIP, security group |
| NixOS config | `infrastructure/nixos/` | Declares entire server state |
| Webhook listener | `src/webhook/` | Receives GitHub push events |
| Deploy script | `infrastructure/nixos/modules/deploy.nix` | Builds and deploys branches |
| Caddy | NixOS service | Reverse proxy, auto-HTTPS, routing |
| App services | systemd template units | Per-branch Bun processes |

## URL Scheme

Each branch is served at a subpath on the EC2 hostname:

- `https://<hostname>/main/` — main branch
- `https://<hostname>/slice-1/` — slice-1 branch

The app reads `BASE_PATH` to generate correct links and asset URLs.

## Operations

All operations are available through the CLI:

```bash
bun run cli infra up         # Provision/update infrastructure
bun run cli nixos apply      # Push NixOS changes to server
bun run cli nixos status     # Check running services
bun run cli webhook setup    # GitHub webhook configuration
```

## Sources

- [EC2 with Pulumi](../decisions/infrastructure/ec2-with-pulumi.md)
- [Caddy reverse proxy](../decisions/infrastructure/caddy-reverse-proxy.md)
- [GitHub webhook deploys](../decisions/infrastructure/github-webhook-deploys.md)
- [Subpath routing](../decisions/infrastructure/subpath-routing.md)
- [Nix-built processes](../decisions/infrastructure/nix-built-processes.md)
- Canonical code: `infrastructure/pulumi/`, `infrastructure/nixos/`, `src/webhook/`
