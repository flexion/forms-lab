import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import type { Command } from './commands'
import { commandTools } from './tools'
import type { FormShaper, ShapingRequest, ShapingResult } from './types'

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

// Validation + retry moved to retry.ts so each shaper stays a pure
// LLM → Commands mapping. Re-exported for back-compat with existing imports.
export { validateCommands } from './retry'
export type { ValidateResult } from './retry'

function buildPrompt(request: ShapingRequest): string {
  const previous = request.previousAttempt
    ? `\n\n## Previous attempt\nYou previously produced these commands:\n${JSON.stringify(request.previousAttempt.commands, null, 2)}\n\nValidation feedback: "${request.previousAttempt.feedback}"\n`
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
- Call tools that match the creator's intent (swapPages, moveGroup, addField, etc.). Prefer the smallest set of commands that achieves the request.
- Use existing ids from the specs above. Do NOT invent ids that reference entities that don't exist yet.
- When creating a new page, group, or field that you need to reference in a later command (e.g., adding a group to a page you just created), pass an explicit \`id\` to the creating tool and reuse that exact id in the subsequent commands. Example:
    addPage    { id: "confirmation",       title: "Confirmation" }
    addGroup   { id: "confirmation-group", pageId: "confirmation", title: "Confirmation" }
    addField   { id: "confirm-accurate",   groupId: "confirmation-group", label: "I confirm the information is accurate", fieldType: "boolean", required: true }
  Keep invented ids short, stable, and human-readable.
- Respect control defaults — don't issue redundant commands. \`boolean\` fields already render as a checkbox; \`choice\` fields default to radio. Only call \`setFieldControl\` to override these defaults (e.g., boolean as toggle, choice as select).
- \`addField\` accepts optional \`control\` and \`helpText\` in one shot. Use those instead of following \`addField\` with a separate \`setFieldControl\` or \`relabelField\`.
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

      const explanation =
        (response.text ?? '').trim() || 'Applied requested changes.'
      return { commands, explanation }
    },
  }
}
