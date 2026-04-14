# Deployment Stability Improvements

**Date:** 2026-04-12
**Status:** draft

## Problem

NixOS service templates reference literal source code paths (e.g., `bun run src/entrypoints/app/main.ts`). Renaming an entry point requires a coordinated NixOS rebuild + code deployment + worktree update. When these fall out of sync, services enter auto-restart loops and Caddy serves 502s. There is no deploy-time guard, no post-rebuild smoke test, no abstraction between NixOS config and code layout, and no documented recovery procedure.

This is the incident described in `notes/2026-04-12-deployment-stability-plan.md`. This spec designs the four improvements proposed there (P1–P4).

## Goal

After these four improvements:

1. A branch deploy that would produce a 502 fails loudly at deploy time with a clear message (P1).
2. A `nixos apply` that breaks core services is detected automatically within 30 seconds (P2).
3. Renaming an entry point is a pure code change — no NixOS rebuild needed (P3).
4. The recovery sequence for NixOS + code coordination issues is documented (P4).

## Design

### P1 — Bootstrap guard in `deploy.sh`

**File:** `infrastructure/nixos/modules/deploy.nix` (the deploy script is inline here, then symlinked to `/srv/forms-lab/deploy.sh` via an activation script).

**Where in the script:** After `bun install`, before `bun run build`.

**What it checks:** If `$BRANCH_DIR/deploy.json` exists, parse it with `jq` and verify that each listed entrypoint file exists in the worktree. For non-main branches, check only `.entrypoints.app`. For main, check all four (app, dashboard, webhook, notify).

**On failure:** Exit 1 with a message like:

```
ERROR: deploy.json entry 'app' points to 'src/entrypoints/app/main.ts'
       but that file does not exist in /srv/forms-lab/my-branch/
       This usually means the branch needs to be rebased on main.
```

**If deploy.json is missing:** Skip the guard (backward-compatible with branches that haven't rebased yet). Log a warning: `WARNING: No deploy.json found — skipping entrypoint validation`.

This is a transitional choice. Once all active branches have rebased onto main (and therefore have deploy.json), we can tighten the guard to require it.

### P2 — Smoke test after `nixos-rebuild`

**File:** `src/entrypoints/cli/commands/nixos.ts`

**Refactor `apply` subcommand:** Replace the local `nixos-rebuild --target-host` invocation with an SSH-based approach:

1. SSH to `root@<hostname>`.
2. Run `nixos-rebuild switch --flake /srv/forms-lab/<branch>/infrastructure/nixos#forms-lab` on the server.
3. On success, poll four core services: `forms-lab-homepage`, `forms-lab-webhook`, `forms-lab-notify`, `forms-lab-app@main`.
4. Poll every 2 seconds for up to 30 seconds.
5. If all four are `active`, print success.
6. If any are not `active` after 30 seconds, print the failing unit names, their `systemctl status` output, and a pointer to the runbook. Exit non-zero.

**Add `--from-branch <name>` flag.** Defaults to `main`. The flag determines which worktree's NixOS config is used for the rebuild. This lets operators test a branch's NixOS changes without merging to main first.

**No local Nix required.** The entire operation runs over SSH. The dev machine needs only `ssh` and `bun`.

### P3 — Entrypoint wrapper + deploy.json

#### deploy.json (new file at repo root)

```json
{
  "entrypoints": {
    "app": "src/entrypoints/app/main.ts",
    "dashboard": "src/entrypoints/dashboard/main.ts",
    "webhook": "src/entrypoints/webhook/main.ts",
    "notify": "src/entrypoints/notify/main.ts"
  }
}
```

Checked into the repo. When a developer renames an entry point, they update deploy.json in the same commit. The NixOS config never changes.

#### Wrapper script (new NixOS module)

**File:** `infrastructure/nixos/modules/entrypoint-wrapper.nix`

Defines a `pkgs.writeShellScriptBin "forms-lab-entrypoint"` wrapper:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROLE="$1"
WORKTREE="$2"
MANIFEST="$WORKTREE/deploy.json"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: $MANIFEST not found. The branch may need to be rebased on main."
  exit 1
fi

ENTRYPOINT=$(jq -r ".entrypoints[\"$ROLE\"] // empty" "$MANIFEST")
if [ -z "$ENTRYPOINT" ]; then
  echo "ERROR: No entrypoint for role '$ROLE' in $MANIFEST"
  exit 1
fi

FULL_PATH="$WORKTREE/$ENTRYPOINT"
if [ ! -f "$FULL_PATH" ]; then
  echo "ERROR: $FULL_PATH does not exist (from $MANIFEST entrypoints.$ROLE)"
  exit 1
fi

cd "$WORKTREE"
exec bun run "$ENTRYPOINT"
```

The wrapper takes two arguments: `<role>` and `<worktree>`. It reads deploy.json, resolves the entry point for the role, validates the file exists, and execs bun.

#### Service template updates

**`app.nix`** — branch app template:

```nix
ExecStart = "${entrypointWrapper}/bin/forms-lab-entrypoint app /srv/forms-lab/%i";
```

WorkingDirectory stays as `/srv/forms-lab/%i`. The wrapper `cd`s to the worktree before exec.

**`homepage.nix`** — dashboard:

```nix
ExecStart = "${entrypointWrapper}/bin/forms-lab-entrypoint dashboard /srv/forms-lab/main";
```

**`webhook.nix`** — the `script = '' ... ''` block changes:

```bash
export GITHUB_WEBHOOK_SECRET=...
export GITHUB_TOKEN=...
...
exec ${entrypointWrapper}/bin/forms-lab-entrypoint webhook /srv/forms-lab/main
```

**`notify.nix`** — same pattern:

```bash
export SLACK_WEBHOOK_URL=...
export PORT=9001
exec ${entrypointWrapper}/bin/forms-lab-entrypoint notify /srv/forms-lab/main
```

#### How the wrapper is shared across modules

The flake's NixOS configuration passes `entrypointWrapper` as a module argument or defines it in a shared let-binding. Two idiomatic approaches:

**Option A — Shared let in `flake.nix`:** Define `entrypointWrapper` in the flake and pass it as a `specialArgs` to the NixOS modules.

**Option B — Separate module exporting a config option:** `entrypoint-wrapper.nix` defines a module that sets `environment.systemPackages = [ wrapper ]` and other modules reference the wrapper via the Nix store path.

I'll go with **Option A** (simpler, less Nix machinery). The wrapper is defined once in `flake.nix` and passed to modules that need it.

#### Honesty test

**File:** `test/deploy-manifest.test.ts`

Loads `deploy.json`, iterates `entrypoints`, verifies each file exists on disk:

```typescript
import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import manifest from '../deploy.json'

describe('deploy.json', () => {
  for (const [role, path] of Object.entries(manifest.entrypoints)) {
    it(`entrypoint "${role}" points at an existing file`, () => {
      expect(existsSync(join(process.cwd(), path))).toBe(true)
    })
  }
})
```

This ensures the manifest stays honest. Runs as part of `bun run check`.

### P4 — Runbook

**File:** `notes/runbooks/nixos-path-migration.md`

**Sections:**

1. **When to use this** — After a `nixos apply` that changes service ExecStart paths, or when deploy.json changes require a NixOS rebuild.
2. **Prerequisites** — SSH access to the EC2 instance. `pulumi stack select prod` in `infrastructure/pulumi/`.
3. **Steps** — The numbered sequence from the stability plan, updated with the ownership gotcha and the `sudo -u forms-lab` requirement.
4. **Verification** — Curl each core service URL, check `systemctl is-active` for the four services.
5. **Rollback** — If services can't be recovered, `nixos-rebuild switch` from `/srv/forms-lab/main` (previous generation) using `nixos-rebuild switch --rollback`.
6. **Known collateral** — Other branch deployments will be broken until they rebase.

The stability plan already has most of this content; P4 extracts it into a standalone runbook with clearer structure.

## Migration sequence

All four improvements land on this branch together. The one-time migration happens at merge time:

1. **Before merge:** All tests pass locally including the new `deploy-manifest.test.ts` and updated architecture tests.
2. **Merge PR to main.** The webhook auto-deploys main, which now includes `deploy.json` and the updated `deploy.nix` script.
3. **Run `bun run cli nixos apply`.** This applies the new NixOS config via SSH to the server. The wrapper replaces direct ExecStart paths. P2's smoke test confirms the four core services start correctly.
4. **Other branches stay stopped** until their owners rebase. Same collateral as the screaming architecture merge.

After this one-time migration, renaming an entry point is a pure code change: update `deploy.json` + rename the file. No NixOS rebuild, no coordinated server update.

## Affected files

**New files:**
- `deploy.json` (repo root)
- `infrastructure/nixos/modules/entrypoint-wrapper.nix`
- `test/deploy-manifest.test.ts`
- `notes/runbooks/nixos-path-migration.md`

**Modified files:**
- `infrastructure/nixos/modules/deploy.nix` — add bootstrap guard
- `infrastructure/nixos/modules/app.nix` — use wrapper
- `infrastructure/nixos/modules/homepage.nix` — use wrapper
- `infrastructure/nixos/modules/webhook.nix` — use wrapper
- `infrastructure/nixos/modules/notify.nix` — use wrapper
- `infrastructure/nixos/flake.nix` — pass wrapper to modules
- `src/entrypoints/cli/commands/nixos.ts` — SSH-based apply + smoke test

## Scope

No product code changes. No changes to the web app, services, design system, or shared utilities. Changes are limited to infrastructure (NixOS modules), CLI tooling (nixos command), and one test + one manifest file.

## Sources

- `notes/2026-04-12-deployment-stability-plan.md` — the stability plan that motivated this
- `infrastructure/nixos/modules/deploy.nix` — current deploy script
- `infrastructure/nixos/modules/app.nix` — current service template
- `src/entrypoints/cli/commands/nixos.ts` — current CLI
