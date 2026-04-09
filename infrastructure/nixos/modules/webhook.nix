{ config, pkgs, ... }:

{
  systemd.services.forms-lab-webhook = {
    description = "Forms Lab GitHub Webhook Listener";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
    };

    # sops-nix decrypts the secret to a file containing the raw value.
    # script sets ExecStart to a wrapper that reads the secret into an env var.
    script = ''
      export GITHUB_WEBHOOK_SECRET=$(cat ${config.sops.secrets.github-webhook-secret.path})
      export PORT=9000
      export DEPLOY_SCRIPT=/srv/forms-lab/deploy.sh
      exec ${pkgs.bun}/bin/bun run /srv/forms-lab/main/src/webhook/main.ts
    '';
  };
}
