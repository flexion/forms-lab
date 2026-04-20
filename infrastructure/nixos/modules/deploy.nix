{ config, pkgs, ... }:

let
  deployMainScript = pkgs.writeShellScriptBin "forms-lab-deploy-main" ''
    set -euo pipefail

    SHA="$1"

    echo "Starting main deployment at $SHA..."

    # Use a unique working directory per run so a stale or mis-owned
    # leftover can never wedge the next deploy.
    WORK_DIR=$(${pkgs.coreutils}/bin/mktemp -d /tmp/forms-lab-deploy.XXXXXX)
    trap '${pkgs.coreutils}/bin/rm -rf "$WORK_DIR"' EXIT

    cd "$WORK_DIR"
    ${pkgs.git}/bin/git clone https://github.com/flexion/forms-lab.git repo
    cd repo
    ${pkgs.git}/bin/git checkout "$SHA"

    # Check if nixos config changed since last deployment
    if ! ${pkgs.diffutils}/bin/diff -qr infrastructure/nixos /etc/nixos >/dev/null 2>&1; then
      echo "NixOS config changed, rebuilding..."
      /run/wrappers/bin/sudo ${pkgs.rsync}/bin/rsync -av --delete infrastructure/nixos/ /etc/nixos/
      /run/wrappers/bin/sudo ${pkgs.nixos-rebuild}/bin/nixos-rebuild switch --flake /etc/nixos#forms-lab
    else
      echo "No NixOS config changes"
    fi

    # Deploy main branch app via the standard deploy script
    ${deployScript}/bin/forms-lab-deploy main "$SHA"

    # Health check
    ${pkgs.coreutils}/bin/sleep 2
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

    mkdir -p "$DEPLOY_ROOT/repos"

    echo "Deploying $BRANCH at $SHA..."

    # --- Lockfile + stale-build recovery -----------------------------------
    # If the previous deploy process crashed (OOM, kernel panic, host reboot
    # mid-build) the worktree can be left with:
    #   - a lingering .deploy-in-progress lockfile
    #   - a partially-built dist/ directory
    # On the *next* push we treat a lockfile older than 10 minutes as proof
    # that the previous run is gone, and we wipe dist/ so the build starts
    # clean. A fresh lockfile (< 10 minutes) means another deploy is actually
    # running and we bail to avoid two processes stomping on each other.
    LOCKFILE="$BRANCH_DIR/.deploy-in-progress"
    STALE_AGE_SECONDS=600  # 10 minutes
    if [ -d "$BRANCH_DIR" ] && [ -f "$LOCKFILE" ]; then
      LOCK_MTIME=$(${pkgs.coreutils}/bin/stat -c %Y "$LOCKFILE" 2>/dev/null || echo 0)
      NOW=$(${pkgs.coreutils}/bin/date +%s)
      AGE=$((NOW - LOCK_MTIME))
      if [ "$AGE" -gt "$STALE_AGE_SECONDS" ]; then
        echo "Found stale lockfile (age $${AGE}s > $${STALE_AGE_SECONDS}s) — cleaning up partial build"
        ${pkgs.coreutils}/bin/rm -f "$LOCKFILE"
        ${pkgs.coreutils}/bin/rm -rf "$BRANCH_DIR/dist"
      else
        echo "ERROR: Fresh lockfile at $LOCKFILE (age $${AGE}s) — another deploy is in progress"
        exit 1
      fi
    fi
    # Make sure the lockfile is removed on any exit — normal, failure, signal.
    # Trap is installed AFTER the stale-check above so we don't accidentally
    # blow away a fresh lockfile belonging to a concurrent deploy that
    # already exited with code 1 before its own trap fired.
    cleanup_lockfile() {
      if [ -n "''${LOCKFILE:-}" ] && [ -f "$LOCKFILE" ]; then
        ${pkgs.coreutils}/bin/rm -f "$LOCKFILE"
      fi
    }
    trap cleanup_lockfile EXIT
    # -----------------------------------------------------------------------

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

    # Create the lockfile now that the worktree exists. Re-touch on each
    # long-running step so the mtime reflects the currently-active phase,
    # and the 10-minute stale threshold is measured from the last real
    # progress rather than from deploy start.
    ${pkgs.coreutils}/bin/touch "$LOCKFILE"

    # Install and build
    ${pkgs.bun}/bin/bun install
    ${pkgs.coreutils}/bin/touch "$LOCKFILE"

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
    ${pkgs.coreutils}/bin/touch "$LOCKFILE"

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

    # Capture the commit SHA of the deployed worktree so getBuildInfo()
    # can resolve the running commit without shelling out to git at runtime.
    # Written to a dedicated .build-info file (not the branch-app .env)
    # because the homepage service also needs BUILD_GIT_SHA but must NOT
    # inherit the branch-app's PORT or BASE_PATH.
    BUILD_GIT_SHA=$(${pkgs.git}/bin/git -C "$BRANCH_DIR" rev-parse HEAD)
    cat > "$BRANCH_DIR/.build-info" <<BUILDEOF
BUILD_GIT_SHA=$BUILD_GIT_SHA
BUILDEOF

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
ALLOWED_USERS=danielnaab,FlexionCodeReview
ALLOWED_EMAIL_DOMAINS=flexion.us
AWS_REGION=us-east-1
AWS_BEDROCK_REGION=us-west-2
CACHE_DB_PATH=/srv/forms-lab/cache.sqlite
REPOS_PATH=/srv/forms-lab/repos
ENVEOF

    # Start or restart the service (use full path to sudo wrapper with setuid bit)
    /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl restart "forms-lab-app@$UNIT_NAME.service" || \
      /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl start "forms-lab-app@$UNIT_NAME.service"

    # Reboot-safety: the forms-lab-branch-apps systemd generator reads
    # $DEPLOY_ROOT/caddy.d/ at boot time and wires every branch with a
    # Caddy route into multi-user.target. We write the Caddy file below,
    # so this branch is automatically "enabled" for the next reboot —
    # no systemctl enable needed (which wouldn't work for template
    # instances on NixOS anyway).

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

  # Branch teardown: stop + disable the app, remove the Caddy route and
  # worktree, free the port. Called by the webhook on a GitHub `delete`
  # event, and by the CLI for manual cleanup. Refuses to tear down
  # protected branches (main) as a safety rail.
  teardownScript = pkgs.writeShellScriptBin "forms-lab-teardown" ''
    set -euo pipefail

    BRANCH="$1"
    DEPLOY_ROOT="/srv/forms-lab"
    SAFE_BRANCH=$(echo "$BRANCH" | ${pkgs.coreutils}/bin/tr '/' '-')

    if [ "$SAFE_BRANCH" = "main" ] || [ -z "$SAFE_BRANCH" ]; then
      echo "ERROR: refusing to tear down protected/empty branch '$BRANCH'"
      exit 1
    fi

    BRANCH_DIR="$DEPLOY_ROOT/$SAFE_BRANCH"
    REPO_DIR="$DEPLOY_ROOT/repo.git"
    PORT_FILE="$DEPLOY_ROOT/ports.json"
    CADDY_FILE="$DEPLOY_ROOT/caddy.d/branch-$SAFE_BRANCH.caddy"
    UNIT="forms-lab-app@$SAFE_BRANCH.service"

    echo "Tearing down $BRANCH..."

    # 1. Stop the app (ignore-not-running)
    /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl stop "$UNIT" || true

    # 2. Remove the Caddy route (this also "disables" the branch for
    #    reboot-safety because the forms-lab-branch-apps generator
    #    only wires branches that have a Caddy file).
    if [ -f "$CADDY_FILE" ]; then
      ${pkgs.coreutils}/bin/rm -f "$CADDY_FILE"
      /run/wrappers/bin/sudo ${pkgs.systemd}/bin/systemctl reload caddy.service || true
    fi

    # 3. Remove the worktree (git-aware so the bare repo stays consistent)
    if [ -d "$BRANCH_DIR" ]; then
      if [ -d "$REPO_DIR" ]; then
        ${pkgs.git}/bin/git -C "$REPO_DIR" worktree remove --force "$BRANCH_DIR" 2>/dev/null || \
          ${pkgs.coreutils}/bin/rm -rf "$BRANCH_DIR"
      else
        ${pkgs.coreutils}/bin/rm -rf "$BRANCH_DIR"
      fi
    fi

    # 4. Free the port so the next deploy of this branch gets a fresh one
    if [ -f "$PORT_FILE" ]; then
      ${pkgs.jq}/bin/jq "del(.[\"$BRANCH\"])" "$PORT_FILE" > "$PORT_FILE.tmp"
      mv "$PORT_FILE.tmp" "$PORT_FILE"
    fi

    echo "Teardown complete for $BRANCH"
  '';
in
{
  environment.systemPackages = [ deployScript deployMainScript teardownScript ];

  # Make the deploy scripts available at expected paths
  system.activationScripts.deployLink = ''
    ln -sf ${deployScript}/bin/forms-lab-deploy /srv/forms-lab/deploy.sh
    ln -sf ${deployMainScript}/bin/forms-lab-deploy-main /srv/forms-lab/deploy-main.sh
    ln -sf ${teardownScript}/bin/forms-lab-teardown /srv/forms-lab/teardown.sh
  '';
}
