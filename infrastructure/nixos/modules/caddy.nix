{ config, pkgs, lib, ... }:

{
  options.flexion.hostname = lib.mkOption {
    type = lib.types.str;
    description = "Public hostname for the Forms Lab instance";
  };

  options.flexion.tlsMode = lib.mkOption {
    type = lib.types.enum [ "internal" "acme" ];
    default = "internal";
    description = "TLS mode: 'internal' for self-signed, 'acme' for Let's Encrypt";
  };

  config = {
    services.caddy = {
      enable = true;
      globalConfig = ''
        auto_https disable_redirects
      '';

      extraConfig = ''
        ${config.flexion.hostname} {
          ${if config.flexion.tlsMode == "internal" then "tls internal" else ""}

          handle /.webhook* {
            uri strip_prefix /.webhook
            reverse_proxy localhost:9000
          }

          handle /git/* {
            root * /srv/forms-lab/repos
            uri strip_prefix /git
            file_server browse
          }

          import /srv/forms-lab/caddy.d/branch-*.caddy
          import /srv/forms-lab/caddy.d/root.caddy

          respond "Forms Lab — no branch deployed at this path" 404
        }

        :80 {
          redir https://{host}{uri} permanent
        }
      '';
    };
  };
}
