---
status: stable
tags: [infrastructure, routing]
decided: 2026-04-07
---

# Branch Deployments as URL Subpaths

Route branch deployments as URL subpaths (e.g., `/main/`, `/slice-1/`) rather than subdomains, with application-level awareness of the base path.

## Context

Each branch deployment needs a stable, unique URL so multiple branches can coexist on a single EC2 instance without conflict. The URL scheme must be predictable, easy to construct from a branch name, and operable without complex DNS configuration. Evaluators and reviewers need to access specific branch URLs reliably.

## Decision

Branches are deployed at URL subpaths on the shared domain: `/main/`, `/slice-1/`, etc. The application receives its base path via a `BASE_PATH` environment variable and mounts all routes under that prefix using Hono's `app.basePath()`. This makes the app self-aware of where it is mounted, so internal links and asset references resolve correctly regardless of which subpath is active. Caddy routes traffic to the correct process based on the path prefix.

## Alternatives considered

- **Subdomain routing** (e.g., `slice-1.forms-lab.example.com`) — Cleaner URLs but requires wildcard DNS configuration and wildcard TLS certificates, adding DNS management complexity.
- **Port-based routing** (e.g., `:3001`, `:3002`) — Simple to implement but not user-friendly; port numbers are opaque, not shareable as meaningful URLs, and require non-standard port access.

## Consequences

- Application code must be base-path-aware; `BASE_PATH` must be set correctly at deploy time
- DNS configuration is simple: a single A record pointing the domain to the EC2 Elastic IP
- No wildcard certificates needed; Caddy handles HTTPS for the single domain
- Branch names map directly and predictably to URL paths

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
