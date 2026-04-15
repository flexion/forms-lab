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
