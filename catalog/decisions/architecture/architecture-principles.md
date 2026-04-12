---
status: stable
tags: [architecture, structure, principles]
decided: 2026-04-11
---

# Architecture Principles

Establish four named principles (P1–P4) and a four-layer `src/` structure (`shared`, `services`, `design-system`, `entrypoints`) to make architecture evolution cheap and safe.

## Context

The original `src/` was organized by technical layer: `src/app/`, `src/lib/`, `src/services/`, `src/types/`, `src/webhook/`, `src/commands/`. Opening the directory told you "this is a Hono app with some utilities" — it didn't tell you what the system did, what processes it ran, or where domain boundaries were. Types lived in a monolithic `models.ts`. The dependency rule, such as it was, lived only in prose.

This had concrete costs:
- New code had no obvious home, so similar things ended up in inconsistent places
- Domain changes rippled unpredictably because cross-boundary types had no owner
- Agents and humans reading the tree had to read files to understand what the system did
- The dependency rule was advisory, not enforced — violations accumulated
- Third-party dependencies crept into places that prevented swapping them later

## Decision

Four principles, mechanically enforced where cheap, named so they can be discussed and amended:

- **P1 — Intent over mechanism.** Directory and file names reveal purpose, not implementation. *Enables changing the implementation without moving or renaming files.*
- **P2 — Dependency flows one way.** `shared → services → entrypoints`; `shared → design-system → entrypoints`. *Enables changing tactical code without risking strategic code.* Mechanically enforced.
- **P3 — Services own their types.** Each service directory has a `types.ts`; cross-boundary types live with the upstream owner. *Enables services to evolve independently.*
- **P4 — Presentation is stateless.** Design-system components receive ready-to-render data. *Enables swapping UI without touching logic.*

The directory structure that follows:

- **`src/shared/`** — pure utilities, no domain knowledge, zero internal deps
- **`src/services/`** — core domain services, each owning its types (`auth`, `content`, `data-collection`, `deployment`, `forms`, `ingestion`, `notifications`, plus `storage.ts`)
- **`src/design-system/`** — UI components (peer to services, not a dependent)
- **`src/entrypoints/`** — runnable processes as composition roots (`app`, `dashboard`, `webhook`, `notify`, `cli`)

Decompose the monolithic `src/types/models.ts` into service-owned `types.ts` files so P3 is structurally true.

P1 is what the industry sometimes calls "screaming architecture" — the idea that opening `src/` should scream what the system does, not what it's built with. That concept was the entry point for this work, but the final framework is broader: the dependency rule, type ownership, and presentation statelessness are not part of the screaming-architecture idea alone.

See [software-architecture.md](../../architecture/software-architecture.md) for the principles in detail with worked examples.

## Alternatives considered

- **Status quo (by technical layer).** Rejected. Hides intent, allows inconsistent placement, leaves the dependency rule advisory.

- **By feature** (each feature gets a directory containing its routes, components, services). Rejected. Features share services — `forms/` and `ingestion/` both depend on `data-collection/`. Feature-scoped directories would either duplicate code or require an escape hatch, and they would prevent the dependency rule from being stated simply. Also makes it hard to see all the runnable processes at a glance.

- **Three layers instead of four** (merge `design-system` into `services`). Rejected. Design-system components and services have different change velocities, different owners, and different test strategies (conformance tests vs. unit tests). Merging them would blur a boundary that is already distinct in practice.

- **Move form-specific components out of `design-system/`** into `entrypoints/app/` (since they're coupled to the forms domain). Rejected. The design system *is* the Forms Lab design system — form components are first-class citizens, not incidental. The right fix was decoupling them from service imports, not relocating them.

## Consequences

**Positive:**
- Directory tour reveals purpose. Opening `src/` tells you what the system is.
- Dependency rule is mechanically checkable (`test/architecture/dependency-rule.test.ts`).
- Services own their types, so changes ripple along explicit dependency edges.
- Agents and humans can predict where new code goes from its purpose alone.
- Design-system components are reusable by construction — they can't depend on services.
- The four principles give agents and humans a vocabulary for discussing architectural choices rather than debating cases one at a time.

**Negative:**
- File moves touched ~450 files across 21 commits on this branch.
- External documentation that references old paths becomes stale.
- Some development-oriented conventions (e.g., "composition at the edge") remain unstated — they're patterns, not principles.

**Accepted:**
- Form-specific components (`flex-form-field`, `flex-form-page`, etc.) live in `design-system/` rather than `entrypoints/app/`. Defended because the design system serves the forms platform — form components are core, not incidental. They define local prop types instead of importing from services.
- Some conformance tests and visual-regression helpers in `design-system/test-helpers/` reference design-system types. These are test infrastructure, not runtime code, and they were moved from `shared/test-helpers/` to `design-system/test-helpers/` to keep runtime `shared/` at zero internal deps.

## Known limits

**The dependency rule constrains internal imports but not third-party ones.** A service file could `import { Hono } from 'hono'` and the dependency rule test would pass. The rule prevents internal entanglement, not external coupling.

We handle external dependencies with an explicit discipline — described in the architecture doc's "Dependencies and externalities" section — where each new dependency is either isolated (contained to one layer or file) or knowingly embraced (accepted as woven through the code, with a future swap treated as a refactoring effort).

At the time of this decision:

- **Isolated:** USWDS (design-system only), Bedrock (`services/ingestion/` only), `better-sqlite3` (`services/storage.ts` only), `markdown-it` (`services/content/markdown.ts` only)
- **Embraced:** `hono/jsx` (design-system components), Hono routing (entrypoints), Bun (runtime)

The `hono/jsx` embrace is the most consequential: if we later wanted to swap JSX runtimes, every design-system component would change. We accept this because no swap is planned, and the cost of isolating `hono/jsx` now would exceed the cost of a future refactoring when it's actually needed.

This discipline is not enforced by a rule. It is enforced by the expectation that dependency adoption is a decision, not a drift. If we later find violations of this discipline, we can promote it to a rule with its own test — responding to smells rather than pre-building enforcement.

## Sources

- [notes/2026-04-11-screaming-architecture/design.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/design.md) — original restructuring design
- [notes/2026-04-11-screaming-architecture/plan.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/plan.md) — 12-task restructuring plan
- [notes/2026-04-11-screaming-architecture/dependency-fixes-design.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/dependency-fixes-design.md) — design for decoupling components from services
- [notes/2026-04-11-screaming-architecture/dependency-fixes-plan.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/dependency-fixes-plan.md) — 8-task plan for the decoupling work
- [notes/2026-04-11-screaming-architecture/principles-design.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/principles-design.md) — design for this principles presentation
- [notes/2026-04-11-screaming-architecture/principles-plan.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/principles-plan.md) — plan for this principles presentation
