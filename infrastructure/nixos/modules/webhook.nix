{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-webhook = {
    description = "Forms Lab GitHub Webhook Listener";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];
    onFailure = [ "forms-lab-notify-failure@%n.service" ];

    path = with pkgs; [ git openssh bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
    };

    script = ''
      export DEPLOY_HOSTNAME=${config.flexion.hostname}
      export PORT=9000
      export DEPLOY_SCRIPT=/srv/forms-lab/deploy.sh
      exec ${config.flexion.fetchSecrets}/bin/forms-lab-fetch-secrets \
        github-webhook-secret github-token \
        -- ${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint webhook /srv/forms-lab/main
    '';
  };
}
