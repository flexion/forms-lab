{ config, pkgs, ... }:

{
  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFzeSniNbg+JvwI93ehqMNWdF1d4WWHDeY8rFHmufek0 daniel@pve"
  ];
}
