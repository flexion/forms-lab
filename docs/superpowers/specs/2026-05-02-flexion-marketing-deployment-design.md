# Flexion Marketing AWS Deployment

**Date:** 2026-05-02
**Status:** Draft
**Scope:** Stand up a fresh Forms Lab deployment in the Flexion Marketing AWS account

## Context

The first Forms Lab deployment runs in the LLM class AWS account on a `t3.medium` x86 EC2 instance. A new, permanent deployment is needed in the Flexion Marketing AWS account. The existing deployment remains as-is; this is a fresh parallel instance with no data migration.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AWS account | Flexion Marketing (`flexion_marketing` profile) | Permanent home for the project |
| Instance type | `t4g.medium` (ARM/Graviton) | Cheaper, faster than t3 for this workload |
| Region | `us-east-1` for everything | Simplify; cross-region inference profiles handle Bedrock model routing |
| Pulumi state | Pulumi Cloud, new stack `prod-marketing` | Existing pattern; built-in state locking and visibility |
| Secrets | AWS Secrets Manager, fetched via IAM role at service start | No secrets on disk, team-friendly, no age key distribution |
| NixOS deploys | Decoupled from app deploys; manual-only | Reduce blast radius, audit trail |
| Domain | Pluggable; launch with EC2 hostname + self-signed TLS | Domain TBD (likely forms.labs.flexion.us), swap in later |
| Branch deploys | Kept | Core feature for showcasing work |
| Auth policy | Same as current (allowlist + flexion.us domain) | Sufficient for launch, revisit as follow-up |
| Bedrock region | Remove `AWS_BEDROCK_REGION`; use `us-east-1` | Single region simplifies config |

## 1. Pulumi Stack & AWS Resources

### New stack config

File: `Pulumi.prod-marketing.yaml`

```yaml
config:
  aws:region: us-east-1
  aws:profile: flexion_marketing
  forms-lab:sshPublicKeyPath: /home/daniel/.ssh/id_ed25519.pub
```

### Changes to `infrastructure/pulumi/index.ts`

- Extract instance type and AMI as Pulumi config values (currently hardcoded `t3.medium` and x86 AMI).
- `prod-marketing` stack uses `t4g.medium` + ARM NixOS AMI (aarch64; specific AMI ID to be looked up at implementation time from [NixOS AMI list](https://nixos.org/download#nixos-amazon)).
- Existing `prod` stack unchanged (keeps `t3.medium` + x86 AMI).
- Security group, IAM role (Bedrock access), and Elastic IP remain structurally the same.
- Add IAM policy for Secrets Manager: `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-1:*:secret:forms-lab/*`.

### Secrets Manager resources (provisioned by Pulumi)

Created as empty secrets; values populated manually after provisioning:

- `forms-lab/github-webhook-secret`
- `forms-lab/github-token`
- `forms-lab/github-client-id`
- `forms-lab/github-client-secret`
- `forms-lab/session-secret`
- `forms-lab/slack-webhook-url`

## 2. NixOS Secrets Integration

### Current approach (sops-nix)

Secrets encrypted in `secrets.yaml`, decrypted at NixOS activation to `/run/secrets/`. Services read from files on disk.

### New approach (AWS Secrets Manager)

Services fetch secrets via IAM role at startup. No secrets on disk.

### Secrets fetcher wrapper

A new NixOS module (`modules/secrets.nix`) provides a shell script `forms-lab-fetch-secrets` that:

1. Calls `aws secretsmanager get-secret-value` for each required secret
2. Exports them as environment variables (uppercased, hyphen-to-underscore: `github-webhook-secret` -> `GITHUB_WEBHOOK_SECRET`)
3. Execs into the actual service command

Each service unit's `ExecStart` becomes:

```
forms-lab-fetch-secrets <secret-names> -- forms-lab-entrypoint <role> <path>
```

### Per-service secret requirements

| Service | Secrets |
|---------|---------|
| webhook | `github-webhook-secret`, `github-token` |
| app instances | `github-client-id`, `github-client-secret`, `session-secret` |
| notify | `slack-webhook-url` |
| deploy script | `github-client-id`, `github-client-secret`, `session-secret` (writes `.env`) |
| homepage/dashboard | none |

**Note on deploy script:** The deploy script is invoked by the webhook as a shell process, not a systemd unit. It uses the same `forms-lab-fetch-secrets` wrapper: the webhook's `ExecStart` fetches webhook+deploy secrets together, or the deploy script calls the wrapper itself to fetch the secrets it needs for `.env` generation. The `.env` files written per-branch do contain secrets on disk (client ID, client secret, session secret) — this is the same as the current architecture where the deploy script reads from `/run/secrets/` and writes to `.env`.

### What gets removed

- `secrets.yaml` (sops-encrypted file)
- sops-nix flake input and module
- Age key provisioning (`/var/lib/sops-nix/key.txt`)

### Dependencies added

- AWS CLI added to NixOS system packages

### Trade-off

Services take slightly longer to start (~1s API call per secret on EC2 with IAM role credentials). If AWS APIs are unreachable, services won't start, but that's a catastrophic scenario where nothing else works either.

## 3. NixOS Deploy Decoupling

### Current behavior

A push to `main` triggers `deploy-main.sh`, which diffs `infrastructure/nixos/` against `/etc/nixos/`. If changed, it runs `rsync` + `nixos-rebuild switch` automatically.

### New behavior

Separate app deploys from system changes.

### Changes to `deploy-main.sh`

1. Still diffs `infrastructure/nixos/` against `/etc/nixos/`
2. If changed: **skip the rebuild**, post a notification via the notify service: "NixOS changes detected in commit {sha} -- manual apply required via `bun run cli nixos apply`"
3. Continue with the app deploy as normal (build, restart services)

### Manual apply flow (unchanged)

`bun run cli nixos apply` remains the command to push NixOS config and rebuild. It SSHes in, rsyncs, and runs `nixos-rebuild switch`.

## 4. Caddy & Domain Configuration

### Current

Hostname hardcoded in `modules/caddy.nix` as the EC2 public hostname, with `tls internal` (self-signed).

### New approach

Make hostname and TLS mode NixOS configuration parameters.

In `modules/caddy.nix`:

- Accept a `hostname` option (string)
- Accept a `tlsMode` option: `"internal"` (self-signed) or `"acme"` (Let's Encrypt)
- Initial deployment: `hostname = <ec2-public-hostname>`, `tlsMode = "internal"`

### When domain is ready (future)

- Update `hostname = "forms.labs.flexion.us"`, `tlsMode = "acme"`
- Run `bun run cli nixos apply`
- Caddy automatically provisions Let's Encrypt certs

One-line config change, no structural changes needed.

## 5. GitHub OAuth & Webhook Cutover

### New GitHub OAuth App

- Create under the Flexion org (or personal account)
- Callback URL initially: `https://<ec2-public-hostname>/auth/callback`
- Update callback URL when domain is assigned
- Client ID and secret stored in Secrets Manager

### Auth policy

Same as current: `ALLOWED_USERS` + `ALLOWED_EMAIL_DOMAINS=flexion.us`. These remain in the deploy script as non-secret config values.

### Webhook cutover

1. Deploy the new instance, verify it's working
2. Update the repo's GitHub webhook URL to the new instance
3. Disable the old webhook (LLM class instance)
4. Old instance continues running but stops receiving push events

### New secrets to generate

- Webhook secret: new value in Secrets Manager + GitHub webhook settings
- GitHub token: new PAT (or reuse existing) in Secrets Manager

## 6. Scope Summary

### Changes

- New Pulumi stack (`prod-marketing`) with configurable instance type + AMI
- `t4g.medium` (ARM/Graviton) instead of `t3.medium`
- AWS Secrets Manager replaces sops-nix; new `forms-lab-fetch-secrets` wrapper
- Remove sops-nix from flake, `secrets.yaml`, age key provisioning
- Deploy script skips NixOS rebuild, notifies instead
- Caddy hostname/TLS parameterized
- Remove `AWS_BEDROCK_REGION`; single region `us-east-1`
- New GitHub OAuth app + webhook secret in Secrets Manager
- AWS CLI added to NixOS system packages

### Stays the same

- Branch deploy model (worktrees, per-branch ports, Caddy routes, teardown)
- All NixOS service modules (webhook, app template, homepage, notify, notify-failure)
- Entrypoint wrapper pattern
- Auth flow (GitHub OAuth, session encryption, allowlist + domain policy)
- Deploy script logic (port allocation, .env generation, smoke checks)
- Notification system (Slack)
- Application code (zero changes to `src/`)

## 7. Follow-Up GitHub Issues

These are out of scope for this deployment but tracked for parallel execution:

1. **Security audit** -- audit the deployed system before sharing the URL broadly
2. **Domain + TLS** -- set up forms.labs.flexion.us, configure DNS, switch Caddy to ACME
3. **CI check for NixOS changes** -- PR-level dry-run diff and comment for infrastructure changes
4. **UX consistency fixes** -- navigation, breadcrumbs, design system gaps
5. **User management / access policy** -- revisit auth policy, consider approval workflow
6. **Activity tracking / LLM cost visibility** -- track usage, surface costs
7. **Landing page / storytelling** -- update content to communicate project context and vision
