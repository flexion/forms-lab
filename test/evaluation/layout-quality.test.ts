import { describe, expect, test } from 'bun:test'
import type { DataCollectionSpec } from '../../src/services/data-collection'
import {
  createLayoutQualityKind,
  type LayoutJudge,
} from '../../src/services/evaluation/kinds/layout-quality'
import type { FormSpec } from '../../src/services/forms'

describe('createLayoutQualityKind', () => {
  const mockJudge: LayoutJudge = {
    async judge() {
      return {
        scores: {
          pageSizing: { score: 5, rationale: 'Perfect' },
          topicCohesion: { score: 3, rationale: 'Acceptable' },
          logicalProgression: { score: 4, rationale: 'Good' },
          conditionalUse: { score: 5, rationale: 'N/A' },
          titleClarity: { score: 1, rationale: 'Poor' },
          deliveryModeChoice: { score: 3, rationale: 'OK' },
        },
      }
    },
  }

  const kind = createLayoutQualityKind(mockJudge)

  test('has correct id and description', () => {
    expect(kind.id).toBe('layout-quality')
    expect(kind.description).toContain('layout')
  })

  test('summarize averages metrics across cases', () => {
    const cases = [
      {
        fixture: 'w-9',
        metrics: {
          pageSizing: 0.8,
          topicCohesion: 0.9,
          logicalProgression: 0.7,
          conditionalUse: 0.6,
          titleClarity: 0.9,
          deliveryModeChoice: 0.8,
          overall: 0.78,
        },
        details: {},
      },
      {
        fixture: 'i-9',
        metrics: {
          pageSizing: 0.6,
          topicCohesion: 0.7,
          logicalProgression: 0.8,
          conditionalUse: 0.5,
          titleClarity: 0.7,
          deliveryModeChoice: 0.6,
          overall: 0.65,
        },
        details: {},
      },
    ]

    const summary = kind.summarize(cases)

    expect(summary.metrics.pageSizing).toBeCloseTo(0.7)
    expect(summary.metrics.topicCohesion).toBeCloseTo(0.8)
    expect(summary.metrics.overall).toBeCloseTo(0.715)
  })

  test('score calls judge and normalizes 1-5 to 0-1', async () => {
    const spec: DataCollectionSpec = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      groups: [
        {
          id: 'g1',
          title: 'G1',
          requirements: [
            {
              id: 'f1',
              fieldName: 'f1',
              label: 'F1',
              fieldType: 'text',
              required: true,
            },
          ],
        },
      ],
    }
    const formSpec: FormSpec = {
      id: 'form-test',
      specId: 'test',
      title: 'Test Form',
      pages: [{ id: 'page-1', title: 'Page 1', groups: ['g1'] }],
    }

    const result = await kind.score({ spec, formSpec }, undefined)

    // 5 -> 1.0, 3 -> 0.5, 4 -> 0.75, 5 -> 1.0, 1 -> 0.0, 3 -> 0.5
    expect(result.metrics.pageSizing).toBeCloseTo(1.0)
    expect(result.metrics.topicCohesion).toBeCloseTo(0.5)
    expect(result.metrics.logicalProgression).toBeCloseTo(0.75)
    expect(result.metrics.conditionalUse).toBeCloseTo(1.0)
    expect(result.metrics.titleClarity).toBeCloseTo(0.0)
    expect(result.metrics.deliveryModeChoice).toBeCloseTo(0.5)
    // overall = (1.0 + 0.5 + 0.75 + 1.0 + 0.0 + 0.5) / 6 = 0.625
    expect(result.metrics.overall).toBeCloseTo(0.625)
  })
})
