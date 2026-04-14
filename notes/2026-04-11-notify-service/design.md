# Notify Service Design

**Date:** 2026-04-11
**Status:** draft

## Problem

The forms-lab deployment infrastructure has no operational alerting. Deploy failures, service crashes, health check failures, and NixOS rebuild errors are only visible in journald logs or GitHub deployment statuses. Nobody gets proactively notified.

## Goals

- Real-time Slack notifications for operational events (deploy success/failure, service crashes, health check failures, NixOS rebuild failures)
- Extensible to application-level events later (logins, user activity)
- Single notification service as the event sink, avoiding scattered Slack calls across the codebase

## Non-Goals

- Persistent event storage or audit log
- Retry/queue semantics (fire-and-forget is acceptable at this scale)
- External monitoring agents or third-party services beyond Slack

## Architecture

A new Hono HTTP service (`forms-lab-notify`) running on port 9001, internal-only (not exposed through Caddy). Components POST JSON events to it; it formats and forwards to Slack via incoming webhook.

```
Deploy script (deploy.sh) ──POST──┐
Systemd OnFailure units ──────────┤
Webhook handler (deploy.ts) ──────┼──> notify service (:9001) ──> Slack webhook
App routes (future) ──────────────┘
```

### Event Payload

```typescript
interface NotifyEvent {
  type: string;       // dot-namespaced: "deploy.success", "service.crashed"
  title: string;      // human-readable summary
  status: "success" | "failure" | "info";
  details?: string;   // optional extra context
  timestamp?: string; // ISO 8601, defaults to server time
}
```

### Initial Event Types

| Type | Source | Status | Example title |
|------|--------|--------|---------------|
| `deploy.success` | webhook deploy.ts | success | "Deployed `main` at abc1234" |
| `deploy.failure` | webhook deploy.ts | failure | "Deploy failed for `main`: build error" |
| `service.crashed` | systemd OnFailure | failure | "Service `forms-lab-app@main` crashed" |
| `health.failure` | webhook deploy.ts | failure | "Health check failed for main after deploy" |
| `nixos.rebuild.failure` | webhook deploy.ts | failure | "NixOS rebuild failed during main deploy" |

### Future Event Types (not built now)

| Type | Source | Status |
|------|--------|--------|
| `app.login` | app auth route | info |
| `app.submission` | app form route | info |

## Service Implementation

**Location:** `src/notify/`

**Files:**
- `main.ts` -- Hono server, `POST /event` and `GET /health` routes
- `slack.ts` -- Formats `NotifyEvent` into Slack attachment, posts via webhook URL
- `types.ts` -- `NotifyEvent` interface and validation

### Routes

- `POST /event` -- Validates payload, formats Slack message, posts to Slack. Returns 200 on success, 400 for bad payload, 502 if Slack rejects.
- `GET /health` -- Returns 200 with `{ status: "ok", service: "notify" }`.

### Slack Message Format

Uses the Slack attachments API with color-coded sidebar:
- `success` = `#2eb886` (green)
- `failure` = `#dc3545` (red)
- `info` = `#6c757d` (gray)

Example message:
```
[deploy.success] Deployed `main` at abc1234
Build completed in 42s
2026-04-11T15:45:00Z
```

### Environment

- `SLACK_WEBHOOK_URL` -- Slack incoming webhook URL (via sops-nix)
- `PORT` -- defaults to 9001

### Error Handling

- Invalid JSON or missing required fields returns 400
- Slack API failure returns 502, logs to stderr (journald)
- No retries -- callers are fire-and-forget

## Integration Points

### 1. Webhook Handler (deploy.ts)

Modify `triggerDeployWithStatus` and `deployMainBranch` to POST events to the notify service after deploy completes:

- On deploy success: POST `deploy.success`
- On deploy failure: POST `deploy.failure`
- On health check failure: POST `health.failure`
- On NixOS rebuild failure: POST `nixos.rebuild.failure`

This is a `fetch("http://localhost:9001/event", ...)` call. If the notify service is down, the fetch fails silently and deployment continues unaffected.

A small helper function `notifyEvent(event: NotifyEvent)` in `src/notify/client.ts` wraps the fetch for reuse across webhook handler and future app routes.

### 2. Systemd OnFailure Units

A template unit `forms-lab-notify-failure@.service` runs when any forms-lab service fails:

```ini
[Service]
Type=oneshot
ExecStart=<notify-failure-script> %i
```

The script curls `http://localhost:9001/event` with a `service.crashed` event containing the failed unit name.

Existing service modules (`webhook.nix`, `app.nix`, `homepage.nix`) get `OnFailure=forms-lab-notify-failure@%n.service` added.

### 3. NixOS Configuration

- New `notify.nix` module for the `forms-lab-notify` systemd service
- New `notify-failure.nix` module for the OnFailure template unit and script
- Add `slack-webhook-url` to sops secrets in `configuration.nix`
- Add both modules to `flake.nix`
- Add `OnFailure=` to existing service modules

## Testing

- Unit tests for event validation and Slack message formatting (`test/notify-*.test.ts`)
- Unit tests for the notify client helper
- Integration of notify calls into existing webhook deploy tests (mock the fetch to localhost:9001)
