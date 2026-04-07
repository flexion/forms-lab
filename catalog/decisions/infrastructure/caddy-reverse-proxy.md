---
status: stable
tags: [infrastructure, networking]
decided: 2026-04-07
---

# Caddy as Reverse Proxy for Branch Routing

Use Caddy as the reverse proxy on EC2 to route incoming requests to branch-specific processes via atomic configuration reloads.

## Context

A single EC2 instance hosts multiple branch deployments, each running as a separate process on a distinct port. An HTTP reverse proxy is required to route public traffic to the correct process based on URL path. The proxy needs to handle HTTPS termination and support programmatic configuration updates as branches are added and removed by the webhook deploy pipeline.

## Decision

Caddy serves as the reverse proxy. Its admin API enables atomic configuration reloads without downtime — the webhook listener can update routing entries programmatically after each deploy. Caddy handles auto-HTTPS via Let's Encrypt, eliminating manual certificate management. Its declarative configuration format is readable and reviewable. Caddy runs as a persistent service on the EC2 instance alongside the branch processes it routes to.

## Alternatives considered

- **Nginx** — Battle-tested and widely understood, but configuration reloads require a separate reload signal, config templating is verbose, and graceful config updates from a script are more cumbersome.
- **Traefik** — Built for dynamic container environments with service discovery; its complexity and container orientation are unnecessary overhead for bare-process deployments.
- **No proxy (app handles routing)** — Would require the application to bind on port 443, manage TLS certificates, and handle multi-branch routing internally — reinventing a solved problem.

## Consequences

- Caddy is an additional process to manage on EC2, though it is stable and low-maintenance
- The webhook listener can update Caddy config programmatically via the admin API after each deploy
- Auto-HTTPS removes certificate renewal from the operational checklist

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
