---
issue: 2
title: Maya signs in to access form authoring
milestone: "Final Project"
labels: [user-story]
state: closed
synced_at: 2026-04-20T15:40:03.188Z
---

## User Story:

As a **form creator (Maya)**, in order to **securely access form authoring tools**, I want **to sign in with my GitHub account and see authoring options that anonymous visitors cannot**

## Preconditions:

- Skeleton complete (Slice 0)
- GitHub OAuth application configured

## Acceptance Criteria:

- [x] Sign-in link visible on public pages
- [x] Clicking sign-in initiates GitHub OAuth flow
- [x] After authentication, user sees their identity (name/avatar) in the header
- [x] Authenticated users see authoring navigation (e.g., "My Projects", "Upload Form")
- [x] Unauthenticated users see only public catalog content
- [x] Sign-out clears the session
- [x] Auth middleware protects authoring routes, redirects to sign-in

## Success Metrics:

- Authentication round-trip completes in under 3 seconds
- Protected routes correctly reject unauthenticated requests

## Notes:

- Authorization model: GitHub repo write access = authoring permission (can be simplified for MVP)
- Session storage: cookie-based, server-side session
- Public routes: `/`, `/catalog/*`, `/health`
- Protected routes: `/authoring/*`, future upload/edit routes
- This slice does NOT include any form authoring functionality — just the auth gate

## Definition of Done:

- [x] Acceptance criteria met
- [x] Threat model updated -- any new trust boundaries, data flows, or attack surfaces are reflected in `catalog/architecture/threat-model.md`
- [x] Technical documentation updated -- architecture docs and decisions are current
- [x] Tests pass including auth middleware tests
- [x] Type checking passes
- [x] CI pipeline green
- [x] Deployed and demoable
