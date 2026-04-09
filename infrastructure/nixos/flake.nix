{
  description = "Forms Lab EC2 NixOS configuration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, sops-nix }: {
    nixosConfigurations.forms-lab = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        sops-nix.nixosModules.sops
        ./hardware-configuration.nix
        ./configuration.nix
        ./modules/users.nix
        ./modules/caddy.nix
        ./modules/webhook.nix
        ./modules/app.nix
        ./modules/deploy.nix
        ./modules/homepage.nix
      ];
    };
  };
}
