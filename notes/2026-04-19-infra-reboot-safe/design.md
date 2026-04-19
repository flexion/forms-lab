---
status: working
---

# Reboot-safe branch apps + webhook mid-build recovery

Incident: 2026-04-19 ~15:49 UTC. Webhook deploy for `experiment/74-rag-extraction` was mid-build
when the EC2 instance froze; a force-stop/start surfaced two problems:

1. Branch app template units (`forms-lab-app@<branch>.service`) did not come back after reboot —
   manual `systemctl start` was required for every branch app.
2. A mid-build kill leaves the deploy in a half-state (stale `dist/`, no restart, no recovery trigger
   until another push arrives).

## Files to change

### Fix 1 — Reboot-safe branch apps

- `infrastructure/nixos/modules/app.nix`
  - The template unit `forms-lab-app@.service` already has `Restart = "on-failure"` and `RestartSec = 5`,
    but no flap control. Add `StartLimitBurst` and `StartLimitIntervalSec` so a broken branch does not
    retry forever (systemd keeps the unit in a "failed" state instead).
  - Template units cannot be `wantedBy` multi-user.target directly — they need each instance enabled.

- `infrastructure/nixos/modules/deploy.nix`
  - After `systemctl restart` / `systemctl start`, also run `systemctl enable` for the instance so
    `/etc/systemd/system/multi-user.target.wants/forms-lab-app@<branch>.service` is symlinked, which
    is what makes the instance come back on reboot.
  - No branch-teardown path exists in the deploy script today (GitHub-delete only marks the deployment
    inactive in the GitHub API; nothing on the filesystem is removed). So "symmetric `disable` on teardown"
    has no site to land in. Noted here so we remember to add `disable` alongside if/when teardown is
    implemented.

- `infrastructure/nixos/configuration.nix`
  - The `forms-lab` user needs passwordless sudo for `systemctl enable forms-lab-app@*` and
    `systemctl disable forms-lab-app@*` in addition to the existing rules.

- `infrastructure/nixos/modules/homepage.nix`, `modules/webhook.nix`, `modules/notify.nix`
  - Already have `wantedBy = [ "multi-user.target" ]`. Verified, no change.

### Fix 2 — Webhook mid-build recovery + startup scan

- `src/entrypoints/webhook/recovery.ts` (new)
  - Pure functions, unit-testable:
    - `listBranchUnitsFromCaddy(caddyDir)`: scan `branch-*.caddy` files, return list of branch unit names.
    - `computeUnitsToStart(branchUnits, activeUnits)`: given a set of known branch units and a set of
      currently-active systemd unit names, return the difference.
    - `isStaleLockfile(mtime, now, maxAgeMs)`: returns true when mtime is older than threshold.
  - Impure functions (thin shell-exec wrappers) injectable so tests do not call `systemctl`:
    - `getActiveBranchUnits(exec)`: runs `systemctl list-units 'forms-lab-app@*' --state=active --no-legend`
      and parses output.
    - `startInactiveBranchUnits({caddyDir, exec})`: orchestrates the above; returns the list it started.

- `src/entrypoints/webhook/main.ts`
  - On service startup (after the port is bound), fire-and-forget call to `startInactiveBranchUnits()`
    and log the result. Failure here should not crash the webhook.

- `infrastructure/nixos/modules/deploy.nix` (shell-side lockfile + idempotency)
  - Acquire `$BRANCH_DIR/.deploy-in-progress` at the top of the deploy.
  - If a lockfile exists but is older than 10 minutes, treat it as stale (stale deploy process) and
    remove it before proceeding.
  - On `set -e` trap EXIT, remove the lockfile on both success and failure (normal script exit).
  - If build stopped mid-way, `dist/` may be stale. Simple fix: run `rm -rf dist/` when the stale
    lockfile was detected (so the subsequent `bun run build` starts clean). On a normal deploy, leave
    `dist/` alone — `bun run build` handles incremental rebuilds correctly on its own.

- `test/webhook-recovery.test.ts` (new)
  - Test the pure helpers and the orchestrator with mocked exec.

## Non-goals

- Not implementing branch-teardown on delete (out of scope).
- Not introducing a queue / persistent deploy state store.
- Not applying NixOS to the running EC2 manually — merge to main triggers auto-deploy and rebuild.
  The NixOS config takes effect after the next rebuild (next main push), and the app-enable behavior
  is only needed after the *next* reboot, so no urgency.

## Commits

1. `infra(nixos): make branch app template reboot-safe` — edit `app.nix` + `deploy.nix` to enable
   instances after start; update `configuration.nix` sudoers.
2. `infra(webhook): add startup recovery for inactive branch apps` — new `recovery.ts` + wire into
   `main.ts` + test.
3. `infra(nixos): lockfile + stale build recovery in deploy.sh` — lockfile hygiene in `deploy.nix`.

## Testing

- `bun run check` (lint + types + tests; baseline 1230 passing).
- Pure recovery helpers covered by unit tests with mocked exec.
- NixOS change is deployed by merging to main; effect is only visible after the next reboot.
