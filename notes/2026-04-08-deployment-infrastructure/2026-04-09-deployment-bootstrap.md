# Deployment Infrastructure Bootstrap - 2026-04-09

## Session Goals

Complete the deployment infrastructure setup for GitHub issue #1:
1. Provision EC2 instance with NixOS
2. Configure sops-nix secrets for webhook
3. Apply NixOS configuration to server
4. Set up GitHub webhook
5. Test end-to-end deployment flow

## Progress Log

### Infrastructure Provisioned

**Pulumi Setup**
- Installed Pulumi 3.230.0 to ~/.pulumi/bin/
- Added pulumi to flake.nix for future dev environments
- Logged into Pulumi Cloud (dnaab-flexion-us)
- Initialized prod stack
- Switched from S3 backend to Pulumi Cloud (S3 bucket creation requires IAM permissions not available)

**AMI Resolution**
- Initial attempts to query NixOS AMIs failed due to missing ec2:DescribeImages IAM permission
- Found NixOS AMI ID via web scraping https://nixos.github.io/amis/images.json
- Selected ami-0d1f1bc132c528d59 (NixOS 25.11.8107 x86_64, created 2026-03-29)
- Updated flake.nix to use nixos-25.11 branch (was 24.11)
- Updated system.stateVersion to 25.11

**EC2 Instance Details**
- Instance ID: i-0e280e8b8ea636137
- Public IP: 34.197.222.16
- Hostname: ec2-34-197-222-16.compute-1.amazonaws.com
- SSH verified: NixOS 25.11 (Xantusia) running
- Security group: SSH (22), HTTP (80), HTTPS (443)
- Elastic IP attached

**Commits**
- 8c4f1c9 - fix: use NixOS 25.11 AMI and update configuration

### Secrets Configuration Complete

**Age Key Generation**
- Generated age key on server at /var/lib/sops-nix/key.txt
- Public key: age1u7jjhjuhj9nuzdxygdjrv80z6xvea7pq73jezpqm2xl4s6ty2ajstyyfth

**Webhook Secret**
- Generated random 256-bit secret: 0ef6fa9d7fd550a83d5754cd62d7d6510a7ae41aee6060c5c59d0b0a232c5569
- Encrypted with sops using age public key
- Committed to infrastructure/nixos/secrets.yaml (encrypted)

**Hardware Configuration**
- Created hardware-configuration.nix importing amazon-image.nix module
- Handles EC2-specific boot loader, filesystem, and networking settings

**Commits**
- ae8a5c4 - chore: add encrypted secrets file for sops-nix

### NixOS Configuration Application Complete

Successfully applied NixOS configuration to server using IP address (34.197.222.16) to avoid SSH control socket path length issue.

**Services Status**
- Caddy: Running successfully on ports 80/443 with auto-HTTPS
- Webhook service: Failing (expected - needs main branch deployed first)
- App template units: Created, ready for per-branch instances
- Firewall: Configured for SSH (22), HTTP (80), HTTPS (443)
- Sops-nix: Working, secrets decrypted

**Issues Encountered**
- Long hostname caused SSH control socket path to exceed Unix socket limit - resolved by using IP address
- Deploy script symlink failed (missing /srv/forms-lab directory) - minor issue, deploy script accessible via nix store
- Webhook service failing because /srv/forms-lab/main/src/webhook/main.ts doesn't exist yet - will resolve after first deploy

**Commits**
- Hardware configuration added
- Flake.nix updated with hardware module

### Next Steps

1. Test manual deploy of main branch to initialize repository
2. Start webhook service after first deploy
3. Configure GitHub webhook 
4. Test automatic deployment via webhook

## Issues Encountered

- AWS IAM role lacks S3 bucket creation permission - resolved by using Pulumi Cloud
- AWS IAM role lacks ec2:DescribeImages permission - resolved by hardcoding AMI ID from public source
- NixOS 24.11 AMIs not available in us-east-1 - resolved by using 25.11

## Next Session

Continue with sops-nix setup and NixOS configuration application.
