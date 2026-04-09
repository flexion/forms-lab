{ config, lib, pkgs, modulesPath, ... }:

{
  imports = [
    (modulesPath + "/virtualisation/amazon-image.nix")
  ];

  # EC2 instance settings (amazon-image.nix provides most EC2-specific config)
  ec2.hvm = true;
}
