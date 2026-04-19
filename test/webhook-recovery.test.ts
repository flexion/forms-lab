import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  computeUnitsToStart,
  isStaleLockfile,
  listBranchUnitsFromCaddy,
  parseActiveBranchUnits,
  startInactiveBranchUnits,
} from '../src/entrypoints/webhook/recovery'

describe('listBranchUnitsFromCaddy', () => {
  let caddyDir: string

  beforeEach(async () => {
    caddyDir = await mkdtemp(join(tmpdir(), 'caddy-test-'))
  })

  afterEach(async () => {
    await rm(caddyDir, { recursive: true, force: true })
  })

  it('returns unit names for each branch-*.caddy file', async () => {
    await writeFile(join(caddyDir, 'branch-main.caddy'), '# main route')
    await writeFile(
      join(caddyDir, 'branch-experiment-74-rag.caddy'),
      '# exp route',
    )
    await writeFile(join(caddyDir, 'root.caddy'), '# root route')

    const units = await listBranchUnitsFromCaddy(caddyDir)
    expect(units.sort()).toEqual([
      'forms-lab-app@experiment-74-rag.service',
      'forms-lab-app@main.service',
    ])
  })

  it('returns empty array when no branch files exist', async () => {
    await writeFile(join(caddyDir, 'root.caddy'), '# root only')
    const units = await listBranchUnitsFromCaddy(caddyDir)
    expect(units).toEqual([])
  })

  it('returns empty array when directory does not exist', async () => {
    const units = await listBranchUnitsFromCaddy('/nonexistent-caddy-dir-xyz')
    expect(units).toEqual([])
  })

  it('ignores files that do not match the branch-*.caddy pattern', async () => {
    await writeFile(join(caddyDir, 'branch-main.caddy'), '# main')
    await writeFile(join(caddyDir, 'branch-main.caddy.bak'), '# backup')
    await writeFile(join(caddyDir, 'other.caddy'), '# other')

    const units = await listBranchUnitsFromCaddy(caddyDir)
    expect(units).toEqual(['forms-lab-app@main.service'])
  })
})

describe('parseActiveBranchUnits', () => {
  it('extracts unit names from systemctl --no-legend output', () => {
    const output = [
      'forms-lab-app@main.service              loaded active running   Forms Lab App - main',
      'forms-lab-app@experiment-73.service     loaded active running   Forms Lab App - experiment-73',
    ].join('\n')
    expect(parseActiveBranchUnits(output).sort()).toEqual([
      'forms-lab-app@experiment-73.service',
      'forms-lab-app@main.service',
    ])
  })

  it('skips blank lines and non-matching rows', () => {
    const output = [
      '',
      'forms-lab-app@main.service              loaded active running   Forms Lab App - main',
      '  ',
      'unrelated.service                       loaded active running   Something else',
    ].join('\n')
    expect(parseActiveBranchUnits(output)).toEqual([
      'forms-lab-app@main.service',
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseActiveBranchUnits('')).toEqual([])
  })
})

describe('computeUnitsToStart', () => {
  it('returns branch units that are not in the active set', () => {
    const result = computeUnitsToStart(
      [
        'forms-lab-app@main.service',
        'forms-lab-app@experiment-73.service',
        'forms-lab-app@experiment-74.service',
      ],
      ['forms-lab-app@main.service'],
    )
    expect(result.sort()).toEqual([
      'forms-lab-app@experiment-73.service',
      'forms-lab-app@experiment-74.service',
    ])
  })

  it('returns empty array when all branch units are active', () => {
    const result = computeUnitsToStart(
      ['forms-lab-app@main.service'],
      ['forms-lab-app@main.service'],
    )
    expect(result).toEqual([])
  })

  it('returns empty array when there are no branch units', () => {
    expect(computeUnitsToStart([], ['forms-lab-app@main.service'])).toEqual([])
  })
})

describe('isStaleLockfile', () => {
  it('returns true when mtime is older than threshold', () => {
    const now = Date.now()
    const elevenMinutesAgo = now - 11 * 60 * 1000
    expect(isStaleLockfile(elevenMinutesAgo, now, 10 * 60 * 1000)).toBe(true)
  })

  it('returns false when mtime is within threshold', () => {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000
    expect(isStaleLockfile(fiveMinutesAgo, now, 10 * 60 * 1000)).toBe(false)
  })

  it('returns false when mtime is exactly at threshold', () => {
    const now = Date.now()
    const exactly = now - 10 * 60 * 1000
    expect(isStaleLockfile(exactly, now, 10 * 60 * 1000)).toBe(false)
  })
})

describe('startInactiveBranchUnits', () => {
  let caddyDir: string

  beforeEach(async () => {
    caddyDir = await mkdtemp(join(tmpdir(), 'caddy-recover-'))
  })

  afterEach(async () => {
    await rm(caddyDir, { recursive: true, force: true })
  })

  it('starts units that are not in the active set', async () => {
    await writeFile(join(caddyDir, 'branch-main.caddy'), '# main')
    await writeFile(join(caddyDir, 'branch-experiment-74.caddy'), '# exp')

    const startCalls: string[] = []
    const exec = {
      listActive: async () =>
        'forms-lab-app@main.service loaded active running',
      start: async (unit: string) => {
        startCalls.push(unit)
      },
    }

    const started = await startInactiveBranchUnits({ caddyDir, exec })
    expect(started).toEqual(['forms-lab-app@experiment-74.service'])
    expect(startCalls).toEqual(['forms-lab-app@experiment-74.service'])
  })

  it('starts nothing when all branch units are active', async () => {
    await writeFile(join(caddyDir, 'branch-main.caddy'), '# main')

    const startCalls: string[] = []
    const exec = {
      listActive: async () =>
        'forms-lab-app@main.service loaded active running',
      start: async (unit: string) => {
        startCalls.push(unit)
      },
    }

    const started = await startInactiveBranchUnits({ caddyDir, exec })
    expect(started).toEqual([])
    expect(startCalls).toEqual([])
  })

  it('continues when one start fails and reports the survivors', async () => {
    await writeFile(join(caddyDir, 'branch-a.caddy'), '# a')
    await writeFile(join(caddyDir, 'branch-b.caddy'), '# b')

    const startCalls: string[] = []
    const exec = {
      listActive: async () => '',
      start: async (unit: string) => {
        startCalls.push(unit)
        if (unit === 'forms-lab-app@a.service') {
          throw new Error('mock failure for a')
        }
      },
    }

    const started = await startInactiveBranchUnits({ caddyDir, exec })
    // Both were attempted, only b succeeded.
    expect(startCalls.sort()).toEqual([
      'forms-lab-app@a.service',
      'forms-lab-app@b.service',
    ])
    expect(started).toEqual(['forms-lab-app@b.service'])
  })

  it('returns empty list when caddyDir is missing', async () => {
    const exec = {
      listActive: async () => '',
      start: async () => {
        throw new Error('should not be called')
      },
    }
    const started = await startInactiveBranchUnits({
      caddyDir: '/nonexistent-xyz',
      exec,
    })
    expect(started).toEqual([])
  })
})
