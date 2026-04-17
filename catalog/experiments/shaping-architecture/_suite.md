---
kind: shaping-architecture
status: working
---

# LLM-Assisted Form Shaping: Architecture Evaluation

A qualitative comparison of two architectures for LLM-assisted editing of a form's `FormSpec` and `DataCollectionSpec`. Both approaches were implemented and driven against the same set of user intents during story-4 development. This experiment captures what was observed and why the team pivoted from the first approach to the second.

## Variants

| Variant | Approach | Outcome |
|---|---|---|
| full-rewrite | LLM returns a revised `FormSpec` as free-form JSON; server diffs before/after | Abandoned mid-story |
| command-based | LLM emits a sequence of domain commands via AI SDK tool-use; direct-manipulation editors (PR #54) emit the same commands and share one staged buffer | Shipped; substrate extended to direct editing |

## Evaluation Method

**Qualitative, not metric-driven.** No automated benchmark exists here. Findings come from running both implementations against the same six representative intents:

1. "Swap pages 2 and 3"
2. "Combine the two employment pages into one"
3. "Make the middle-name field optional"
4. "Move 'military service' to page 4"
5. "Rename 'personal info' to 'applicant information'"
6. "Suggest delivery modes for each section based on complexity"

For each variant, we recorded: does the LLM produce a plausible result, does the result match intent, is the resulting diff legible to Maya, and does the implementation scale toward direct-manipulation editing (WYSIWYG).

## Why Capture This

The pivot from full-rewrite to command-based happened on one branch before merge. Without this record, the "why" lives only in commit history and a design note. An experiment page makes the reasoning reviewable alongside the rest of the project's LLM work.

## Course Topics

- LLM output structure: structured output vs. constrained tool-use
- Prompt drift and intent capture
- Multi-layer validation (model-level, schema-level, semantic-level)
