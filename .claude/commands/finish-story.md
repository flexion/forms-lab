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
