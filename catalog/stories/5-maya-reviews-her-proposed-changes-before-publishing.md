---
issue: 5
title: Maya reviews her proposed changes before publishing
milestone: "Final Project"
labels: [user-story]
state: open
synced_at: 2026-04-16T22:12:05.773Z
---

## User Story:

As a **form creator (Maya)**, in order to **understand the impact of my changes before they go live**, I want **to see a semantic diff of my proposed specs compared to the published version, with side-by-side previews**

## Preconditions:

- Maya has made changes to a FormSpec (Story 4 shaping, on a named branch)
- Published version exists on `main` for comparison

## Acceptance Criteria:

- [ ] Branch model: `main` is the published state; named branches are working copies
- [ ] `main` is read-only in the editor; Maya must create or select a branch to edit
- [ ] Branch indicator and switcher in the editor header
- [ ] Change indicators on modified resources in the editor sidebar
- [ ] PR-style review page at `/:owner/:slug/compare/:base...:branch`
- [ ] Maya can view a structural semantic diff between base and branch DataCollectionSpec
- [ ] Maya can view a structural semantic diff between base and branch FormSpec
- [ ] Diffs are domain-aware: "Added page 'Military Service'", "Reordered 'Offense Information' to page 4", not raw JSON diffs
- [ ] Command log shown as narrative context alongside structural diff (History tab)
- [ ] Side-by-side rendered previews show how the form looks before and after
- [ ] Maya can approve changes (merge branch to target)
- [ ] Maya can reject changes (delete branch)
- [ ] Comments on review pages (threads with author, timestamp, markdown body)
- [ ] Branch-qualified form URLs for testing non-production forms (`/:owner/:slug/forms/:branch`)
- [ ] Non-production forms display a visual preview banner
- [ ] Submissions reference the exact commit SHA via `specVersion` field

## Success Metrics:

- Maya can understand the impact of changes without technical knowledge
- Semantic diff correctly identifies all meaningful changes

## Notes:

- Comparison follows GitHub conventions: `/:owner/:slug/compare/:base...:branch`
- Review page has four tabs: Changes, Preview, History, Comments
- Comments stored in the branch's bare repo (`reviews/base...branch/comments.json`)
- Agentic comment-driven form evolution deferred to #52
- Branch-qualified forms work identically to production forms; submissions are standard but tagged with branch commit SHA

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [ ] Technical documentation updated -- architecture docs and decisions are current
- [ ] Comparison and diff infrastructure works for DataCollectionSpec and FormSpec
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Deployed and demoable
