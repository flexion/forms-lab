import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log(
    'Usage: bun run cli webhook <subcommand> [--stack <name>]\n',
  )
  console.log('Subcommands:')
  console.log(
    '  setup        Show GitHub webhook configuration guide',
  )
  console.log('\nOptions:')
  console.log(
    '  --stack <name>  Pulumi stack (default: current stack)',
  )
}

function getStackArgs(args: string[]): string[] {
  const stackIdx = args.indexOf('--stack')
  if (stackIdx !== -1 && args[stackIdx + 1]) {
    return ['--stack', args[stackIdx + 1]]
  }
  return []
}

export async function webhook(args: string[]): Promise<number> {
  const subcommand = args[0]
  const stackArgs = getStackArgs(args)

  switch (subcommand) {
    case 'setup': {
      let hostname = '<hostname>'
      try {
        const proc = Bun.spawn(
          [
            'pulumi',
            'stack',
            'output',
            'hostname',
            ...stackArgs,
          ],
          {
            cwd: pulumiDir,
            stdout: 'pipe',
          },
        )
        const text = await new Response(proc.stdout).text()
        if ((await proc.exited) === 0 && text.trim()) {
          hostname = text.trim()
        }
      } catch {
        // Pulumi not available — show placeholder
      }

      console.log('GitHub Webhook Configuration')
      console.log('============================\n')
      console.log(
        'Go to: https://github.com/flexion/forms-lab/settings/hooks/new\n',
      )
      console.log(`  Payload URL:    https://${hostname}/.webhook`)
      console.log('  Content type:   application/json')
      console.log(
        '  Secret:         (from AWS Secrets Manager: forms-lab/github-webhook-secret)',
      )
      console.log('  Events:         Just the push event')
      console.log('  Active:         ✓\n')
      console.log(
        'After creating the webhook, push to main to trigger the first deploy.',
      )
      return 0
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
