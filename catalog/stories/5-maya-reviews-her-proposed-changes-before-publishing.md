---
issue: 5
title: Maya reviews her proposed changes before publishing
milestone: "Final Project"
labels: [user-story]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form creator (Maya)**, in order to **understand the impact of my changes before they go live**, I want **to see a semantic diff of my proposed specs compared to the published version, with a rendered preview**

## Preconditions:

- Maya has made changes to a FormSpec (Story 4 shaping, on a named branch)
- Published version exists on `main` for comparison

## Acceptance Criteria:

- [x] Branch model: `main` is the published state; named branches are working copies
- [x] `main` is read-only in the editor; Maya must create or select a branch to edit
- [x] Branch indicator and switcher in the editor header
- [x] Change indicators on modified resources in the editor sidebar
- [x] PR-style review page at `/:owner/:slug/compare/:base...:branch`
- [x] Maya can view a structural semantic diff between base and branch DataCollectionSpec
- [x] Maya can view a structural semantic diff between base and branch FormSpec
- [x] Diffs are domain-aware: "Added page 'Military Service'", "Reordered 'Offense Information' to page 4", not raw JSON diffs
- [x] Command log shown as narrative context alongside structural diff (History tab)
- [x] Rendered preview of changes — delivered as an annotated single view (flex-spec-diff-browser) rather than a literal side-by-side. See `notes/story-5-review-changes/preview-diff-design.md` for the rationale: an annotated single view reads cleanly for both small refinements (collapses unchanged items) and initial imports (walks the form once with `+ New` badges), while literal side-by-side became a wall of text on large forms.
- [x] Maya can approve changes (merge branch to target)
- [x] Maya can reject changes (delete branch)
- [x] Comments on review pages (threads with author, timestamp, markdown body)
- [x] Branch-qualified form URLs for testing non-production forms (`/forms/:specId/branches/:branch`)
- [x] Non-production forms display a visual preview banner
- [x] Submissions reference the exact commit SHA via `specVersion` field

## Success Metrics:

- Maya can understand the impact of changes without technical knowledge
- Semantic diff correctly identifies all meaningful changes

## Notes:

- Comparison follows GitHub conventions: `/:owner/:slug/compare/:base...:branch`
- Review page has four tabs: Changes, Preview, History, Comments
- Preview tab uses a single annotated head-side view (overview strip + collapsible pages/groups with inline change badges) rather than literal split; design documented at `notes/story-5-review-changes/preview-diff-design.md`.
- Comments stored in the branch's bare repo (`reviews/base---branch/comments.json`)
- Agentic comment-driven form evolution deferred to #52
- Branch-qualified forms work identically to production forms; submissions are standard but tagged with branch commit SHA
- PDF imports now land on an `import` branch for review-before-publish flow; project overview shows a "Pending review" banner with Review/Edit CTAs.

## Definition of Done:

- [x] Acceptance criteria met
- [x] Threat model reviewed — no new trust boundaries; existing coverage sufficient
- [x] Technical documentation updated (design.md, preview-diff-design.md, review.md, session-log.md in notes/story-5-review-changes/)
- [x] Comparison and diff infrastructure works for DataCollectionSpec and FormSpec
- [x] Tests pass (707 tests, 0 failures)
- [x] Type checking passes
- [x] Deployed and demoable at https://ec2-34-197-222-16.compute-1.amazonaws.com/story-5-review-changes/