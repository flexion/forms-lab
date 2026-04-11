{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-webhook = {
    description = "Forms Lab GitHub Webhook Listener";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    path = with pkgs; [ git openssh bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
      OnFailure = "forms-lab-notify-failure@%n.service";
    };

    # sops-nix decrypts the secret to a file containing the raw value.
    # script sets ExecStart to a wrapper that reads the secret into an env var.
    script = ''
      export GITHUB_WEBHOOK_SECRET=$(cat ${config.sops.secrets.github-webhook-secret.path})
      export GITHUB_TOKEN=$(cat ${config.sops.secrets.github-token.path})
      export DEPLOY_HOSTNAME=ec2-34-197-222-16.compute-1.amazonaws.com
      export PORT=9000
      export DEPLOY_SCRIPT=/srv/forms-lab/deploy.sh
      exec ${pkgs.bun}/bin/bun run /srv/forms-lab/main/src/webhook/main.ts
    '';
  };
}
