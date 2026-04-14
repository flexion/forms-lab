# Notify Service Implementation Plan

**Date:** 2026-04-11
**Design:** [design.md](design.md)

## Steps

### Step 1: Types and Slack Formatter (independent)

Create the core types and Slack formatting logic.

**Files to create:**
- `src/notify/types.ts` -- `NotifyEvent` interface, `NotifyStatus` type, `validateEvent()` function
- `src/notify/slack.ts` -- `formatSlackMessage(event: NotifyEvent)` returns Slack attachment payload, `postToSlack(webhookUrl: string, event: NotifyEvent)` posts it

**Tests to create:**
- `test/notify-slack.test.ts` -- Tests for `formatSlackMessage` (correct colors per status, all fields present, missing optional fields handled) and `postToSlack` (mocks fetch, verifies payload shape, handles Slack errors)

**TDD approach:** Write test for `validateEvent` first, then implement. Write test for `formatSlackMessage`, then implement. Write test for `postToSlack`, then implement.

### Step 2: Notify Client Helper (independent)

Create the client helper that other components use to fire events.

**Files to create:**
- `src/notify/client.ts` -- `notifyEvent(event: NotifyEvent): Promise<void>` that POSTs to `http://localhost:${NOTIFY_PORT}/event`, catches and logs errors silently

**Tests to create:**
- `test/notify-client.test.ts` -- Tests that it POSTs correct payload, handles connection refused gracefully, handles non-200 responses gracefully

### Step 3: Hono Service (depends on Step 1)

Create the HTTP server.

**Files to create:**
- `src/notify/main.ts` -- Hono app with `POST /event` and `GET /health`, reads `SLACK_WEBHOOK_URL` and `PORT` from env

**Tests to create:**
- `test/notify-service.test.ts` -- Tests for POST /event (valid payload returns 200, missing fields returns 400, bad JSON returns 400), GET /health returns 200

### Step 4: Webhook Handler Integration (depends on Step 2)

Modify deploy.ts to send notifications after deploys.

**Files to modify:**
- `src/webhook/deploy.ts` -- Import `notifyEvent` from client, call after deploy success/failure in `triggerDeployWithStatus` and `deployMainBranch`

**Tests to modify:**
- `test/webhook-deploy.test.ts` -- Verify notify events are sent on success and failure (mock the fetch)

### Step 5: NixOS Modules (independent)

Create the NixOS service configuration and OnFailure integration.

**Files to create:**
- `infrastructure/nixos/modules/notify.nix` -- systemd service for forms-lab-notify (mirrors webhook.nix pattern)
- `infrastructure/nixos/modules/notify-failure.nix` -- OnFailure template unit and shell script

**Files to modify:**
- `infrastructure/nixos/flake.nix` -- Add `./modules/notify.nix` and `./modules/notify-failure.nix` to modules list
- `infrastructure/nixos/configuration.nix` -- Add `slack-webhook-url` to sops secrets
- `infrastructure/nixos/modules/webhook.nix` -- Add `OnFailure=forms-lab-notify-failure@%n.service`
- `infrastructure/nixos/modules/app.nix` -- Add `OnFailure=forms-lab-notify-failure@%n.service`
- `infrastructure/nixos/modules/homepage.nix` -- Add `OnFailure=forms-lab-notify-failure@%n.service`

No automated tests for NixOS modules (they require nixos-rebuild to validate).

## Parallelism

Steps 1, 2, and 5 are independent and can run in parallel.
Step 3 depends on Step 1.
Step 4 depends on Step 2.

```
Step 1 (types + slack) ──> Step 3 (hono service)
Step 2 (client helper) ──> Step 4 (webhook integration)
Step 5 (nixos modules)
```
