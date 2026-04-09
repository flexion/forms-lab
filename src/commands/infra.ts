import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli infra <subcommand>\n')
  console.log('Subcommands:')
  console.log('  bootstrap    Create S3 bucket for Pulumi state')
  console.log('  up           Provision/update EC2 via Pulumi')
  console.log('  outputs      Show hostname, IP, SSH command')
  console.log('  ssh          SSH into the EC2 instance')
}

async function runPulumi(args: string[]): Promise<number> {
  const proc = Bun.spawn(['pulumi', ...args], {
    cwd: pulumiDir,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  return await proc.exited
}

async function getOutput(name: string): Promise<string> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', name], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text.trim()
}

export async function infra(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'bootstrap': {
      console.log('Creating S3 bucket for Pulumi state...')
      const proc = Bun.spawn(
        [
          'aws',
          's3api',
          'create-bucket',
          '--bucket',
          'forms-lab-pulumi-state',
          '--region',
          'us-east-1',
        ],
        {
          stdio: ['inherit', 'inherit', 'inherit'],
          env: { ...process.env, AWS_PROFILE: 'llm-class' },
        },
      )
      const code = await proc.exited
      if (code === 0) {
        // Enable versioning
        const ver = Bun.spawn(
          [
            'aws',
            's3api',
            'put-bucket-versioning',
            '--bucket',
            'forms-lab-pulumi-state',
            '--versioning-configuration',
            'Status=Enabled',
          ],
          {
            stdio: ['inherit', 'inherit', 'inherit'],
            env: { ...process.env, AWS_PROFILE: 'llm-class' },
          },
        )
        await ver.exited
        console.log('S3 bucket created with versioning enabled.')
      }
      return code
    }

    case 'up':
      return runPulumi(['up', '--yes'])

    case 'outputs': {
      const exitCode = await runPulumi(['stack', 'output'])
      if (exitCode === 0) {
        const hostname = await getOutput('hostname')
        if (hostname) {
          console.log(`\nSSH: ssh root@${hostname}`)
        }
      }
      return exitCode
    }

    case 'ssh': {
      const hostname = await getOutput('hostname')
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
