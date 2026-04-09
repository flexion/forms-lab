---
status: stable
tags: [infrastructure, deployment, ci]
decided: 2026-04-07
---

# GitHub Webhook Triggers Deploys on EC2

Automate branch deployments by receiving GitHub push webhooks on EC2, then pulling, building, and routing without manual intervention.

## Context

Each push to a tracked branch should deploy automatically to its subpath URL. The deploy pipeline needs to be triggered by GitHub events rather than polling, and it needs to run on the EC2 host where branch processes are managed. Manual deploys via SSH would be slower and harder to audit.

## Decision

GitHub sends a push webhook to a small listener service running on EC2. The listener receives the event, validates the signature, pulls the branch, builds the application with Nix, restarts the systemd unit for that branch, and updates the Caddy configuration to ensure routing is current. The entire pipeline runs on the EC2 host, keeping it self-contained. No CI runner credentials need access to production; the host manages itself.

## Alternatives considered

- **SSH from CI (e.g., GitHub Actions)** — A CI job SSHes into EC2 and runs deploy commands. Requires managing SSH keys as CI secrets and granting CI broad access to the production host.
- **Polling** — The EC2 host periodically checks for new commits. Simple but wasteful — it burns cycles on intervals, introduces latency, and inverts the event flow unnecessarily.

## Consequences

- EC2 must be reachable from GitHub's webhook IP ranges; security group rules must allow this
- The webhook listener is a small, persistent service to maintain and monitor
- Deploy events are auditable via webhook delivery logs in the GitHub repository settings
- Webhook secret validation prevents unauthorized deploys from spoofed requests

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
