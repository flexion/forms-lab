---
issue: 2
title: Maya signs in to access form authoring
milestone: "Final Project"
labels: [user-story]
state: open
synced_at: 2026-04-09T02:23:21.175Z
---

## User Story:

As a **form creator (Maya)**, in order to **securely access form authoring tools**, I want **to sign in with my GitHub account and see authoring options that anonymous visitors cannot**

## Preconditions:

- Skeleton complete (Slice 0)
- GitHub OAuth application configured

## Acceptance Criteria:

- [ ] Sign-in link visible on public pages
- [ ] Clicking sign-in initiates GitHub OAuth flow
- [ ] After authentication, user sees their identity (name/avatar) in the header
- [ ] Authenticated users see authoring navigation (e.g., "My Projects", "Upload Form")
- [ ] Unauthenticated users see only public catalog content
- [ ] Sign-out clears the session
- [ ] Auth middleware protects authoring routes, redirects to sign-in

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

- [ ] Acceptance criteria met
- [ ] Tests pass including auth middleware tests
- [ ] Type checking passes
- [ ] CI pipeline green
- [ ] Deployed and demoable