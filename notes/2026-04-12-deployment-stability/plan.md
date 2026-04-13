# Deployment Stability Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple NixOS service templates from source code paths so that renaming an entry point is a pure code change, and add deploy-time guards, post-rebuild smoke tests, and a recovery runbook.

**Architecture:** Four improvements: (1) a bootstrap guard in deploy.sh that verifies deploy.json entries before starting a service, (2) a smoke test after nixos-rebuild that polls core services, (3) a wrapper script + deploy.json manifest that replaces literal ExecStart paths, and (4) a recovery runbook. P3 is the structural fix; P1/P2/P4 are defensive layers.

**Tech Stack:** Nix (NixOS modules, `writeShellScriptBin`), shell (wrapper + deploy guard), TypeScript/Bun (CLI refactor), Markdown (runbook)

**Working directory:** `/home/daniel/src/forms-lab/.worktrees/screaming-architecture`

---

## Task order rationale

P3 goes first because it creates `deploy.json` and the wrapper, which P1's guard reads. P1 goes second (the guard validates deploy.json). P2 goes third (CLI refactor + smoke test). P4 (runbook) is independent and goes last.

---

### Task 1: Create `deploy.json` and the deploy manifest honesty test

**Files:**
- Create: `deploy.json` (repo root)
- Create: `test/deploy-manifest.test.ts`

- [ ] **Step 1: Create `deploy.json`**

Create `deploy.json` at the repo root:

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

- [ ] **Step 2: Create the honesty test**

Create `test/deploy-manifest.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const manifest = await Bun.file(
  join(process.cwd(), 'deploy.json'),
).json()

describe('deploy.json', () => {
  it('has an entrypoints object', () => {
    expect(manifest.entrypoints).toBeDefined()
    expect(typeof manifest.entrypoints).toBe('object')
  })

  for (const [role, path] of Object.entries(
    manifest.entrypoints as Record<string, string>,
  )) {
    it(`entrypoint "${role}" points at an existing file`, () => {
      const fullPath = join(process.cwd(), path)
      expect(existsSync(fullPath)).toBe(true)
    })
  }
})
```

- [ ] **Step 3: Run the test**

```bash
bun test test/deploy-manifest.test.ts
```

Expected: 5 tests pass (1 structure + 4 entrypoint checks).

- [ ] **Step 4: Run the full check suite**

```bash
bun run check
```

Expected: 375 total tests pass (370 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add deploy.json test/deploy-manifest.test.ts
git commit -m "infra(deploy): add deploy.json manifest with honesty test

Lists the four entrypoints (app, dashboard, webhook, notify) used by
systemd services. The test verifies each listed path points at an
existing file on every commit. This manifest is the source of truth
that the entrypoint wrapper (next commit) reads at runtime.
"
```

---

### Task 2: Create the entrypoint wrapper NixOS module

**Files:**
- Create: `infrastructure/nixos/modules/entrypoint-wrapper.nix`
- Modify: `infrastructure/nixos/flake.nix`

- [ ] **Step 1: Create the wrapper module**

Create `infrastructure/nixos/modules/entrypoint-wrapper.nix`:

```nix
{ config, pkgs, lib, ... }:

let
  entrypointWrapper = pkgs.writeShellScriptBin "forms-lab-entrypoint" ''
    set -euo pipefail
    ROLE="$1"
    WORKTREE="$2"
    MANIFEST="$WORKTREE/deploy.json"

    if [ ! -f "$MANIFEST" ]; then
      echo "ERROR: $MANIFEST not found."
      echo "The branch may need to be rebased on main (which includes deploy.json)."
      exit 1
    fi

    ENTRYPOINT=$(${pkgs.jq}/bin/jq -r ".entrypoints[\"$ROLE\"] // empty" "$MANIFEST")
    if [ -z "$ENTRYPOINT" ]; then
      echo "ERROR: No entrypoint for role '$ROLE' in $MANIFEST"
      echo "Valid roles: $(${pkgs.jq}/bin/jq -r '.entrypoints | keys | join(", ")' "$MANIFEST")"
      exit 1
    fi

    FULL_PATH="$WORKTREE/$ENTRYPOINT"
    if [ ! -f "$FULL_PATH" ]; then
      echo "ERROR: $FULL_PATH does not exist"
      echo "deploy.json says entrypoints.$ROLE = $ENTRYPOINT"
      echo "but $FULL_PATH is missing from the worktree."
      exit 1
    fi

    cd "$WORKTREE"
    exec ${pkgs.bun}/bin/bun run "$ENTRYPOINT"
  '';
in
{
  environment.systemPackages = [ entrypointWrapper ];

  # Export the wrapper path for other modules to reference
  options.flexion.entrypointWrapper = lib.mkOption {
    type = lib.types.package;
    default = entrypointWrapper;
    description = "The forms-lab entrypoint wrapper script package";
  };
}
```

- [ ] **Step 2: Register the module in `flake.nix`**

In `infrastructure/nixos/flake.nix`, add `./modules/entrypoint-wrapper.nix` to the modules list. Insert it before `./modules/app.nix` so the wrapper is available when service modules load:

Add the line:
```nix
        ./modules/entrypoint-wrapper.nix
```

between `./modules/deploy.nix` and `./modules/homepage.nix` in the modules list.

- [ ] **Step 3: Run checks**

```bash
bun run check
```

Expected: 375 tests still pass (no runtime code changed).

- [ ] **Step 4: Commit**

```bash
git add infrastructure/nixos/modules/entrypoint-wrapper.nix infrastructure/nixos/flake.nix
git commit -m "infra(nixos): add entrypoint wrapper module

Shell script that reads deploy.json from a branch worktree, resolves
the entrypoint for a given role (app/dashboard/webhook/notify), validates
the file exists, and execs bun. Called as:
  forms-lab-entrypoint <role> <worktree-path>

Exports the wrapper via config.flexion.entrypointWrapper for use by
service modules. Registered in the flake module list.
"
```

---

### Task 3: Update service modules to use the wrapper

**Files:**
- Modify: `infrastructure/nixos/modules/app.nix`
- Modify: `infrastructure/nixos/modules/homepage.nix`
- Modify: `infrastructure/nixos/modules/webhook.nix`
- Modify: `infrastructure/nixos/modules/notify.nix`

- [ ] **Step 1: Update `app.nix`**

Replace the entire file with:

```nix
{ config, pkgs, ... }:

{
  # Template unit for branch app services
  # Instantiated by the deploy script as forms-lab-app@<branch>.service
  systemd.services."forms-lab-app@" = {
    description = "Forms Lab App - %i";
    after = [ "network.target" ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      # %i is the instance name (branch name, with / replaced by -)
      WorkingDirectory = "/srv/forms-lab/%i";
      ExecStart = "${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint app /srv/forms-lab/%i";
      Restart = "on-failure";
      RestartSec = 5;
      OnFailure = "forms-lab-notify-failure@%n.service";

      # Environment loaded from a per-branch env file written by deploy script
      EnvironmentFile = "/srv/forms-lab/%i/.env";
    };
  };
}
```

- [ ] **Step 2: Update `homepage.nix`**

Replace the entire file with:

```nix
{ config, pkgs, ... }:

{
  # Homepage service - deployment dashboard at root
  systemd.services.forms-lab-homepage = {
    description = "Forms Lab Homepage - Deployment Dashboard";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    path = with pkgs; [ bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab/main";
      Restart = "on-failure";
      RestartSec = 5;
      Environment = [
        "PORT=3000"
      ];
      ExecStart = "${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint dashboard /srv/forms-lab/main";
      OnFailure = "forms-lab-notify-failure@%n.service";
    };
  };
}
```

- [ ] **Step 3: Update `webhook.nix`**

Replace the `exec` line in the script block. The full file becomes:

```nix
{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-webhook = {
    description = "Forms Lab GitHub Webhook Listener";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    path = with pkgs; [ git openssh bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
      OnFailure = "forms-lab-notify-failure@%n.service";
    };

    # sops-nix decrypts the secret to a file containing the raw value.
    # script sets ExecStart to a wrapper that reads the secret into an env var.
    script = ''
      export GITHUB_WEBHOOK_SECRET=$(cat ${config.sops.secrets.github-webhook-secret.path})
      export GITHUB_TOKEN=$(cat ${config.sops.secrets.github-token.path})
      export DEPLOY_HOSTNAME=ec2-34-197-222-16.compute-1.amazonaws.com
      export PORT=9000
      export DEPLOY_SCRIPT=/srv/forms-lab/deploy.sh
      exec ${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint webhook /srv/forms-lab/main
    '';
  };
}
```

- [ ] **Step 4: Update `notify.nix`**

Replace the `exec` line in the script block. The full file becomes:

```nix
{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-notify = {
    description = "Forms Lab Notification Service";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    path = with pkgs; [ bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
    };

    script = ''
      export SLACK_WEBHOOK_URL=$(cat ${config.sops.secrets.slack-webhook-url.path})
      export PORT=9001
      exec ${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint notify /srv/forms-lab/main
    '';
  };
}
```

- [ ] **Step 5: Run checks**

```bash
bun run check
```

Expected: 375 tests still pass (no runtime code changed; NixOS modules are not exercised by the test suite).

- [ ] **Step 6: Commit**

```bash
git add infrastructure/nixos/modules/app.nix infrastructure/nixos/modules/homepage.nix infrastructure/nixos/modules/webhook.nix infrastructure/nixos/modules/notify.nix
git commit -m "infra(nixos): use entrypoint wrapper in all service modules

Replace literal 'bun run src/entrypoints/...' ExecStart paths with
the forms-lab-entrypoint wrapper that reads deploy.json at runtime.

After applying this NixOS config, renaming an entry point is a pure
code change: update deploy.json + rename the file. No NixOS rebuild,
no coordinated server update.

Services updated: forms-lab-app@ (branch template), forms-lab-homepage,
forms-lab-webhook, forms-lab-notify.
"
```

---

### Task 4: Add bootstrap guard to `deploy.sh`

**Files:**
- Modify: `infrastructure/nixos/modules/deploy.nix`

- [ ] **Step 1: Add the guard to the deploy script**

In `infrastructure/nixos/modules/deploy.nix`, add the bootstrap guard after the `bun install` line (line 46) and before the `bun run build` line (line 47). Insert this block:

```bash
    # Bootstrap guard: verify deploy.json entrypoints exist before building
    if [ -f "$BRANCH_DIR/deploy.json" ]; then
      echo "Validating deploy.json entrypoints..."
      if [ "$BRANCH" = "main" ]; then
        ROLES="app dashboard webhook notify"
      else
        ROLES="app"
      fi
      for ROLE in $ROLES; do
        EP=$(${pkgs.jq}/bin/jq -r ".entrypoints[\"$ROLE\"] // empty" "$BRANCH_DIR/deploy.json")
        if [ -z "$EP" ]; then
          echo "ERROR: deploy.json has no entrypoint for role '$ROLE'"
          exit 1
        fi
        if [ ! -f "$BRANCH_DIR/$EP" ]; then
          echo "ERROR: deploy.json entry '$ROLE' points to '$EP'"
          echo "       but that file does not exist in $BRANCH_DIR/"
          echo "       This usually means the branch needs to be rebased on main."
          exit 1
        fi
      done
      echo "All entrypoints validated."
    else
      echo "WARNING: No deploy.json found in $BRANCH_DIR — skipping entrypoint validation"
    fi
```

This goes between the existing `${pkgs.bun}/bin/bun install` line and the existing `${pkgs.bun}/bin/bun run build` line.

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: 375 tests pass.

- [ ] **Step 3: Commit**

```bash
git add infrastructure/nixos/modules/deploy.nix
git commit -m "infra(deploy): add bootstrap guard for deploy.json entrypoints

After bun install but before bun run build, the deploy script now
verifies that each entry in deploy.json points at an existing file
in the branch worktree. For main deploys, all four roles are checked
(app, dashboard, webhook, notify). For branch deploys, only app.

If deploy.json is missing (branch hasn't rebased yet), the guard
is skipped with a warning — this is a transitional behavior.

Catches the specific failure mode where a branch's code doesn't
match the NixOS service template, preventing silent 502s.
"
```

---

### Task 5: Refactor CLI `nixos apply` to SSH + smoke test

**Files:**
- Modify: `src/entrypoints/cli/commands/nixos.ts`

- [ ] **Step 1: Rewrite `nixos.ts`**

Replace the entire contents of `src/entrypoints/cli/commands/nixos.ts`:

```typescript
import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli nixos <subcommand> [options]\n')
  console.log('Subcommands:')
  console.log(
    '  apply [--from-branch <name>]  Apply NixOS config via SSH (default: main)',
  )
  console.log(
    '  status                        Show running services and health',
  )
}

async function getHostname(): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname'], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}

async function sshExec(
  hostname: string,
  command: string,
): Promise<number> {
  const proc = Bun.spawn(
    ['ssh', '-o', 'StrictHostKeyChecking=no', `root@${hostname}`, command],
    { stdio: ['inherit', 'inherit', 'inherit'] },
  )
  return await proc.exited
}

async function sshOutput(
  hostname: string,
  command: string,
): Promise<{ code: number; stdout: string }> {
  const proc = Bun.spawn(
    ['ssh', '-o', 'StrictHostKeyChecking=no', `root@${hostname}`, command],
    { stdout: 'pipe', stderr: 'inherit' },
  )
  const stdout = await new Response(proc.stdout).text()
  const code = await proc.exited
  return { code, stdout }
}

const CORE_SERVICES = [
  'forms-lab-homepage',
  'forms-lab-webhook',
  'forms-lab-notify',
  'forms-lab-app@main.service',
]

async function smokeTestServices(hostname: string): Promise<boolean> {
  console.log('\nRunning post-rebuild smoke test...')
  const maxWait = 30
  const interval = 2

  for (let elapsed = 0; elapsed < maxWait; elapsed += interval) {
    const { stdout } = await sshOutput(
      hostname,
      CORE_SERVICES.map(
        (s) => `systemctl is-active '${s}' 2>/dev/null || echo failed`,
      ).join(' && '),
    )

    const results = stdout.trim().split('\n')
    const allActive = results.every((r) => r.trim() === 'active')
    if (allActive) {
      console.log(
        `All ${CORE_SERVICES.length} core services active after ${elapsed}s.`,
      )
      return true
    }

    if (elapsed + interval < maxWait) {
      await Bun.sleep(interval * 1000)
    }
  }

  console.error(`\nSMOKE TEST FAILED after ${maxWait}s. Failing services:`)
  for (const svc of CORE_SERVICES) {
    const { stdout } = await sshOutput(
      hostname,
      `systemctl is-active '${svc}' 2>/dev/null`,
    )
    if (stdout.trim() !== 'active') {
      console.error(`\n  ${svc}: ${stdout.trim()}`)
      const { stdout: status } = await sshOutput(
        hostname,
        `systemctl status '${svc}' --no-pager 2>&1 | head -15`,
      )
      console.error(status)
    }
  }
  console.error(
    '\nSee notes/runbooks/nixos-path-migration.md for recovery steps.',
  )
  return false
}

export async function nixos(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'apply': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }

      let branch = 'main'
      const branchIdx = args.indexOf('--from-branch')
      if (branchIdx !== -1 && args[branchIdx + 1]) {
        branch = args[branchIdx + 1]
      }

      const safeBranch = branch.replace(/\//g, '-')
      const worktree = `/srv/forms-lab/${safeBranch}`

      console.log(`Applying NixOS config from ${worktree} on ${hostname}...`)

      const rebuildCode = await sshExec(
        hostname,
        [
          `git config --global --add safe.directory ${worktree} 2>/dev/null || true`,
          `cd ${worktree}`,
          `nixos-rebuild switch --flake ./infrastructure/nixos#forms-lab`,
        ].join(' && '),
      )

      if (rebuildCode !== 0) {
        console.error(`nixos-rebuild failed with exit code ${rebuildCode}`)
        return rebuildCode
      }

      console.log('NixOS rebuild succeeded.')

      const healthy = await smokeTestServices(hostname)
      return healthy ? 0 : 1
    }

    case 'status': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      const proc = Bun.spawn(
        [
          'ssh',
          '-o',
          'StrictHostKeyChecking=no',
          `root@${hostname}`,
          'systemctl',
          'list-units',
          'forms-lab-*',
          '--no-pager',
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
```

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: 375 tests pass. The nixos CLI command is not unit-tested (it's an operational tool that shells out to SSH); the test suite exercises it only to the extent that `cli.test.ts` checks the help output doesn't crash.

- [ ] **Step 3: Verify the CLI still parses**

```bash
bun run cli nixos
```

Expected: prints the usage help with the `--from-branch` option listed.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/cli/commands/nixos.ts
git commit -m "infra(cli): SSH-based nixos apply with post-rebuild smoke test

Refactor 'bun run cli nixos apply' to SSH to the server and run
nixos-rebuild there, instead of running nixos-rebuild locally
(which requires Nix installed on the dev machine).

After a successful rebuild, polls four core services (homepage,
webhook, notify, app@main) every 2 seconds for up to 30 seconds.
Reports failing services with systemctl status excerpts and a
pointer to the recovery runbook. Exits non-zero on failure.

Add --from-branch flag (default: main) to apply NixOS config from
a specific branch's worktree on the server.
"
```

---

### Task 6: Write the recovery runbook

**Files:**
- Create: `notes/runbooks/nixos-path-migration.md`

- [ ] **Step 1: Create the runbook**

Create `notes/runbooks/nixos-path-migration.md`:

```markdown
# Runbook: NixOS + Code Path Coordination

## When to use this

After a `bun run cli nixos apply` that reports failing services, or after any manual `nixos-rebuild switch` that changes systemd service ExecStart paths or the entrypoint wrapper.

## Prerequisites

- SSH access to the EC2 instance (`ssh root@<hostname>`).
- `pulumi stack select prod` in `infrastructure/pulumi/` (for `bun run cli nixos` commands).

## Recovery steps

### 1. Run the smoke test to identify what's broken

```bash
bun run cli nixos status
```

Look for services in `failed` or `activating (auto-restart)` state.

### 2. If core services are failing (homepage, webhook, notify)

These run from `/srv/forms-lab/main`. If main doesn't have the code the NixOS config expects (e.g., missing `deploy.json` or entry point files), update main manually:

```bash
# IMPORTANT: run as forms-lab user, not root.
# Running git as root poisons the bare repo with root-owned objects.
ssh root@<hostname>
sudo -u forms-lab bash
cd /srv/forms-lab/main
git fetch origin <branch-with-fixes>
git reset --hard FETCH_HEAD
bun install && bun run build
exit  # back to root
systemctl restart forms-lab-homepage forms-lab-webhook forms-lab-notify
```

### 3. If branch services are failing

Branch services use the `forms-lab-app@` template. If their code doesn't match the current NixOS config (missing `deploy.json` or mismatched paths), stop them:

```bash
ssh root@<hostname>
systemctl list-units 'forms-lab-app@*' --all --no-pager | awk '$4!="running"{print $1}' | xargs -r systemctl stop
```

These branches recover automatically when their owners push after rebasing on main.

### 4. If git permissions are broken

If you ran git commands as root (instead of `forms-lab`), the bare repo may have root-owned objects. The webhook will fail with "insufficient permission for adding an object to repository database."

```bash
ssh root@<hostname>
chown -R forms-lab:forms-lab /srv/forms-lab/repo.git /srv/forms-lab/main
```

### 5. Verify recovery

```bash
bun run cli nixos status
```

All four core services should be `active (running)`.

## Rollback

If the NixOS rebuild itself is the problem and you need to go back:

```bash
ssh root@<hostname>
nixos-rebuild switch --rollback
```

This restores the previous NixOS generation (including the previous ExecStart paths). Note that the code on disk may still be newer than what the rolled-back config expects — you may need to also roll back the code in `/srv/forms-lab/main`.

## Known collateral

After any NixOS config change that affects the `forms-lab-app@` template, branches that haven't rebased will be incompatible. Their services will fail on restart. This is expected and resolved by the branch owner rebasing on main.
```

- [ ] **Step 2: Run checks**

```bash
bun run check
```

Expected: 375 tests pass (no code changed).

- [ ] **Step 3: Commit**

```bash
git add notes/runbooks/nixos-path-migration.md
git commit -m "docs(ops): add NixOS path migration runbook

Step-by-step recovery procedure for NixOS + code coordination issues.
Covers: core service failures, branch service failures, git permission
poisoning, and rollback. Documents the forms-lab-user-not-root gotcha.

Referenced by the nixos CLI smoke test failure message and by the
deployment stability plan.
"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run the full check suite**

```bash
bun run check
```

Expected: 375 tests pass (370 prior + 5 deploy-manifest).

- [ ] **Step 2: Verify deploy.json exists and is valid**

```bash
cat deploy.json | jq .
```

Expected: prints the four entrypoints.

- [ ] **Step 3: Verify the entrypoint wrapper module is registered**

```bash
grep 'entrypoint-wrapper' infrastructure/nixos/flake.nix
```

Expected: `./modules/entrypoint-wrapper.nix` appears in the modules list.

- [ ] **Step 4: Verify service modules reference the wrapper**

```bash
grep -l 'entrypointWrapper' infrastructure/nixos/modules/*.nix
```

Expected: `app.nix`, `homepage.nix`, `webhook.nix`, `notify.nix`, `entrypoint-wrapper.nix`.

- [ ] **Step 5: Verify the deploy script has the guard**

```bash
grep 'deploy.json' infrastructure/nixos/modules/deploy.nix
```

Expected: multiple matches showing the bootstrap guard logic.

- [ ] **Step 6: Verify the CLI has the smoke test**

```bash
bun run cli nixos
```

Expected: help text shows `apply [--from-branch <name>]`.

- [ ] **Step 7: Verify the runbook exists**

```bash
ls notes/runbooks/nixos-path-migration.md
```

- [ ] **Step 8: Commit if any changes from verification**

If no changes were introduced (expected), skip this step. Otherwise:

```bash
git add -A
git commit -m "infra: final verification of deployment stability improvements"
```
