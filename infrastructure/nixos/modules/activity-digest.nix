{ config, pkgs, lib, ... }:

{
  systemd.services.forms-lab-activity-digest = {
    description = "Forms Lab Daily Activity Digest";
    after = [ "forms-lab-notify.service" ];
    requires = [ "forms-lab-notify.service" ];

    path = with pkgs; [ bun ];

    serviceConfig = {
      Type = "oneshot";
      User = "forms-lab";
      Group = "forms-lab";
      WorkingDirectory = "/srv/forms-lab/main";
    };

    script = ''
      export ACTIVITY_DB_PATH="/srv/forms-lab/data/activity.sqlite"
      exec ${pkgs.bun}/bin/bun run src/entrypoints/cli/main.ts activity digest
    '';
  };

  systemd.timers.forms-lab-activity-digest = {
    description = "Daily Forms Lab Activity Digest";
    wantedBy = [ "timers.target" ];

    timerConfig = {
      OnCalendar = "*-*-* 06:00:00";
      Persistent = true;
    };
  };
}
