import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ActivityRow, UsageSummary } from '../../../services/activity'
import { createActivityStore } from '../../../services/activity'
import { notifyEvent } from '../../../services/notifications'

const DB_PATH = process.env.ACTIVITY_DB_PATH ?? 'data/activity.sqlite'

function getStore() {
  mkdirSync(dirname(DB_PATH), { recursive: true })
  return createActivityStore(DB_PATH)
}

export function formatSummary(summary: UsageSummary): string {
  const lines: string[] = []
  lines.push(
    `Total: ${summary.totalEvents} events | ~$${summary.estimatedCost.toFixed(2)} estimated cost`,
  )
  lines.push('')

  if (summary.byUser.length > 0) {
    lines.push('By user:')
    for (const entry of summary.byUser) {
      const tokens =
        entry.tokens > 1000
          ? `${(entry.tokens / 1000).toFixed(0)}K`
          : `${entry.tokens}`
      lines.push(
        `  ${entry.userId}: ${entry.events} events, ${tokens} tokens, ~$${entry.cost.toFixed(2)}`,
      )
    }
    lines.push('')
  }

  if (summary.byOperation.length > 0) {
    lines.push('By operation:')
    for (const entry of summary.byOperation) {
      lines.push(
        `  ${entry.operation}: ${entry.events} calls, ~$${entry.cost.toFixed(2)}`,
      )
    }
    lines.push('')
  }

  if (summary.byProject.length > 0) {
    lines.push('Top projects:')
    for (const entry of summary.byProject) {
      lines.push(
        `  ${entry.projectId}: ${entry.events} events, ~$${entry.cost.toFixed(2)}`,
      )
    }
  }

  return lines.join('\n')
}

export function formatEvents(events: ActivityRow[]): string {
  if (events.length === 0) return 'No events found.'

  const lines: string[] = []
  for (const event of events) {
    const time = new Date(event.timestamp * 1000).toISOString().slice(0, 19)
    const parts = [
      time,
      event.eventType,
      event.userId ?? '-',
      event.projectId ?? '-',
      event.operation ?? '-',
    ]
    lines.push(parts.join('\t'))
  }
  return lines.join('\n')
}

function parseNumericArg(
  args: string[],
  flag: string,
  defaultValue: number,
): number {
  const idx = args.indexOf(flag)
  if (idx !== -1 && args[idx + 1]) {
    return Number.parseInt(args[idx + 1], 10)
  }
  return defaultValue
}

function parseStringArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1]
  }
  return undefined
}

export async function activity(args: string[]): Promise<number> {
  const subcommand = args[0]

  if (!subcommand || subcommand === '--help') {
    console.log('Usage: bun run cli activity <subcommand>\n')
    console.log('Subcommands:')
    console.log('  summary     Show usage summary (default: today)')
    console.log('  events      List activity events')
    console.log('  digest      Post daily digest to Slack')
    console.log('\nOptions:')
    console.log('  --days <n>      Number of days to look back (default: 1)')
    console.log('  --user <login>  Filter by user')
    console.log('  --project <slug> Filter by project')
    console.log('  --operation <op> Filter by operation')
    console.log('  --limit <n>     Max events to show (default: 50)')
    return 0
  }

  const store = getStore()
  const now = Math.floor(Date.now() / 1000)

  if (subcommand === 'summary') {
    const days = parseNumericArg(args, '--days', 1)
    const from = now - days * 86400
    const summary = store.summarize({ from, to: now })
    console.log(
      `\nActivity Summary (last ${days} day${days > 1 ? 's' : ''}):\n`,
    )
    console.log(formatSummary(summary))
    return 0
  }

  if (subcommand === 'events') {
    const days = parseNumericArg(args, '--days', 1)
    const limit = parseNumericArg(args, '--limit', 50)
    const events = store.query({
      from: now - days * 86400,
      to: now,
      userId: parseStringArg(args, '--user'),
      projectId: parseStringArg(args, '--project'),
      operation: parseStringArg(args, '--operation'),
      limit,
    })
    console.log(formatEvents(events))
    return 0
  }

  if (subcommand === 'digest') {
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const to = Math.floor(todayMidnight.getTime() / 1000)
    const from = to - 86400

    const summary = store.summarize({ from, to })
    const dateStr = new Date(from * 1000).toISOString().slice(0, 10)

    if (summary.totalEvents === 0) {
      console.log(`No activity on ${dateStr}. Skipping digest.`)
      return 0
    }

    const details = formatSummary(summary)
    await notifyEvent({
      type: 'activity-digest',
      title: `Forms Lab Daily Usage — ${dateStr}`,
      status: 'info',
      details,
    })

    console.log(`Digest posted for ${dateStr}`)
    return 0
  }

  console.error(`Unknown subcommand: ${subcommand}`)
  return 1
}
