# SDLC Automations Design

**Date:** 2026-04-14
**Status:** draft
**Goal:** Streamline multi-session coordination, enforce consistent process, reduce review burden, and prevent worktree/branch sprawl.

## Problem

Running 3-5 parallel Claude Code sessions on different stories creates coordination overhead:

- Sessions make incompatible changes without awareness of each other's work
- Review quality is inconsistent -- sometimes thorough, sometimes rushed when juggling
- Worktrees and branches pile up from abandoned or completed sessions
- No structural enforcement of the project's defined process (TDD, code review, checks before push)
- Context is lost between sessions working on the same story

## Approach: Hooks-Enforced Lifecycle

Encode the session lifecycle into Claude Code custom commands that route to superpowers skills at the right time. Enforce invariants with git hooks (repo-level) and Claude Code hooks (agent-level). Coordinate via a lightweight flight board file.

## Session Lifecycle Commands

### `/create-story`

Creates a new story and optionally begins implementation.

1. Accepts a natural language description of the desired outcome
2. Creates a GitHub issue with story format (persona narrative, outcome-oriented ACs, acceptance tests)
3. Creates `notes/story-N-name/` directory
4. Asks: "Start implementation now, or just file the story?"
5. If starting, flows into `/start-story` automatically

### `/start-story <description-or-number>`

Initializes a session for story work.

1. Resolves the story by natural language search or issue number via GitHub API
2. Creates a git worktree on a branch (`story-N/short-name`)
3. Adds a row to `notes/flight-board.md` with status "in-progress"
4. Reads existing notes from `notes/story-N-name/` for context
5. Routes to the appropriate superpowers skill based on what already exists:
   - No spec yet: invokes brainstorming skill, then writing-plans
   - Has spec, no plan: invokes writing-plans skill
   - Has plan: invokes executing-plans skill

### `/finish-story`

Wraps up a session's work and creates a PR.

1. Runs `bun run check` (lint + types + tests) -- blocks on failure
2. Invokes the superpowers code-review skill against the branch diff
3. Creates a PR with structured body (summary, AC checklist, test plan)
4. Updates `notes/flight-board.md` to "pr-open" with PR link
5. Appends a completion entry to `notes/story-N-name/session-log.md`

### `/review-story <description-or-pr-number>`

Reviews another session's output.

1. Resolves the PR by natural language search or PR number
2. Fetches PR diff and description
3. Invokes the superpowers code-review skill
4. Checks CI status
5. Provides a structured accept/request-changes recommendation

## Guardrail Hooks

### Git Hooks (repo-level, all actors)

The principle: "Would I want this enforced when manually doing a quick fix from the terminal?" If yes, it's a git hook.

**Pre-push:** Runs `bun run check`. Prevents pushing code that fails lint, types, or tests. Implemented as a shell script, installable via `bun run cli setup-hooks`.

**Commit-msg:** Validates conventional commit format (`type(scope): description`). Rejects malformed messages at commit time.

### Claude Code Hooks (settings.json, agent sessions only)

The principle: agent-process enforcement that doesn't apply to manual git usage.

**Pre-PR creation:** Before `gh pr create`, verifies `bun run check` passed and code-review was invoked (detected by the presence of a `notes/story-N-name/review.md` artifact written by `/finish-story`). Blocks if either is missing.

**Flight board update:** On branch creation and PR creation, updates `notes/flight-board.md` with session status.

**Worktree cleanup reminder:** On session exit, warns about uncommitted changes or unmerged worktrees.

## GitHub Actions Enhancements

**Required status checks:** Mark existing CI jobs (test, lint) as required checks on `main`. GitHub settings change only.

**Post-deploy smoke check:** After the webhook deploys a branch, trigger `scripts/smoke-check.ts` against the deployed URL. Report pass/fail back to the PR as a commit status.

**Auto-delete branches:** Enable "Automatically delete head branches" in GitHub repo settings.

## Story Workspace in `notes/`

Each story gets a subdirectory that collects all session artifacts:

```
notes/
  flight-board.md                # cross-story coordination
  story-48-walkthrough/
    design.md                    # from brainstorming skill
    plan.md                      # from writing-plans skill
    session-log.md               # timestamped session entries
  story-9-form-delivery/
    design.md
    plan.md
    session-log.md
```

**Flight board** stays at `notes/` top level since it spans all stories.

**Session log** is appended by `/start-story` and `/finish-story` with timestamped entries: what was worked on, decisions made, what's left. Gives the next session context without re-reading the full diff.

**Superpowers skill output** (specs, plans) targets the story subdirectory instead of `docs/superpowers/`.

## Flight Board Format

```markdown
# Flight Board

| Story | Branch | Status | Worktree | Updated |
|-------|--------|--------|----------|---------|
| #48 Guided walkthrough | story-48/walkthrough | in-progress | worktree-abc | 2026-04-14 10:30 |
| #9 Form delivery | story-9/form-delivery | pr-open (#52) | worktree-def | 2026-04-14 09:15 |
```

**Status values:** in-progress, pr-open, merged
**Pruning:** Rows older than 7 days in "merged" status are removed automatically.
**Fallback:** If the flight board gets stale, `gh issue list` and `gh pr list` are authoritative.

## Enforced Workflow Summary

1. **Create story** -- `/create-story` or manual GitHub issue
2. **Start session** -- `/start-story` resolves story, creates worktree, routes to right skill
3. **Work** -- normal session with superpowers skills, artifacts in `notes/story-N-name/`
4. **Wrap up** -- `/finish-story` runs checks, reviews, creates PR, updates flight board
5. **Review** -- `/review-story` or manual review
6. **Merge** -- branch auto-deletes, flight board entry ages out

Any step can be skipped or done manually, but the default path enforces the full process. Hooks catch omissions; commands make the right thing the easy thing.

## Implementation Scope

This design produces work items in these categories:

1. **Custom commands** -- `/create-story`, `/start-story`, `/finish-story`, `/review-story`
2. **Git hooks** -- pre-push (`bun run check`), commit-msg (conventional commit validation)
3. **Claude Code hooks** -- pre-PR check, flight board updates, worktree cleanup reminder
4. **GitHub configuration** -- required status checks, auto-delete branches
5. **GitHub Actions** -- post-deploy smoke check workflow
6. **Convention** -- `notes/story-N-name/` directory structure, flight board format, session log format
