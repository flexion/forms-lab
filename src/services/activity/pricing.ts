/** Dollars per 1M tokens. Update when AWS announces price changes. */
export const BEDROCK_PRICING: Record<
  string,
  { input: number; output: number }
> = {
  'us.anthropic.claude-opus-4-6-v1': { input: 15.0, output: 75.0 },
  'us.anthropic.claude-sonnet-4-20250514-v1:0': { input: 3.0, output: 15.0 },
  'us.anthropic.claude-haiku-4-5-20251001-v1:0': { input: 0.8, output: 4.0 },
  'us.amazon.nova-pro-v1:0': { input: 0.8, output: 3.2 },
  'us.amazon.nova-lite-v1:0': { input: 0.06, output: 0.24 },
  'us.meta.llama3-2-90b-instruct-v1:0': { input: 2.0, output: 2.0 },
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
