{ config, pkgs, ... }:

let
  notifyFailureScript = pkgs.writeShellScriptBin "forms-lab-notify-failure" ''
    UNIT="$1"
    ${pkgs.curl}/bin/curl -s -X POST http://localhost:9001/event \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"service.crashed\",\"title\":\"Service $UNIT crashed\",\"status\":\"failure\",\"details\":\"Systemd unit $UNIT entered failed state\"}" \
      || true
  '';
in
{
  environment.systemPackages = [ notifyFailureScript ];

  # Template unit triggered by OnFailure= in other services
  systemd.services."forms-lab-notify-failure@" = {
    description = "Notify on failure of %i";
    serviceConfig = {
      Type = "oneshot";
      User = "forms-lab";
      Group = "forms-lab";
      ExecStart = "${notifyFailureScript}/bin/forms-lab-notify-failure %i";
    };
  };
}
