---
issue: 71
title: Developer navigates LLM integrations via a screaming service layer
milestone: "Final Project"
labels: [user-story]
state: closed
synced_at: 2026-04-20T15:40:03.186Z
---

## User Story

As a **developer**, in order to **quickly locate every LLM integration point and understand each service's public interface**, I want **the catalog to surface LLM touchpoints explicitly and each service to "scream" its intent through a clear public entrypoint that the catalog can link to on GitHub**.

## Preconditions

- Architecture principles (P1–P4) documented in `catalog/architecture/software-architecture.md`
- Services currently under `src/services/*` with per-service `types.ts` but no consistent "public API" file
- Catalog already has architecture, decisions, and experiments sections

## Acceptance Criteria

- [ ] New catalog page (e.g. `catalog/architecture/llm-integrations.md`) enumerates every LLM touchpoint (extraction, shaping, evaluation/judge, conversational filling, future RAG) with deep links to the relevant GitHub source lines
- [ ] Each service under `src/services/*` has a single, obvious public-interface entrypoint (e.g. `index.ts` re-exports, or a documented convention) so a reader sees the service's intent without scanning every file
- [ ] The software-architecture doc is updated to describe the "service public interface" convention, reinforcing P1 (intent over mechanism)
- [ ] Internal helpers are clearly internal: imports from other layers route only through each service's public entrypoint (enforced by `test/architecture/dependency-rule.test.ts` or a sibling test)
- [ ] Catalog pages that describe a service or experiment link to the service's public entrypoint on GitHub (permalinked to a commit or tag where practical)
- [ ] A short "how to navigate this codebase" section exists in the catalog (system-overview or a new page) that names the convention and points at the LLM-integrations page as an example
- [ ] No behavior change: all existing tests and `bun run check` pass

## Success Metrics

- A developer new to the project can list every LLM call site from the catalog in under 5 minutes
- Service directories read as a list of intents (one entrypoint per service), not a flat pile of files
- Cross-service imports reference only the public entrypoint of the target service

## Notes

- Framing: this is a "screaming architecture" pass focused on *service public interfaces*, not a rewrite. Prefer moving/renaming and re-exports over refactors.
- Consider whether the convention is `src/services/<name>/index.ts` (re-exports) or a named file like `src/services/<name>/<name>.ts`. Pick one and document why.
- Good candidate services to audit first: `forms/` (many files — resolver, session, submission, shaping, filling, etc.), `extraction/`, `evaluation/`, `data-collection/`
- LLM-integrations catalog page should cross-reference the experiment roadmap (`catalog/experiments/_roadmap.md`) so readers can trace from a variant back to the code that runs it
- GitHub links should use the `flexion/forms-lab` repo with line ranges; prefer permalinks to `main` unless pinning to a commit is needed
- Consider adding a dependency-rule test that forbids deep imports across service boundaries once the entrypoint convention is established
- Start this work after the first round of experiment stories merges to main

## Definition of Done

- [ ] Acceptance criteria met
- [ ] Threat model updated if security-relevant (unlikely — navigation/docs change)
- [ ] Tests pass (including dependency-rule tests)
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable (catalog page reachable on the deployed branch)