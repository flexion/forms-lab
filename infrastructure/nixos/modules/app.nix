{ config, pkgs, ... }:

{
  # Template unit for branch app services
  # Instantiated by the deploy script as forms-lab-app@<branch>.service
  systemd.services."forms-lab-app@" = {
    description = "Forms Lab App - %i";
    after = [ "network.target" ];
    onFailure = [ "forms-lab-notify-failure@%n.service" ];

    path = [ pkgs.git ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      # %i is the instance name (branch name, with / replaced by -)
      WorkingDirectory = "/srv/forms-lab/%i";
      ExecStart = "${config.flexion.entrypointWrapper}/bin/forms-lab-entrypoint app /srv/forms-lab/%i";
      Restart = "on-failure";
      RestartSec = 5;

      # Flap control: if the unit fails 5 times within 5 minutes, stop
      # retrying and leave it in a failed state instead of burning CPU.
      # systemd interprets these at the [Unit]/[Service] level — NixOS
      # exposes them via startLimit* keys on the service attrset.

      # Environment loaded from a per-branch env file written by deploy script
      EnvironmentFile = "/srv/forms-lab/%i/.env";
    };

    # Flap control — prevents a broken branch from retrying forever.
    startLimitBurst = 5;
    startLimitIntervalSec = 300;
  };
}
