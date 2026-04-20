import { describe, expect, it } from 'bun:test'
import type {
  Command,
  FormShaper,
  ProjectState,
} from '../../../src/services/forms'
import { withValidationRetry } from '../../../src/services/forms/shaping/retry'
import type {
  ShapingRequest,
  ShapingResult,
} from '../../../src/services/forms/shaping/types'

function fixture(): ProjectState {
  return {
    dataSpec: {
      id: 'ds1',
      title: 'T',
      description: '',
      groups: [
        {
          id: 'g1',
          title: 'G1',
          requirements: [
            {
              id: 'f1',
              fieldName: 'name',
              label: 'Name',
              fieldType: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    formSpec: {
      id: 'form1',
      specId: 'ds1',
      title: 'F',
      pages: [{ id: 'p1', title: 'P', groups: ['g1'] }],
    },
  }
}

function fakeShaper(scripted: Array<Command[] | Error>): {
  shaper: FormShaper
  calls: ShapingRequest[]
} {
  const calls: ShapingRequest[] = []
  let idx = 0
  const shaper: FormShaper = {
    async shape(request: ShapingRequest): Promise<ShapingResult> {
      calls.push(request)
      const step = scripted[idx++]
      if (step instanceof Error) throw step
      return { commands: step, explanation: 'ok' }
    },
  }
  return { shaper, calls }
}

describe('withValidationRetry', () => {
  it('returns the inner result unchanged when it validates on the first try', async () => {
    const { shaper, calls } = fakeShaper([
      [{ kind: 'renamePage', id: 'p1', title: 'New' }],
    ])
    const wrapped = withValidationRetry(shaper)
    const result = await wrapped.shape({ intent: 'rename', state: fixture() })
    expect(result.commands).toHaveLength(1)
    expect(calls.length).toBe(1)
  })

  it('retries once with previousAttempt populated when the first batch is invalid', async () => {
    const { shaper, calls } = fakeShaper([
      [{ kind: 'renamePage', id: 'nope', title: 'X' }],
      [{ kind: 'renamePage', id: 'p1', title: 'X' }],
    ])
    const wrapped = withValidationRetry(shaper)
    const result = await wrapped.shape({ intent: 'rename', state: fixture() })
    expect(result.commands).toHaveLength(1)
    expect(calls.length).toBe(2)
    expect(calls[1].previousAttempt).toBeDefined()
    expect(calls[1].previousAttempt?.commands).toEqual([
      { kind: 'renamePage', id: 'nope', title: 'X' },
    ])
    expect(calls[1].previousAttempt?.feedback).toContain('nope')
    expect(calls[1].previousAttempt?.feedback).toContain('p1')
  })

  it('throws after exhausting retries', async () => {
    const { shaper, calls } = fakeShaper([
      [{ kind: 'renamePage', id: 'nope', title: 'X' }],
      [{ kind: 'renamePage', id: 'still-nope', title: 'Y' }],
    ])
    const wrapped = withValidationRetry(shaper, { maxRetries: 1 })
    await expect(
      wrapped.shape({ intent: 'rename', state: fixture() }),
    ).rejects.toThrow(/invalid command sequence/i)
    expect(calls.length).toBe(2)
  })

  it('passes a client-supplied previousAttempt through on the first call', async () => {
    const { shaper, calls } = fakeShaper([
      [{ kind: 'renamePage', id: 'p1', title: 'ok' }],
    ])
    const wrapped = withValidationRetry(shaper)
    await wrapped.shape({
      intent: 'rename',
      state: fixture(),
      previousAttempt: {
        commands: [{ kind: 'swapPages', a: 'p1', b: 'nope' }],
        feedback: 'user said swap was wrong',
      },
    })
    expect(calls[0].previousAttempt?.feedback).toBe('user said swap was wrong')
  })

  it('propagates errors thrown by the inner shaper without retrying', async () => {
    const boom = new Error('bedrock exploded')
    const { shaper, calls } = fakeShaper([boom])
    const wrapped = withValidationRetry(shaper)
    await expect(
      wrapped.shape({ intent: 'rename', state: fixture() }),
    ).rejects.toThrow('bedrock exploded')
    expect(calls.length).toBe(1)
  })
})
