# OAuth App Setup for EC2 Deployment

Date: 2026-04-09

## GitHub OAuth App

Created manually at https://github.com/settings/developers:

- **Application name:** Forms Lab (EC2)
- **Homepage URL:** `https://ec2-34-197-222-16.compute-1.amazonaws.com`
- **Authorization callback URL:** `https://ec2-34-197-222-16.compute-1.amazonaws.com/`
- **Client ID:** `Ov23linvAYa2FW2JWb6G`

The callback URL is set to the server root. Each branch deployment passes its own `redirect_uri` dynamically (e.g., `/story-2-authentication/auth/callback`). GitHub allows any subpath under the registered host.

## Secrets Management

OAuth credentials are managed via sops-nix:

- **Edit secrets:** `cd infrastructure/nixos && nix develop -c sops secrets.yaml`
- **Age key location (local):** `~/.config/sops/age/keys.txt` (copied from server)
- **Age key location (server):** `/var/lib/sops-nix/key.txt`
- **Secrets file:** `infrastructure/nixos/secrets.yaml`

Secrets declared in `configuration.nix`, decrypted to `/run/secrets/` on the server. The deploy script reads them and injects into each branch's `.env`.

### Keys in secrets.yaml

| Key | Purpose |
|-----|---------|
| `github-webhook-secret` | HMAC validation for GitHub webhook payloads |
| `github-client-id` | GitHub OAuth App client ID |
| `github-client-secret` | GitHub OAuth App client secret |
| `session-secret` | AES-GCM session cookie encryption key |

## Deploy Script Changes

The deploy script (`infrastructure/nixos/modules/deploy.nix`) now:

1. Reads secrets from `/run/secrets/` and writes them to each branch's `.env`
2. Sets `GITHUB_AUTHZ_REPO=flexion/forms-lab` for all branches
3. Handles force pushes correctly: fetches into bare repo ref for new worktrees, uses FETCH_HEAD for existing ones

## Testing

After setup, clicking "Sign in" on any branch deployment redirects to GitHub OAuth. Only users with write/admin access to `flexion/forms-lab` can authenticate.
