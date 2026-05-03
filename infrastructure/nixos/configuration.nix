{ config, pkgs, ... }:

{
  # Basic system configuration
  system.stateVersion = "25.11";

  # Packages available system-wide
  environment.systemPackages = with pkgs; [
    git
    bun
    curl
    jq
    awscli2
  ];

  # Firewall
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ 22 80 443 ];
  };

  # Enable SSH
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = "prohibit-password";
      PasswordAuthentication = false;
    };
  };

  # Timezone
  time.timeZone = "UTC";

  # Create the forms-lab service directory and Caddy routes directory
  systemd.tmpfiles.rules = [
    "d /srv/forms-lab 0755 forms-lab forms-lab -"
    "d /srv/forms-lab/caddy.d 0755 forms-lab forms-lab -"
    # Create root route for homepage service (port 3000)
    "f /srv/forms-lab/caddy.d/root.caddy 0644 forms-lab forms-lab - # Route for homepage (port 3000)\nhandle /* {\n  reverse_proxy localhost:3000\n}\n"
  ];

  # Service user
  users.users.forms-lab = {
    isSystemUser = true;
    group = "forms-lab";
    home = "/srv/forms-lab";
    shell = pkgs.bash;
  };
  users.groups.forms-lab = {};

  # Hostname — update after pulumi up provides the EC2 public DNS
  flexion.hostname = "ec2-54-198-178-196.compute-1.amazonaws.com";

  # Allow forms-lab user to manage its own services, reload Caddy, and
  # apply NixOS config changes that arrive via the webhook-driven main deploy.
  security.sudo.extraRules = [{
    users = [ "forms-lab" ];
    commands = [{
      command = "${pkgs.systemd}/bin/systemctl restart forms-lab-app@*";
      options = [ "NOPASSWD" ];
    } {
      command = "${pkgs.systemd}/bin/systemctl start forms-lab-app@*";
      options = [ "NOPASSWD" ];
    } {
      command = "${pkgs.systemd}/bin/systemctl stop forms-lab-app@*";
      options = [ "NOPASSWD" ];
    } {
      command = "${pkgs.systemd}/bin/systemctl restart forms-lab-homepage.service";
      options = [ "NOPASSWD" ];
    } {
      command = "${pkgs.systemd}/bin/systemctl reload caddy.service";
      options = [ "NOPASSWD" ];
    } {
      command = "${pkgs.rsync}/bin/rsync -av --delete infrastructure/nixos/ /etc/nixos/";
      options = [ "NOPASSWD" ];
    } {
      # Use a wildcard for the flake target because `#` is a comment
      # character in sudoers and would otherwise truncate the rule.
      command = "${pkgs.nixos-rebuild}/bin/nixos-rebuild switch --flake /etc/nixos*";
      options = [ "NOPASSWD" ];
    }];
  }];
}
