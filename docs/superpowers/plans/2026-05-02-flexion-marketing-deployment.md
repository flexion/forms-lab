# Flexion Marketing Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a fresh Forms Lab deployment in the Flexion Marketing AWS account on a `t4g.medium` ARM/Graviton EC2 instance running NixOS, with AWS Secrets Manager replacing sops-nix, and decoupled NixOS rebuilds.

**Architecture:** The existing Pulumi project gets a second stack (`prod-marketing`) targeting the new AWS account. NixOS modules are updated to fetch secrets from AWS Secrets Manager via IAM role at service startup instead of reading sops-nix files from disk. The deploy-main script is modified to notify instead of auto-rebuilding NixOS. Caddy config is parameterized for future domain swap.

**Tech Stack:** Pulumi (TypeScript), NixOS (Nix), AWS (EC2, Secrets Manager, IAM), Caddy, Bun, Hono

**Spec:** `docs/superpowers/specs/2026-05-02-flexion-marketing-deployment-design.md`

---

### Task 1: Parameterize Pulumi instance type and AMI

Make the EC2 instance type and AMI ID configurable per Pulumi stack so the existing `prod` stack is unchanged while `prod-marketing` can use ARM/Graviton.

**Files:**
- Modify: `infrastructure/pulumi/index.ts`
- Modify: `infrastructure/pulumi/Pulumi.prod.yaml`

- [ ] **Step 1: Add config values for instanceType and amiId in index.ts**

Replace the hardcoded AMI and instance type with Pulumi config lookups that fall back to the current values:

```typescript
// In infrastructure/pulumi/index.ts, replace lines 6-14:

const config = new pulumi.Config()
const sshKeyPath = config.require('sshPublicKeyPath')
const sshPublicKey = readFileSync(resolve(sshKeyPath), 'utf-8').trim()

const instanceType = config.get('instanceType') || 't3.medium'
const amiId = config.require('amiId')
const nixosAmi = Promise.resolve({ id: amiId })
```

Then update the instance resource (line 109):

```typescript
  instanceType: instanceType,
```

Remove the old comment block about t3.small OOM (lines 106-108) — it's historical context that belongs in git history.

- [ ] **Step 2: Add amiId to existing prod stack config**

Add the current AMI ID to `Pulumi.prod.yaml` so the existing stack keeps working:

```yaml
config:
  aws:region: us-east-1
  aws:profile: llm-class
  forms-lab:sshPublicKeyPath: /home/daniel/.ssh/id_ed25519.pub
  forms-lab:amiId: ami-0d1f1bc132c528d59
```

- [ ] **Step 3: Verify prod stack is unchanged**

Run:
```bash
cd infrastructure/pulumi && pulumi preview --stack prod
```

Expected: No changes (or only the config reference change, no resource replacements).

- [ ] **Step 4: Commit**

```bash
git add infrastructure/pulumi/index.ts infrastructure/pulumi/Pulumi.prod.yaml
git commit -m "infra(pulumi): parameterize instance type and AMI ID

Extract hardcoded t3.medium and x86 AMI into Pulumi config values.
Existing prod stack gets explicit amiId in config. Prepares for
ARM/Graviton stack in Flexion Marketing account."
```

---

### Task 2: Add Secrets Manager IAM policy and resources to Pulumi

Add IAM permissions for Secrets Manager access and create the secret resources.

**Files:**
- Modify: `infrastructure/pulumi/index.ts`

- [ ] **Step 1: Add Secrets Manager IAM policy**

After the existing `forms-lab-bedrock` RolePolicy (line 97), add:

```typescript
new aws.iam.RolePolicy('forms-lab-secrets', {
  role: role.id,
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['secretsmanager:GetSecretValue'],
        Resource: [
          'arn:aws:secretsmanager:us-east-1:*:secret:forms-lab/*',
        ],
      },
    ],
  }),
})
```

- [ ] **Step 2: Add Secrets Manager secret resources**

After the IAM policy, add the secret resources. These are created empty — values are populated manually after provisioning:

```typescript
const secretNames = [
  'github-webhook-secret',
  'github-token',
  'github-client-id',
  'github-client-secret',
  'session-secret',
  'slack-webhook-url',
]

for (const name of secretNames) {
  new aws.secretsmanager.Secret(`forms-lab-secret-${name}`, {
    name: `forms-lab/${name}`,
    description: `Forms Lab: ${name}`,
    tags: { Project: 'forms-lab' },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add infrastructure/pulumi/index.ts
git commit -m "infra(pulumi): add Secrets Manager IAM policy and secret resources

Add secretsmanager:GetSecretValue permission to EC2 role.
Create empty secrets in forms-lab/ prefix for manual population.
Secrets: github-webhook-secret, github-token, github-client-id,
github-client-secret, session-secret, slack-webhook-url."
```

---

### Task 3: Create prod-marketing Pulumi stack config

Create the new stack configuration file for the Flexion Marketing account.

**Files:**
- Create: `infrastructure/pulumi/Pulumi.prod-marketing.yaml`

- [ ] **Step 1: Look up ARM NixOS AMI for us-east-1**

Find the current NixOS 25.11 aarch64 AMI for us-east-1 from https://nixos.org/download#nixos-amazon or by checking:

```bash
aws ec2 describe-images \
  --profile flexion_marketing \
  --region us-east-1 \
  --owners 427812963091 \
  --filters "Name=name,Values=NixOS-25.11*aarch64*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].[ImageId,Name]' \
  --output text
```

If the IAM account lacks `ec2:DescribeImages`, check https://nixos.github.io/amis/ for the latest aarch64 AMI in us-east-1.

- [ ] **Step 2: Create the stack config file**

Create `infrastructure/pulumi/Pulumi.prod-marketing.yaml`:

```yaml
config:
  aws:region: us-east-1
  aws:profile: flexion_marketing
  forms-lab:sshPublicKeyPath: /home/daniel/.ssh/id_ed25519.pub
  forms-lab:instanceType: t4g.medium
  forms-lab:amiId: <ARM_AMI_ID_FROM_STEP_1>
```

- [ ] **Step 3: Initialize the Pulumi stack**

```bash
cd infrastructure/pulumi && pulumi stack init prod-marketing
```

- [ ] **Step 4: Preview the stack**

```bash
cd infrastructure/pulumi && pulumi preview --stack prod-marketing
```

Expected: Plan to create all resources (EC2, security group, IAM role, EIP, secrets).

- [ ] **Step 5: Commit**

```bash
git add infrastructure/pulumi/Pulumi.prod-marketing.yaml
git commit -m "infra(pulumi): add prod-marketing stack for Flexion Marketing account

t4g.medium ARM/Graviton instance in us-east-1.
Uses flexion_marketing AWS profile."
```

---

### Task 4: Update CLI to support multiple stacks

The CLI commands currently hardcode `AWS_PROFILE: 'llm-class'`. Make them stack-aware.

**Files:**
- Modify: `src/entrypoints/cli/commands/infra.ts`
- Modify: `src/entrypoints/cli/commands/nixos.ts`

- [ ] **Step 1: Update infra.ts to accept a --stack flag**

Replace the hardcoded `AWS_PROFILE` with a stack-aware lookup. The Pulumi config contains the AWS profile, so we read it from the active stack:

```typescript
import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli infra <subcommand> [--stack <name>]\n')
  console.log('Subcommands:')
  console.log('  up           Provision/update EC2 via Pulumi')
  console.log('  outputs      Show hostname, IP, SSH command')
  console.log('  ssh          SSH into the EC2 instance')
  console.log('\nOptions:')
  console.log('  --stack <name>  Pulumi stack (default: current stack)')
}

function getStackArgs(args: string[]): string[] {
  const stackIdx = args.indexOf('--stack')
  if (stackIdx !== -1 && args[stackIdx + 1]) {
    return ['--stack', args[stackIdx + 1]]
  }
  return []
}

async function runPulumi(args: string[]): Promise<number> {
  const proc = Bun.spawn(['pulumi', ...args], {
    cwd: pulumiDir,
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  return await proc.exited
}

async function getOutput(name: string, stackArgs: string[]): Promise<string> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', name, ...stackArgs], {
    cwd: pulumiDir,
    stdout: 'pipe',
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text.trim()
}

export async function infra(args: string[]): Promise<number> {
  const subcommand = args[0]
  const stackArgs = getStackArgs(args)

  switch (subcommand) {
    case 'up':
      return runPulumi(['up', '--yes', ...stackArgs])

    case 'outputs': {
      const exitCode = await runPulumi(['stack', 'output', ...stackArgs])
      if (exitCode === 0) {
        const hostname = await getOutput('hostname', stackArgs)
        if (hostname) {
          console.log(`\nSSH: ssh root@${hostname}`)
        }
      }
      return exitCode
    }

    case 'ssh': {
      const hostname = await getOutput('hostname', stackArgs)
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      console.log(`Connecting to ${hostname}...`)
      const proc = Bun.spawn(['ssh', `root@${hostname}`], {
        stdio: ['inherit', 'inherit', 'inherit'],
      })
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
```

Key changes:
- Remove `AWS_PROFILE` override — let Pulumi read it from stack config
- Remove the `bootstrap` subcommand — no longer needed (was for S3 backend)
- Add `--stack` flag passthrough to all Pulumi commands
- `getOutput` accepts `stackArgs` to query the right stack

- [ ] **Step 2: Update nixos.ts to accept a --stack flag**

Update `getHostname` to accept stack args and remove hardcoded `AWS_PROFILE`:

```typescript
function getStackArgs(args: string[]): string[] {
  const stackIdx = args.indexOf('--stack')
  if (stackIdx !== -1 && args[stackIdx + 1]) {
    return ['--stack', args[stackIdx + 1]]
  }
  return []
}

async function getHostname(stackArgs: string[]): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname', ...stackArgs], {
    cwd: pulumiDir,
    stdout: 'pipe',
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}
```

Then update all call sites in the `nixos` function to pass `getStackArgs(args)` to `getHostname`.

- [ ] **Step 3: Verify the CLI still works for prod stack**

```bash
bun run cli infra outputs --stack prod
bun run cli nixos status --stack prod
```

Expected: Same output as before.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/cli/commands/infra.ts src/entrypoints/cli/commands/nixos.ts
git commit -m "infra(cli): make infra and nixos commands stack-aware

Add --stack flag to infra and nixos CLI commands. Remove hardcoded
AWS_PROFILE — Pulumi reads it from stack config. Remove obsolete
bootstrap subcommand (S3 backend no longer used)."
```

---

### Task 5: Create secrets fetcher NixOS module

Replace sops-nix with a wrapper that fetches secrets from AWS Secrets Manager at service startup.

**Files:**
- Create: `infrastructure/nixos/modules/secrets.nix`

- [ ] **Step 1: Write the secrets.nix module**

Create `infrastructure/nixos/modules/secrets.nix`:

```nix
{ config, pkgs, lib, ... }:

let
  # Wrapper script that fetches secrets from AWS Secrets Manager and
  # execs into the target command. Each secret name (e.g. "github-token")
  # is fetched from "forms-lab/<name>" and exported as an uppercased env
  # var with hyphens replaced by underscores (GITHUB_TOKEN).
  fetchSecretsScript = pkgs.writeShellScriptBin "forms-lab-fetch-secrets" ''
    set -euo pipefail

    SECRETS=""
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --)
          shift
          break
          ;;
        *)
          SECRETS="$SECRETS $1"
          shift
          ;;
      esac
    done

    if [ "$#" -eq 0 ]; then
      echo "Usage: forms-lab-fetch-secrets <secret1> [secret2 ...] -- <command> [args...]"
      exit 1
    fi

    for SECRET_NAME in $SECRETS; do
      # Fetch from AWS Secrets Manager
      VALUE=$(${pkgs.awscli2}/bin/aws secretsmanager get-secret-value \
        --secret-id "forms-lab/$SECRET_NAME" \
        --query 'SecretString' \
        --output text \
        --region us-east-1)

      # Convert name to env var: github-webhook-secret -> GITHUB_WEBHOOK_SECRET
      ENV_NAME=$(echo "$SECRET_NAME" | ${pkgs.coreutils}/bin/tr '[:lower:]-' '[:upper:]_')
      export "$ENV_NAME=$VALUE"
    done

    exec "$@"
  '';
in
{
  options.flexion.fetchSecrets = lib.mkOption {
    type = lib.types.package;
    default = fetchSecretsScript;
    description = "The forms-lab secrets fetcher script package";
  };

  config = {
    environment.systemPackages = [ fetchSecretsScript ];
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add infrastructure/nixos/modules/secrets.nix
git commit -m "infra(nixos): add secrets fetcher module for AWS Secrets Manager

forms-lab-fetch-secrets wrapper fetches named secrets from
forms-lab/<name> in Secrets Manager, exports as env vars
(uppercased, hyphens to underscores), then execs into the
target command. Replaces sops-nix for secret delivery."
```

---

### Task 6: Update NixOS service modules to use secrets fetcher

Replace sops-nix secret file reads with the new `forms-lab-fetch-secrets` wrapper in all service modules.

**Files:**
- Modify: `infrastructure/nixos/modules/webhook.nix`
- Modify: `infrastructure/nixos/modules/notify.nix`

- [ ] **Step 1: Update webhook.nix**

Replace the entire file content:

```nix
{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-webhook = {
    description = "Forms Lab GitHub Webhook Listener";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];
    onFailure = [ "forms-lab-notify-failure@%n.service" ];

    path = with pkgs; [ git openssh bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
    };

    script = ''
      export DEPLOY_HOSTNAME=${config.flexion.hostname}
      export PORT=9000
      export DEPLOY_SCRIPT=/srv/forms-lab/deploy.sh
      exec ${config.flexion.fetchSecrets}/bin/forms-lab-fetch-secrets \
        github-webhook-secret github-token \
        -- ${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint webhook /srv/forms-lab/main
    '';
  };
}
```

Key changes:
- Removed `config.sops.secrets.*` references
- Wrapped the entrypoint with `forms-lab-fetch-secrets`
- `DEPLOY_HOSTNAME` uses `config.flexion.hostname` (defined in Task 7)

- [ ] **Step 2: Update notify.nix**

Replace the entire file content:

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
      export PORT=9001
      exec ${config.flexion.fetchSecrets}/bin/forms-lab-fetch-secrets \
        slack-webhook-url \
        -- ${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint notify /srv/forms-lab/main
    '';
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add infrastructure/nixos/modules/webhook.nix infrastructure/nixos/modules/notify.nix
git commit -m "infra(nixos): use secrets fetcher in webhook and notify services

Replace sops-nix secret file reads with forms-lab-fetch-secrets
wrapper. Webhook fetches github-webhook-secret and github-token.
Notify fetches slack-webhook-url."
```

---

### Task 7: Parameterize Caddy hostname and TLS

Make hostname and TLS mode configurable NixOS options instead of hardcoded values.

**Files:**
- Modify: `infrastructure/nixos/modules/caddy.nix`

- [ ] **Step 1: Add NixOS options and parameterize caddy.nix**

Replace the entire file content:

```nix
{ config, pkgs, lib, ... }:

{
  options.flexion.hostname = lib.mkOption {
    type = lib.types.str;
    description = "Public hostname for the Forms Lab instance";
  };

  options.flexion.tlsMode = lib.mkOption {
    type = lib.types.enum [ "internal" "acme" ];
    default = "internal";
    description = "TLS mode: 'internal' for self-signed, 'acme' for Let's Encrypt";
  };

  config = {
    services.caddy = {
      enable = true;
      globalConfig = ''
        auto_https disable_redirects
      '';

      extraConfig = ''
        ${config.flexion.hostname} {
          ${if config.flexion.tlsMode == "internal" then "tls internal" else ""}

          handle /.webhook* {
            uri strip_prefix /.webhook
            reverse_proxy localhost:9000
          }

          handle /git/* {
            root * /srv/forms-lab/repos
            uri strip_prefix /git
            file_server browse
          }

          import /srv/forms-lab/caddy.d/branch-*.caddy
          import /srv/forms-lab/caddy.d/root.caddy

          respond "Forms Lab — no branch deployed at this path" 404
        }

        :80 {
          redir https://{host}{uri} permanent
        }
      '';
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add infrastructure/nixos/modules/caddy.nix
git commit -m "infra(nixos): parameterize Caddy hostname and TLS mode

Add flexion.hostname and flexion.tlsMode NixOS options.
Defaults to self-signed TLS. Switch to 'acme' when a real
domain is configured."
```

---

### Task 8: Update deploy script — secrets and NixOS decoupling

Update `deploy.nix` to: (1) fetch secrets from Secrets Manager instead of `/run/secrets/`, (2) remove `AWS_BEDROCK_REGION`, and (3) skip NixOS rebuild in deploy-main, notifying instead.

**Files:**
- Modify: `infrastructure/nixos/modules/deploy.nix`

- [ ] **Step 1: Update deploy script to use forms-lab-fetch-secrets for .env generation**

In the `deployScript` definition, replace the `.env` generation block (lines 188-202) with:

```nix
    # Fetch secrets for .env file generation
    # The deploy script runs as forms-lab user with IAM role access
    GITHUB_CLIENT_ID=$(${pkgs.awscli2}/bin/aws secretsmanager get-secret-value \
      --secret-id "forms-lab/github-client-id" --query 'SecretString' --output text --region us-east-1)
    GITHUB_CLIENT_SECRET=$(${pkgs.awscli2}/bin/aws secretsmanager get-secret-value \
      --secret-id "forms-lab/github-client-secret" --query 'SecretString' --output text --region us-east-1)
    SESSION_SECRET=$(${pkgs.awscli2}/bin/aws secretsmanager get-secret-value \
      --secret-id "forms-lab/session-secret" --query 'SecretString' --output text --region us-east-1)

    # Write per-branch env file
    cat > "$BRANCH_DIR/.env" <<ENVEOF
PORT=$PORT
BASE_PATH=/$UNIT_NAME/
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
SESSION_SECRET=$SESSION_SECRET
GITHUB_AUTHZ_ORG=flexion
ALLOWED_USERS=danielnaab,FlexionCodeReview
ALLOWED_EMAIL_DOMAINS=flexion.us
AWS_REGION=us-east-1
CACHE_DB_PATH=/srv/forms-lab/cache.sqlite
REPOS_PATH=/srv/forms-lab/repos
ENVEOF
```

Note: `AWS_BEDROCK_REGION` is removed — `us-east-1` via `AWS_REGION` handles all AWS services.

- [ ] **Step 2: Update deploy-main to skip NixOS rebuild and notify instead**

Replace the NixOS rebuild block in `deployMainScript` (lines 22-28):

```nix
    # Check if nixos config changed since last deployment
    if ! ${pkgs.diffutils}/bin/diff -qr infrastructure/nixos /etc/nixos >/dev/null 2>&1; then
      echo "NixOS config changes detected — skipping auto-rebuild"
      echo "Manual apply required: bun run cli nixos apply"
      # Notify via the notification service
      ${pkgs.curl}/bin/curl -s -X POST http://localhost:9001/event \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"deploy.nixos-changed\",\"title\":\"NixOS config changed in $SHA\",\"status\":\"warning\",\"details\":\"Manual apply required: bun run cli nixos apply\"}" \
        || true
    else
      echo "No NixOS config changes"
    fi
```

- [ ] **Step 3: Add awscli2 to the deploy script's dependencies**

The `deployScript` and `deployMainScript` use `pkgs.awscli2` now. Ensure it's available by adding it in the `let` block or as a system package. Since the scripts are written with `pkgs.writeShellScriptBin` and reference `${pkgs.awscli2}` directly, Nix handles the dependency automatically.

- [ ] **Step 4: Commit**

```bash
git add infrastructure/nixos/modules/deploy.nix
git commit -m "infra(nixos): fetch secrets from Secrets Manager in deploy script

Replace /run/secrets/ reads with AWS Secrets Manager calls.
Remove AWS_BEDROCK_REGION (use us-east-1 for everything).
Deploy-main now skips NixOS rebuild and posts a notification
instead, requiring manual apply via CLI."
```

---

### Task 9: Remove sops-nix and update flake.nix

Remove sops-nix dependency, secrets.yaml, and update the NixOS configuration to remove all sops references.

**Files:**
- Modify: `infrastructure/nixos/flake.nix`
- Modify: `infrastructure/nixos/configuration.nix`

- [ ] **Step 1: Update flake.nix — remove sops-nix, support aarch64**

Replace the entire file content:

```nix
{
  description = "Forms Lab EC2 NixOS configuration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
  let
    # Support both x86_64 (existing prod) and aarch64 (prod-marketing)
    mkSystem = system: nixpkgs.lib.nixosSystem {
      inherit system;
      modules = [
        ./hardware-configuration.nix
        ./configuration.nix
        ./modules/users.nix
        ./modules/caddy.nix
        ./modules/webhook.nix
        ./modules/app.nix
        ./modules/deploy.nix
        ./modules/entrypoint-wrapper.nix
        ./modules/homepage.nix
        ./modules/notify.nix
        ./modules/notify-failure.nix
        ./modules/secrets.nix
      ];
    };
  in {
    nixosConfigurations.forms-lab = mkSystem "x86_64-linux";
    nixosConfigurations.forms-lab-arm = mkSystem "aarch64-linux";
  };
}
```

Key changes:
- Removed sops-nix input and module
- Added `modules/secrets.nix` to module list
- Added `forms-lab-arm` configuration for aarch64
- Removed devShell (was only for sops)

- [ ] **Step 2: Remove sops config from configuration.nix**

Remove the entire sops block (lines 52-73) and the `sops` package from systemPackages (line 14):

In `environment.systemPackages`, replace:

```nix
  environment.systemPackages = with pkgs; [
    git
    bun
    curl
    jq
    sops
  ];
```

with:

```nix
  environment.systemPackages = with pkgs; [
    git
    bun
    curl
    jq
    awscli2
  ];
```

Remove the entire `sops = { ... };` block (lines 52-73).

- [ ] **Step 3: Set the hostname in configuration.nix**

Add the hostname configuration. For now, use a placeholder that will be updated after `pulumi up` provides the EC2 public hostname:

```nix
  # Hostname — update after pulumi up provides the EC2 public DNS
  flexion.hostname = "PLACEHOLDER-UPDATE-AFTER-PULUMI-UP";
```

This will be updated in Task 11 after provisioning.

- [ ] **Step 4: Commit**

```bash
git add infrastructure/nixos/flake.nix infrastructure/nixos/configuration.nix
git commit -m "infra(nixos): remove sops-nix, add aarch64 support

Remove sops-nix flake input, module, and all sops config.
Replace sops with awscli2 in system packages.
Add forms-lab-arm NixOS configuration for aarch64.
Add secrets.nix module to flake."
```

---

### Task 10: Update NixOS nixos-rebuild flake target in CLI

The `nixos apply` command needs to use the correct flake target for ARM instances.

**Files:**
- Modify: `src/entrypoints/cli/commands/nixos.ts`

- [ ] **Step 1: Add --arm flag to nixos apply**

Update the `apply` case to accept an `--arm` flag that selects the `forms-lab-arm` flake target:

```typescript
    case 'apply': {
      const stackArgs = getStackArgs(args)
      const hostname = await getHostname(stackArgs)
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }

      let branch = 'main'
      const branchIdx = args.indexOf('--from-branch')
      if (branchIdx !== -1 && args[branchIdx + 1]) {
        branch = args[branchIdx + 1]
      }

      const isArm = args.includes('--arm')
      const flakeTarget = isArm ? 'forms-lab-arm' : 'forms-lab'

      const safeBranch = branch.replace(/\//g, '-')
      const worktree = `/srv/forms-lab/${safeBranch}`

      console.log(`Applying NixOS config (${flakeTarget}) from ${worktree} on ${hostname}...`)

      const rebuildCode = await sshExec(
        hostname,
        [
          `git config --global --add safe.directory ${worktree} 2>/dev/null || true`,
          `cd ${worktree}`,
          `nixos-rebuild switch --flake ./infrastructure/nixos#${flakeTarget}`,
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
```

Update `printUsage` to document the new flags:

```typescript
function printUsage(): void {
  console.log('Usage: bun run cli nixos <subcommand> [options]\n')
  console.log('Subcommands:')
  console.log(
    '  apply [--from-branch <name>] [--arm] [--stack <name>]  Apply NixOS config via SSH',
  )
  console.log(
    '  status [--stack <name>]       Show running services and health',
  )
  console.log(
    '  logs <service> [--follow] [--stack <name>]  Show logs for a service',
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entrypoints/cli/commands/nixos.ts
git commit -m "infra(cli): add --arm and --stack flags to nixos commands

nixos apply --arm uses forms-lab-arm flake target for aarch64.
All nixos subcommands accept --stack for multi-stack support."
```

---

### Task 11: Provision the new instance and configure secrets

This is the hands-on provisioning task. It requires AWS credentials and manual secret population.

**Files:**
- Modify: `infrastructure/nixos/configuration.nix` (hostname update)

- [ ] **Step 1: Provision the EC2 instance**

```bash
cd infrastructure/pulumi && pulumi up --stack prod-marketing
```

Expected: Creates EC2 instance, security group, IAM role, EIP, Secrets Manager secrets. Note the public DNS hostname from the output.

- [ ] **Step 2: Populate secrets in AWS Secrets Manager**

For each secret, use the AWS CLI to set the value:

```bash
aws secretsmanager put-secret-value \
  --profile flexion_marketing \
  --region us-east-1 \
  --secret-id "forms-lab/github-webhook-secret" \
  --secret-string "$(openssl rand -hex 32)"

aws secretsmanager put-secret-value \
  --profile flexion_marketing \
  --region us-east-1 \
  --secret-id "forms-lab/session-secret" \
  --secret-string "$(openssl rand -hex 32)"
```

For `github-token`: create a new PAT at https://github.com/settings/tokens with `repo:status` and `repo_deployment` scopes, then:

```bash
aws secretsmanager put-secret-value \
  --profile flexion_marketing \
  --region us-east-1 \
  --secret-id "forms-lab/github-token" \
  --secret-string "<PAT_VALUE>"
```

For `github-client-id` and `github-client-secret`: create a new GitHub OAuth app (Task 12), then populate these.

For `slack-webhook-url`: use the existing Slack webhook URL or create a new one.

- [ ] **Step 3: Update hostname in configuration.nix**

Replace the placeholder with the actual EC2 public DNS:

```nix
  flexion.hostname = "<ACTUAL-EC2-PUBLIC-DNS-FROM-PULUMI-OUTPUT>";
```

- [ ] **Step 4: Apply NixOS config to the new instance**

```bash
bun run cli nixos apply --stack prod-marketing --arm
```

Expected: NixOS rebuild succeeds. Services may fail initially (secrets not yet fully populated, no repo cloned yet).

- [ ] **Step 5: Commit the hostname update**

```bash
git add infrastructure/nixos/configuration.nix
git commit -m "infra(nixos): set hostname for prod-marketing instance

Update flexion.hostname to the Elastic IP public DNS from
the Flexion Marketing deployment."
```

---

### Task 12: Create GitHub OAuth app and configure webhook

Set up the GitHub OAuth app and webhook for the new instance.

- [ ] **Step 1: Create GitHub OAuth app**

Run the setup helper or create manually at https://github.com/settings/developers:
- Application name: Forms Lab (Flexion Marketing)
- Homepage URL: `https://<ec2-public-hostname>`
- Authorization callback URL: `https://<ec2-public-hostname>/auth/callback`

- [ ] **Step 2: Populate OAuth secrets in Secrets Manager**

```bash
aws secretsmanager put-secret-value \
  --profile flexion_marketing \
  --region us-east-1 \
  --secret-id "forms-lab/github-client-id" \
  --secret-string "<CLIENT_ID>"

aws secretsmanager put-secret-value \
  --profile flexion_marketing \
  --region us-east-1 \
  --secret-id "forms-lab/github-client-secret" \
  --secret-string "<CLIENT_SECRET>"
```

- [ ] **Step 3: Configure GitHub webhook**

Go to https://github.com/flexion/forms-lab/settings/hooks and add a new webhook:
- Payload URL: `https://<ec2-public-hostname>/.webhook`
- Content type: `application/json`
- Secret: the value you generated for `forms-lab/github-webhook-secret`
- Events: Just the push event + Branch or tag deletion
- Active: checked

- [ ] **Step 4: Disable the old webhook**

In the same webhook settings page, find the old webhook pointing at the LLM class EC2 instance and uncheck "Active" (or delete it).

---

### Task 13: Verify the deployment end-to-end

- [ ] **Step 1: Check all services are running**

```bash
bun run cli nixos status --stack prod-marketing
```

Expected: All `forms-lab-*` services active.

- [ ] **Step 2: Trigger a deployment via webhook**

Push a trivial commit (or re-push the current HEAD) to trigger the webhook:

```bash
git push origin main
```

Monitor the deployment:

```bash
bun run cli nixos logs webhook --follow --stack prod-marketing
```

Expected: Webhook receives the push event, triggers deploy, main branch builds and starts.

- [ ] **Step 3: Verify the app is accessible**

Open `https://<ec2-public-hostname>/` in a browser. Accept the self-signed certificate. Expected: Landing page loads.

- [ ] **Step 4: Test authentication**

Click "Sign in" and complete the GitHub OAuth flow. Expected: Redirected back to the dashboard.

- [ ] **Step 5: Test branch deployment**

Push a feature branch and verify it deploys:

```bash
git checkout -b test/deployment-verification
git commit --allow-empty -m "test: verify branch deployment"
git push -u origin test/deployment-verification
```

Wait for deployment, then visit `https://<ec2-public-hostname>/test-deployment-verification/`. Expected: App loads at the branch path.

Clean up:

```bash
git checkout main
git push origin --delete test/deployment-verification
git branch -d test/deployment-verification
```

- [ ] **Step 6: Verify NixOS rebuild is decoupled**

Make a trivial change to a NixOS config file, push to main, and verify the deploy script notifies instead of rebuilding:

```bash
bun run cli nixos logs webhook --follow --stack prod-marketing
```

Expected: Log shows "NixOS config changes detected — skipping auto-rebuild" and a Slack notification is posted.

---

### Task 14: Create follow-up GitHub issues

Create the GitHub issues for work identified during brainstorming that is out of scope for this deployment.

- [ ] **Step 1: Create issues**

```bash
gh issue create --title "Security audit of deployed system" \
  --body "Audit the deployed Forms Lab instance before sharing the URL broadly.

## Scope
- Review auth flow for vulnerabilities (CSRF, open redirect, session fixation)
- Check Caddy TLS configuration
- Review firewall rules and network exposure
- Audit IAM role permissions (least privilege)
- Check for dependency vulnerabilities
- Review secrets handling (Secrets Manager access patterns)

## Context
New deployment in Flexion Marketing AWS account. URL will be shared with Flexion employees."

gh issue create --title "Domain + TLS: forms.labs.flexion.us" \
  --body "Set up the production domain and Let's Encrypt TLS.

## Tasks
- Determine who manages flexion.us DNS zone
- Request DNS record for forms.labs.flexion.us pointing to EC2 Elastic IP
- Update \`flexion.hostname\` in NixOS configuration.nix
- Switch \`flexion.tlsMode\` to \`\"acme\"\`
- Apply NixOS config: \`bun run cli nixos apply --stack prod-marketing --arm\`
- Update GitHub OAuth app callback URL
- Verify HTTPS with real certificate"

gh issue create --title "CI check for NixOS infrastructure changes" \
  --body "Add a CI step that detects and comments on NixOS config changes in PRs.

## Approach
- GitHub Action that runs on PRs
- Detects changes in \`infrastructure/nixos/\`
- Comments on the PR with the diff
- Optionally: run \`nixos-rebuild --dry-run\` in CI to validate syntax

## Context
NixOS rebuilds are now manual-only (decoupled from app deploys). PR-level
visibility helps reviewers understand system-level impact before merge."

gh issue create --title "UX consistency fixes" \
  --body "Resolve inconsistencies in the Forms Lab UI.

## Known Issues
- Breadcrumb navigation inconsistent across pages
- Mixed navigation patterns (header nav vs repo nav vs sidebar nav)
- Some design system components lack contracts/examples (flex-assistant, flex-editable-field)
- Missing component metadata (flex-diagram, flex-badge)
- No persistent context when navigating between form editing and project overview

## Approach
- Audit all pages for navigation consistency
- Standardize breadcrumb usage
- Fill in missing component contracts and metadata"

gh issue create --title "User management and access policy" \
  --body "Revisit authentication and authorization for broader access.

## Current State
- GitHub OAuth with allowlist (ALLOWED_USERS) + email domain match (flexion.us)
- Any Flexion employee with a GitHub account can sign in
- No approval workflow, no user roles, no project-level permissions

## Considerations
- LLM calls are expensive — need cost awareness/control
- Should new users require approval?
- Should there be admin vs regular user roles?
- Should projects have access controls (private/shared)?

## Context
Deployed to Flexion Marketing account, URL shared with company."

gh issue create --title "Activity tracking and LLM cost visibility" \
  --body "Track user activity and surface LLM usage costs.

## Requirements
- Log form extraction/shaping events with user attribution
- Track LLM API calls (model, tokens, cost estimate)
- Surface usage data to admins (dashboard or report)
- Enable per-user or per-project usage limits (future)

## Context
No activity tracking currently exists beyond auth audit logs.
LLM costs are the primary operational concern for broader access."

gh issue create --title "Landing page and project storytelling" \
  --body "Update the landing page to communicate the Forms Lab story.

## Goals
- Help people understand what Forms Lab does and why it matters
- Position it as a reusable forms solution for government
- Make people interested in working with Flexion on this
- Provide clear onboarding path for new users

## Current State
Landing page has basic hero + 4-step explanation.
Needs richer narrative, examples, and call-to-action."
```

- [ ] **Step 2: Commit (no code changes — issues are on GitHub)**

No commit needed. Verify the issues were created:

```bash
gh issue list --label "" --limit 10
```
