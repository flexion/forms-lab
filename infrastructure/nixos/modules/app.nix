{ config, pkgs, ... }:

{
  # Template unit for branch app services
  # Instantiated by the deploy script as forms-lab-app@<branch>.service
  systemd.services."forms-lab-app@" = {
    description = "Forms Lab App - %i";
    after = [ "network.target" ];

    serviceConfig = {
      Type = "simple";
      User = "forms-lab";
      Group = "forms-lab";
      # %i is the instance name (branch name, with / replaced by -)
      WorkingDirectory = "/srv/forms-lab/%i";
      ExecStart = "${pkgs.bun}/bin/bun run src/app/main.ts";
      Restart = "on-failure";
      RestartSec = 5;

      # Environment loaded from a per-branch env file written by deploy script
      EnvironmentFile = "/srv/forms-lab/%i/.env";
    };
  };
}
