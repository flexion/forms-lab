import { z } from 'zod'

export const criterionStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'added',
])

export type CriterionStatus = z.infer<typeof criterionStatusSchema>

export const criterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  status: criterionStatusSchema,
})

export type Criterion = z.infer<typeof criterionSchema>

export const criteriaSetSchema = z.object({
  criteria: z.array(criterionSchema),
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
})

export type CriteriaSet = z.infer<typeof criteriaSetSchema>

export interface SectionEvalResult {
  criterionId: string
  pass: boolean
  explanation: string
  retry?: number
}

export interface EvalResults {
  sections: Record<
    string,
    {
      results: SectionEvalResult[]
      generatedAt: string
    }
  >
}

export interface AuthoringStageConfig {
  criteria: { modelId: string }
  structure: { modelId: string }
  generation: { modelId: string }
  evaluation: { modelId: string }
}

export type AuthoringStage =
  | 'criteria'
  | 'structure'
  | 'sections'
  | 'complete'
