import type { Command, ProjectState } from './commands'
import { executeBatch } from './executor'
import type { FormShaper, ShapingRequest, ShapingResult } from './types'

export interface RetryOptions {
  maxRetries?: number
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: string; failedAt: number; command: Command }

export function withValidationRetry(
  inner: FormShaper,
  options: RetryOptions = {},
): FormShaper {
  const maxRetries = options.maxRetries ?? 1

  return {
    async shape(request: ShapingRequest): Promise<ShapingResult> {
      let attempt = await inner.shape(request)
      let validation = executeBatch(request.state, attempt.commands)
      if (validation.ok) return attempt

      for (let retry = 0; retry < maxRetries; retry++) {
        const feedback = buildFeedback(
          attempt.commands,
          validation.failedAt,
          validation.error,
        )
        attempt = await inner.shape({
          intent: request.intent,
          state: request.state,
          previousAttempt: { commands: attempt.commands, feedback },
        })
        validation = executeBatch(request.state, attempt.commands)
        if (validation.ok) return attempt
      }

      throw new Error(
        `LLM produced invalid command sequence: ${validation.error} (command ${validation.failedAt})`,
      )
    },
  }
}

function buildFeedback(
  commands: Command[],
  failedAt: number,
  error: string,
): string {
  return [
    `Your previous batch failed validation at command ${failedAt}: ${error}`,
    'When you need to reference a new page/group/field in a later command, pass an explicit `id` to the creating tool and reuse that exact id in all subsequent commands.',
    'Emit a corrected command sequence.',
  ].join(' ')
}

// Re-export a thin validation helper so callers that only want to validate
// (no retry) keep a stable import surface.
export function validateCommands(
  commands: Command[],
  state: ProjectState,
): ValidateResult {
  const result = executeBatch(state, commands)
  if (result.ok) return { ok: true }
  return {
    ok: false,
    error: result.error,
    failedAt: result.failedAt,
    command: result.command,
  }
}
