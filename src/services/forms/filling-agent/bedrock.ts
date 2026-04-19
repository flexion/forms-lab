// src/services/forms/filling-agent/bedrock.ts
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { generateText } from 'ai'
import { evaluateCondition } from '../resolver'
import { buildSystemPrompt } from './system-prompt-builder'
import type {
  FillingAgent,
  FillingContext,
  FillingTurn,
  ToolCallRecord,
} from './types'

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-20250514-v1:0'

export interface BedrockFillingAgentOptions {
  model?: string
  region?: string
}

/**
 * BedrockFillingAgent - Production LLM-based filling agent using Claude via Bedrock
 *
 * Uses Vercel AI SDK's generateText with tool-use pattern to:
 * - Generate conversational prompts using system prompt
 * - Parse tool calls (collect_field, explain_field, skip_field)
 * - Update collected fields based on tool calls
 * - Determine when form is complete
 */
export class BedrockFillingAgent implements FillingAgent {
  private model: string
  private bedrock: ReturnType<typeof createAmazonBedrock>

  constructor(options?: BedrockFillingAgentOptions) {
    this.model = options?.model ?? DEFAULT_MODEL

    this.bedrock = createAmazonBedrock({
      credentialProvider: fromNodeProviderChain(),
      region:
        options?.region ??
        process.env.AWS_BEDROCK_REGION ??
        process.env.AWS_REGION,
    })
  }

  async advance(
    context: FillingContext,
    userResponse: string | null,
  ): Promise<FillingTurn> {
    // Build system prompt with current form state
    const systemPrompt = buildSystemPrompt(
      context.groups,
      context.collectedFields,
    )

    // Build messages array from conversation history
    const messages = this.buildMessages(context, userResponse)

    // Call LLM with tools
    const result = await generateText({
      model: this.bedrock(this.model),
      system: systemPrompt,
      messages,
      tools: {
        collect_field: {
          description: 'Record a field value when the user provides it',
          parameters: {
            json: {
              type: 'object' as const,
              properties: {
                fieldName: {
                  type: 'string' as const,
                  description: 'The field name to collect (camelCase)',
                },
                value: {
                  type: 'string' as const,
                  description: 'The value provided by the user',
                },
              },
              required: ['fieldName', 'value'] as const,
            },
          },
          // biome-ignore lint/suspicious/noExplicitAny: Bedrock expects json wrapper around schema
        } as any,
        explain_field: {
          description:
            'Provide additional context about a field when the user asks for clarification',
          parameters: {
            json: {
              type: 'object' as const,
              properties: {
                fieldName: {
                  type: 'string' as const,
                  description: 'The field name to explain',
                },
              },
              required: ['fieldName'] as const,
            },
          },
          // biome-ignore lint/suspicious/noExplicitAny: Bedrock expects json wrapper around schema
        } as any,
        skip_field: {
          description: 'Mark a field as intentionally skipped',
          parameters: {
            json: {
              type: 'object' as const,
              properties: {
                fieldName: {
                  type: 'string' as const,
                  description: 'The field name to skip',
                },
                reason: {
                  type: 'string' as const,
                  description: 'Why the field is being skipped',
                },
              },
              required: ['fieldName', 'reason'] as const,
            },
          },
          // biome-ignore lint/suspicious/noExplicitAny: Bedrock expects json wrapper around schema
        } as any,
      },
    })

    // Parse tool calls and collect fields
    const toolCalls: ToolCallRecord[] = []
    const fieldsCollected: Record<
      string,
      { value: string | number | boolean }
    > = {}

    for (const toolCall of result.toolCalls ?? []) {
      // Type assertion for tool call properties
      const toolName = toolCall.toolName as
        | 'collect_field'
        | 'explain_field'
        | 'skip_field'

      // Extract args - this is typed based on the tool definition
      const args: Record<string, string> =
        'args' in toolCall ? (toolCall.args as Record<string, string>) : {}

      toolCalls.push({
        tool: toolName,
        input: args,
      })

      // If this is a collect_field call, update fieldsCollected
      if (
        toolName === 'collect_field' &&
        'fieldName' in args &&
        'value' in args
      ) {
        const { fieldName, value } = args
        fieldsCollected[fieldName] = {
          value: this.parseValue(value, fieldName, context),
        }
      }
    }

    // Update context with newly collected fields - merge with existing
    const updatedCollectedFields: typeof context.collectedFields = {
      ...context.collectedFields,
      ...fieldsCollected,
    }

    // Check if we're finished (no more required fields to collect)
    const finished = this.isFormComplete(context.groups, updatedCollectedFields)

    return {
      message: result.text,
      fieldsCollected,
      finished,
      toolCalls,
    }
  }

  /**
   * Build messages array from conversation history and current user response
   */
  private buildMessages(
    context: FillingContext,
    userResponse: string | null,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add conversation history
    for (const msg of context.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add current user response if provided
    if (userResponse !== null) {
      messages.push({
        role: 'user',
        content: userResponse,
      })
    } else if (messages.length === 0) {
      // If no messages and no user response, send initial prompt
      messages.push({
        role: 'user',
        content: 'Hello, I would like to start filling out the form.',
      })
    }

    return messages
  }

  /**
   * Parse value into appropriate type based on field definition
   */
  private parseValue(
    value: string,
    fieldName: string,
    context: FillingContext,
  ): string | number | boolean {
    // Find the field definition
    for (const group of context.groups) {
      for (const req of group.requirements) {
        if (req.fieldName === fieldName) {
          switch (req.fieldType) {
            case 'boolean':
              return (
                value.toLowerCase() === 'true' ||
                value.toLowerCase() === 'yes' ||
                value === '1'
              )
            case 'number':
            case 'currency':
              return Number(value)
            default:
              return value
          }
        }
      }
    }

    // Default to string if field not found
    return value
  }

  /**
   * Check if all required fields have been collected
   */
  private isFormComplete(
    groups: FillingContext['groups'],
    collectedFields: FillingContext['collectedFields'],
  ): boolean {
    for (const group of groups) {
      // Skip group if condition not met
      if (!evaluateCondition(group.condition, collectedFields)) {
        continue
      }

      for (const req of group.requirements) {
        // Skip if not required
        if (!req.required) {
          continue
        }

        // Skip if already collected
        if (req.fieldName in collectedFields) {
          continue
        }

        // Skip if field condition not met
        if (!evaluateCondition(req.condition, collectedFields)) {
          continue
        }

        // Found an uncollected required field
        return false
      }
    }

    // All required fields are collected
    return true
  }
}
