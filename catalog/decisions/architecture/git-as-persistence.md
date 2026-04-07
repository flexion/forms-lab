---
status: stable
tags: [architecture, persistence, data]
decided: 2026-04-07
---

# Git as Persistence Layer

Store form specs, catalog content, and assets as files in git, making version control the primary persistence mechanism.

## Context

The system needed a way to manage structured data — form specs, catalog docs, assets — that preserved history, supported branching for proposal workflows, and kept operations simple. A traditional database would have required a separate service, migrations, and no native branching model. Git's primitives (commits, branches, SHAs) map naturally onto the system's collaboration and versioning requirements.

## Decision

Git is the persistence layer. Form specs are stored as JSON, catalog content as markdown with YAML frontmatter, and assets (PDFs, policy docs) alongside the specs they belong to. Every change is versioned automatically. Branching enables proposal workflows where authors can shape a spec on a branch before merging. Submissions reference the exact git SHA of the spec version used at collection time, ensuring data interpretation remains unambiguous as specs evolve.

## Alternatives considered

- **PostgreSQL or SQLite** — Supports structured queries and transactions, but loses the branching model entirely. Would require a separate migration strategy and schema management.
- **Headless CMS (e.g., Contentful, Sanity)** — Provides a content authoring UI, but introduces an external service dependency and no meaningful branching workflow.
- **Git + database hybrid** — Use git for versioning and a database for query-heavy operations. Reasonable at scale, but premature complexity for a class project; can be added later when query needs emerge.

## Consequences

- No database to manage, provision, or migrate — reduces operational surface area
- File reads are fast at our scale; catalog renders directly from the filesystem
- Complex queries (e.g., "all forms with field type X") require filesystem traversal, which becomes unwieldy at large scale
- Submissions should move to a database eventually as collected data grows and query patterns mature

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
