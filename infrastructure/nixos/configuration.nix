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

  # Create the forms-lab service directory
  systemd.tmpfiles.rules = [
    "d /srv/forms-lab 0755 forms-lab forms-lab -"
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
}
