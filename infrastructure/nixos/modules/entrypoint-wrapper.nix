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
