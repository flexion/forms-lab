{ config, pkgs, ... }:

let
  deployScript = pkgs.writeShellScriptBin "forms-lab-deploy" ''
    set -euo pipefail

    BRANCH="$1"
    SHA="$2"
    REPO_DIR="/srv/forms-lab/repo.git"
    DEPLOY_ROOT="/srv/forms-lab"
    # Sanitize branch name for filesystem (replace / with -)
    SAFE_BRANCH=$(echo "$BRANCH" | tr '/' '-')
    BRANCH_DIR="$DEPLOY_ROOT/$SAFE_BRANCH"
    PORT_FILE="$DEPLOY_ROOT/ports.json"

    echo "Deploying $BRANCH at $SHA..."

    # Initialize bare repo if needed
    if [ ! -d "$REPO_DIR" ]; then
      ${pkgs.git}/bin/git clone --bare https://github.com/flexion/forms-lab.git "$REPO_DIR"
      # Configure the bare repo to fetch all branches
      ${pkgs.git}/bin/git -C "$REPO_DIR" config remote.origin.fetch "+refs/heads/*:refs/heads/*"
      ${pkgs.git}/bin/git -C "$REPO_DIR" fetch origin
    fi

    # Create or update worktree
    if [ ! -d "$BRANCH_DIR" ]; then
      echo "Creating worktree for $BRANCH..."
      # Fetch into the bare repo's branch ref so worktree add gets the latest
      # (--force handles force pushes where the local ref is stale)
      # Use full refs/heads/ path to avoid ambiguity with slashes in branch names
      ${pkgs.git}/bin/git -C "$REPO_DIR" fetch origin "+refs/heads/$BRANCH:refs/heads/$BRANCH" --force
      ${pkgs.git}/bin/git -C "$REPO_DIR" worktree add "$BRANCH_DIR" "refs/heads/$BRANCH"
    else
      echo "Updating worktree for $BRANCH..."
      cd "$BRANCH_DIR"
      # Fetch directly in the worktree — can't update the bare repo ref while
      # the branch is checked out, so use FETCH_HEAD + reset instead
      ${pkgs.git}/bin/git fetch origin "$BRANCH"
      ${pkgs.git}/bin/git reset --hard FETCH_HEAD
    fi

    cd "$BRANCH_DIR"

    # Install and build
    ${pkgs.bun}/bin/bun install
    ${pkgs.bun}/bin/bun run build

    # Assign port — read from ports.json or assign next available
    if [ ! -f "$PORT_FILE" ]; then
      echo '{}' > "$PORT_FILE"
    fi

    # Use sanitized branch name for systemd unit
    UNIT_NAME="$SAFE_BRANCH"

    PORT=$(${pkgs.jq}/bin/jq -r ".[\"$BRANCH\"] // empty" "$PORT_FILE")
    if [ -z "$PORT" ]; then
      # Find next available port starting from 3001
      HIGHEST=$(${pkgs.jq}/bin/jq -r '[.[] | tonumber] | max // 3000' "$PORT_FILE")
      PORT=$((HIGHEST + 1))
      ${pkgs.jq}/bin/jq ". + {\"$BRANCH\": $PORT}" "$PORT_FILE" > "$PORT_FILE.tmp"
      mv "$PORT_FILE.tmp" "$PORT_FILE"
      echo "Assigned port $PORT to $BRANCH"
    fi

    # Write per-branch env file
    # All branches serve at /<branch>/
    # OAuth secrets are read from sops-nix managed files in /run/secrets/
    cat > "$BRANCH_DIR/.env" <<ENVEOF
PORT=$PORT
BASE_PATH=/$UNIT_NAME/
GITHUB_CLIENT_ID=$(cat /run/secrets/github-client-id 2>/dev/null || echo "")
GITHUB_CLIENT_SECRET=$(cat /run/secrets/github-client-secret 2>/dev/null || echo "")
SESSION_SECRET=$(cat /run/secrets/session-secret 2>/dev/null || echo "")
GITHUB_AUTHZ_ORG=flexion
AWS_REGION=us-east-1
ENVEOF

    # Start or restart the service (use full path to sudo wrapper with setuid bit)
    /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl restart "forms-lab-app@$UNIT_NAME.service" || \
      /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl start "forms-lab-app@$UNIT_NAME.service"

    # Write Caddy route snippet to persistent config directory
    CADDY_DIR="$DEPLOY_ROOT/caddy.d"
    mkdir -p "$CADDY_DIR"

    # All branches handle /<branch>/*
    cat > "$CADDY_DIR/branch-$UNIT_NAME.caddy" <<CADDYEOF
# Route for branch: $BRANCH (port $PORT)
handle /$UNIT_NAME* {
  reverse_proxy localhost:$PORT
}
CADDYEOF

    # Reload Caddy to pick up the new route
    /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl reload caddy.service

    echo "Deployed $BRANCH at port $PORT (/$UNIT_NAME/)"

    # If deploying main branch, also update the homepage service
    if [ "$BRANCH" = "main" ]; then
      echo "Updating homepage service..."
      /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl restart forms-lab-homepage.service
      echo "Homepage service restarted"
    fi
  '';
in
{
  environment.systemPackages = [ deployScript ];

  # Make the deploy script available at the expected path
  system.activationScripts.deployLink = ''
    ln -sf ${deployScript}/bin/forms-lab-deploy /srv/forms-lab/deploy.sh
  '';
}
