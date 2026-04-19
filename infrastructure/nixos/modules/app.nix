{ config, pkgs, ... }:

let
  # Systemd generator: at boot time, before multi-user.target resolves,
  # look at /srv/forms-lab/caddy.d/branch-*.caddy and for each branch
  # write a symlink in /run/systemd/system/multi-user.target.wants/ that
  # points at the branch's template instance. This is how you give a
  # dynamic set of template instances an [Install] relationship on
  # NixOS — you can't write to /etc/systemd/system/multi-user.target.wants/
  # (read-only, NixOS-managed) and `systemctl enable` on a template
  # instance fails because the instance unit file doesn't exist.
  #
  # /run is tmpfs and writable, so this runs cleanly on every boot.
  branchAppGenerator = pkgs.writeShellScript "forms-lab-branch-app-generator" ''
    set -euo pipefail

    # systemd passes three target directories; we want the second
    # ("early" per `man systemd.generator` — generators may place
    # generated units there, which systemd treats as equivalent to
    # /etc/systemd/system).
    EARLY_DIR="''${2:-}"
    [ -z "$EARLY_DIR" ] && exit 0

    CADDY_DIR=/srv/forms-lab/caddy.d
    [ -d "$CADDY_DIR" ] || exit 0

    WANTS_DIR="$EARLY_DIR/multi-user.target.wants"
    mkdir -p "$WANTS_DIR"

    # Unit file lives in the nix store; the bare template unit is the
    # target for every per-branch instance symlink.
    TEMPLATE_UNIT=/etc/systemd/system/forms-lab-app@.service

    for caddy_file in "$CADDY_DIR"/branch-*.caddy; do
      [ -f "$caddy_file" ] || continue
      base=$(${pkgs.coreutils}/bin/basename "$caddy_file" .caddy)
      branch=''${base#branch-}
      [ -z "$branch" ] && continue

      # Systemd interprets a symlink named foo@bar.service inside a
      # .wants/ directory as "want instance bar of template foo@.service".
      ${pkgs.coreutils}/bin/ln -sf "$TEMPLATE_UNIT" "$WANTS_DIR/forms-lab-app@$branch.service"
    done
  '';
in
{
  # Install the generator by bundling it in a systemd.packages entry.
  # systemd.packages adds a derivation's lib/systemd/ tree to the unit
  # search path, including its system-generators/ subdir. We can't use
  # environment.etc because /etc/systemd/system-generators/ collides
  # with NixOS's stock systemd setup (read-only path conflict).
  systemd.packages = [
    (pkgs.runCommand "forms-lab-branch-apps-generator" { } ''
      install -D -m 0755 ${branchAppGenerator} \
        $out/lib/systemd/system-generators/forms-lab-branch-apps
    '')
  ];

  # Template unit for branch app services
  # Instantiated by the deploy script as forms-lab-app@<branch>.service
  systemd.services."forms-lab-app@" = {
    description = "Forms Lab App - %i";
    after = [ "network.target" ];
    onFailure = [ "forms-lab-notify-failure@%n.service" ];

    # Note: we intentionally do NOT set `wantedBy = [ "multi-user.target" ]`
    # on this bare template. NixOS would interpret that as creating a
    # useless `forms-lab-app@multi-user.service` instance on every
    # rebuild. Reboot-safety is instead provided by the generator above:
    # it reads /srv/forms-lab/caddy.d/branch-*.caddy at boot and wants
    # each instance that has a Caddy route.

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

      # Environment loaded from per-branch files written by deploy script.
      # .env holds branch-app config (PORT, BASE_PATH, secrets, AWS); the
      # dedicated .build-info file holds BUILD_GIT_SHA only so the homepage
      # service can inherit BUILD_GIT_SHA without picking up branch-app PORT.
      EnvironmentFile = [
        "/srv/forms-lab/%i/.env"
        "-/srv/forms-lab/%i/.build-info"
      ];
    };

    # Flap control — prevents a broken branch from retrying forever.
    startLimitBurst = 5;
    startLimitIntervalSec = 300;
  };
}
