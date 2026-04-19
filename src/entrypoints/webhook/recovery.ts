/**
 * Recovery for inactive branch apps after a webhook restart (including reboot).
 *
 * Motivation: 2026-04-19 incident where a force-stop/start of the EC2 box
 * left every `forms-lab-app@<branch>.service` instance dead until an operator
 * manually ran `systemctl start`. The NixOS-side fix (enabling each instance
 * on deploy) addresses future branches; this module addresses the webhook's
 * own startup so it can cross-check Caddy routes against active units and
 * start any that are missing — belt-and-braces for the reboot path.
 *
 * Design:
 * - Pure helpers take strings / arrays, have no I/O, are trivially tested.
 * - The one I/O orchestrator (`startInactiveBranchUnits`) takes an injectable
 *   `exec` object so tests never actually call systemctl.
 */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const BRANCH_FILE_PATTERN = /^branch-(.+)\.caddy$/

/**
 * List systemd unit names implied by the branch-*.caddy files in `caddyDir`.
 * Returns e.g. `['forms-lab-app@main.service', 'forms-lab-app@experiment-74.service']`.
 * Returns `[]` when the directory is missing or contains no branch files.
 */
export async function listBranchUnitsFromCaddy(
  caddyDir: string,
): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(caddyDir)
  } catch {
    return []
  }

  const units: string[] = []
  for (const entry of entries) {
    const match = entry.match(BRANCH_FILE_PATTERN)
    if (!match) continue
    units.push(`forms-lab-app@${match[1]}.service`)
  }
  return units
}

/**
 * Parse `systemctl list-units 'forms-lab-app@*' --no-legend` output into
 * a list of unit names. Accepts the plain-whitespace output format.
 */
export function parseActiveBranchUnits(output: string): string[] {
  const units: string[] = []
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const firstToken = trimmed.split(/\s+/)[0]
    if (
      firstToken.startsWith('forms-lab-app@') &&
      firstToken.endsWith('.service')
    ) {
      units.push(firstToken)
    }
  }
  return units
}

/**
 * Given the list of branch units known from Caddy and the list of currently
 * active units from systemd, return the units that need to be started.
 */
export function computeUnitsToStart(
  branchUnits: string[],
  activeUnits: string[],
): string[] {
  const active = new Set(activeUnits)
  return branchUnits.filter((u) => !active.has(u))
}

/**
 * True if the lockfile mtime is strictly older than `maxAgeMs` relative to `now`.
 * Used to expire stale `.deploy-in-progress` lockfiles left behind by a
 * crashed deploy run. The boundary case (mtime == now - maxAgeMs) is NOT stale.
 */
export function isStaleLockfile(
  mtimeMs: number,
  nowMs: number,
  maxAgeMs: number,
): boolean {
  return nowMs - mtimeMs > maxAgeMs
}

/**
 * Stat a lockfile and decide whether it is stale. Returns null if the
 * file does not exist.
 */
export async function lockfileMtimeMs(path: string): Promise<number | null> {
  try {
    const s = await stat(path)
    return s.mtimeMs
  } catch {
    return null
  }
}

/**
 * I/O-boundary executor. Tests inject a fake; production wires this to
 * actual systemctl calls.
 */
export interface RecoveryExec {
  /** Runs the equivalent of `systemctl list-units 'forms-lab-app@*' --state=active --no-legend` and returns stdout. */
  listActive: () => Promise<string>
  /** Runs the equivalent of `sudo systemctl start <unit>`. Throws on failure. */
  start: (unit: string) => Promise<void>
}

export interface StartInactiveOptions {
  caddyDir: string
  exec: RecoveryExec
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
}

/**
 * Scan caddy.d for known branches, check which aren't active, start the
 * missing ones. Returns the list that was successfully started. Never throws.
 */
export async function startInactiveBranchUnits(
  options: StartInactiveOptions,
): Promise<string[]> {
  const { caddyDir, exec, logger = console } = options

  const branchUnits = await listBranchUnitsFromCaddy(caddyDir)
  if (branchUnits.length === 0) return []

  let activeOutput = ''
  try {
    activeOutput = await exec.listActive()
  } catch (err) {
    logger.warn('Recovery: failed to list active units:', err)
    return []
  }

  const activeUnits = parseActiveBranchUnits(activeOutput)
  const toStart = computeUnitsToStart(branchUnits, activeUnits)

  const started: string[] = []
  for (const unit of toStart) {
    try {
      await exec.start(unit)
      started.push(unit)
      logger.log(`Recovery: started ${unit}`)
    } catch (err) {
      logger.error(`Recovery: failed to start ${unit}:`, err)
    }
  }
  return started
}

/**
 * Default exec implementation that shells out to systemctl. Only used in
 * production; tests should provide their own.
 */
export function createSystemctlExec(): RecoveryExec {
  return {
    listActive: async () => {
      const proc = Bun.spawn(
        [
          'systemctl',
          'list-units',
          'forms-lab-app@*',
          '--state=active',
          '--no-legend',
          '--no-pager',
        ],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      const stdout = await new Response(proc.stdout).text()
      await proc.exited
      return stdout
    },
    start: async (unit: string) => {
      const proc = Bun.spawn(
        ['/run/wrappers/bin/sudo', 'systemctl', 'start', unit],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      const stderr = await new Response(proc.stderr).text()
      const exitCode = await proc.exited
      if (exitCode !== 0) {
        throw new Error(`systemctl start ${unit} failed: ${stderr}`)
      }
    },
  }
}
