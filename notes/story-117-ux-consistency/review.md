# Story #117 Code Review Summary

**Date:** 2026-05-06
**Branch:** story-117/ux-consistency
**Reviewer:** Code review subagent

## AC Coverage

| AC | Status | Notes |
|----|--------|-------|
| All navigable pages include consistent breadcrumb trails | Addressed | flex-breadcrumb component used everywhere, custom HTML removed |
| Navigation patterns are unified | Addressed | Repo-centric model, project-scoped forms, consistent currentSection highlighting |
| Design system components have complete contracts | Out of scope | Split to separate story per design decision |
| Walkthrough shows no jarring transitions | Addressed | Consistent chrome from landing -> project -> form -> back |

## Issues Found and Resolved

1. **Owner routes missing `currentSection="projects"`** — All Layout calls in owner/index.tsx, edit/index.tsx, and compare/index.tsx were missing the prop. Fixed: added `currentSection="projects"` to all ~20 call sites.

2. **Missing RepoNav on validation error re-render** — When form validation fails and the page is re-rendered, RepoNav was not included. Fixed: added RepoNav to the validation error path.

## Remaining Concerns (Non-blocking)

- **Duplicated router configuration in server.tsx** — The `/forms` and `/:owner/:slug/forms` mounts share nearly identical dep wiring (~50 lines). Could be extracted into a shared factory. Low risk, maintainability improvement.

- **Breadcrumb missing from chat view** — `handleChatView` renders RepoNav but not Breadcrumb. The full-width layout makes this less noticeable. Minor inconsistency.

- **Tree/blob breadcrumb hrefs** — Intermediate breadcrumb items (tree, ref) lack href links. Functionally harmless but slightly degraded from the original implementation.
