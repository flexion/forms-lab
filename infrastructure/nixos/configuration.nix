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
  ];

  # Service user
  users.users.forms-lab = {
    isSystemUser = true;
    group = "forms-lab";
    home = "/srv/forms-lab";
    shell = pkgs.bash;
  };
  users.groups.forms-lab = {};

  # sops-nix for secrets
  sops = {
    defaultSopsFile = ./secrets.yaml;
    age.keyFile = "/var/lib/sops-nix/key.txt";
    secrets.github-webhook-secret = {
      owner = "forms-lab";
    };
  };

  # Allow forms-lab user to manage its own services and reload Caddy
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
      command = "${pkgs.systemd}/bin/systemctl reload caddy.service";
      options = [ "NOPASSWD" ];
    }];
  }];
}
