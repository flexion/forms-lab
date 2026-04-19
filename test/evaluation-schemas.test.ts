import { describe, expect, it } from 'bun:test'
import { evaluationRunSchema } from '../src/services/evaluation'
import { fixtureManifestSchema } from '../src/services/evaluation/schemas'

describe('fixtureManifestSchema', () => {
  it('validates a correct manifest', () => {
    const manifest = {
      name: 'Application for Presidential Pardon',
      specVersion: '2026-04-11',
      groundTruthModel: 'us.anthropic.claude-opus-4-20250514-v1:0',
      reviewed: true,
      notes: 'Opus extraction, reviewed for obvious errors',
    }
    const result = fixtureManifestSchema.safeParse(manifest)
    expect(result.success).toBe(true)
  })

  it('requires name, specVersion, groundTruthModel, reviewed', () => {
    const result = fixtureManifestSchema.safeParse({ name: 'test' })
    expect(result.success).toBe(false)
  })

  it('accepts manifest without optional notes', () => {
    const manifest = {
      name: 'Test',
      specVersion: '2026-04-11',
      groundTruthModel: 'model-id',
      reviewed: false,
    }
    const result = fixtureManifestSchema.safeParse(manifest)
    expect(result.success).toBe(true)
  })
})

describe('evaluationRunSchema', () => {
  it('validates a correct evaluation run', () => {
    const run = {
      kind: 'pdf-field-extraction',
      implementation: 'sonnet',
      specVersion: '2026-04-11',
      status: 'current',
      timestamp: '2026-04-11T12:00:00.000Z',
      model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      summary: { fieldRecall: 0.94, fieldPrecision: 0.87 },
      cases: [
        {
          fixture: 'pardon-application',
          metrics: { fieldRecall: 0.94, fieldPrecision: 0.87 },
          details: { matched: 18, missed: 1, extra: 2 },
        },
      ],
    }
    const result = evaluationRunSchema.safeParse(run)
    expect(result.success).toBe(true)
  })

  it('rejects invalid status values', () => {
    const run = {
      kind: 'pdf-field-extraction',
      implementation: 'sonnet',
      specVersion: '2026-04-11',
      status: 'invalid',
      timestamp: '2026-04-11T12:00:00.000Z',
      model: 'model-id',
      summary: {},
      cases: [],
    }
    const result = evaluationRunSchema.safeParse(run)
    expect(result.success).toBe(false)
  })

  it('validates archived run with archivedReason', () => {
    const run = {
      kind: 'pdf-field-extraction',
      implementation: 'sonnet',
      specVersion: '2026-04-11',
      status: 'archived',
      archivedReason: 'extraction goals changed, see specVersion 2026-04-15',
      timestamp: '2026-04-11T12:00:00.000Z',
      model: 'model-id',
      summary: { fieldRecall: 0.94 },
      cases: [],
    }
    const result = evaluationRunSchema.safeParse(run)
    expect(result.success).toBe(true)
  })
})
