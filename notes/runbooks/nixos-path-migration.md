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
