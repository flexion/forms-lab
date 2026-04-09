---
status: stable
tags: [infrastructure, build, deployment]
decided: 2026-04-07
---

# Nix-Built Bare Processes Instead of Containers

Build each branch deployment deterministically with Nix and run it as a bare process managed by systemd, without Docker or other container runtimes.

## Context

Each branch deployment needs an isolated, reproducible build that runs predictably on the EC2 host. The deployments run only trusted code from the project's own repository, so the full process isolation of containers is unnecessary. Container overhead — image layering, registry pushes, container daemon management — adds complexity without meaningful benefit in this context.

## Decision

Nix builds the application deterministically for each branch: the same source inputs always produce the same output, with no host-environment interference. Systemd (or NixOS service declarations) manages the resulting process — starting, stopping, and restarting it as needed. There is no Docker daemon, no container registry, and no image management. The webhook deploy pipeline builds via Nix and updates the systemd unit for the target branch.

## Alternatives considered

- **Docker containers** — Standard for process isolation in multi-tenant environments, but the isolation overhead is unnecessary when all processes run trusted project code. Adds image build times, registry management, and daemon complexity.
- **PM2** — Node/Bun process manager that handles restarts and log aggregation. Simpler than Nix+systemd but adds a runtime dependency and less deterministic builds; Nix provides stronger guarantees.

## Consequences

- Builds are deterministic: reproducible across environments and across time for the same source
- Lighter resource usage than containers — no daemon overhead, processes run directly on the host
- NixOS-style service declarations double as documentation of what each branch process needs
- The deploy pipeline depends on Nix being available on the EC2 host

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
