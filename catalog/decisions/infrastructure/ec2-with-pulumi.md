---
status: stable
tags: [infrastructure, deployment, cloud]
decided: 2026-04-07
---

# Single EC2 Instance Managed by Pulumi (TypeScript)

Provision and manage a single EC2 instance with an Elastic IP using Pulumi with TypeScript, enabling reproducible infrastructure for branch-per-deployment.

## Context

Branch-per-subpath deployment requires a stable, programmable server where new branches can be provisioned, routed, and deprovisioned automatically. Infrastructure-as-code ensures the environment is reproducible and not dependent on manual console operations. The choice of IaC tooling needed to fit a TypeScript-first project where team members already know the language.

## Decision

Pulumi manages all infrastructure in TypeScript. A single EC2 instance hosts all branch deployments, with an Elastic IP providing a stable address for DNS. Pulumi's TypeScript SDK means infrastructure code shares the same language, type system, and tooling as application code. The single-instance model keeps costs low and operations simple for a class project.

## Alternatives considered

- **Terraform with HCL** — The most widely used IaC tool, but HCL is a separate language from the application stack, adding a context switch and no type safety.
- **Manual AWS Console** — Fast to start but not reproducible; onboarding a new environment or recovering from failure requires manual steps with no documentation of intent.
- **Fly.io** — Simpler deployment model with less configuration, but provides less control over routing and process management needed for the webhook-driven deploy pipeline.

## Consequences

- Infrastructure is reproducible and code-reviewed like application changes
- Pulumi maintains remote state that must be managed and kept consistent
- EC2 costs are minimal for a class project with intermittent traffic
- Single instance is a single point of failure, acceptable for this context

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
