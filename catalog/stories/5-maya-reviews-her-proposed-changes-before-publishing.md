---
issue: 5
title: Maya reviews her proposed changes before publishing
milestone: "Slice 4: Maya Reviews Changes"
labels: [user-story]
state: open
synced_at: 2026-04-07T21:53:40.698Z
---

## User Story:

As a **form creator (Maya)**, in order to **understand the impact of my changes before they go live**, I want **to see a semantic diff of my proposed specs compared to the published version, with side-by-side previews**

## Preconditions:

- Maya has made changes to a FormSpec (Slice 3 proposal mode)
- Published version exists for comparison

## Acceptance Criteria:

- [ ] Maya can view a semantic diff between proposed and published DataCollectionSpec
- [ ] Maya can view a semantic diff between proposed and published FormSpec
- [ ] Diffs are domain-aware: "Added page 'Military Service'", "Reordered 'Offense Information' to page 4", not raw JSON diffs
- [ ] Side-by-side rendered previews show how the form looks before and after
- [ ] Comparison uses URL-based protocol: `/catalog/compare/<resource>?from=<ref>&to=<ref>`
- [ ] Maya can approve changes (merge proposal to published)
- [ ] Maya can reject changes (discard proposal)
- [ ] Approved changes link to a GitHub PR for audit trail

## Success Metrics:

- Maya can understand the impact of changes without technical knowledge
- Semantic diff correctly identifies all meaningful changes

## Notes:

- Comparison protocol is generic — works for any resource type (specs, personas, etc.)
- `from` and `to` refs can be git SHAs, branch names, or special values like `published` and `proposal`
- This slice implements the comparison infrastructure that future slices reuse

## Definition of Done:

- [ ] Acceptance criteria met
- [ ] Comparison protocol works for DataCollectionSpec and FormSpec
- [ ] Tests pass
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable