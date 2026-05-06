{
  description = "Forms Lab EC2 NixOS configuration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
  let
    # Default is aarch64 (prod-marketing Graviton); x86 variant available
    mkSystem = system: nixpkgs.lib.nixosSystem {
      inherit system;
      modules = [
        ./hardware-configuration.nix
        ./configuration.nix
        ./modules/users.nix
        ./modules/caddy.nix
        ./modules/webhook.nix
        ./modules/app.nix
        ./modules/deploy.nix
        ./modules/entrypoint-wrapper.nix
        ./modules/homepage.nix
        ./modules/notify.nix
        ./modules/notify-failure.nix
        ./modules/activity-digest.nix
        ./modules/secrets.nix
      ];
    };
  in {
    nixosConfigurations.forms-lab = mkSystem "aarch64-linux";
    nixosConfigurations.forms-lab-x86 = mkSystem "x86_64-linux";
  };
}
