# Story-4 direct-edit UI — session log

## 2026-04-16 — Brainstorm + plan

Brainstormed the direct-edit experience. Key decisions: editable preview
in place of the iframe, inline-expand for overflow controls, one-page-at-a-time
view, explicit Save / Discard buffer shared with the chat assistant, no
drag-and-drop in v1. Wrote the spec to `notes/2026-04-16-direct-edit-ui-design.md`
and the 19-task plan to `notes/2026-04-16-direct-edit-ui-plan.md`.

## 2026-04-16 — Implementation phase 1

Ran tasks 1-7 (save endpoint, editor buffer, protocol events, structure sidebar
switches to stage-command) via subagent-driven-development. Three review-driven
fixes landed inline: ownership guard on `/edit/save`, canonicalState drift on
chat-accept, fetch-mock leak in the save test.

## 2026-04-16 — Implementation phase 2-7

Tasks 8-19: staged-changes popover, editable-page/group/field components,
chat unification, integration test, format pass. 627 tests passing at the end.

## 2026-04-17 — PR #54 pushed, visual iteration

PR created. Iterated on visual design based on manual testing of the deploy:

- Shifted from "always-editable rows" to selection-driven click-to-edit, with
  Carlos-identical preview by default.
- Redesigned the field edit card as a labeled-form panel (every property
  visible, no "...more" disclosure, no flex-select layout override).
- Restructured the sidebar: compact rows, delivery-mode popover, icon sizing,
  no re-render flash, sidebar-click doesn't auto-enter page edit mode.
- Left-aligned the preview column (dropped a stray `justify-content: center`
  that was making content jump horizontally when switching pages).
- Fixed root-cause CSS issues: several stylesheets weren't imported in the
  CSS entry, `--flex-space-2xs` / `--flex-space-3xs` were used but never
  defined, and `--flex-text-lg` / `--flex-text-md` were invalid (so heading
  sizes fell back to browser default).
- Wired a "Preview as applicant" link that opens the existing `/preview`
  route, and fixed the preview to load `components.js` so the date picker
  hydrates.

## 2026-04-17 — Session complete

**Branch:** story-4/direct-edit-ui
**PR:** #54
**Changes:** Direct-manipulation edit UI for form shaping; sidebar page
navigation; preview-as-applicant link.
**Status:** PR open for review; code review done; ready to merge.
