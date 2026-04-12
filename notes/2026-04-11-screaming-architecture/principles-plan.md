# Principles-First Architecture Presentation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Name the four architectural principles (P1–P4) once, make them visible everywhere they matter, and enforce the one principle (P2) that is mechanically checkable.

**Architecture:** Five artifacts — agent persona, architecture doc rewrite, screaming-architecture ADR, dependency rule test, updated static diagram. No product code changes. The test is the only new runtime artifact.

**Tech Stack:** Markdown with YAML frontmatter (catalog content), TypeScript (diagram and test), Bun test runner

**Working directory:** `/home/daniel/src/forms-lab/.worktrees/screaming-architecture`

---

## Task order rationale

Tasks are ordered so each artifact can reference earlier ones:

1. Agent persona first — establishes the stakeholder whose needs shape the other artifacts.
2. Architecture doc rewrite — names the principles, referenced by all later artifacts.
3. Screaming-architecture ADR — provides provenance, linked from the architecture doc's Sources section.
4. Dependency rule test — encodes P2, referenced by the architecture doc's enforcement section.
5. Updated diagram — visualizes the principles from the architecture doc.
6. CLAUDE.md cross-references — ties the artifacts together for session-start discovery.

Each task ends with passing `bun run check`.

---

### Task 1: Create the Agent persona

**Files:**
- Create: `catalog/personas/agent.md`

- [ ] **Step 1: Create the persona file**

Create `catalog/personas/agent.md` with this exact content:

```markdown
---
id: agent
name: Agent
role: Coding collaborator
---

# Agent — Coding Collaborator

**Role:** An LLM-backed coding tool that reads the codebase, plans changes, writes code, runs tests, and reports results. Invoked by a Developer. Sessions are stateless — context must be reconstructed at the start of each session.

## Background

An agent participates in building and maintaining Forms Lab. It is not an end user of the forms platform. It is a collaborator that amplifies Developer work: making mechanical changes at scale, surfacing patterns across many files in parallel, and following explicit rules.

This persona exists so that design decisions can ask "does this serve the agent?" just as they ask "does this serve Maya?" The agent has real needs that shape the system — making them explicit means they can be argued with, rather than left implicit in tooling.

## What the agent does well

- Pattern matching across many files in parallel
- Following explicit rules and worked examples
- Test-first development when patterns exist
- Mechanical refactors at scale
- Reconstructing context from documentation at session start

## What the agent cannot do

- Hold the full codebase in context at once
- Infer unstated conventions from commit history alone
- Remember anything from a prior session
- Distinguish "important but undocumented" from "unimportant"
- Reliably choose between unstated alternatives

## Needs (reasoning)

These needs let the agent think critically about novel situations, not just pattern-match.

- **Principles before recipes.** Patterns make sense only if the agent knows why they exist. Rules without rationale become cargo cult when the situation shifts. The architecture doc names principles first; the structure is derived from them.
- **Explicit ranking when principles conflict.** The agent must be able to decide without guessing. The architecture doc's "when principles conflict" section provides this.
- **Visibility into trade-offs.** Every structural choice should link to a decision record. When the agent proposes a change, it should be able to find — and cite — the reasoning the change overturns.
- **An escalation path when reasoning fails.** When no principle fits, the agent should know to propose an ADR amendment, not silently diverge.

## Needs (operations)

These needs support the reasoning needs above.

- **Intent-revealing structure.** Directory names that tell the agent where things belong. The screaming architecture (P1) serves this directly.
- **Enforceable contracts.** Rules encoded as tests, not just prose. A violated rule should fail CI with a file:line reference, not require a reviewer to catch it. The dependency rule test enforces P2.
- **Session-start context.** A single file (`CLAUDE.md`) that loads architecture, rules, and project structure on session start.
- **Worked examples per principle.** Each principle in the architecture doc has an example drawn from the current codebase.
- **Immediate, localized feedback.** When the agent does something wrong, it should find out in seconds, and the message should point at the specific problem.

## Failure modes when needs are not met

- Guesses at placement of new code because intent is ambiguous
- Duplicates existing utilities because search failed to find them
- Reintroduces patterns already rejected because decisions are implicit
- Passes review but leaves subtle architectural drift
- Over-fits to a single worked example without understanding the principle

## Related stakeholders

- **Developer** — directs the agent, reviews output, amends the rules
- **Evaluator** — assesses agent output quality against requirements
```

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: all tests pass. The personas route reads this file automatically — no route changes needed. The `catalog-personas.test.ts` test asserts the page renders the personas that exist; adding a persona does not break it.

- [ ] **Step 3: Verify the persona renders**

```bash
grep -n 'personas' src/entrypoints/app/routes/catalog/personas.tsx | head -5
```

Confirm the route reads from `catalog/personas/` directory and renders all `.md` files. If so, the new persona is auto-discovered.

- [ ] **Step 4: Commit**

```bash
git add catalog/personas/agent.md
git commit -m "docs(catalog): add Agent persona

Add agent as a first-class persona alongside Developer and Evaluator.
Written as an interface spec (capabilities, constraints, needs, failure
modes) rather than a character sketch. Needs section leads with
reasoning needs followed by operational needs.
"
```

---

### Task 2: Rewrite software-architecture.md with principles-first structure

**Files:**
- Modify: `catalog/architecture/software-architecture.md` (replace entire contents)

- [ ] **Step 1: Replace the architecture doc**

Replace the entire contents of `catalog/architecture/software-architecture.md` with:

```markdown
---
status: working
tags: [architecture, codebase, principles]
---

# Software Architecture

How the Forms Lab codebase is organized, and why. This doc names the four principles that shape the code. The directory structure is a consequence of the principles, not the other way around.

If you're about to add code, read the principles first. If a situation doesn't fit, see "When principles conflict" at the bottom.

## Principles

### P1 — Intent over mechanism

Directory and file names reveal what a thing is *for*, not what it is *built with*.

**Rationale:** Organizing by technology forces re-reading every time the implementation changes. A reader should predict where something lives from its purpose alone.

**Worked example:** PDF extraction lives in `services/ingestion/`, not `services/llm-client/`, because the intent is "turn a PDF into a spec." We currently use Bedrock, but that's an implementation detail — the file wouldn't move if we switched providers.

### P2 — Dependency flows one way

Inner layers know nothing of outer layers.

```
shared → services → entrypoints
shared → design-system → entrypoints
```

**Rationale:** The rule collapses reader thinking. If you're in `services/`, you only need to know `shared/` exists. You never need to know who calls you. Reversing a dependency means two files change instead of one; cycles mean the whole graph must be understood at once.

**Worked example:** When `flex-form-page` was decoupled from `services/forms/resolver`, we didn't pass `evaluateCondition` as a prop. We moved the call up into the route. The component became dumber, the route became smarter, but the dependency arrow only points one way.

**Enforcement:** `test/architecture/dependency-rule.test.ts` encodes this principle as a test. Violations fail CI with a specific file:line.

### P3 — Services own their types

Each service directory has a `types.ts` that defines the shapes it owns. Cross-boundary types live in whichever service is upstream of the relationship.

**Rationale:** Where a type lives answers "who decides when this can change?" A type in `services/forms/types.ts` is owned by the forms domain. A grab-bag type file is owned by nobody, which means it can't safely change.

**Worked example:** `DataCollectionSpec` lives in `services/data-collection/types.ts` because data-collection is the authoritative definition. `services/forms/types.ts` imports it because forms is downstream. `services/ingestion/types.ts` also imports it because ingestion produces data-collection specs.

### P4 — Presentation is stateless

Design-system components receive ready-to-render data. Logic happens in routes. Components take props; they don't import services, fetch data, or compute conditions.

**Rationale:** A stateless component is trivially testable, trivially reusable, and trivially correct. A component that reaches into services is coupled to the service layer's current shape — when the service changes, the component breaks in ways that aren't visible from the component file alone.

**Worked example:** `flex-form-page` previously called `evaluateCondition` inline. Now it receives `page: FormPageData` with groups and fields already filtered by the route. The HTML output is identical; the reasoning burden dropped.

**Partial enforcement:** P2's test makes stateful components structurally difficult (design-system can't import from services). P4 is the stricter version of the same constraint.

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

## When principles conflict

Sometimes a situation doesn't fit cleanly. Default rules:

1. **If a situation fits an existing principle, follow it.** Most situations are covered.
2. **If two principles conflict, default to P2.** P2 is the cheap constraint — move logic up toward the entrypoint. Almost all conflicts between P4 and something else resolve by making the component dumber and the caller smarter.
3. **If no principle fits, or if following one produces an obviously wrong result, propose an ADR amendment.** Do not silently diverge. See `catalog/decisions/architecture/screaming-architecture.md` for the template.

The principles are not sacred. They are tracked. An ADR amendment is a legitimate move.

## Sources

- [Screaming architecture ADR](../decisions/architecture/screaming-architecture.md) — provenance for P1–P4
- [Hono on Bun decision](../decisions/architecture/hono-on-bun.md)
- [Git as persistence decision](../decisions/architecture/git-as-persistence.md)
- [Data model](data-model.md) — domain types in detail
- [System overview](system-overview.md) — infrastructure topology
```

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: all tests pass. The architecture route reads this file automatically — no route changes needed.

- [ ] **Step 3: Commit**

```bash
git add catalog/architecture/software-architecture.md
git commit -m "docs(arch): rewrite software-architecture.md principles-first

Replace the stale doc with a principles-first structure. Names P1-P4
(intent over mechanism, dependency flows one way, services own types,
presentation stateless) with rationale and worked examples. Directory
structure is presented as a consequence of the principles.

Adds a 'when principles conflict' section with escalation path to
ADR amendment.
"
```

---

### Task 3: Write the screaming-architecture ADR

**Files:**
- Create: `catalog/decisions/architecture/screaming-architecture.md`

- [ ] **Step 1: Create the ADR file**

Create `catalog/decisions/architecture/screaming-architecture.md` with this exact content:

```markdown
---
status: stable
tags: [architecture, structure, principles]
decided: 2026-04-11
---

# Screaming Architecture for the src/ Tree

Reorganize `src/` into four intent-revealing layers (`shared`, `services`, `design-system`, `entrypoints`) with a one-way dependency rule.

## Context

The original `src/` was organized by technical layer: `src/app/`, `src/lib/`, `src/services/`, `src/types/`, `src/webhook/`, `src/commands/`. Opening the directory told you "this is a Hono app with some utilities" — it didn't tell you what the system did, what processes it ran, or where domain boundaries were. Types were in a single monolithic `models.ts`. The dependency rule, such as it was, lived only in prose.

This had concrete costs:
- New code had no obvious home, so similar things ended up in inconsistent places
- Domain changes rippled unpredictably because cross-boundary types had no owner
- An agent reading the tree had to read files to understand what the system did
- The dependency rule was advisory, not enforced — violations accumulated

## Decision

Reorganize into four top-level directories named by intent:

- **`src/shared/`** — pure utilities, no domain knowledge, zero internal deps
- **`src/services/`** — core domain services, each owning its types (`auth`, `content`, `data-collection`, `deployment`, `forms`, `ingestion`, `notifications`, plus `storage.ts`)
- **`src/design-system/`** — UI components (peer to services, not a dependent)
- **`src/entrypoints/`** — runnable processes as composition roots (`app`, `dashboard`, `webhook`, `notify`, `cli`)

Enforce a one-way dependency rule:
```
shared → services → entrypoints
shared → design-system → entrypoints
```

Decompose the monolithic `src/types/models.ts` into service-owned `types.ts` files.

Four principles follow from this decision:

- **P1 — Intent over mechanism** (names reveal purpose)
- **P2 — Dependency flows one way** (mechanically enforced)
- **P3 — Services own their types** (authoritative ownership)
- **P4 — Presentation is stateless** (components receive ready-to-render data)

See [software-architecture.md](../../architecture/software-architecture.md) for the principles in detail.

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
- Design system components are reusable by construction — they can't depend on services.

**Negative:**
- File moves touched ~450 files across 21 commits on this branch.
- External documentation that references old paths becomes stale.
- Some development-oriented conventions (e.g., "composition at the edge") remain unstated — they're patterns, not principles.

**Accepted:**
- Form-specific components (`flex-form-field`, `flex-form-page`, etc.) live in `design-system/` rather than `entrypoints/app/`. Defended because the design system serves the forms platform — form components are core, not incidental. They define local prop types instead of importing from services.
- Some conformance tests and visual-regression helpers in `design-system/test-helpers/` violate the dependency rule by importing design-system types. These are test infrastructure, not runtime code, and they were moved from `shared/test-helpers/` to `design-system/test-helpers/` to keep runtime `shared/` at zero internal deps.

## Sources

- [notes/2026-04-11-screaming-architecture/design.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/design.md) — original design
- [notes/2026-04-11-screaming-architecture/plan.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/plan.md) — 12-task implementation plan
- [notes/2026-04-11-screaming-architecture/dependency-fixes-design.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/dependency-fixes-design.md) — design for decoupling components from services
- [notes/2026-04-11-screaming-architecture/dependency-fixes-plan.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/dependency-fixes-plan.md) — 8-task plan for the decoupling work
- [notes/2026-04-11-screaming-architecture/principles-design.md](https://github.com/flexion/forms-lab/blob/main/notes/2026-04-11-screaming-architecture/principles-design.md) — this work
```

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: all tests pass. The decisions route auto-discovers files in `catalog/decisions/architecture/`.

- [ ] **Step 3: Commit**

```bash
git add catalog/decisions/architecture/screaming-architecture.md
git commit -m "docs(decisions): add screaming architecture ADR

Add an architectural decision record documenting the screaming
architecture restructuring and the four principles (P1-P4) that shape
the codebase. Names alternatives considered (by-feature, three-layer,
move-form-components-out) and the tradeoffs accepted.

Provides provenance for software-architecture.md.
"
```

---

### Task 4: Write the dependency rule test

**Files:**
- Create: `test/architecture/dependency-rule.test.ts`

- [ ] **Step 1: Create the test file**

Create `test/architecture/dependency-rule.test.ts` with this exact content:

```typescript
import { describe, expect, it } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

/**
 * Enforces P2 (dependency flows one way) from the screaming architecture.
 *
 * Rule:
 *   shared/        -> may import from: (none internal)
 *   services/      -> may import from: shared/, services/
 *   design-system/ -> may import from: shared/, design-system/
 *   entrypoints/   -> may import from: shared/, services/, design-system/, entrypoints/
 *
 * See catalog/architecture/software-architecture.md for rationale.
 * See catalog/decisions/architecture/screaming-architecture.md for provenance.
 *
 * Violations fail the test with a specific file:line reference so the
 * offending site can be fixed directly.
 */

type Layer = 'shared' | 'services' | 'design-system' | 'entrypoints'

const LAYER_ALLOWED: Record<Layer, Layer[]> = {
  shared: ['shared'],
  services: ['shared', 'services'],
  'design-system': ['shared', 'design-system'],
  entrypoints: ['shared', 'services', 'design-system', 'entrypoints'],
}

const SRC_ROOT = join(process.cwd(), 'src')

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(fullPath)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield fullPath
    }
  }
}

function getLayer(absolutePath: string): Layer | null {
  const rel = relative(SRC_ROOT, absolutePath)
  const top = rel.split('/')[0]
  if (
    top === 'shared' ||
    top === 'services' ||
    top === 'design-system' ||
    top === 'entrypoints'
  ) {
    return top
  }
  return null
}

interface Import {
  line: number
  source: string
}

function parseImports(content: string): Import[] {
  const imports: Import[] = []
  const lines = content.split('\n')
  const importPattern = /\bfrom\s+['"]([^'"]+)['"]/
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(importPattern)
    if (match) {
      imports.push({ line: i + 1, source: match[1] })
    }
  }
  return imports
}

/**
 * Resolve a relative import from `fromFile` to an absolute path within src/.
 * Returns null for external packages or non-src imports.
 */
function resolveImport(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null
  const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'))
  const parts = fromDir.split('/')
  const importParts = importPath.split('/')
  for (const part of importParts) {
    if (part === '.') continue
    if (part === '..') {
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return parts.join('/')
}

function getImportedLayer(
  fromFile: string,
  importPath: string,
): Layer | null {
  const resolved = resolveImport(fromFile, importPath)
  if (!resolved) return null
  if (!resolved.startsWith(SRC_ROOT)) return null
  return getLayer(resolved)
}

interface Violation {
  file: string
  line: number
  fromLayer: Layer
  toLayer: Layer
  importPath: string
}

async function findViolations(): Promise<Violation[]> {
  const violations: Violation[] = []
  for await (const file of walk(SRC_ROOT)) {
    const fromLayer = getLayer(file)
    if (!fromLayer) continue
    const content = await readFile(file, 'utf-8')
    const imports = parseImports(content)
    for (const imp of imports) {
      const toLayer = getImportedLayer(file, imp.source)
      if (!toLayer) continue
      if (!LAYER_ALLOWED[fromLayer].includes(toLayer)) {
        violations.push({
          file: relative(process.cwd(), file),
          line: imp.line,
          fromLayer,
          toLayer,
          importPath: imp.source,
        })
      }
    }
  }
  return violations
}

describe('dependency rule (P2)', () => {
  it('shared/ imports only from shared/', async () => {
    const violations = (await findViolations()).filter(
      (v) => v.fromLayer === 'shared',
    )
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — shared/ imports from ${v.toLayer}/: ${v.importPath}`,
        )
        .join('\n')
      throw new Error(`shared/ dependency rule violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })

  it('services/ imports only from shared/ or services/', async () => {
    const violations = (await findViolations()).filter(
      (v) => v.fromLayer === 'services',
    )
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — services/ imports from ${v.toLayer}/: ${v.importPath}`,
        )
        .join('\n')
      throw new Error(`services/ dependency rule violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })

  it('design-system/ imports only from shared/ or design-system/', async () => {
    const violations = (await findViolations()).filter(
      (v) => v.fromLayer === 'design-system',
    )
    if (violations.length > 0) {
      const report = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line} — design-system/ imports from ${v.toLayer}/: ${v.importPath}`,
        )
        .join('\n')
      throw new Error(`design-system/ dependency rule violations:\n${report}`)
    }
    expect(violations).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the new test in isolation**

```bash
bun test test/architecture/dependency-rule.test.ts
```

Expected: all 3 tests pass. The screaming architecture refactor and dependency fixes on this branch made the codebase compliant, so the test should be green immediately.

If any test fails, read the violation report, go to the reported file:line, and either:
- Fix the import (if the code is wrong)
- Report back — the branch had a violation we missed during the refactor

- [ ] **Step 3: Run the full check suite**

```bash
bun run check
```

Expected: all 365 existing tests plus the 3 new ones pass, for 368 total.

- [ ] **Step 4: Commit**

```bash
git add test/architecture/dependency-rule.test.ts
git commit -m "test(arch): enforce P2 dependency rule

Add a test that verifies imports respect the screaming architecture
dependency rule: shared -> services/design-system -> entrypoints.
Violations fail with specific file:line references.

This encodes P2 from software-architecture.md as an executable contract.
"
```

---

### Task 5: Update the static diagram

**Files:**
- Modify: `src/design-system/components/flex-diagram/diagrams/software-architecture.ts` (replace entire contents)

- [ ] **Step 1: Replace the diagram definition**

Replace the entire contents of `src/design-system/components/flex-diagram/diagrams/software-architecture.ts` with:

```typescript
import { resolveUrl } from '../../../../shared/base-path'
import type { GraphDefinition } from '../types'

export const softwareArchitectureGraph: GraphDefinition = {
  title: 'Software Architecture',
  description:
    'Four layers with one-way dependencies (P2). shared has no internal dependencies. services and design-system are peers, both depending only on shared. entrypoints is the composition root — it wires services, design-system, and shared together. See the software architecture doc for the principles (P1-P4) that shape this structure.',
  nodes: [
    {
      id: 'entrypoints',
      label: 'entrypoints',
      description: 'Runnable processes: app, dashboard, webhook, notify, cli',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'services',
      label: 'services',
      description:
        'Core domain services, each owning its types (P3): auth, content, data-collection, deployment, forms, ingestion, notifications, storage',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'design-system',
      label: 'design-system',
      description:
        'UI components. Stateless — receives ready-to-render data (P4).',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
    {
      id: 'shared',
      label: 'shared',
      description: 'Pure utilities. Zero internal dependencies.',
      href: resolveUrl('/catalog/architecture/software-architecture'),
    },
  ],
  edges: [
    { source: 'entrypoints', target: 'services', label: 'depends on' },
    { source: 'entrypoints', target: 'design-system', label: 'depends on' },
    { source: 'entrypoints', target: 'shared', label: 'depends on' },
    { source: 'services', target: 'shared', label: 'depends on' },
    { source: 'design-system', target: 'shared', label: 'depends on' },
  ],
  direction: 'TB',
  nodeWidth: 160,
  nodeHeight: 44,
  ranksep: 60,
  nodesep: 40,
}
```

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: all tests pass. The `test/flex-diagram.test.tsx` test renders diagram definitions; the new node/edge shape is valid per `GraphDefinition`, so it should pass.

- [ ] **Step 3: Commit**

```bash
git add src/design-system/components/flex-diagram/diagrams/software-architecture.ts
git commit -m "docs(arch): update software architecture diagram

Replace the stale App/Webhook/CLI/Services/Lib/Types diagram with the
four-layer screaming architecture: entrypoints, services, design-system,
shared. Edges labeled 'depends on' to visualize P2 (dependency flows
one way). Each node links to the architecture doc.
"
```

---

### Task 6: Cross-reference the artifacts from CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — add a "Principles" section pointing at the architecture doc and dependency rule test

- [ ] **Step 1: Read the current CLAUDE.md Architecture section**

```bash
grep -n '^## ' CLAUDE.md
```

Locate the `## Architecture` section (should be around line 185).

- [ ] **Step 2: Add a Principles subsection**

In `CLAUDE.md`, locate the `## Architecture` section. After the existing bullet list (Runtime, Framework, Data Model, Persistence, Catalog, CLI, CSS), add a new section immediately after:

```markdown
## Principles

The codebase is shaped by four named principles. Before adding or moving code, read [catalog/architecture/software-architecture.md](catalog/architecture/software-architecture.md).

- **P1 — Intent over mechanism.** Directory names reveal purpose, not implementation.
- **P2 — Dependency flows one way.** `shared → services/design-system → entrypoints`. Enforced by `test/architecture/dependency-rule.test.ts`.
- **P3 — Services own their types.** Each service has a `types.ts`; cross-boundary types live with the upstream owner.
- **P4 — Presentation is stateless.** Design-system components receive ready-to-render data.

When a situation doesn't fit a principle, see the "When principles conflict" section in the architecture doc — propose an ADR amendment rather than silently diverging.

Provenance: [catalog/decisions/architecture/screaming-architecture.md](catalog/decisions/architecture/screaming-architecture.md).
```

Place this section immediately after `## Architecture` and before `## Documentation Governance`.

- [ ] **Step 3: Run checks**

```bash
bun run check
```

Expected: all tests pass. CLAUDE.md is not referenced by any test.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add Principles section with cross-references

Point agents at the architecture doc, dependency rule test, and
screaming-architecture ADR from the session-start context.
"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run the full check suite**

```bash
bun run check
```

Expected: all 368 tests pass (365 existing + 3 new dependency rule tests).

- [ ] **Step 2: Verify the new catalog entries render**

```bash
bun run dev &
sleep 3
curl -s http://localhost:3000/catalog/personas | grep -o 'Agent' | head -1
curl -s http://localhost:3000/catalog/architecture | grep -o 'Software Architecture' | head -1
curl -s http://localhost:3000/catalog/decisions | grep -o 'Screaming' | head -1
kill %1 2>/dev/null
```

Expected: each grep finds the expected text, confirming the new catalog pages are served.

If the dev server is already running elsewhere, skip this step and just verify manually in a browser.

- [ ] **Step 3: Verify the dependency rule test would catch a violation**

Sanity check. Add a deliberate violation temporarily:

```bash
echo "import type { Hono } from '../services/forms/types'" >> src/shared/base-path.ts
bun test test/architecture/dependency-rule.test.ts
```

Expected: the test fails with a clear error message pointing at `src/shared/base-path.ts` and the forbidden import.

Revert the change:

```bash
git checkout src/shared/base-path.ts
```

Confirm the test passes again:

```bash
bun test test/architecture/dependency-rule.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 4: Verify the four-node diagram is correct**

```bash
grep -A 2 'id:' src/design-system/components/flex-diagram/diagrams/software-architecture.ts | head -20
```

Expected output shows `entrypoints`, `services`, `design-system`, `shared` — no legacy nodes (`app`, `webhook`, `cli`, `lib`, `types`).

- [ ] **Step 5: Commit if any changes from verification**

If no changes were introduced during verification (expected case), skip this step. Otherwise:

```bash
git add -A
git commit -m "docs(arch): final verification of principles-first presentation"
```
