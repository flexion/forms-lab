{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-notify = {
    description = "Forms Lab Notification Service";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    path = with pkgs; [ bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab";
      Restart = "on-failure";
      RestartSec = 5;
    };

    script = ''
      export SLACK_WEBHOOK_URL=$(cat ${config.sops.secrets.slack-webhook-url.path})
      export PORT=9001
      exec ${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint notify /srv/forms-lab/main
    '';
  };
}
