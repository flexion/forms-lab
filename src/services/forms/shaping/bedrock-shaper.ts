import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { Command, ProjectState } from './commands'
import { executeBatch } from './executor'
import { commandTools } from './tools'
import type { FormShaper, ShapingRequest, ShapingResult } from './types'

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: string; failedAt: number; command: Command }

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

function buildPrompt(request: ShapingRequest): string {
  const previous = request.previousAttempt
    ? `\n\n## Previous attempt\nYou previously produced these commands:\n${JSON.stringify(request.previousAttempt.commands, null, 2)}\n\nThe user said: "${request.previousAttempt.feedback}"\n`
    : ''

  return `You are a form design assistant. A form creator wants to modify the structure of their form. Call the appropriate tools to express the edits as a sequence of commands.

## Current FormSpec
${JSON.stringify(request.state.formSpec, null, 2)}

## Current DataCollectionSpec groups and fields
${JSON.stringify(
  request.state.dataSpec.groups.map((g) => ({
    id: g.id,
    title: g.title,
    fields: g.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      type: r.fieldType,
    })),
  })),
  null,
  2,
)}

## The form creator's request
"${request.intent}"
${previous}

## Guidance
- Call tools that match the creator's intent. The tools correspond to domain operations like swapPages, moveGroup, addField, etc.
- Preserve page/group/field identity: use real ids from the specs above. Invent new ids only for commands that create new entities.
- When reordering, only change position — don't rewrite content.
- After calling tools, respond with a single short sentence summarizing what you did. This sentence will be shown to the user.`
}

export interface BedrockShaperOptions {
  model?: string
}

export function createBedrockFormShaper(
  options?: BedrockShaperOptions,
): FormShaper {
  const bedrockProfile = process.env.AWS_BEDROCK_PROFILE
  const credentialProvider = bedrockProfile
    ? fromIni({ profile: bedrockProfile })
    : fromNodeProviderChain()
  const bedrock = createAmazonBedrock({
    credentialProvider,
    region: process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION,
  })

  return {
    async shape(request: ShapingRequest): Promise<ShapingResult> {
      const model = options?.model ?? DEFAULT_MODEL
      const response = await generateText({
        model: bedrock(model),
        maxOutputTokens: 4096,
        tools: commandTools,
        messages: [{ role: 'user', content: buildPrompt(request) }],
      })

      const commands: Command[] = []
      for (const call of response.toolCalls ?? []) {
        commands.push({
          kind: call.toolName,
          ...(call.input as object),
        } as Command)
      }

      const validation = validateCommands(commands, request.state)
      if (!validation.ok) {
        throw new Error(
          `LLM produced invalid command sequence: ${validation.error} (command ${validation.failedAt})`,
        )
      }

      const explanation =
        (response.text ?? '').trim() || 'Applied requested changes.'
      return { commands, explanation }
    },
  }
}
