# Screaming Architecture Restructuring

**Date:** 2026-04-11
**Status:** working

## Problem

The current `src/` structure organizes code by technical layer (`services/`, `lib/`, `types/`) rather than by intent. Opening `src/` tells you "this is a Hono app with some utilities" -- it doesn't tell you what the system does, what processes it runs, or where domain boundaries are. Business logic, entry points, shared utilities, and UI components are interleaved in ways that obscure ownership and violate the dependency rule.

## Goals

- Top-level directories reveal the system's purpose and structure at a glance
- All runnable processes are visible and grouped intuitively
- Core services define system behavior with clear domain ownership
- Shared code is organized intuitively
- The dependency rule is enforced: inner layers never depend on outer layers

## Dependency Rule

Three layers with one direction of dependency:

```
shared/          ← depends on nothing internal
services/        ← depends on shared/
design-system/   ← depends on shared/
entrypoints/     ← depends on services/, design-system/, shared/
```

- `shared/` holds pure utilities and third-party type declarations. No domain types, no business logic.
- `services/` own their domain types. Each service defines its own `types.ts`. Services can depend on other services (no cycles).
- `design-system/` is a peer to services. Components receive data as props -- they never import from services or entrypoints.
- `entrypoints/` is the composition root. Routes and commands import services, pass data to components, return responses.

## Directory Structure

```
src/
  entrypoints/
    app/                    — forms platform web application
      main.ts
      server.tsx
      middleware/
      routes/
      public/
    dashboard/              — deployment dashboard (was homepage)
      main.ts
    webhook/                — GitHub event listener
      main.ts
      handler.ts
    notify/                 — notification delivery server
      main.ts
      slack.ts
    cli/                    — command line interface
      main.ts
      commands/

  services/
    data-collection/        — core domain model: what data to collect
      types.ts                (DataCollectionSpec, DataRequirement,
                               RequirementGroup, ValidationRule,
                               FieldType, FieldCondition)
    forms/                  — form resolution, delivery, sessions
      types.ts                (FormSpec, FormPage, ResolvedForm,
                               FormSession, FieldEntry,
                               FormSessionGateway, SubmissionGateway)
      resolver.ts
      validation.ts
      navigation.ts
      session.ts
      submission.ts
    ingestion/              — PDF → structured spec pipeline
      types.ts                (ExtractionResult, ExtractionOptions,
                               FieldConfidence, StoredProject,
                               NewProject, ProjectStatus)
      pdf-extractor.ts
      schemas.ts
    auth/                   — authentication and sessions
      types.ts                (SessionUser)
      github-oauth.ts
      session.ts
    deployment/             — deploy orchestration
      types.ts                (DeployResult, DeploymentState, etc.)
      deploy.ts
      github.ts
      metadata.ts
    notifications/          — notification types and client
      types.ts                (NotifyEvent, NotifyStatus)
      client.ts
    content/                — content rendering (markdown)
      types.ts                (MarkdownFile)
      markdown.ts
    storage.ts              — persistence layer (SQLite)

  design-system/
    components/
      flex-alert/
      flex-button/
      ... (65+ components, internal structure unchanged)
    conformance/
      types.ts
    register.ts             — client-side hydration entry
    registry.ts
    types.ts

  shared/
    base-path.ts            — multi-tenant path resolution
    format-html.ts          — HTML pretty-printer
    test-helpers/           — conformance test utilities
    visual-descriptor/      — visual regression detection
    types/
      markdown-it-task-lists.d.ts
```

## Naming Conventions

- **Industry-standard abbreviations only:** `auth`, `cli`. Everything else uses full words.
- **Plural for collection domains:** `forms`, `notifications`. Singular for single concerns: `auth`, `deployment`, `storage`.
- **Intent over technology:** `content` not `markdown`, `storage` not `database`.
- **Entrypoint vs. service disambiguation:** `entrypoints/notify/` (the delivery process) vs. `services/notifications/` (the domain: types + client).

## Service Dependency Graph

```
shared/
  ↑
data-collection/        ← core domain, depends only on shared/
  ↑               ↑
forms/          ingestion/     ← depend on data-collection/
auth/                          ← independent, depends on shared/
deployment/                    ← independent, depends on shared/
  └→ notifications/            ← deployment posts events via client
content/                       ← independent, depends on shared/
storage/                       ← independent, depends on shared/
```

No cycles. Each service owns its types. Cross-service dependencies are explicit in the import graph.

## Infrastructure Updates Required

All NixOS modules and package.json scripts reference `src/` paths that must be updated:

| Reference | Current | New |
|-----------|---------|-----|
| `app.nix` ExecStart | `src/app/main.ts` | `src/entrypoints/app/main.ts` |
| `homepage.nix` ExecStart | `src/homepage/main.ts` | `src/entrypoints/dashboard/main.ts` |
| `webhook.nix` ExecStart | `src/webhook/main.ts` | `src/entrypoints/webhook/main.ts` |
| `notify.nix` ExecStart | `src/notify/main.ts` | `src/entrypoints/notify/main.ts` |
| `deploy.nix` ExecStart | `src/app/main.ts` | `src/entrypoints/app/main.ts` |
| `package.json` dev/start | `src/app/main.ts` | `src/entrypoints/app/main.ts` |
| `package.json` webhook | `src/webhook/main.ts` | `src/entrypoints/webhook/main.ts` |
| `package.json` cli | `src/cli.ts` | `src/entrypoints/cli/main.ts` |
| `build-css.ts` | `src/app/public/styles.css` | `src/entrypoints/app/public/styles.css` |
| `build-components.ts` | `src/app/components/register.ts` | `src/design-system/register.ts` |

## Notes

- `deployment-card.tsx` (currently in `src/app/components/`) moves to `entrypoints/dashboard/` -- it's a dashboard-specific component, not a design system primitive.
- `models.ts` is fully decomposed into service-owned `types.ts` files. The `shared/types/` directory thins to only the third-party type declaration.
- Component internal structure (each flex-* directory) is unchanged.

## Scope

This restructuring is a mechanical refactor: move files, update imports, update infrastructure references. No behavior changes, no new features, no API changes. All tests must pass identically before and after.

The implementation plan will be written separately after prerequisite branches are merged.

