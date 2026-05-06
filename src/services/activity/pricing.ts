/** Dollars per 1M tokens. Update when AWS announces price changes. */
export const BEDROCK_PRICING: Record<
  string,
  { input: number; output: number }
> = {
  'us.anthropic.claude-sonnet-4-20250514-v1:0': { input: 3.0, output: 15.0 },
}

/** Compute estimated cost in dollars for a single LLM call. */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = BEDROCK_PRICING[model]
  if (!pricing) return 0
  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  )
}
