import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../../../infrastructure/pulumi')

function printUsage(): void {
  console.log('Usage: bun run cli nixos <subcommand> [--stack <name>] [options]\n')
  console.log('Subcommands:')
  console.log(
    '  apply [--from-branch <name>] [--arm]  Apply NixOS config via SSH',
  )
  console.log(
    '  status                        Show running services and health',
  )
  console.log(
    '  logs <service> [--follow]     Show logs for a service (e.g., app@story-3-pdf-upload)',
  )
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

async function getHostname(stackArgs: string[]): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname', ...stackArgs], {
    cwd: pulumiDir,
    stdout: 'pipe',
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}

async function sshExec(hostname: string, command: string): Promise<number> {
  const proc = Bun.spawn(
    ['ssh', '-o', 'StrictHostKeyChecking=no', `root@${hostname}`, command],
    { stdio: ['inherit', 'inherit', 'inherit'] },
  )
  return await proc.exited
}

async function sshOutput(
  hostname: string,
  command: string,
): Promise<{ code: number; stdout: string }> {
  const proc = Bun.spawn(
    ['ssh', '-o', 'StrictHostKeyChecking=no', `root@${hostname}`, command],
    { stdout: 'pipe', stderr: 'inherit' },
  )
  const stdout = await new Response(proc.stdout).text()
  const code = await proc.exited
  return { code, stdout }
}

const CORE_SERVICES = [
  'forms-lab-homepage',
  'forms-lab-webhook',
  'forms-lab-notify',
  'forms-lab-app@main.service',
]

async function smokeTestServices(hostname: string): Promise<boolean> {
  console.log('\nRunning post-rebuild smoke test...')
  const maxWait = 30
  const interval = 2

  for (let elapsed = 0; elapsed < maxWait; elapsed += interval) {
    const { stdout } = await sshOutput(
      hostname,
      CORE_SERVICES.map(
        (s) => `systemctl is-active '${s}' 2>/dev/null || echo failed`,
      ).join(' && '),
    )

    const results = stdout.trim().split('\n')
    const allActive = results.every((r) => r.trim() === 'active')
    if (allActive) {
      console.log(
        `All ${CORE_SERVICES.length} core services active after ${elapsed}s.`,
      )
      return true
    }

    if (elapsed + interval < maxWait) {
      await Bun.sleep(interval * 1000)
    }
  }

  console.error(`\nSMOKE TEST FAILED after ${maxWait}s. Failing services:`)
  for (const svc of CORE_SERVICES) {
    const { stdout } = await sshOutput(
      hostname,
      `systemctl is-active '${svc}' 2>/dev/null`,
    )
    if (stdout.trim() !== 'active') {
      console.error(`\n  ${svc}: ${stdout.trim()}`)
      const { stdout: status } = await sshOutput(
        hostname,
        `systemctl status '${svc}' --no-pager 2>&1 | head -15`,
      )
      console.error(status)
    }
  }
  console.error(
    '\nSee notes/runbooks/nixos-path-migration.md for recovery steps.',
  )
  return false
}

export async function nixos(args: string[]): Promise<number> {
  const subcommand = args[0]
  const stackArgs = getStackArgs(args)

  switch (subcommand) {
    case 'apply': {
      const hostname = await getHostname(stackArgs)
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }

      let branch = 'main'
      const branchIdx = args.indexOf('--from-branch')
      if (branchIdx !== -1 && args[branchIdx + 1]) {
        branch = args[branchIdx + 1]
      }

      const safeBranch = branch.replace(/\//g, '-')
      const worktree = `/srv/forms-lab/${safeBranch}`

      const isArm = args.includes('--arm')
      const flakeTarget = isArm ? 'forms-lab-arm' : 'forms-lab'

      console.log(`Applying NixOS config (${flakeTarget}) from ${worktree} on ${hostname}...`)

      const rebuildCode = await sshExec(
        hostname,
        [
          `git config --global --add safe.directory ${worktree} 2>/dev/null || true`,
          `cd ${worktree}`,
          `nixos-rebuild switch --flake ./infrastructure/nixos#${flakeTarget}`,
        ].join(' && '),
      )

      if (rebuildCode !== 0) {
        console.error(`nixos-rebuild failed with exit code ${rebuildCode}`)
        return rebuildCode
      }

      console.log('NixOS rebuild succeeded.')

      const healthy = await smokeTestServices(hostname)
      return healthy ? 0 : 1
    }

    case 'status': {
      const hostname = await getHostname(stackArgs)
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      const proc = Bun.spawn(
        [
          'ssh',
          '-o',
          'StrictHostKeyChecking=no',
          `root@${hostname}`,
          'systemctl',
          'list-units',
          'forms-lab-*',
          '--no-pager',
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    case 'logs': {
      const hostname = await getHostname(stackArgs)
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }
      const service = args[1]
      if (!service) {
        console.error('Usage: bun run cli nixos logs <service> [--follow]')
        console.error('Examples:')
        console.error('  bun run cli nixos logs app@story-3-pdf-upload')
        console.error('  bun run cli nixos logs app@main --follow')
        console.error('  bun run cli nixos logs webhook --follow')
        return 1
      }
      const unitName = service.startsWith('forms-lab-')
        ? `${service}.service`
        : `forms-lab-${service}.service`
      const follow = args.includes('--follow') || args.includes('-f')
      const journalArgs = [
        'journalctl',
        '-u',
        unitName,
        '--no-pager',
        ...(follow ? ['-f'] : ['-n', '100']),
      ]
      const proc = Bun.spawn(
        [
          'ssh',
          '-o',
          'StrictHostKeyChecking=no',
          `root@${hostname}`,
          ...journalArgs,
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
