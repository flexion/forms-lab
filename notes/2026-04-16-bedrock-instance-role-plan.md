# Bedrock Instance Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the cross-account FlexionLLM SSO workflow so the deployed app authenticates to Bedrock via the EC2 instance role instead of a rotating SSO token.

**Architecture:** The forms-lab EC2 instance already has an IAM instance profile (`forms-lab-profile-a6d6c95`) attached to a role that grants `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on US foundation models and inference profiles (`infrastructure/pulumi/index.ts:62-101`). Account `165286508758` (llm-class) has Bedrock model access enabled — confirmed 2026-04-16 by invoking `us.anthropic.claude-sonnet-4-20250514-v1:0`, `us.anthropic.claude-haiku-4-5-20251001-v1:0`, and `us.anthropic.claude-opus-4-6-v1` locally with the llm-class profile. The app services already fall back to `fromNodeProviderChain` when `AWS_BEDROCK_PROFILE` is unset, so the deploy-script env generator and the per-service `fromIni` branch are the only things keeping the SSO path alive. Remove those, delete the `bedrock-credentials` CLI, and clean up the `/srv/forms-lab/.aws` directory on the instance.

**Tech Stack:** Pulumi (already configured — no change), NixOS deploy.nix env generation, `@aws-sdk/credential-providers` (`fromNodeProviderChain`), `@ai-sdk/amazon-bedrock`.

---

## Out of Scope

- Consolidating `src/services/pdf-extractor.ts` and `src/services/ingestion/pdf-extractor.ts` (both are used — `server.tsx` imports the root one, CLI imports the ingestion one). Treat as a separate refactor.
- Changing the `AWS_PROFILE=llm-class` env used by CLI commands that call Pulumi (`infra`, `nixos`, `webhook`, `deploy`, `extract`). Those invoke AWS APIs from the developer's laptop, not Bedrock from the server, and SSO on the laptop is fine.
- Local developer setup (`.env.example`) — updated in Task 5 but local dev still works via `aws sso login --profile llm-class` and the default provider chain.

## Branch Workflow

Per CLAUDE.md "Stacked Branch Workflow", this is an infrastructure change:

```bash
git checkout main && git pull
git checkout -b infra/2026-04-16-bedrock-instance-role
```

Commit with conventional-commit scope `infra(bedrock):`.

---

## Task 1: Pre-flight probe — confirm the instance role works for Bedrock

**Purpose:** Prove the EC2 instance role can invoke the actual production models before removing the SSO fallback. If this fails the whole plan aborts.

**Files:** None (read-only probe from the deployed EC2).

- [ ] **Step 1: SSH to the EC2 host**

```bash
bun run cli infra ssh
# Or equivalently: ssh root@$(cd infrastructure/pulumi && AWS_PROFILE=llm-class pulumi stack output hostname)
```

- [ ] **Step 2: Probe Bedrock using the instance role**

On the EC2 host, ensure no profile/SSO env var is set, then run a probe against the default app model:

```bash
unset AWS_PROFILE AWS_BEDROCK_PROFILE
cd /srv/forms-lab/main
sudo -u forms-lab HOME=/srv/forms-lab env -u AWS_PROFILE -u AWS_BEDROCK_PROFILE \
  AWS_REGION=us-east-1 AWS_BEDROCK_REGION=us-west-2 \
  bun -e '
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";

const bedrock = createAmazonBedrock({
  credentialProvider: fromNodeProviderChain(),
  region: process.env.AWS_BEDROCK_REGION,
});

const { text } = await generateText({
  model: bedrock("us.anthropic.claude-sonnet-4-20250514-v1:0"),
  maxOutputTokens: 10,
  messages: [{ role: "user", content: "ping" }],
});
console.log("OK:", text);
'
```

Expected: `OK: <some response>`.

If it fails with `AccessDeniedException` or credential errors: STOP. The IAM policy or instance profile is not actually effective. Debug before continuing; do not proceed with code changes.

- [ ] **Step 3: Record the result**

Note the outcome in the PR description when you open it (Task 7). No commit yet.

---

## Task 2: Simplify service code to always use `fromNodeProviderChain`

**Files:**
- Modify: `src/services/pdf-extractor.ts:1-2, 59-69`
- Modify: `src/services/ingestion/pdf-extractor.ts:1-2, 64-76`
- Modify: `src/services/evaluation/judge.ts:1-2, 15-23`

- [ ] **Step 1: Update `src/services/pdf-extractor.ts`**

Replace the top import line:

```ts
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
```

with:

```ts
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
```

Replace the body of `createBedrockPdfExtractor` that currently reads (roughly lines 59-69):

```ts
export function createBedrockPdfExtractor(): PdfExtractor {
  // Use AWS SSO profile if configured, otherwise fall back to default chain
  // (env vars, instance profile, etc.)
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })
```

with:

```ts
export function createBedrockPdfExtractor(): PdfExtractor {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })
```

- [ ] **Step 2: Update `src/services/ingestion/pdf-extractor.ts`**

Same import change. Replace the body of `createBedrockPdfExtractor` (currently lines 64-76) — note this variant takes an `options?: BedrockExtractorOptions` argument; preserve that signature:

```ts
export function createBedrockPdfExtractor(
  options?: BedrockExtractorOptions,
): PdfExtractor {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })
```

Keep the rest of the function body (the `return { extract(...) { ... } }` block) exactly as it is.

- [ ] **Step 3: Update `src/services/evaluation/judge.ts`**

Same import change. Replace the body of `createBedrockFieldJudge` (currently lines 15-23):

```ts
export function createBedrockFieldJudge(model: string): FieldJudge {
  const bedrock = createAmazonBedrock({
    credentialProvider: fromNodeProviderChain(),
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })
```

Keep the rest of the function body (the `return { judge(...) { ... } }` block) exactly as it is.

- [ ] **Step 4: Run checks**

```bash
bun run check
```

Expected: pass. Existing tests don't exercise the credential provider path directly (they use mock extractors at higher levels), so no test updates are needed. TypeScript will fail if any other file still references `fromIni` from `@aws-sdk/credential-providers`; if that happens, fix the remaining usage or add it to Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/services/pdf-extractor.ts src/services/ingestion/pdf-extractor.ts src/services/evaluation/judge.ts
git commit -m "infra(bedrock): always use default AWS provider chain

The app runs on EC2 with an IAM instance profile (forms-lab-role) that
grants bedrock:InvokeModel on US foundation models and inference
profiles. Drop the AWS_BEDROCK_PROFILE / fromIni SSO branch — the default
provider chain picks up instance credentials on the server and local
\`aws sso login\` credentials on developer machines.
"
```

---

## Task 3: Stop writing `AWS_BEDROCK_PROFILE` into per-branch `.env`

**Files:**
- Modify: `infrastructure/nixos/modules/deploy.nix:143-145`

- [ ] **Step 1: Remove the `AWS_BEDROCK_PROFILE` line from the env heredoc**

Open `infrastructure/nixos/modules/deploy.nix`. Find the heredoc starting at line 135 (`cat > "$BRANCH_DIR/.env" <<ENVEOF`). The current lines 143-145 read:

```
AWS_REGION=us-east-1
AWS_BEDROCK_PROFILE=ClaudeCodeAccess-FlexionLLM
AWS_BEDROCK_REGION=us-west-2
```

Delete only the `AWS_BEDROCK_PROFILE=...` line. Final lines:

```
AWS_REGION=us-east-1
AWS_BEDROCK_REGION=us-west-2
```

Leave every other line in the heredoc unchanged.

- [ ] **Step 2: Verify the nix file still parses**

```bash
nix-instantiate --parse infrastructure/nixos/modules/deploy.nix > /dev/null && echo "OK"
```

If `nix-instantiate` isn't on your PATH, skip this step — NixOS rebuild on the server will validate it during deploy (Task 6).

- [ ] **Step 3: Commit**

```bash
git add infrastructure/nixos/modules/deploy.nix
git commit -m "infra(bedrock): stop emitting AWS_BEDROCK_PROFILE in branch env

With the services always using the default AWS provider chain, the per-
branch env no longer needs to point at the FlexionLLM SSO profile.
Keep AWS_REGION and AWS_BEDROCK_REGION; drop the SSO profile var.
"
```

---

## Task 4: Delete the `bedrock-credentials` CLI command

**Files:**
- Delete: `src/entrypoints/cli/commands/bedrock-credentials.ts`
- Modify: `src/entrypoints/cli/main.ts:1, 22-27`

- [ ] **Step 1: Remove the command registration from `main.ts`**

In `src/entrypoints/cli/main.ts`:

1. Delete the import on line 1:

```ts
import { bedrockCredentials } from './commands/bedrock-credentials'
```

2. Delete the first entry in the `commands` array (currently lines 23-27):

```ts
  {
    name: 'bedrock-credentials',
    description: 'Manage cross-account Bedrock SSO credentials',
    run: bedrockCredentials,
  },
```

Leave every other command entry intact.

- [ ] **Step 2: Delete the command source file**

```bash
git rm src/entrypoints/cli/commands/bedrock-credentials.ts
```

- [ ] **Step 3: Run checks**

```bash
bun run check
```

Expected: pass. TypeScript will flag any lingering import of `./commands/bedrock-credentials`; there should be none besides the one we just removed.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/cli/main.ts
git commit -m "infra(bedrock): retire bedrock-credentials CLI command

Cross-account SSO push is no longer needed — the app uses the EC2
instance role for Bedrock. Delete the login/push/status subcommands and
drop the registration from cli/main.ts.
"
```

---

## Task 5: Update docs — `.env.example` and `CLAUDE.md`

**Files:**
- Modify: `.env.example:7`
- Modify: `CLAUDE.md` (Quick Reference and Deployment sections)

- [ ] **Step 1: Drop `AWS_BEDROCK_PROFILE` from `.env.example`**

Open `.env.example`. Delete this line (currently line 7):

```
AWS_BEDROCK_PROFILE=ClaudeCodeAccess-FlexionLLM
```

Leave the `AWS_REGION` and `AWS_BEDROCK_REGION` lines in place.

- [ ] **Step 2: Remove the Bedrock credentials block from `CLAUDE.md`**

In `CLAUDE.md`, under the `## Deployment` section, delete the entire sub-block beginning:

```markdown
# Bedrock credentials (cross-account SSO)
bun run cli bedrock-credentials login   # Login to Flexion LLM AWS SSO
bun run cli bedrock-credentials push    # Copy SSO token to EC2 server
bun run cli bedrock-credentials status  # Check if credentials are valid
```

Remove the surrounding blank line that's left behind, if any, so the preceding block (Manual deployment) and following content flow cleanly.

- [ ] **Step 3: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "infra(bedrock): drop SSO profile from docs and example env

Reflect the instance-role approach in .env.example and CLAUDE.md.
"
```

---

## Task 6: Open PR, merge, verify deploy, clean up server state

**Files:** None in this repo — verification only.

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin infra/2026-04-16-bedrock-instance-role
gh pr create --base main \
  --title "infra(bedrock): use EC2 instance role instead of cross-account SSO" \
  --body "$(cat <<'EOF'
## Context

The forms-lab EC2 already has an IAM instance profile (forms-lab-role) with bedrock:InvokeModel on US foundation models and inference profiles. Account 165286508758 (llm-class) has Bedrock model access enabled — verified by invoking Sonnet 4, Haiku 4.5, and Opus 4.6 from us-west-2 against that account. The cross-account SSO push to a FlexionLLM profile is redundant and forces an ~8h credential refresh cadence.

## Changes

- Services always use fromNodeProviderChain (picks up instance role on EC2, local SSO creds on laptop).
- Deploy script no longer writes AWS_BEDROCK_PROFILE into per-branch .env.
- bedrock-credentials CLI command removed.
- .env.example and CLAUDE.md updated.

## Pre-flight

Ran a Bedrock invoke probe on the deployed EC2 using the instance role (no AWS_PROFILE set, fromNodeProviderChain): [record result from Task 1].

## Testing

- [ ] bun run check passes locally
- [ ] After merge + webhook deploy: ssh to EC2, verify /srv/forms-lab/main/.env has no AWS_BEDROCK_PROFILE line
- [ ] After merge + webhook deploy: trigger PDF extraction via the deployed UI, confirm success in journalctl

## Related

- Unblocks removal of /srv/forms-lab/.aws SSO cache directory (done post-merge).
EOF
)"
```

- [ ] **Step 2: Merge via GitHub UI once checks pass**

Webhook deploys to EC2 (~3 min). NixOS config changed (`deploy.nix`), so this triggers a `nixos-rebuild switch`.

- [ ] **Step 3: Verify the new env file on the server**

```bash
bun run cli infra ssh
# On host:
grep AWS /srv/forms-lab/main/.env
```

Expected output (two lines, no `AWS_BEDROCK_PROFILE`):

```
AWS_REGION=us-east-1
AWS_BEDROCK_REGION=us-west-2
```

- [ ] **Step 4: Verify the app is invoking Bedrock successfully**

Either (a) upload a PDF through the deployed site and watch extraction complete, or (b) tail the service log while triggering extraction:

```bash
journalctl -u 'forms-lab-app@main.service' -f
```

Expected: extraction returns without `AccessDeniedException` / `CredentialsProviderError`.

- [ ] **Step 5: Remove the now-unused SSO cache on the server**

On the EC2 host, as root:

```bash
rm -rf /srv/forms-lab/.aws
```

This was the target of the old `bedrock-credentials push` command. It is no longer read by anything.

- [ ] **Step 6: Confirm the FlexionLLM laptop profile is no longer needed**

The `[profile ClaudeCodeAccess-FlexionLLM]` entry in `~/.aws/config` is dead weight for this project once the PR is merged. You can delete it from your laptop's AWS config, or leave it — it does no harm. Not a commit.

---

## Rollback

If the deploy in Task 6 step 4 fails with a Bedrock credentials error:

1. Revert the merge commit on main (`git revert -m 1 <merge-sha>` or use GitHub's Revert button). The webhook will redeploy the previous state.
2. Re-add the FlexionLLM entry to `/srv/forms-lab/.aws` via `bun run cli bedrock-credentials login && bun run cli bedrock-credentials push` — but only if Task 4 has already been reverted, since the CLI command is deleted in this PR.
3. File an issue against the IAM role or Bedrock account access — the Task 1 pre-flight should have caught this, so investigate why it didn't.
