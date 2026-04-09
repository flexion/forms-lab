import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli deploy <subcommand>\n')
  console.log('Subcommands:')
  console.log('  homepage     Update and restart the homepage service')
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

export async function deploy(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'homepage': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        console.error('Make sure infrastructure is provisioned with: bun run cli infra up')
        return 1
      }

      console.log(`Deploying homepage to ${hostname}...`)

      // SSH to the server and run deployment commands as forms-lab user
      const sshCommands = [
        'cd /srv/forms-lab/main',
        'git fetch origin',
        'git reset --hard origin/main',
        'bun install',
        'bun run build',
        'sudo systemctl restart forms-lab-homepage.service',
        'sleep 2',
        'systemctl status forms-lab-homepage.service --no-pager',
      ].join(' && ')

      const proc = Bun.spawn(
        ['ssh', `root@${hostname}`, `su - forms-lab -c '${sshCommands}'`],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )

      const exitCode = await proc.exited

      if (exitCode === 0) {
        console.log('\n✓ Homepage deployed successfully')
        console.log(`Visit: https://${hostname}/`)
      } else {
        console.error('\n✗ Homepage deployment failed')
      }

      return exitCode
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
