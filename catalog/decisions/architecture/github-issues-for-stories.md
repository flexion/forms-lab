---
status: stable
tags: [architecture, project-management]
decided: 2026-04-07
---

# GitHub Issues as Story Source of Truth

Use GitHub Issues as the authoritative store for user stories, with a CLI sync command that pulls them into the repo as markdown files.

## Context

The project needed story tracking that integrated naturally with the development workflow and was accessible as context for Claude Code. Keeping stories entirely separate from the codebase would fragment context; keeping them only in the repo would lose the discussion and collaboration affordances of a purpose-built issue tracker.

## Decision

GitHub Issues labeled `user-story` are the authoritative source of truth for user stories. Milestones map to delivery slices. A CLI sync command (`bun run cli sync-stories`) pulls current issues into `catalog/stories/` as markdown files, making them readable alongside architecture docs and specs. Issues preserve threaded discussion, assignees, and labels; the synced markdown provides offline and tooling access.

## Alternatives considered

- **Repo-only markdown** — Simple and always in sync with code, but loses the discussion threads, notifications, and collaborative editing that GitHub Issues provide.
- **Linear or Jira** — Purpose-built project management with better workflow tooling, but overkill for a class project and creates a context gap for Claude Code.
- **GitHub Projects** — Adds a kanban layer over Issues, but introduces an extra level of indirection without meaningful benefit for our workflow.

## Consequences

- Familiar GitHub interface for story authoring and discussion
- A manual sync step is required to keep repo markdown current; the repo can be stale between syncs
- Stories in the repo provide useful context for AI-assisted development without requiring API calls at runtime

## Sources

- [Design spec](https://github.com/flexion/llm-class-2026-winter-cohort/blob/main/notes/final-project/2026-04-07-design.md)
