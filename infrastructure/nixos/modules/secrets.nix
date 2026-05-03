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
