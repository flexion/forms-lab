import type { Command } from '../../forms'
import type { CaseMetrics, EvaluationKind, SummaryMetrics } from '../types'

export interface ShapingOutput {
  commands: Command[]
  explanation: string
}

export interface ShapingGroundTruth {
  intent: string
  expectedCommands: Command[]
}

/**
 * Compare argument values for two commands of the same kind.
 * Returns the fraction of non-kind arguments that match exactly.
 */
function argumentAccuracy(output: Command, expected: Command): number {
  const outputEntries = Object.entries(output).filter(([k]) => k !== 'kind')
  const expectedEntries = Object.entries(expected).filter(([k]) => k !== 'kind')

  if (expectedEntries.length === 0) return 1

  let matches = 0
  for (const [key, value] of expectedEntries) {
    const outputValue = outputEntries.find(([k]) => k === key)?.[1]
    if (JSON.stringify(outputValue) === JSON.stringify(value)) {
      matches++
    }
  }

  return matches / expectedEntries.length
}

/**
 * Shaping commands evaluation kind.
 *
 * Scores a shaping variant's command output against expected commands:
 * - **Kind recall**: fraction of expected command kinds that appear in output
 * - **Kind precision**: fraction of output command kinds that match expected
 * - **Argument accuracy**: for matched commands, average fraction of arguments
 *   that match expected values
 */
export const shapingCommandsKind: EvaluationKind<
  ShapingOutput,
  ShapingGroundTruth
> = {
  id: 'shaping-commands',
  description:
    'Scores shaping variants on command-kind precision/recall and argument accuracy against scripted intents',

  async score(
    output: ShapingOutput,
    groundTruth: ShapingGroundTruth,
  ): Promise<CaseMetrics> {
    const outputKinds = output.commands.map((c) => c.kind)
    const expectedKinds = groundTruth.expectedCommands.map((c) => c.kind)

    // Handle both-empty case
    if (expectedKinds.length === 0 && outputKinds.length === 0) {
      return {
        fixture: '',
        metrics: { kindRecall: 1, kindPrecision: 1, argumentAccuracy: 1 },
        details: { matchedKinds: [], missingKinds: [], extraKinds: [] },
      }
    }

    // Match output commands to expected commands by kind (greedy, first-match)
    const matchedExpected = new Set<number>()
    const matchedOutput = new Set<number>()
    const matchPairs: Array<{ outputIdx: number; expectedIdx: number }> = []

    for (let oi = 0; oi < output.commands.length; oi++) {
      for (let ei = 0; ei < groundTruth.expectedCommands.length; ei++) {
        if (matchedExpected.has(ei)) continue
        if (
          output.commands[oi].kind === groundTruth.expectedCommands[ei].kind
        ) {
          matchedExpected.add(ei)
          matchedOutput.add(oi)
          matchPairs.push({ outputIdx: oi, expectedIdx: ei })
          break
        }
      }
    }

    // Kind recall: fraction of expected kinds found in output
    const kindRecall =
      expectedKinds.length > 0 ? matchedExpected.size / expectedKinds.length : 1

    // Kind precision: fraction of output kinds that match expected
    const kindPrecision =
      outputKinds.length > 0 ? matchedOutput.size / outputKinds.length : 1

    // Argument accuracy: average across matched pairs
    let argAccuracy: number
    if (matchPairs.length === 0) {
      argAccuracy = 0
    } else {
      let totalArgAcc = 0
      for (const { outputIdx, expectedIdx } of matchPairs) {
        totalArgAcc += argumentAccuracy(
          output.commands[outputIdx],
          groundTruth.expectedCommands[expectedIdx],
        )
      }
      argAccuracy = totalArgAcc / matchPairs.length
    }

    // Build detail lists
    const matchedKinds = matchPairs.map(
      ({ expectedIdx }) => groundTruth.expectedCommands[expectedIdx].kind,
    )
    const missingKinds = groundTruth.expectedCommands
      .filter((_, i) => !matchedExpected.has(i))
      .map((c) => c.kind)
    const extraKinds = output.commands
      .filter((_, i) => !matchedOutput.has(i))
      .map((c) => c.kind)

    return {
      fixture: '',
      metrics: {
        kindRecall,
        kindPrecision,
        argumentAccuracy: argAccuracy,
      },
      details: { matchedKinds, missingKinds, extraKinds },
    }
  },

  summarize(cases: CaseMetrics[]): SummaryMetrics {
    if (cases.length === 0) {
      return { metrics: {} }
    }

    const metricKeys = new Set<string>()
    for (const c of cases) {
      for (const key of Object.keys(c.metrics)) {
        metricKeys.add(key)
      }
    }

    const metrics: Record<string, number> = {}
    for (const key of metricKeys) {
      let sum = 0
      let count = 0
      for (const c of cases) {
        if (key in c.metrics) {
          sum += c.metrics[key]
          count++
        }
      }
      metrics[key] = count > 0 ? sum / count : 0
    }

    return { metrics }
  },
}
