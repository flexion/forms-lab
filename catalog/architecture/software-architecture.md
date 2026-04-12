---
status: working
tags: [architecture, codebase, principles]
---

# Software Architecture

## Goal

The goal is to evolve this system cheaply and safely over time. The principles below exist to keep that evolution cheap and safe by preserving options at every level — tactical parts can change without risking strategic parts.

If you're about to add code, read the principles first. The directory structure is a consequence of the principles, not the other way around. If a situation doesn't fit, see "When principles conflict" near the bottom.

## Principles

### P1 — Intent over mechanism

Directory and file names reveal what a thing is *for*, not what it is *built with*.

*The point is legibility and domain organization.* A reader — human or agent — navigates the code by what things do, not by what they're built with. Opening `src/` should match the business purpose of the system, not the framework it runs on. Each name points at a domain concept the reader can grasp without opening the file.

**Worked example:** PDF extraction lives in `services/ingestion/`, not `services/llm-client/`. We currently use Bedrock, but that's an implementation detail — a reader looking for "how do we turn PDFs into specs?" finds it under its domain name.

*A consequence:* implementation changes don't force renames. Swapping markdown-it doesn't rename `services/content/markdown.ts`. That's a side effect of the naming being domain-shaped, not the reason for it.

### P2 — Dependency flows one way

Inner layers know nothing of outer layers.

```
shared → services → entrypoints
shared → design-system → entrypoints
```

*The point is cognitive isolation.* By forcing dependencies in one direction, each layer can be understood on its own. If you're in `services/`, you only need to know what's below you in the graph — you never need to know who calls you. The direction also encodes stability: things that change often depend on things that are stable, never the reverse. Reversing a dependency means two files change instead of one; cycles mean the whole graph must be understood at once.

**Worked example:** When `flex-form-page` was decoupled from `services/forms/resolver`, we didn't pass `evaluateCondition` as a prop. We moved the call up into the route. The component became dumber, the route became smarter, but the dependency arrow still only points one way.

**Enforcement:** `test/architecture/dependency-rule.test.ts` encodes this as an executable contract. Violations fail CI with a specific file:line.

*A consequence:* tactical code (routes, components) can change without risking strategic code (types, domain services).

### P3 — Services own their types

Each service directory has a `types.ts` that defines the shapes it owns. Cross-boundary types live in whichever service is upstream of the relationship.

*The point is clear authority.* Where a type lives answers "who decides when this changes?" A type in `services/forms/types.ts` is owned by the forms domain — changes to it are a forms-domain decision. Types in a grab-bag file are owned by nobody, which means changes become political. Explicit ownership lets changes ripple along an explicit dependency edge instead of through negotiation.

**Worked example:** `DataCollectionSpec` lives in `services/data-collection/types.ts` because data-collection is the authoritative definition. `services/forms/types.ts` imports it because forms is downstream. `services/ingestion/types.ts` also imports it because ingestion produces data-collection specs. When data-collection needs to change, the change radiates outward from one authoritative source.

*A consequence:* services evolve independently because ownership is explicit.

### P4 — Presentation is stateless

Design-system components receive ready-to-render data. Logic happens in routes. Components take props; they don't import services, fetch data, or compute conditions.

*The point is separating "what to show" from "how to show it."* Components describe appearance — they don't fetch, compute, decide, or coordinate. Logic and data belong to the caller. You can reason about a component by reading only the component, without tracing where its data came from or what decisions were made upstream.

**Worked example:** `flex-form-page` previously called `evaluateCondition` inline. Now it receives `page: FormPageData` with groups and fields already filtered by the route. The HTML output is identical, but the component can now be understood without also understanding the condition evaluator.

**Partial enforcement:** P2's test makes stateful components structurally difficult (design-system can't import from services). P4 is the stricter version of the same constraint.

*A consequence:* UI can be swapped without touching logic, and logic can be tested without a DOM.

## Structure (derived from the principles)

The four top-level directories under `src/`:

### `src/shared/`

Pure utilities with no domain knowledge. Zero internal dependencies — the base case for P2.

Currently: `base-path.ts` (multi-tenant URL resolution), `format-html.ts` (HTML pretty-printer), `types/markdown-it-task-lists.d.ts` (third-party type declaration).

### `src/services/`

Core domain services. Each service directory has a `types.ts` (P3) and one or more implementation files. Services depend only on `shared/` and other services (no cycles).

Currently: `auth/`, `content/`, `data-collection/`, `deployment/`, `forms/`, `ingestion/`, `notifications/`, plus `storage.ts` at the directory root.

### `src/design-system/`

UI components. Peer to services — depends on `shared/` but not on services (P4). Components receive ready-to-render data as props.

Currently: `components/flex-*/` (60+ components), `conformance/`, `test-helpers/`, `visual-descriptor/`, `register.ts`, `registry.ts`, `types.ts`.

### `src/entrypoints/`

Runnable processes — the composition root. Routes and commands import services, pass data to components, return responses. This is where integration complexity lives.

Currently: `app/` (forms platform web app), `dashboard/` (deployment dashboard), `webhook/` (GitHub event listener), `notify/` (notification delivery), `cli/` (command-line interface).

## Dependencies and externalities

The dependency rule (P2) constrains internal imports between layers. It does not constrain third-party imports within a file. When adopting an external dependency, you explicitly choose:

- **Isolate it.** Contain it to a single layer or file so it can be swapped without touching the rest of the codebase. Example: `markdown-it` lives only in `services/content/markdown.ts`.
- **Embrace it.** Accept that the dependency is woven through the code and that a future swap would be a refactoring effort. Example: `hono/jsx` types appear in every design-system component. We accept this because we're not planning to swap JSX runtimes.

Neither choice is wrong. What matters is that the choice is explicit. Drifting into embrace without noticing is the failure mode.

**Current state:**

- **Isolated:** USWDS (design-system only), Bedrock (`services/ingestion/` only), `better-sqlite3` (`services/storage.ts` only), `markdown-it` (`services/content/markdown.ts` only)
- **Embraced:** `hono/jsx` (design-system components), Hono routing (entrypoints), Bun (runtime)

When adding a new dependency, note the choice in the commit or ADR that introduces it. Future axes of change are cheaper to plan for when they're visible.

## When principles conflict

Sometimes a situation doesn't fit cleanly. Default rules:

1. **If a situation fits an existing principle, follow it.** Most situations are covered.
2. **If two principles conflict, default to P2.** P2 is the cheap constraint — move logic up toward the entrypoint. Almost all conflicts between P4 and something else resolve by making the component dumber and the caller smarter.
3. **If no principle fits, or if following one produces an obviously wrong result, propose an ADR amendment.** Do not silently diverge. See `catalog/decisions/architecture/architecture-principles.md` for the template.

The principles are not sacred. They are tracked. An ADR amendment is a legitimate move.

## Sources

- [Architecture Principles ADR](../decisions/architecture/architecture-principles.md) — provenance for P1–P4
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
- [Data model](data-model.md) — domain types in detail
- [System overview](system-overview.md) — infrastructure topology
