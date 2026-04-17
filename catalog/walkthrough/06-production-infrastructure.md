---
title: "Production Infrastructure"
order: 6
rubric: [environment-setup]
timing: "2 min"
audience: [evaluator]
---

# Deployment Architecture

Forms Lab runs in a production environment on AWS, provisioned and managed through infrastructure-as-code.

## Stack

- **Compute**: EC2 instance provisioned via Pulumi (TypeScript)
- **OS**: NixOS — declarative, reproducible system configuration
- **Reverse proxy**: Caddy with automatic TLS
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **LLM API**: Claude via Amazon Bedrock (EC2 instance role)

## Branch-Per-Deployment Model

Every git branch gets its own deployment:

- Push to any branch → GitHub webhook triggers deployment
- Each branch runs as a separate process on an assigned port
- Caddy routes `/<branch>/*` to the correct process
- Push to `main` also restarts the homepage dashboard

This means reviewers can visit any branch's deployment directly by URL.

## Infrastructure as Code

- **Pulumi**: Provisions EC2, security groups, IAM roles
- **NixOS flake**: Defines system packages, services, Caddy config, deploy scripts
- **GitHub webhook**: Receives push events, triggers `deploy.sh`

See: [Deployment Architecture](/catalog/architecture/deployment) | [Infrastructure Decisions](/catalog/decisions/infrastructure)
