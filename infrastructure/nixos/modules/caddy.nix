{ config, pkgs, ... }:

{
  services.caddy = {
    enable = true;
    # Global config — disable automatic HTTP→HTTPS redirects to use manual redirect below
    # Caddy will still provision TLS certs using the EC2 public hostname
    globalConfig = ''
      auto_https disable_redirects
    '';

    # Base Caddyfile — webhook route is always present
    # Branch routes are added dynamically by the deploy script
    # via Caddy's admin API
    extraConfig = ''
      :443 {
        # Webhook listener on port 9000
        handle /.webhook* {
          reverse_proxy localhost:9000
        }

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
