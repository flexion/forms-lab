import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli infra <subcommand> [--stack <name>]\n')
  console.log('Subcommands:')
  console.log('  up           Provision/update EC2 via Pulumi')
  console.log('  outputs      Show hostname, IP, SSH command')
  console.log('  ssh          SSH into the EC2 instance')
  console.log('\nOptions:')
  console.log('  --stack <name>  Pulumi stack (default: current stack)')
}

function getStackArgs(args: string[]): string[] {
  const stackIdx = args.indexOf('--stack')
  if (stackIdx !== -1 && args[stackIdx + 1]) {
    return ['--stack', args[stackIdx + 1]]
  }
  return []
}

async function runPulumi(args: string[]): Promise<number> {
  const proc = Bun.spawn(['pulumi', ...args], {
    cwd: pulumiDir,
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  return await proc.exited
}

async function getOutput(name: string, stackArgs: string[]): Promise<string> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', name, ...stackArgs], {
    cwd: pulumiDir,
    stdout: 'pipe',
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text.trim()
}

export async function infra(args: string[]): Promise<number> {
  const subcommand = args[0]
  const stackArgs = getStackArgs(args)

  switch (subcommand) {
    case 'up':
      return runPulumi(['up', '--yes', ...stackArgs])

    case 'outputs': {
      const exitCode = await runPulumi(['stack', 'output', ...stackArgs])
      if (exitCode === 0) {
        const hostname = await getOutput('hostname', stackArgs)
        if (hostname) {
          console.log(`\nSSH: ssh root@${hostname}`)
        }
      }
      return exitCode
    }

    case 'ssh': {
      const hostname = await getOutput('hostname', stackArgs)
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      console.log(`Connecting to ${hostname}...`)
      const proc = Bun.spawn(['ssh', `root@${hostname}`], {
        stdio: ['inherit', 'inherit', 'inherit'],
      })
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
