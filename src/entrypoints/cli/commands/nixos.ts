import { resolve } from 'node:path'

const nixosDir = resolve(import.meta.dir, '../../../../infrastructure/nixos')
const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli nixos <subcommand>\n')
  console.log('Subcommands:')
  console.log('  apply        Push NixOS config to EC2 instance')
  console.log('  status       Show running services and health')
}

async function getHostname(): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname'], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}

export async function nixos(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'apply': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      console.log(`Applying NixOS config to ${hostname}...`)
      const proc = Bun.spawn(
        [
          'nixos-rebuild',
          'switch',
          '--flake',
          `${nixosDir}#forms-lab`,
          '--target-host',
          `root@${hostname}`,
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    case 'status': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      const proc = Bun.spawn(
        ['ssh', `root@${hostname}`, 'systemctl', 'list-units', 'forms-lab-*'],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
