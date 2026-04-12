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
