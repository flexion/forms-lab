import { z } from 'zod'

export const judgeMatchSchema = z.object({
  groundTruthFieldName: z.string(),
  extractedFieldName: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

export const judgeResponseSchema = z.object({
  matches: z.array(judgeMatchSchema),
  unmatchedGroundTruth: z.array(z.string()),
  unmatchedExtracted: z.array(z.string()),
})

export type JudgeMatch = z.infer<typeof judgeMatchSchema>
export type JudgeResponse = z.infer<typeof judgeResponseSchema>
