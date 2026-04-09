import { infra } from './commands/infra'
import { nixos } from './commands/nixos'
import { syncStories } from './commands/sync-stories'
import { webhook } from './commands/webhook'

export interface ParsedArgs {
  command: string
  args: string[]
}

export interface Command {
  name: string
  description: string
  run: (args: string[]) => Promise<number>
}

const commands: Command[] = [
  {
    name: 'sync-stories',
    description: 'Sync user stories from GitHub Issues',
    run: syncStories,
  },
  {
    name: 'infra',
    description: 'Manage EC2 infrastructure via Pulumi',
    run: infra,
  },
  {
    name: 'nixos',
    description: 'Manage NixOS configuration on EC2',
    run: nixos,
  },
  {
    name: 'webhook',
    description: 'GitHub webhook configuration',
    run: webhook,
  },
]

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { command: 'help', args: [] }
  }
  return { command: argv[0], args: argv.slice(1) }
}

export function getCommand(name: string): Command | undefined {
  return commands.find((c) => c.name === name)
}

function printHelp(): void {
  console.log('Usage: bun run cli <command>\n')
  console.log('Commands:')
  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`)
  }
}

// Main entry point
if (import.meta.main) {
  const { command, args } = parseArgs(process.argv.slice(2))

  if (command === 'help') {
    printHelp()
    process.exit(0)
  }

  const cmd = getCommand(command)
  if (!cmd) {
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
  }

  const exitCode = await cmd.run(args)
  process.exit(exitCode)
}
