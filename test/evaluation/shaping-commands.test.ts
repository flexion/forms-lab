import { describe, expect, it } from 'bun:test'
import type { Command } from '../../src/services/forms/shaping/commands'
import {
  type ShapingGroundTruth,
  type ShapingOutput,
  shapingCommandsKind,
} from '../../src/services/evaluation/kinds/shaping-commands'

describe('shaping-commands evaluation kind', () => {
  it('has correct id and description', () => {
    expect(shapingCommandsKind.id).toBe('shaping-commands')
    expect(shapingCommandsKind.description).toBeTruthy()
  })

  describe('score', () => {
    it('returns perfect scores for exact match', async () => {
      const commands: Command[] = [
        { kind: 'swapPages', a: 'page-2', b: 'page-3' },
      ]
      const output: ShapingOutput = {
        commands,
        explanation: 'Swapped pages.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Swap pages 2 and 3',
        expectedCommands: commands,
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      expect(result.metrics.kindRecall).toBe(1)
      expect(result.metrics.kindPrecision).toBe(1)
      expect(result.metrics.argumentAccuracy).toBe(1)
    })

    it('reports zero recall when output is empty', async () => {
      const output: ShapingOutput = {
        commands: [],
        explanation: 'Nothing done.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Swap pages 2 and 3',
        expectedCommands: [{ kind: 'swapPages', a: 'page-2', b: 'page-3' }],
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      expect(result.metrics.kindRecall).toBe(0)
      expect(result.metrics.kindPrecision).toBe(1) // 0 output, 0 wrong => vacuously 1
      expect(result.metrics.argumentAccuracy).toBe(0)
    })

    it('reports zero precision when output has extra commands', async () => {
      const output: ShapingOutput = {
        commands: [
          { kind: 'swapPages', a: 'page-2', b: 'page-3' },
          { kind: 'renamePage', id: 'page-1', title: 'Foo' },
        ],
        explanation: 'Swapped and renamed.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Swap pages 2 and 3',
        expectedCommands: [{ kind: 'swapPages', a: 'page-2', b: 'page-3' }],
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      expect(result.metrics.kindRecall).toBe(1)
      expect(result.metrics.kindPrecision).toBe(0.5)
      expect(result.metrics.argumentAccuracy).toBe(1)
    })

    it('calculates partial argument accuracy for matching kinds', async () => {
      const output: ShapingOutput = {
        commands: [{ kind: 'swapPages', a: 'page-1', b: 'page-3' }],
        explanation: 'Swapped wrong pages.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Swap pages 2 and 3',
        expectedCommands: [{ kind: 'swapPages', a: 'page-2', b: 'page-3' }],
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      expect(result.metrics.kindRecall).toBe(1)
      expect(result.metrics.kindPrecision).toBe(1)
      // 'a' is wrong, 'b' is correct => 0.5
      expect(result.metrics.argumentAccuracy).toBe(0.5)
    })

    it('handles multiple commands with partial kind overlap', async () => {
      const output: ShapingOutput = {
        commands: [
          { kind: 'swapPages', a: 'page-2', b: 'page-3' },
          { kind: 'addPage', title: 'New page' },
        ],
        explanation: 'Did some things.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Swap and merge',
        expectedCommands: [
          { kind: 'swapPages', a: 'page-2', b: 'page-3' },
          { kind: 'mergePages', intoId: 'page-1', fromId: 'page-2' },
        ],
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      // swapPages found, mergePages not found => 1/2
      expect(result.metrics.kindRecall).toBe(0.5)
      // swapPages matches, addPage does not => 1/2
      expect(result.metrics.kindPrecision).toBe(0.5)
      // only swapPages matched, and its args are correct
      expect(result.metrics.argumentAccuracy).toBe(1)
    })

    it('handles both empty output and empty expected', async () => {
      const output: ShapingOutput = {
        commands: [],
        explanation: 'Nothing.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Do nothing',
        expectedCommands: [],
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      expect(result.metrics.kindRecall).toBe(1)
      expect(result.metrics.kindPrecision).toBe(1)
      expect(result.metrics.argumentAccuracy).toBe(1)
    })

    it('exposes matched and unmatched details', async () => {
      const output: ShapingOutput = {
        commands: [
          { kind: 'swapPages', a: 'page-2', b: 'page-3' },
          { kind: 'addPage', title: 'Extra' },
        ],
        explanation: 'Mixed.',
      }
      const groundTruth: ShapingGroundTruth = {
        intent: 'Swap pages',
        expectedCommands: [{ kind: 'swapPages', a: 'page-2', b: 'page-3' }],
      }

      const result = await shapingCommandsKind.score(output, groundTruth)
      expect(result.details.matchedKinds).toEqual(['swapPages'])
      expect(result.details.missingKinds).toEqual([])
      expect(result.details.extraKinds).toEqual(['addPage'])
    })
  })

  describe('summarize', () => {
    it('averages metrics across cases', () => {
      const cases = [
        {
          fixture: 'case-1',
          metrics: { kindRecall: 1, kindPrecision: 0.5, argumentAccuracy: 1 },
          details: {},
        },
        {
          fixture: 'case-2',
          metrics: { kindRecall: 0.5, kindPrecision: 1, argumentAccuracy: 0.5 },
          details: {},
        },
      ]

      const summary = shapingCommandsKind.summarize(cases)
      expect(summary.metrics.kindRecall).toBe(0.75)
      expect(summary.metrics.kindPrecision).toBe(0.75)
      expect(summary.metrics.argumentAccuracy).toBe(0.75)
    })

    it('returns empty metrics for empty input', () => {
      const summary = shapingCommandsKind.summarize([])
      expect(summary.metrics).toEqual({})
    })
  })
})
