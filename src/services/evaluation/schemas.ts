import { z } from 'zod'

export const fixtureManifestSchema = z.object({
  name: z.string(),
  specVersion: z.string(),
  groundTruthModel: z.string(),
  reviewed: z.boolean(),
  notes: z.string().optional(),
})

export const evaluationRunSchema = z.object({
  kind: z.string(),
  implementation: z.string(),
  specVersion: z.string(),
  status: z.enum(['current', 'archived']),
  archivedReason: z.string().optional(),
  timestamp: z.string(),
  model: z.string(),
  summary: z.record(z.string(), z.number()),
  cases: z.array(
    z.object({
      fixture: z.string(),
      metrics: z.record(z.string(), z.number()),
      details: z.record(z.string(), z.unknown()),
    }),
  ),
})

export type FixtureManifest = z.infer<typeof fixtureManifestSchema>
export type EvaluationRun = z.infer<typeof evaluationRunSchema>
