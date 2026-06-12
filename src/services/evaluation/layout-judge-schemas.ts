import { z } from 'zod'

const layoutJudgeEntrySchema = z.object({
  score: z.number().min(1).max(5),
  rationale: z.string(),
})

export const layoutJudgeResponseSchema = z.object({
  scores: z.record(z.string(), layoutJudgeEntrySchema),
})

export type LayoutJudgeResponse = z.infer<typeof layoutJudgeResponseSchema>
