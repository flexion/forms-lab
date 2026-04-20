---
issue: 52
title: LLM responds to review comments to evolve forms
milestone: ""
labels: [user-story]
state: open
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form creator (Maya)**, in order to **iterate on form designs through natural conversation during review**, I want **the LLM to read my review comments and propose changes to the form specs**

## Preconditions:

- A review (PR) exists for a form branch (Story 5)
- Maya can leave comments on the review page

## Acceptance Criteria:

- [ ] Maya can leave a comment on a review that describes a desired change
- [ ] The LLM interprets the comment and proposes form shaping commands
- [ ] Maya can accept or reject the LLM's proposed changes
- [ ] Changes from accepted proposals appear as new commits on the branch
- [ ] The review diff updates to reflect the new changes
- [ ] Conversation thread is preserved for context

## Notes:

- Builds on Story 5's review/comment infrastructure and Story 4's command-based shaping
- This is an agentic integration point: the LLM participates in the review process
- Comments are the input channel; shaping commands are the output
- Spun off from Story 5 design discussion (2026-04-16)

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Deployed and demoable