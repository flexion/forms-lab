---
status: working
audience: future-claude-session
created: 2026-04-19
---

# Experiment Orchestration — PR #58 Follow-ups

## 1. Purpose

This document is the executable handoff for the eight follow-up experiment stories (#59–#66) filed after PR #58 (story 10 variant picker). Any future Claude Code session picks this file up, reads the status table, and dispatches the next story without needing prior conversation history. There is no separate coordinator service or automation — discipline enforced by a single doc is cheaper and more adaptable than code given the presentation deadline (~2026-04-20) and the small, bounded scope. The "orchestration" is: read this file, pick the next story, execute the playbook, update the table, commit. Humans read it too — the status table is the single source of truth the user checks between sessions.

## 2. Current state

| Issue | Title | Status | Branch | Tier | Blockers |
|-------|-------|--------|--------|------|----------|
| #59 | Maya chooses her shaping model | **shipped** | merged (PR #69) | 1 | — |
| #60 | Carlos's conversation uses a chosen model | planned | — | 3 | #58 + #9 |
| #61 | Maya verifies AcroForm mapping | planned | — | 2 | — |
| #62 | Maya's extractions cite the law (RAG) | planned | — | 2 | — |
| #63 | Maya's extractions learn from curated examples (few-shot) | **shipped** | merged (PR #67) | 1 | — |
| #64 | Maya's extractions use a tuned prompt (prompt-opt) | planned | — | 2 | — |
| #65 | Maya's extractions use our fine-tuned model (LoRA) | **scope-deferred** | — | 3 | See catalog/experiments/pdf-field-extraction/lora-scope-deferral.md |
| #66 | Maya extracts via structured tool-use | **shipped** | merged (PR #68) | 1 | — |
| #73 | Prompt optimization (hybrid/temperature) | **shipped** | merged (PR #76) | 2 | Hybrid-v1 wins suite (precision 99.2%, recall 72.6%); temp=0 ablation shows +15.1pp precision at -9.9pp recall |
| #74 | RAG extraction variant | **pr-open** | [PR #78](https://github.com/flexion/forms-lab/pull/78) | 2 | Sensitivity +25.3pp, precision +13.6pp, recall -5.7pp |
| #75 | Live shaping model evaluation | **shipped** | merged (PR #77) | 2 | Opus 73/83/67%, Sonnet 67/75/62%, Haiku 67/83/62%. |

**How to update this table** — edit it in a commit alongside any status change. This file is the source of truth; the catalog roadmap (`catalog/experiments/_roadmap.md`) mirrors it. Statuses: `planned` → `in-progress` → `pr-open` → `shipped`, or `scope-deferred` if cut.

## 3. Priority tiers

- **Tier 1** — parallel-safe, small blast radius. Three subagents can run concurrently in separate worktrees without stepping on each other. These are mostly prompt/variant changes behind the existing shaping pipeline.
- **Tier 2** — sequential. Each story introduces new infra (a new eval kind, prompt-opt harness, RAG retrieval service) that later stories may reuse. Running them in parallel risks duplicate infra or merge conflicts on the shared eval scaffolding.
- **Tier 3** — gated. Heavy work (LoRA training, multi-service integration). Requires explicit user approval before start. Scope-deferral with a written note is an acceptable outcome given the timeline.

**Recommended execution order** (after PR #58 merges):
1. Launch tier 1 in parallel: #63 (few-shot), #66 (tool-use), #59 (shaping-model picker).
2. As tier 1 completes, pick up tier 2 serially: #61 (field-mapping) → #64 (prompt-opt) → #62 (RAG).
3. Tier 3 (#60 filling, #65 LoRA) only after user approval, and only if time remains before the presentation.

## 4. Per-story execution playbook

Steps below are self-contained. A fresh session needs only this doc and the issue body.

1. **Read the issue.** `gh issue view <N>` to load the full acceptance criteria and linked design notes.
2. **Create a worktree.** Use the kebab-case slug from `catalog/experiments/_roadmap.md` (e.g., `field-mapping-comparison` for #61):
   ```
   git worktree add .worktrees/experiment-<slug> -b experiment/<N>-<slug> origin/main
   ```
3. **Scaffold notes.** `mkdir -p notes/story-<N>-<slug>/` and commit stub `design.md` and `plan.md` on the first commit so later commits have a home.
4. **Brainstorm (if non-trivial).** Invoke `superpowers:brainstorming` for any story that introduces new infra or touches multiple surfaces (#61, #62, #64, #65). For pure prompt variants (#63 few-shot, #66 tool-use) brainstorming is usually overkill — use judgment.
5. **Write a plan.** Invoke `superpowers:writing-plans`. Commit `notes/story-<N>-<slug>/plan.md`.
6. **Execute.** Invoke `superpowers:subagent-driven-development`. Each task: implementer subagent → spec review → code-quality review for behavior-bearing commits (skipped for pure-type or barrel files).
7. **Update catalog.** Definition of done for every story:
   - A variant markdown in the right `catalog/experiments/<suite>/` directory with metrics and findings.
   - Update `catalog/experiments/_roadmap.md` — flip the row to `shipped` with a one-line finding.
   - Update this file's status table.
8. **Verify.** `bun run check` must be green before push. No exceptions, no skipped tests.
9. **Open a draft PR.** `gh pr create --draft --base main` with a summary that links back to the issue.
10. **Report to the user.** PR URL, findings, checkpoint needs. User merges. The coordinator session never merges.

The `/start-story` and `/finish-story` skills shortcut steps 2–3 and 8–9 respectively. Prefer them when the story shape fits; fall back to the raw commands above when they don't.

## 5. Dispatch template

Paste into the Agent tool with `subagent_type=general-purpose`, filling placeholders:

```
You are implementing Story #{{ISSUE_NUMBER}}: {{TITLE}}.

## Working directory
/home/daniel/src/forms-lab/.worktrees/experiment-{{SLUG}}

## Story
Read the full acceptance criteria via `gh issue view {{ISSUE_NUMBER}}`.
The plan lives at notes/story-{{ISSUE_NUMBER}}-{{SLUG}}/plan.md — read it
before writing any code. If it doesn't exist, stop and report NEEDS_CONTEXT.

## Method
- TDD: write a failing test first, then implementation, then refactor.
- Commit messages follow conventional commits (feat/fix/test/docs/chore
  with scope). One logical change per commit.
- Behavior-bearing code requires test coverage. Pure type/barrel files
  do not.
- Before claiming done, run `bun run check` and paste the tail of the
  output into your report.

## Required output
A single report at the end of your run with one of these statuses:
- DONE — all tasks complete, check green, branch ready for PR.
- DONE_WITH_CONCERNS — complete but with caveats the coordinator
  should surface to the user (list them).
- BLOCKED — cannot proceed; state the blocker and what input is needed.
- NEEDS_CONTEXT — missing plan, spec, or prior artifact; state what.

Include the branch name, list of commits made, and the paths of any
catalog entries or notes you created or modified.

## Non-goals
Do not merge. Do not push to main. Do not delete or skip tests. Do not
modify infra (NixOS, Pulumi, webhook) — those are out of scope for
experiment stories.
```

## 6. Checkpoint rules

Non-negotiable user gates. When a gate fires, stop, commit the status-table update, and report to the user.

- **Before starting a tier-3 story** — confirm scope and cost commitment with the user in writing.
- **Before any `bun run cli evaluate` run** — Bedrock spend is roughly $2–10 per run; get explicit user go-ahead.
- **Before any LoRA training run** — GPU time and dollar commitment; user approval required.
- **Before merging any PR** — the user merges. The coordinator session never merges.
- **On any failure** — session stops, marks the story `blocked-on-user` in the status table with a one-line reason, commits the update, reports.

## 7. Kill switch

If context runs out or the user interrupts mid-story, stop cleanly:

1. Commit whatever is in the current worktree, even if incomplete. Prefix the message with `WIP:`.
2. Push the branch.
3. Update this file — set the story status to `in-progress` with a one-line note of what is left to do and what the next session should pick up.
4. Commit and push the status update on the story branch (not a separate orchestration branch — keeps history flat).
5. Done. The next session reads this doc plus `git log` on the story branch and resumes.

## 8. Known risks

- **Scope creep per story.** Each experiment is a variant — resist the urge to refactor adjacent code. File a follow-up issue instead.
- **Fixture cache contention.** Parallel subagents hitting the same fixture cache directory can race. Give each worktree its own cache dir if tests start flaking.
- **Bedrock rate limits.** Running multiple `evaluate` invocations in parallel will throttle. Serialize eval runs across tier-1 parallel stories.
- **LoRA likely won't ship by the presentation.** Plan to scope-defer #65 with a written note rather than burn the last day chasing it.
- **The 759-test suite takes ~7s and must stay green.** No `test.skip` to make a story "look done." If a test is wrong, fix or delete it with a commit message explaining why.
