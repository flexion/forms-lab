---
kind: shaping-architecture
implementation: full-rewrite
status: abandoned
course-topics: [llm-output-structure, prompt-drift]
---

# Full-spec rewrite (abandoned)

**Status:** abandoned mid-story

## Approach

The LLM received the current `FormSpec` plus Maya's intent and was asked to return a revised `FormSpec` as JSON. The server parsed the returned JSON, validated it against the `FormSpec` schema, and performed a structural diff before-vs-after to surface "what changed" in the UI.

## Observed Failure Modes

### Drift

Asked to *"swap pages 2 and 3"*, Claude preserved the page IDs in position and swapped their contents — titles, group IDs, and field ordering moved between two stable parent records. The structural diff reported "two pages heavily modified" rather than "two pages reordered". Other intents produced similar class of drift: asked to combine two groups, Claude sometimes created a new group and moved fields into it rather than reusing an existing group ID.

### Intent Loss

The server had no first-class record of what Maya asked for. The diff was the only artifact. Any intent that matched several possible structural outcomes (and most did) produced a diff that was ambiguous about *why* changes happened.

### Noisy Diffs

Even semantically trivial edits produced structurally-significant diffs when Claude normalized whitespace in help text, re-quoted strings differently, or rewrote redundant-but-present fields.

### Ceiling Against WYSIWYG

A future drag-drop editor has to translate a click-and-drag into an atomic operation. "Produce a revised `FormSpec`" is not that operation. Building direct manipulation on top of this approach would mean maintaining two distinct edit paths (LLM → full spec, drag → command-or-patch), with no obvious unification.

## Why Abandoned

The failure modes weren't fixable through prompt tuning. The abstraction — "let the LLM rewrite the whole document" — was the problem. The team pivoted to command-based editing before merging the branch.
