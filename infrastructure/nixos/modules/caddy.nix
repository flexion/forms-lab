{ config, pkgs, ... }:

{
  services.caddy = {
    enable = true;
    # Global config — auto-HTTPS using the EC2 public hostname
    # The hostname is determined at deploy time and written to /srv/forms-lab/hostname
    globalConfig = ''
      auto_https disable_redirects
    '';

    # Base Caddyfile — webhook route is always present
    # Branch routes are added dynamically by the deploy script
    # via Caddy's admin API
    extraConfig = ''
      :443 {
        # The deploy script configures route blocks via admin API
        # This is the fallback
        respond "Forms Lab — no branch deployed at this path" 404
      }

      :80 {
        redir https://{host}{uri} permanent
      }
    '';
  };

  # Ensure Caddy admin API is enabled (default: localhost:2019)
  # The deploy script uses it to update routes atomically
}
