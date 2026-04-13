{ config, pkgs, ... }:

let
  deployMainScript = pkgs.writeShellScriptBin "forms-lab-deploy-main" ''
    set -euo pipefail

    SHA="$1"

    echo "Starting main deployment at $SHA..."

    # Use a unique working directory per run so a stale or mis-owned
    # leftover can never wedge the next deploy.
    WORK_DIR=$(${pkgs.coreutils}/bin/mktemp -d /tmp/forms-lab-deploy.XXXXXX)
    trap 'rm -rf "$WORK_DIR"' EXIT

    cd "$WORK_DIR"
    ${pkgs.git}/bin/git clone https://github.com/flexion/forms-lab.git repo
    cd repo
    ${pkgs.git}/bin/git checkout "$SHA"

    # Check if nixos config changed since last deployment
    if ! ${pkgs.diffutils}/bin/diff -qr infrastructure/nixos /etc/nixos >/dev/null 2>&1; then
      echo "NixOS config changed, rebuilding..."
      ${pkgs.rsync}/bin/rsync -av infrastructure/nixos/ /etc/nixos/
      /run/wrappers/bin/sudo nixos-rebuild switch --flake /etc/nixos#forms-lab
    else
      echo "No NixOS config changes"
    fi

    # Deploy main branch app via the standard deploy script
    forms-lab-deploy main "$SHA"

    # Health check
    sleep 2
    ${pkgs.curl}/bin/curl -f http://localhost:3000/health || exit 1

    echo "Main deployment complete"
  '';

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
AWS_BEDROCK_PROFILE=ClaudeCodeAccess-FlexionLLM
AWS_BEDROCK_REGION=us-west-2
CACHE_DB_PATH=/srv/forms-lab/cache.sqlite
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

    # Run smoke checks if the script exists
    if [ -f "$BRANCH_DIR/scripts/smoke-check.ts" ]; then
      echo "Running smoke checks..."
      # Wait for the service to be ready
      for i in $(seq 1 10); do
        if ${pkgs.curl}/bin/curl -sf "http://localhost:$PORT/$UNIT_NAME/health" > /dev/null 2>&1; then
          break
        fi
        sleep 1
      done
      # Source .env so smoke check sees AWS_REGION etc.
      set -a; source "$BRANCH_DIR/.env"; set +a
      BASE_URL="http://localhost:$PORT/$UNIT_NAME" ${pkgs.bun}/bin/bun run "$BRANCH_DIR/scripts/smoke-check.ts" || \
        echo "WARNING: Smoke checks failed — deployment may be misconfigured"
    fi

    # If deploying main branch, also update the homepage service
    if [ "$BRANCH" = "main" ]; then
      echo "Updating homepage service..."
      /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl restart forms-lab-homepage.service
      echo "Homepage service restarted"
    fi
  '';
in
{
  environment.systemPackages = [ deployScript deployMainScript ];

  # Make the deploy scripts available at expected paths
  system.activationScripts.deployLink = ''
    ln -sf ${deployScript}/bin/forms-lab-deploy /srv/forms-lab/deploy.sh
    ln -sf ${deployMainScript}/bin/forms-lab-deploy-main /srv/forms-lab/deploy-main.sh
  '';
}
