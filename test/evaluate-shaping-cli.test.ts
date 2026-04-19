import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluate } from '../src/entrypoints/cli/commands/evaluate'
import { evaluationRunSchema } from '../src/services/evaluation/schemas'
import type { Command } from '../src/services/forms/shaping/commands'
import type {
  FormShaper,
  ShapingRequest,
  ShapingResult,
} from '../src/services/forms/shaping/types'
import { StrategyRegistry } from '../src/services/strategy-registry'

type ShapeFn = (request: ShapingRequest) => Promise<ShapingResult>

function buildMockRegistry(
  variantId: string,
  shape: ShapeFn,
): StrategyRegistry<FormShaper> {
  const registry = new StrategyRegistry<FormShaper>()
  registry.register({
    id: variantId,
    metadata: {
      name: `Mock ${variantId}`,
      description: 'Mock shaper for tests',
      status: 'experimental',
      courseTopics: ['evaluation', 'model-selection'],
      catalogPath: `/catalog/experiments/shaping-model-comparison/${variantId}`,
      modelId: 'mock-model-id',
    },
    create: () => ({ shape }),
  })
  return registry
}

describe('evaluate shaping CLI subcommand', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shaping-eval-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns exit code 1 for unknown variant', async () => {
    const registry = buildMockRegistry('bedrock-sonnet', async () => ({
      commands: [],
      explanation: '',
    }))

    const exitCode = await evaluate(
      ['shaping', 'nonexistent-variant', '--out-dir', tempDir],
      { shapingRegistry: registry },
    )

    expect(exitCode).toBe(1)
  })

  it('returns exit code 1 when no variant id is provided', async () => {
    const exitCode = await evaluate(['shaping'])

    expect(exitCode).toBe(1)
  })

  it('writes JSON and markdown with six cases when all intents succeed', async () => {
    const expectedCommandByIntentId: Record<string, Command[]> = {
      'swap-pages': [{ kind: 'swapPages', a: 'page-2', b: 'page-3' }],
      'merge-employment': [
        { kind: 'mergePages', intoId: 'page-2', fromId: 'page-3' },
      ],
      'optional-middle-name': [
        { kind: 'setRequired', id: 'middleName', required: false },
      ],
      'move-military': [
        {
          kind: 'moveGroup',
          groupId: 'military-service',
          toPageId: 'page-4',
        },
      ],
      'rename-personal-info': [
        { kind: 'renamePage', id: 'page-1', title: 'Applicant Information' },
      ],
      'suggest-delivery-modes': [
        { kind: 'setDeliveryMode', pageId: 'page-1', mode: 'static' },
        { kind: 'setDeliveryMode', pageId: 'page-2', mode: 'static' },
        { kind: 'setDeliveryMode', pageId: 'page-3', mode: 'static' },
        {
          kind: 'setDeliveryMode',
          pageId: 'page-4',
          mode: 'conversational',
        },
        { kind: 'setDeliveryMode', pageId: 'page-5', mode: 'static' },
      ],
    }

    const { shapingIntentFixtures } = await import(
      '../src/services/evaluation/fixtures/shaping-intents'
    )

    const shape: ShapeFn = async (request) => {
      const fixture = shapingIntentFixtures.find(
        (f) => f.intent === request.intent,
      )
      if (!fixture) throw new Error(`Unexpected intent: ${request.intent}`)
      return {
        commands: expectedCommandByIntentId[fixture.id],
        explanation: `Mocked response for ${fixture.id}`,
      }
    }

    const registry = buildMockRegistry('bedrock-mock', shape)

    const exitCode = await evaluate(
      ['shaping', 'bedrock-mock', '--out-dir', tempDir],
      { shapingRegistry: registry },
    )

    expect(exitCode).toBe(0)

    const jsonPath = join(tempDir, 'bedrock-mock.json')
    const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    const parsed = evaluationRunSchema.safeParse(raw)
    expect(parsed.success).toBe(true)

    expect(raw.kind).toBe('shaping-commands')
    expect(raw.implementation).toBe('bedrock-mock')
    expect(raw.cases).toHaveLength(6)
    expect(raw.summary.kindRecall).toBe(1)
    expect(raw.summary.kindPrecision).toBe(1)
    expect(raw.summary.argumentAccuracy).toBe(1)
    const caseFixtures = raw.cases.map((c: { fixture: string }) => c.fixture)
    expect(caseFixtures).toContain('swap-pages')
    expect(caseFixtures).toContain('suggest-delivery-modes')

    const mdPath = join(tempDir, 'mock.md')
    const md = readFileSync(mdPath, 'utf-8')
    expect(md).toContain('## Summary')
    expect(md).toContain('Command-Kind Recall')
    expect(md).toContain('100.0%')
  })

  it('records a zero-metric case when shape() throws', async () => {
    const { shapingIntentFixtures } = await import(
      '../src/services/evaluation/fixtures/shaping-intents'
    )

    const shape: ShapeFn = async (request) => {
      if (request.intent.startsWith('Swap')) {
        throw new Error('LLM produced invalid command sequence')
      }
      const fixture = shapingIntentFixtures.find(
        (f) => f.intent === request.intent,
      )
      if (!fixture) throw new Error(`Unexpected intent: ${request.intent}`)
      return {
        commands: fixture.expectedCommands,
        explanation: 'ok',
      }
    }

    const registry = buildMockRegistry('bedrock-mock', shape)

    const exitCode = await evaluate(
      ['shaping', 'bedrock-mock', '--out-dir', tempDir],
      { shapingRegistry: registry },
    )

    expect(exitCode).toBe(0)

    const raw = JSON.parse(
      readFileSync(join(tempDir, 'bedrock-mock.json'), 'utf-8'),
    )
    expect(raw.cases).toHaveLength(6)
    const failedCase = raw.cases.find(
      (c: { fixture: string }) => c.fixture === 'swap-pages',
    )
    expect(failedCase).toBeDefined()
    expect(failedCase.metrics.kindRecall).toBe(0)
    expect(failedCase.details.error).toContain('invalid command sequence')

    const passedCase = raw.cases.find(
      (c: { fixture: string }) => c.fixture === 'rename-personal-info',
    )
    expect(passedCase?.metrics.kindRecall).toBe(1)
  })
})
