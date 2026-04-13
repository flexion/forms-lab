# Deployment Stability Plan

**Date:** 2026-04-12
**Status:** draft

## Context

On 2026-04-12, deploying the `infra/2026-04-11-screaming-architecture` branch caused a cascading outage of branch deployments on the EC2 instance. This doc captures what happened, why, and a prioritized set of changes to prevent it from happening again.

## Incident summary

The `infra/2026-04-11-screaming-architecture` branch moved all runnable entry points from `src/app/main.ts`, `src/webhook/main.ts`, `src/homepage/main.ts`, `src/notify/main.ts`, `src/cli.ts` into `src/entrypoints/<process>/main.ts`. The branch's commits updated every NixOS module's `ExecStart` path to match.

The webhook triggered a deploy for the branch when it was pushed. The branch worktree was created on the server, code was built, and `forms-lab-app@infra-2026-04-11-screaming-architecture.service` was started via the existing `forms-lab-app@` systemd template. That template's `ExecStart` was still `src/app/main.ts` — the *old* path, from the NixOS config last applied before the branch push. The branch worktree had no such file. The service entered an auto-restart loop and Caddy served `/infra-2026-04-11-screaming-architecture/*` as HTTP 502.

Running `nixos-rebuild switch` over SSH updated the service template to the new path and restored the branch app. But it immediately broke three core services and every other branch deployment:

- **`forms-lab-homepage`, `forms-lab-webhook`, `forms-lab-notify`** all run from `/srv/forms-lab/main`. Main hadn't been merged yet, so `/srv/forms-lab/main/src/entrypoints/` didn't exist. All three went into auto-restart loops.
- **21 other branch deployments** shared the same `forms-lab-app@` service template, but their code was from before the refactor and had no `src/entrypoints/app/main.ts`. All 21 went into auto-restart loops.

Recovery required manual `git fetch` + `git reset --hard` of `/srv/forms-lab/main` to the branch's commit SHA, a rebuild/restart, and then `systemctl stop` of the 21 failing branch services so they'd stop auto-restarting.

## Root causes

Five separate things combined to produce the cascade. Each is worth naming because fixing any one would have contained the damage.

### Root cause 1: NixOS service template is shared across all branches

The `forms-lab-app@` systemd template is a single declaration with one `ExecStart` path. Every branch instance of the template inherits that path. Branches with old code paths cannot coexist with a template pointing at new paths. There is no "one template per branch" or "template version pinned to branch" mechanism.

### Root cause 2: NixOS config depends on code structure

The `ExecStart` path is a literal string referencing `src/entrypoints/app/main.ts`. Renaming an entry point in source code requires a matching change in NixOS config, *and* a rebuild of NixOS on the server, *and* a simultaneous update of every worktree that runs under the new template. These four things must happen together or services break.

There is no abstraction layer between NixOS and code structure. A wrapper script that reads an in-worktree descriptor (`.deploy.json` or similar) would break this coupling entirely, but that does not exist today.

### Root cause 3: Core services run from `/srv/forms-lab/main`

`forms-lab-homepage`, `forms-lab-webhook`, and `forms-lab-notify` all have `WorkingDirectory = "/srv/forms-lab/main"` or equivalent. Main serves a dual role: "the main branch's deployment" *and* "the source of truth for core services." When a NixOS config change requires code at new paths, `main` must have those paths. If `main` hasn't been merged with the code change yet, the core services break. This creates a chicken-and-egg: the PR containing the code change *cannot* be deployed normally because the webhook (running from main) is broken.

### Root cause 4: No staging or dry-run before NixOS apply

`nixos-rebuild switch` was run directly against prod. There is no staging environment, no "will this break existing deployments?" check, no diff-against-current-deployed-state step. The first thing that detected the problem was the 502 on the user's branch URL.

### Root cause 5: No bootstrap guard in the deploy script

When `deploy.sh` runs for a branch, it does `bun install` and `bun run build` — but it does not verify that the file named in the NixOS `ExecStart` actually exists in the branch worktree. If the file is missing, systemd discovers the problem on service start and enters an auto-restart loop silently. The deploy script exits "successfully" even though the app will never run.

## Proposed improvements

Priorities are based on cost to implement × probability of catching a similar failure × blast radius of the failure it catches.

### P1 — Bootstrap guard in `deploy.sh`

**Cost:** tiny. A handful of lines in `/srv/forms-lab/deploy.sh`.
**Catches:** the specific failure mode where a branch's code doesn't match the NixOS template.
**Why P1:** directly addresses the most likely recurrence. Silent 502s are replaced with loud deploy failures.

After `bun run build`, before starting the service, extract the expected `ExecStart` path from the running systemd unit and verify the file exists in the branch worktree:

```bash
EXPECTED=$(systemctl show "forms-lab-app@$UNIT_NAME.service" -p ExecStart --value \
           | sed -n 's/.*bun run \([^ ;]*\).*/\1/p')
if [ -n "$EXPECTED" ] && [ ! -f "$BRANCH_DIR/$EXPECTED" ]; then
  echo "ERROR: systemd expects '$EXPECTED' but it does not exist in $BRANCH_DIR"
  echo "This usually means the branch needs to be rebased on main or the"
  echo "NixOS config on the server is out of sync with the code."
  exit 1
fi
```

The deploy fails loudly with a clear explanation. No 502 mystery, no auto-restart loop, no notify-failure spam.

### P2 — Smoke test after `nixos-rebuild switch`

**Cost:** small. A dozen lines wrapping the rebuild command.
**Catches:** incidents where the rebuild succeeds but leaves existing services broken.
**Why P2:** the `nixos-rebuild switch` returned success in the incident even though three core services entered failed states. Automated post-rebuild verification would have surfaced the problem in seconds.

Wrap the rebuild in a script that, after `switch`, polls `systemctl is-active` for each core service (`forms-lab-homepage`, `forms-lab-webhook`, `forms-lab-notify`) and at least one running branch instance. If any is not `active` after a 30-second settle window, print the failing unit's journal and the recovery steps. The script can be added to `bun run cli nixos apply`.

### P3 — Decouple `ExecStart` from code layout via a wrapper

**Cost:** medium. Adds a small wrapper program in the NixOS flake.
**Catches:** the entire class of failures where renaming an entry point requires a coordinated NixOS rebuild.
**Why P3:** this is the structural fix. The coupling between NixOS config and source paths is the root of root causes — every other mitigation is a band-aid on it.

The pattern: the NixOS service template runs a wrapper (let's call it `forms-lab-run-entrypoint`) which reads `.deploy-manifest.json` in the branch worktree to find the actual entry point:

```json
{
  "entrypoints": {
    "app": "src/entrypoints/app/main.ts",
    "webhook": "src/entrypoints/webhook/main.ts",
    "dashboard": "src/entrypoints/dashboard/main.ts",
    "notify": "src/entrypoints/notify/main.ts"
  }
}
```

Then `ExecStart = "${wrapper}/bin/forms-lab-run-entrypoint app %i"`. The wrapper reads the manifest, resolves the entry point, and execs bun. Renaming `src/entrypoints/app/main.ts` is now purely a code concern — the NixOS config is stable, and each branch's manifest describes its own layout.

This is the biggest change of the three but also the one that *structurally* makes the problem impossible to recur. Every branch can have any entry-point layout it wants as long as its manifest is correct.

### P4 — Runbook for NixOS + code coordination

**Cost:** trivial. A markdown file.
**Catches:** the scenario where the structural fix (P3) isn't in yet.
**Why P4:** during the transition, incidents can still happen. Writing down the exact recovery sequence means the next person (or agent) doesn't have to rediscover it.

Create `notes/runbooks/nixos-path-migration.md` with the sequence I used:

1. NixOS rebuild on the server via SSH.
2. As `forms-lab` user (not root), cd `/srv/forms-lab/main`, git fetch the branch ref, `git reset --hard`. **Never run git commands as root against `/srv/forms-lab/repo.git` or its worktrees** — new objects end up owned by root and the webhook (which runs as `forms-lab`) can no longer unpack new pushes. Use `sudo -u forms-lab git ...` for any manual recovery.
3. As `forms-lab`: `bun install && bun run build`.
4. As root: `systemctl restart forms-lab-homepage forms-lab-webhook forms-lab-notify`.
5. Stop all failing branch services: `systemctl list-units 'forms-lab-app@*' --all | awk '$4!="running"{print $1}' | xargs systemctl stop`.
6. Verify the branch app is running and the URL returns 200.
7. If webhook deploys start failing with "insufficient permission for adding an object to repository database," it means root-owned git objects leaked into the bare repo. Fix with `chown -R forms-lab:forms-lab /srv/forms-lab/repo.git /srv/forms-lab/main` (and any other worktrees touched).

Also document the known collateral: branch deployments for other branches will be broken until they rebase.

### Out of scope (considered and rejected)

- **Separate core-services worktree** (not from `main`). Proposed briefly during the incident. Would break the chicken-and-egg cleanly but adds a persistent "core" worktree to manage, and it's a bigger change than P3. P3 fixes more things for comparable effort.
- **Backward-compatibility shims in code** (keep `src/app/main.ts` as a re-export pointing at `src/entrypoints/app/main.ts`). Works for migrations but adds code clutter that has to be cleaned up later, and the cleanup step is the same hazard we're trying to avoid.
- **Staging environment.** Correct long-term answer but a large project. P2 (smoke test after rebuild) gives 80% of the value for 5% of the cost.

## Recommendation

Do P1 and P4 immediately — they are essentially free and directly address what broke tonight. Do P2 as a small follow-up. Consider P3 as a follow-on project: it is the correct structural fix but is larger than this batch's scope.

In the short term, the most likely recurrence is another branch pushing an unrelated NixOS change that invalidates existing deployments. P1 makes that fail loudly at deploy time instead of silently at service-start time. P4 makes the recovery a documented sequence instead of an investigation.

## Sources

- Incident conversation (this session): screaming architecture merge, NixOS rebuild, cascading service failures
- `/srv/forms-lab/deploy.sh` (current deploy script on the server)
- `infrastructure/nixos/modules/app.nix` (current service template)
- `infrastructure/nixos/modules/{homepage,webhook,notify}.nix` (core services, all rooted at `/srv/forms-lab/main`)
