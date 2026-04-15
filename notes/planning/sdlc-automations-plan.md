# SDLC Automations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode the multi-session story lifecycle into Claude Code commands, git hooks, Claude Code hooks, and GitHub configuration so the process is consistent, enforced, and visible.

**Architecture:** Four Claude Code custom commands (`/create-story`, `/start-story`, `/finish-story`, `/review-story`) orchestrate the session lifecycle and route to superpowers skills. Git hooks enforce repo invariants (pre-push checks, conventional commits). Claude Code hooks in `settings.json` enforce agent-specific process (pre-PR verification, flight board updates). A flight board file at `notes/flight-board.md` tracks in-flight work.

**Tech Stack:** Claude Code custom commands (markdown), shell scripts (git hooks), Claude Code settings.json hooks, GitHub Actions, `gh` CLI

---

## File Structure

### New files
- `.claude/commands/create-story.md` -- custom command for story creation
- `.claude/commands/start-story.md` -- custom command for session initialization
- `.claude/commands/finish-story.md` -- custom command for session wrap-up
- `.claude/commands/review-story.md` -- custom command for PR review
- `scripts/install-hooks.sh` -- git hook installer
- `scripts/git-hooks/pre-push` -- pre-push hook script
- `scripts/git-hooks/commit-msg` -- commit-msg hook script
- `notes/flight-board.md` -- coordination file (initial empty template)
- `.github/workflows/smoke-check.yml` -- post-deploy smoke check action

### Modified files
- `.claude/settings.json` -- add Claude Code hooks
- `package.json` -- add `setup-hooks` script

---

### Task 1: Flight Board Template

**Files:**
- Create: `notes/flight-board.md`

- [ ] **Step 1: Create the flight board file**

```markdown
# Flight Board

| Story | Branch | Status | Worktree | Updated |
|-------|--------|--------|----------|---------|
```

- [ ] **Step 2: Commit**

```bash
git add notes/flight-board.md
git commit -m "feat(sdlc): add flight board for session coordination"
```

---

### Task 2: Git Hook -- Pre-Push

**Files:**
- Create: `scripts/git-hooks/pre-push`
- Create: `scripts/install-hooks.sh`
- Modify: `package.json` (add `setup-hooks` script)

- [ ] **Step 1: Create the pre-push hook script**

Create `scripts/git-hooks/pre-push`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Running pre-push checks (bun run check)..."
bun run check
echo "Pre-push checks passed."
```

- [ ] **Step 2: Create the hook installer script**

Create `scripts/install-hooks.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/scripts/git-hooks"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

for hook in "$HOOKS_DIR"/*; do
  hook_name="$(basename "$hook")"
  target="$GIT_HOOKS_DIR/$hook_name"

  if [ -f "$target" ] && [ ! -L "$target" ]; then
    echo "WARNING: $target already exists and is not a symlink. Skipping."
    echo "  Remove it manually if you want to install the managed hook."
    continue
  fi

  ln -sf "$hook" "$target"
  echo "Installed $hook_name -> $target"
done

echo "Git hooks installed."
```

- [ ] **Step 3: Make both scripts executable**

```bash
chmod +x scripts/git-hooks/pre-push scripts/install-hooks.sh
```

- [ ] **Step 4: Add setup-hooks script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"setup-hooks": "bash scripts/install-hooks.sh"
```

- [ ] **Step 5: Test the installer**

```bash
bun run setup-hooks
```

Expected: prints "Installed pre-push -> .git/hooks/pre-push"

- [ ] **Step 6: Commit**

```bash
git add scripts/git-hooks/pre-push scripts/install-hooks.sh package.json
git commit -m "feat(sdlc): add pre-push hook running bun run check"
```

---

### Task 3: Git Hook -- Conventional Commit Validation

**Files:**
- Create: `scripts/git-hooks/commit-msg`

- [ ] **Step 1: Create the commit-msg hook script**

Create `scripts/git-hooks/commit-msg`:

```bash
#!/usr/bin/env bash
set -euo pipefail

commit_msg_file="$1"
commit_msg="$(head -1 "$commit_msg_file")"

# Allow merge commits
if echo "$commit_msg" | grep -qE '^Merge '; then
  exit 0
fi

# Conventional commit pattern: type(scope): description
# type is required, scope is optional
pattern='^(feat|fix|docs|test|chore|refactor|style|perf|ci|build|infra|revert)(\([a-zA-Z0-9_/-]+\))?: .+'

if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo ""
  echo "ERROR: Commit message does not follow conventional commit format."
  echo ""
  echo "Expected: type(scope): description"
  echo "  Types: feat, fix, docs, test, chore, refactor, style, perf, ci, build, infra, revert"
  echo "  Scope: optional, in parentheses"
  echo ""
  echo "Examples:"
  echo "  feat(auth): add GitHub OAuth flow"
  echo "  fix: correct date parsing in submission handler"
  echo "  infra(nixos): update caddy reverse proxy config"
  echo ""
  echo "Your message: $commit_msg"
  exit 1
fi
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/git-hooks/commit-msg
```

- [ ] **Step 3: Reinstall hooks**

```bash
bun run setup-hooks
```

Expected: prints "Installed commit-msg" and "Installed pre-push"

- [ ] **Step 4: Test with a bad commit message**

```bash
echo "test" > /tmp/test-commit-msg
scripts/git-hooks/commit-msg /tmp/test-commit-msg
```

Expected: exits non-zero with the error message explaining the format.

- [ ] **Step 5: Test with a good commit message**

```bash
echo "feat(auth): add login flow" > /tmp/test-commit-msg
scripts/git-hooks/commit-msg /tmp/test-commit-msg
```

Expected: exits 0, no output.

- [ ] **Step 6: Commit**

```bash
git add scripts/git-hooks/commit-msg
git commit -m "feat(sdlc): add conventional commit validation hook"
```

---

### Task 4: Custom Command -- `/create-story`

**Files:**
- Create: `.claude/commands/create-story.md`

- [ ] **Step 1: Write the command**

Create `.claude/commands/create-story.md`:

```markdown
Create a new user story and optionally begin implementation.

## Arguments

$ARGUMENTS — a natural language description of the desired outcome. Can be a brief phrase or a detailed description.

## Instructions

1. **Clarify the story** if the description is vague. Ask one clarifying question at most. If the intent is clear, proceed.

2. **Identify the persona.** Determine which persona this story is for based on the catalog:
   - Maya (form creator) -- authoring, uploading, shaping forms
   - Carlos (form filler) -- completing, submitting forms
   - Developer -- infrastructure, tooling, evaluation, security
   If unclear, ask.

3. **Draft the GitHub issue** with this structure:

   ```
   ## User Story

   As a **[persona]**, in order to **[goal/purpose]**, I want **[desired capability]**

   ## Preconditions

   - [What must be true before this story can start]

   ## Acceptance Criteria

   - [ ] [Outcome-oriented, testable criterion]
   - [ ] [Each criterion describes a user-observable result]

   ## Success Metrics

   - [Measurable indicators of success]

   ## Notes

   - [Implementation hints, constraints, or open questions]

   ## Definition of Done

   - [ ] Acceptance criteria met
   - [ ] Threat model updated if security-relevant
   - [ ] Tests pass
   - [ ] Type checking passes
   - [ ] CI pipeline green
   - [ ] Deployed and demoable
   ```

4. **Show the draft** to the user for approval before creating. Make any requested changes.

5. **Create the GitHub issue:**

   ```bash
   gh issue create --title "<story title>" --label "user-story" --milestone "Final Project" --body "<body>"
   ```

6. **Create the story notes directory:**

   ```bash
   mkdir -p notes/story-<N>-<short-name>/
   ```

   Where `<N>` is the issue number and `<short-name>` is a kebab-case slug derived from the title.

7. **Ask the user:** "Story #N created. Start implementation now, or just file it?"

8. If starting now, tell the user to run `/start-story <N>` (do not invoke it directly -- the user should start a fresh session or continue explicitly).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/create-story.md
git commit -m "feat(sdlc): add /create-story custom command"
```

---

### Task 5: Custom Command -- `/start-story`

**Files:**
- Create: `.claude/commands/start-story.md`

- [ ] **Step 1: Write the command**

Create `.claude/commands/start-story.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/start-story.md
git commit -m "feat(sdlc): add /start-story custom command"
```

---

### Task 6: Custom Command -- `/finish-story`

**Files:**
- Create: `.claude/commands/finish-story.md`

- [ ] **Step 1: Write the command**

Create `.claude/commands/finish-story.md`:

```markdown
Wrap up the current session's work and create a pull request.

## Instructions

### 1. Identify the current story

Determine the story from the current branch name (should match `story-<N>/<slug>`). If not on a story branch, ask which story this work is for.

Fetch the issue to get the ACs:

```bash
gh issue view <N>
```

### 2. Run checks

Run the full check suite:

```bash
bun run check
```

If checks fail, report the failures and stop. Do not proceed to PR creation until checks pass. Help fix any issues.

### 3. Review the work

Run the superpowers code-review skill (invoke `/superpowers:requesting-code-review`) against the diff from the base branch:

```bash
git diff main...HEAD
```

The review should assess:
- Do the changes satisfy the ACs from the GitHub issue?
- Are there test gaps?
- Are there architectural concerns (check against principles in CLAUDE.md)?
- Any security-relevant changes that need threat model updates?

If the review finds issues, fix them before proceeding. Re-run checks after fixes.

### 4. Write a review artifact

Save the code review summary to `notes/story-N-name/review.md` with:
- Date and branch
- AC coverage assessment
- Issues found and resolved
- Any remaining concerns

### 5. Create the PR

```bash
gh pr create --base main --title "<type>(scope): <short description>" --body "$(cat <<'EOF'
## Summary

<2-3 bullet points describing what this PR delivers>

## Story

Closes #<N>

## Acceptance Criteria

<Copy ACs from the issue, mark which are addressed by this PR>

## Test Plan

- [ ] `bun run check` passes
- [ ] <specific test scenarios based on the ACs>
- [ ] Deployed and verified at <branch URL if applicable>

## Review Notes

<Any context the reviewer needs, decisions made, tradeoffs>
EOF
)"
```

### 6. Update the flight board

Read `notes/flight-board.md` and update this story's row:
- Status: `pr-open`
- Add the PR number/link
- Update the timestamp

### 7. Update the session log

Append to `notes/story-N-name/session-log.md`:

```markdown
## YYYY-MM-DD HH:MM -- Session complete

**Branch:** story-N/slug
**PR:** #<pr-number>
**Changes:** <one-line summary>
**Status:** PR open for review
```

### 8. Report

Tell the user: "PR #X created for story #N. Flight board updated. Ready for review."
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/finish-story.md
git commit -m "feat(sdlc): add /finish-story custom command"
```

---

### Task 7: Custom Command -- `/review-story`

**Files:**
- Create: `.claude/commands/review-story.md`

- [ ] **Step 1: Write the command**

Create `.claude/commands/review-story.md`:

```markdown
Review a pull request for a story.

## Arguments

$ARGUMENTS — a PR number (e.g., "52"), a story number (e.g., "#48"), or a natural language description (e.g., "walkthrough PR", "pdf upload"). If empty, list open PRs and ask which one to review.

## Instructions

### 1. Resolve the PR

If `$ARGUMENTS` is a PR number, fetch it:

```bash
gh pr view <number>
```

If `$ARGUMENTS` starts with `#` (story number), find the PR for that story:

```bash
gh pr list --search "story-<N>" --state open
```

If `$ARGUMENTS` is text, search:

```bash
gh pr list --search "$ARGUMENTS" --state open
```

If multiple matches, show them and ask the user to pick one.

### 2. Gather context

Fetch the PR details:

```bash
gh pr view <number> --json title,body,headRefName,baseRefName,additions,deletions,files,reviews,statusCheckRollup
```

Fetch the diff:

```bash
gh pr diff <number>
```

Read the linked story issue (extract the issue number from the PR body or branch name).

### 3. Check CI status

```bash
gh pr checks <number>
```

Report whether CI is passing, failing, or pending. If failing, identify which checks failed.

### 4. Invoke code review

Run the superpowers code-review skill (`/superpowers:requesting-code-review`) against the PR diff. The review should assess:

- **AC coverage:** Does the PR satisfy all acceptance criteria from the linked story?
- **Test coverage:** Are there tests for the new behavior? Are edge cases covered?
- **Architecture:** Do the changes follow the project's principles (P1-P4 from CLAUDE.md)?
- **Security:** Any new trust boundaries, data flows, or auth changes that need threat model updates?
- **Code quality:** Naming, structure, unnecessary complexity?

### 5. Provide a structured recommendation

Format the review as:

```markdown
## Review: PR #<number> -- <title>

**Story:** #<N> <title>
**CI:** passing/failing/pending
**Verdict:** APPROVE / REQUEST CHANGES

### AC Coverage
- [x/~/ ] AC 1 -- <assessment>
- [x/~/ ] AC 2 -- <assessment>

### Findings
1. **[severity]** <finding> -- <file:line>
   Suggestion: <what to change>

### Summary
<1-2 sentences: overall assessment and recommendation>
```

Severity levels: `critical` (blocks merge), `important` (should fix), `suggestion` (nice to have)

### 6. Ask the user

"Based on this review, would you like me to: (a) approve the PR, (b) request changes with these findings, or (c) leave a comment without a verdict?"

Then execute the chosen action:

```bash
# Approve
gh pr review <number> --approve --body "<summary>"

# Request changes
gh pr review <number> --request-changes --body "<findings>"

# Comment
gh pr review <number> --comment --body "<findings>"
```
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/review-story.md
git commit -m "feat(sdlc): add /review-story custom command"
```

---

### Task 8: Claude Code Hooks in settings.json

**Files:**
- Modify: `.claude/settings.json`

- [ ] **Step 1: Read the current settings**

```bash
cat .claude/settings.json
```

Current content:

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true
  }
}
```

- [ ] **Step 2: Add hooks to settings.json**

Update `.claude/settings.json` to:

```json
{
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true
  },
  "hooks": {
    "PreToolCall": [
      {
        "matcher": "Bash(gh pr create*)",
        "hook": "bash -c 'if [ ! -f notes/story-*/review.md ] && ! git log --oneline -20 | grep -q \"review\"; then echo \"WARNING: No code review artifact found. Run /finish-story to ensure code review before PR creation.\" >&2; fi'",
        "description": "Warn if creating a PR without a code review artifact"
      }
    ],
    "PostToolCall": [
      {
        "matcher": "Bash(git push*)",
        "hook": "bash -c 'BRANCH=$(git branch --show-current); if [[ \"$BRANCH\" == story-* ]]; then STORY_NUM=$(echo $BRANCH | sed \"s/story-\\([0-9]*\\).*/\\1/\"); echo \"Reminder: update notes/flight-board.md for story #$STORY_NUM\" >&2; fi'",
        "description": "Remind to update flight board after pushing a story branch"
      }
    ],
    "Stop": [
      {
        "hook": "bash -c 'WORKTREES=$(git worktree list --porcelain 2>/dev/null | grep \"^worktree\" | grep -v \"$(git rev-parse --show-toplevel)$\" || true); if [ -n \"$WORKTREES\" ]; then DIRTY=\"\"; for wt in $(echo \"$WORKTREES\" | sed \"s/worktree //\"); do if [ -n \"$(git -C \"$wt\" status --porcelain 2>/dev/null)\" ]; then DIRTY=\"$DIRTY\\n  $wt\"; fi; done; if [ -n \"$DIRTY\" ]; then echo \"WARNING: Worktrees with uncommitted changes:$DIRTY\" >&2; fi; fi'",
        "description": "Warn about worktrees with uncommitted changes on session exit"
      }
    ]
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(sdlc): add Claude Code hooks for PR review check and flight board reminders"
```

---

### Task 9: GitHub Actions -- Post-Deploy Smoke Check

**Files:**
- Create: `.github/workflows/smoke-check.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/smoke-check.yml`:

```yaml
name: Post-Deploy Smoke Check

on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Branch that was deployed'
        required: true
      base_url:
        description: 'Deployed URL to check'
        required: true

jobs:
  smoke:
    name: Smoke Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.branch }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run smoke checks
        run: bun run smoke
        env:
          BASE_URL: ${{ inputs.base_url }}

      - name: Report status
        if: always()
        run: |
          if [ "${{ job.status }}" = "success" ]; then
            gh api repos/${{ github.repository }}/statuses/${{ github.sha }} \
              -f state=success \
              -f description="Smoke check passed" \
              -f context="smoke-check"
          else
            gh api repos/${{ github.repository }}/statuses/${{ github.sha }} \
              -f state=failure \
              -f description="Smoke check failed" \
              -f context="smoke-check"
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/smoke-check.yml
git commit -m "ci(sdlc): add post-deploy smoke check workflow"
```

---

### Task 10: GitHub Repository Configuration

This task is manual GitHub settings changes, not code.

- [ ] **Step 1: Enable auto-delete branches**

```bash
gh api repos/{owner}/{repo} --method PATCH -f delete_branch_on_merge=true
```

- [ ] **Step 2: Enable required status checks on main**

Go to GitHub repo Settings > Branches > Branch protection rules for `main`, or use:

```bash
gh api repos/{owner}/{repo}/branches/main/protection --method PUT \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=Test" \
  -f "required_status_checks[contexts][]=Lint" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews=null" \
  -f "restrictions=null"
```

- [ ] **Step 3: Verify settings**

```bash
gh api repos/{owner}/{repo} --jq '.delete_branch_on_merge'
```

Expected: `true`

---

### Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add session lifecycle section to CLAUDE.md**

Add after the "Quick Reference" section:

```markdown
## Session Lifecycle

Use these commands to maintain a consistent workflow across sessions:

```bash
/create-story              # Create a new user story (GitHub issue + notes directory)
/start-story <description> # Initialize session for a story (worktree, context, skill routing)
/finish-story              # Run checks, code review, create PR, update flight board
/review-story <PR>         # Review another session's PR
```

Session artifacts are stored in `notes/story-N-name/` (design, plan, session log, review).
The flight board at `notes/flight-board.md` tracks in-flight work across sessions.
```

- [ ] **Step 2: Update the setup section**

Add to the Setup section, after GitHub OAuth:

```markdown
### Git Hooks

Install project git hooks (pre-push checks, conventional commit validation):

```bash
bun run setup-hooks
```
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(sdlc): document session lifecycle commands and git hook setup"
```

---

### Task 12: Integration Test

This task verifies the full lifecycle works end-to-end.

- [ ] **Step 1: Install git hooks**

```bash
bun run setup-hooks
```

- [ ] **Step 2: Test conventional commit validation**

```bash
echo "bad message" > /tmp/test-msg && scripts/git-hooks/commit-msg /tmp/test-msg; echo "exit: $?"
echo "feat(test): good message" > /tmp/test-msg && scripts/git-hooks/commit-msg /tmp/test-msg; echo "exit: $?"
```

Expected: first exits 1, second exits 0.

- [ ] **Step 3: Verify flight board exists and is valid markdown**

```bash
cat notes/flight-board.md
```

Expected: shows the empty flight board template with headers.

- [ ] **Step 4: Verify all custom commands are loadable**

```bash
ls -la .claude/commands/
```

Expected: `create-story.md`, `start-story.md`, `finish-story.md`, `review-story.md`, `review-threat-model.md`

- [ ] **Step 5: Verify settings.json is valid JSON**

```bash
bun -e "console.log(JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')))"
```

Expected: prints the parsed JSON object without errors.

- [ ] **Step 6: Run project checks**

```bash
bun run check
```

Expected: all checks pass (lint, types, tests).
