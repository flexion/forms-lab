Initialize a session for working on a story.

## Arguments

$ARGUMENTS — a story issue number (e.g., "48") or a natural language description (e.g., "guided walkthrough", "pdf upload"). If empty, list open stories and ask which one to work on.

## Instructions

### 1. Resolve the story

If `$ARGUMENTS` is a number, fetch it directly:

```bash
gh issue view <number>
```

If `$ARGUMENTS` is text, search for it:

```bash
gh issue list --label "user-story" --state open --search "$ARGUMENTS"
```

If multiple matches, show them and ask the user to pick one. If no matches, suggest `/create-story`.

### 2. Create a worktree

Derive the branch name from the issue: `story-<N>/<short-slug>` where `<short-slug>` is a kebab-case version of the title (max 40 chars).

Check if a branch already exists:

```bash
git branch --list "story-<N>/*"
```

If it exists, ask: "Branch `story-N/name` already exists. Resume work on it, or start fresh?"

If resuming, enter the existing worktree. If starting fresh or new, create a worktree:

```bash
git worktree add .worktrees/story-<N>-<slug> -b story-<N>/<slug> main
```

Then change to the worktree directory.

### 3. Update the flight board

Read `notes/flight-board.md` and add a row:

| Story | Branch | Status | Worktree | Updated |
|-------|--------|--------|----------|---------|
| #N Title | story-N/slug | in-progress | .worktrees/story-N-slug | YYYY-MM-DD HH:MM |

If a row for this story already exists, update its status and timestamp.

### 4. Load context

Read existing notes from `notes/story-N-name/` if the directory exists. Summarize what's been done and what remains.

Read the GitHub issue body to extract ACs and any linked documents.

### 5. Route to the right workflow

Check what artifacts exist in `notes/story-N-name/`:

- **No `design.md`**: This story needs design work. Tell the user: "This story doesn't have a design yet. Starting with brainstorming." Then invoke the brainstorming skill via `/superpowers:brainstorm`. Make sure specs and plans are saved to `notes/story-N-name/`.

- **Has `design.md` but no `plan.md`**: Tell the user: "Design exists but no implementation plan. Let's create one." Invoke the writing-plans skill. Save the plan to `notes/story-N-name/plan.md`.

- **Has `plan.md`**: Tell the user: "Implementation plan exists. Picking up where we left off." Read the plan, identify incomplete tasks (unchecked checkboxes), and invoke the executing-plans skill starting from the first incomplete task.

### 6. Spec and plan location

All design specs and implementation plans for this story go in `notes/story-N-name/`, not `docs/superpowers/`. When invoking superpowers skills, direct their output to this directory.
