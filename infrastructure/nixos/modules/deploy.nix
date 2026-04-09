{ config, pkgs, ... }:

let
  deployScript = pkgs.writeShellScriptBin "forms-lab-deploy" ''
    set -euo pipefail

    BRANCH="$1"
    SHA="$2"
    REPO_DIR="/srv/forms-lab/repo.git"
    DEPLOY_ROOT="/srv/forms-lab"
    BRANCH_DIR="$DEPLOY_ROOT/$BRANCH"
    PORT_FILE="$DEPLOY_ROOT/ports.json"

    echo "Deploying $BRANCH at $SHA..."

    # Initialize bare repo if needed
    if [ ! -d "$REPO_DIR" ]; then
      ${pkgs.git}/bin/git clone --bare https://github.com/flexion/forms-lab.git "$REPO_DIR"
    fi

    # Fetch latest (fetch specific branch to avoid conflicts with checked-out worktrees)
    ${pkgs.git}/bin/git -C "$REPO_DIR" fetch origin "+refs/heads/$BRANCH:refs/heads/$BRANCH"

    # Create or update worktree
    if [ ! -d "$BRANCH_DIR" ]; then
      echo "Creating worktree for $BRANCH..."
      ${pkgs.git}/bin/git -C "$REPO_DIR" worktree add "$BRANCH_DIR" "$BRANCH"
    else
      echo "Updating worktree for $BRANCH..."
      cd "$BRANCH_DIR"
      ${pkgs.git}/bin/git fetch origin "+refs/heads/$BRANCH:refs/heads/$BRANCH"
      ${pkgs.git}/bin/git reset --hard "$BRANCH"
    fi

    cd "$BRANCH_DIR"

    # Install and build
    ${pkgs.bun}/bin/bun install
    ${pkgs.bun}/bin/bun run build

    # Assign port — read from ports.json or assign next available
    if [ ! -f "$PORT_FILE" ]; then
      echo '{}' > "$PORT_FILE"
    fi

    # Sanitize branch name for systemd (replace / with -)
    UNIT_NAME=$(echo "$BRANCH" | tr '/' '-')

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
    cat > "$BRANCH_DIR/.env" <<ENVEOF
    PORT=$PORT
    BASE_PATH=/$UNIT_NAME/
    ENVEOF

    # Start or restart the service
    systemctl restart "forms-lab-app@$UNIT_NAME.service" || \
      systemctl start "forms-lab-app@$UNIT_NAME.service"

    # Update Caddy config via admin API
    ${pkgs.curl}/bin/curl -s -X POST http://localhost:2019/config/apps/http/servers/srv0/routes \
      -H "Content-Type: application/json" \
      -d "{
        \"@id\": \"branch-$UNIT_NAME\",
        \"match\": [{\"path\": [\"/$UNIT_NAME/*\"]}],
        \"handle\": [{
          \"handler\": \"reverse_proxy\",
          \"upstreams\": [{\"dial\": \"localhost:$PORT\"}]
        }]
      }" || echo "Warning: Caddy config update may need manual adjustment"

    echo "Deployed $BRANCH at port $PORT (/$UNIT_NAME/)"
  '';
in
{
  environment.systemPackages = [ deployScript ];

  # Make the deploy script available at the expected path
  system.activationScripts.deployLink = ''
    ln -sf ${deployScript}/bin/forms-lab-deploy /srv/forms-lab/deploy.sh
  '';
}
