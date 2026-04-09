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
    # Branch routes are imported from /srv/forms-lab/caddy.d/*.caddy
    extraConfig = ''
      ec2-34-197-222-16.compute-1.amazonaws.com {
        # Use self-signed certificate (Let's Encrypt won't issue for .compute.amazonaws.com)
        tls internal

        # Webhook listener on port 9000
        handle /.webhook* {
          uri strip_prefix /.webhook
          reverse_proxy localhost:9000
        }

        # Import branch-specific routes from deploy script
        import /srv/forms-lab/caddy.d/*.caddy

        # Fallback for unmatched paths
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
