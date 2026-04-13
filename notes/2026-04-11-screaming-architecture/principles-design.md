# Principles-First Architecture Presentation

**Date:** 2026-04-11
**Status:** draft

## Problem

We just completed a screaming architecture restructuring that introduced a clean four-layer structure (`shared`, `services`, `design-system`, `entrypoints`) with a one-way dependency rule. The code is right. The documentation is not.

Three specific gaps:

1. **`catalog/architecture/software-architecture.md` is stale.** It still describes `src/app/`, `src/lib/`, `src/types/` and their dependency rules. None of that matches the current code.

2. **The software-architecture diagram is stale.** Nodes are App, Webhook, CLI, Services, Lib, Types — doesn't reflect the new layers.

3. **No provenance for the structural choices.** There's no ADR for the screaming architecture itself, no ADR for the dependency rule, and no record of the alternatives considered. A future reader — human or agent — who asks "why four directories and not three?" has no place to find the answer.

A deeper gap underlies these: **the current documentation is recipe-shaped, not principle-shaped.** It describes what the code looks like, not why it looks that way. An agent or human encountering a novel situation has no framework to reason about it. This is the thing we actually want to fix. The stale docs are just the symptom.

## Goal

Present the architecture so that:

1. The principles that shape the code are named once, referenced everywhere, and enforced where mechanical enforcement is cheap.
2. A reader — human or agent — can reason about novel situations by applying the principles, not by pattern-matching recipes.
3. The principles have provenance, so they can be revisited and amended, not treated as sacred.
4. The feedback loop for violations is immediate: if the agent writes code that breaks a principle, a test fails in seconds with a file:line reference.

This is a documentation refactor paired with one small enforcement addition. No behavior changes in product code.

## Design

### Four principles

These are the principles actually in use in the current codebase. They are not aspirational — each one is observable in commits from the last few days.

**P1 — Intent over mechanism.** Directory and file names reveal what a thing is *for*, not what it is *built with*. `services/forms/` not `services/http-handlers/`; `entrypoints/notify/` not `services/slack-client/`.

Rationale: the alternative — organizing by technology — forces re-reading every time the implementation changes. A reader should be able to predict where something lives from its purpose alone.

Worked example: PDF extraction lives in `services/ingestion/`, not `services/llm-client/`, because the intent is "turn a PDF into a spec." The fact that we currently use Bedrock is an implementation detail that could change without relocating the file.

**P2 — Dependency flows one way.** Inner layers know nothing of outer layers.

```
shared → services → entrypoints
shared → design-system → entrypoints
```

Rationale: the rule collapses reader thinking. If you are in `services/`, you only need to know `shared/` exists. You never need to know who calls you. Reversing a dependency means two files change instead of one; cycles mean the whole graph must be understood at once.

Worked example: when we decoupled `flex-form-page` from `services/forms/resolver`, we did not pass `evaluateCondition` as a prop. We moved the call up into the route. The component became dumber, the route became smarter, but the dependency arrow only points one way.

Enforcement: encoded as a test (see Artifact 4 below). Violations fail CI with a specific file:line.

**P3 — Services own their types.** Each service directory has a `types.ts` that defines the shapes it owns. Cross-boundary types live in whichever service is upstream of the relationship.

Rationale: where a type lives answers "who decides when this can change?" A type in `services/forms/types.ts` is owned by the forms domain. A type in a hypothetical grab-bag `shared/types/everything.ts` is owned by nobody, which means it cannot safely change.

Worked example: `DataCollectionSpec` lives in `services/data-collection/types.ts` because data-collection is the authoritative definition. `services/forms/types.ts` imports it because forms is downstream. `services/ingestion/types.ts` also imports it because ingestion produces data-collection specs.

**P4 — Presentation is stateless.** Design-system components receive ready-to-render data. Logic happens in routes. Components take props; they do not import services, fetch data, or compute conditions.

Rationale: a stateless component is trivially testable, trivially reusable, and trivially correct. A component that reaches into services is coupled to the service layer's current shape — when the service changes, the component breaks in ways that are not visible from the component file alone.

Worked example: `flex-form-page` previously called `evaluateCondition` inline. Now it receives `page: FormPageData` with groups and fields already filtered by the route. The HTML output is identical; the reasoning burden dropped.

Partial enforcement: P2's test makes stateful components structurally difficult (design-system cannot import from services). P4 is the stricter version of the same constraint.

### Rejected principle candidates

Two candidates considered and rejected for this batch:

- **"Composition at the edge"** (services don't call each other, integration happens at entrypoints). Observable in the code but not strongly defended — it's more a pattern than a principle, and it overlaps P2. Keeping it would add length without adding reasoning power.

- **"Decisions have provenance"** (every structural choice has an ADR). True and important, but it is a governance practice, not an architectural principle. It belongs in how the catalog is managed, not in the architecture doc.

### When principles conflict

The architecture doc will include a short section naming this explicitly. The escalation path is:

1. If a situation fits an existing principle, follow it.
2. If two principles conflict, default to P2 (dependency flows one way) as the cheap constraint — move logic up toward the entrypoint.
3. If no principle fits, or if following one produces an obviously wrong result, propose an ADR amendment. Do not silently diverge.

This section exists to give the agent permission to stop pattern-matching and start reasoning when a situation genuinely does not fit.

### Five artifacts

**Artifact 1 — Agent persona** (`catalog/personas/agent.md`)

A stakeholder document, not a character sketch. Written as an interface spec: capabilities, constraints, needs, failure modes. The needs section leads with reasoning needs ("principles before recipes," "explicit ranking when principles conflict," "escalation path when reasoning fails") followed by operational needs ("intent-revealing structure," "enforceable contracts," "session-start context loading," "immediate localized feedback").

Frontmatter: `id: agent`, `name: Agent`, `role: Coding collaborator`.

Does not use a human name. Not anthropomorphized. Reads like a component contract because that is what an agent is in this collaboration.

**Artifact 2 — Architecture doc rewrite** (`catalog/architecture/software-architecture.md`)

Replaces the current stale doc. New skeleton:

```
# Software Architecture

## Principles
  ### P1 — Intent over mechanism
    Statement / Rationale / Worked example
  ### P2 — Dependency flows one way
    Statement / Rationale / Worked example / Enforcement
  ### P3 — Services own their types
    Statement / Rationale / Worked example
  ### P4 — Presentation is stateless
    Statement / Rationale / Worked example

## Structure (derived from principles)
  ### src/shared/
  ### src/services/
  ### src/design-system/
  ### src/entrypoints/

## When principles conflict
  Escalation path to ADR amendment

## Sources
  - ADR: screaming architecture
  - ADR: hono on bun
  - Data model doc
```

The "Structure (derived)" section is deliberately brief. The principles do the heavy lifting; the structure is a consequence. The doc should be readable in 5 minutes.

Status: `working` (the principles are observed in the current code).

**Artifact 3 — ADR for screaming architecture** (`catalog/decisions/architecture/screaming-architecture.md`)

Follows the existing decision format in `catalog/decisions/architecture/`. Content:

- **Status:** `stable` (the decision was made and implemented)
- **Decided:** `2026-04-11`
- **Tags:** `[architecture, structure, principles]`
- **Context:** The original `src/app/`, `src/lib/`, `src/services/`, `src/types/` structure organized code by technical layer. Opening `src/` told you "this is a Hono app with some utilities" — it did not tell you what the system did or where domain boundaries were.
- **Decision:** Four layers named by intent: `shared`, `services`, `design-system`, `entrypoints`. Dependency rule enforced: shared → services/design-system → entrypoints.
- **Principles established:** P1–P4 (brief cross-reference to software-architecture.md).
- **Alternatives considered:**
  - Status quo (by technical layer) — rejected because it hides intent.
  - By feature (each feature gets a directory with routes/components/services mixed) — rejected because it prevents the dependency rule from being stated simply.
  - Three layers instead of four (merge design-system into services) — rejected because design-system and services have different change velocities and different owners.
- **Consequences:**
  - Positive: directory tour reveals purpose. Dependency rule is mechanically checkable. Services own their types.
  - Negative: file moves touched ~450 files in 12 commits. Anything that references paths in external docs becomes stale.
  - Accepted: design-system components that are form-specific still live in `design-system/` rather than in `entrypoints/app/`. The design system serves the forms platform, so form components are first-class.
- **Sources:** Links to `notes/2026-04-11-screaming-architecture/design.md`, `notes/2026-04-11-screaming-architecture/plan.md`, `notes/2026-04-11-screaming-architecture/dependency-fixes-design.md`, and the final PR.

**Artifact 4 — Dependency rule test** (`test/architecture/dependency-rule.test.ts`)

A new test file that encodes P2. Reads all TypeScript files under `src/`, parses imports (or uses string matching against `from '...'`), and verifies:

- Files in `src/shared/` import only from `src/shared/` or from external packages.
- Files in `src/services/` import only from `src/services/` or `src/shared/` or external packages.
- Files in `src/design-system/` import only from `src/design-system/` or `src/shared/` or external packages.
- Files in `src/entrypoints/` may import from anywhere under `src/`.

Failures report the offending file, line number, and the forbidden import, so an agent fixing the violation can go directly to the site.

Runs as part of `bun test` (and therefore `bun run check`). No separate invocation required.

**Artifact 5 — Updated static diagram** (`src/design-system/components/flex-diagram/diagrams/software-architecture.ts`)

Replaces the stale diagram. Four nodes:

- `shared`
- `services`
- `design-system`
- `entrypoints`

Edges:

- `services → shared`
- `design-system → shared`
- `entrypoints → services`
- `entrypoints → design-system`
- `entrypoints → shared`

Edge label on the diagram: "dependency flows one way." Diagram description references P1–P4 briefly.

The diagram nodes link to the architecture doc section for each layer.

## Scope

This is a documentation refactor plus one test file. No changes to product code. No changes to the catalog's routing, templates, or schema. No changes to existing decisions or architecture docs other than `software-architecture.md`. No changes to CLAUDE.md — its Project Structure section is already accurate.

Tests: all 365 existing tests continue to pass. The new dependency rule test adds test cases.

## Explicitly out of scope

To prevent scope creep, these are named as things we are not doing in this batch:

- **Catalog reorganization** (question-based navigation instead of document-type grouping). Useful but independent.
- **Cookbook / case studies.** Downstream of principles existing. Revisit once the principles document is in place.
- **Living-diagram generator** that parses imports at build time. Speculative; the static diagram is sufficient until drift is observed.
- **Mechanical enforcement for P3 and P4.** Tests for these could be written, but P2's test is the structural invariant the rest depends on. Adding more enforcement is a feedback-loop improvement for later.
- **ADRs for P1, P3, P4 individually.** The screaming-architecture ADR covers the set. Splitting them adds length without new information.

## Feedback loop enabled

With the five artifacts in place:

1. Agent opens session → `CLAUDE.md` references the architecture doc.
2. Architecture doc names P1–P4 with rationale and worked examples.
3. Agent places code according to the principles.
4. If the agent writes an import that violates P2, the dependency rule test fails with file:line.
5. If the agent encounters a situation that does not fit any principle, the architecture doc's "when principles conflict" section directs them to propose an ADR amendment.
6. The ADR for screaming architecture is the template for future amendments.

Rules have teeth, rationale is visible, violations fail fast, and the system can be changed without requiring archaeology.

## Sources

- `notes/2026-04-11-screaming-architecture/design.md` — the screaming architecture design
- `notes/2026-04-11-screaming-architecture/plan.md` — the implementation plan
- `notes/2026-04-11-screaming-architecture/dependency-fixes-design.md` — dependency rule fixes design
- `notes/2026-04-11-screaming-architecture/dependency-fixes-plan.md` — dependency rule fixes plan
- `catalog/architecture/software-architecture.md` (current, stale — to be replaced)
- `src/design-system/components/flex-diagram/diagrams/software-architecture.ts` (current, stale — to be replaced)
