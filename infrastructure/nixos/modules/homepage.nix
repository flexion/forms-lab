{ config, pkgs, ... }:

{
  # Homepage service - deployment dashboard at root
  systemd.services.forms-lab-homepage = {
    description = "Forms Lab Homepage - Deployment Dashboard";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];
    onFailure = [ "forms-lab-notify-failure@%n.service" ];

    path = with pkgs; [ bun ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab/main";
      Restart = "on-failure";
      RestartSec = 5;
      Environment = [
        "PORT=3000"
      ];
      ExecStart = "${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint dashboard /srv/forms-lab/main";
    };
  };
}
