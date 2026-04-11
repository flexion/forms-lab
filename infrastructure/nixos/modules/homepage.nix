{ config, pkgs, ... }:

{
  # Homepage service - deployment dashboard at root
  systemd.services.forms-lab-homepage = {
    description = "Forms Lab Homepage - Deployment Dashboard";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

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
      ExecStart = "${pkgs.bun}/bin/bun run src/homepage/main.ts";
    };
  };
}
