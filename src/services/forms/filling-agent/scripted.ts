// src/services/forms/filling-agent/scripted.ts
import type { DataRequirement } from '../../data-collection/types'
import { evaluateCondition } from '../resolver'
import type {
  FillingAgent,
  FillingContext,
  FillingTurn,
  ToolCallRecord,
} from './types'

/**
 * ScriptedFillingAgent - Deterministic filling agent for testing
 *
 * Walks through fields sequentially:
 * - First group, first field, then next field, etc.
 * - Evaluates field conditions using evaluateCondition
 * - Skips fields whose conditions aren't met
 * - Returns finished=true when all applicable fields are collected
 */
export class ScriptedFillingAgent implements FillingAgent {
  async advance(
    context: FillingContext,
    userResponse: string | null,
  ): Promise<FillingTurn> {
    const toolCalls: ToolCallRecord[] = {}
    const fieldsCollected: Record<string, any> = {}

    // If user provided a response, collect it for the current pending field
    if (userResponse !== null) {
      const currentField = this.findPendingField(context)
      if (currentField) {
        const value = this.parseValue(userResponse, currentField.fieldType)
        fieldsCollected[currentField.fieldName] = { value }
        toolCalls[currentField.fieldName] = {
          tool: 'collect_field',
          input: {
            fieldName: currentField.fieldName,
            value: String(value),
          },
        }
      }
    }

    // Update context with newly collected fields
    const updatedContext = {
      ...context,
      collectedFields: { ...context.collectedFields, ...fieldsCollected },
    }

    // Find next field to collect
    const nextField = this.findPendingField(updatedContext)

    if (!nextField) {
      return {
        message: 'Thank you! Your form is now complete.',
        fieldsCollected,
        finished: true,
        toolCalls: Object.values(toolCalls),
      }
    }

    // Ask for the next field
    const message = this.buildPrompt(nextField)
    return {
      message,
      fieldsCollected,
      finished: false,
      toolCalls: Object.values(toolCalls),
    }
  }

  /**
   * Find the next uncollected required field that passes condition checks
   */
  private findPendingField(
    context: FillingContext,
  ): DataRequirement | null {
    for (const group of context.groups) {
      // Skip group if its condition isn't met
      if (!evaluateCondition(group.condition, context.collectedFields)) {
        continue
      }

      for (const requirement of group.requirements) {
        // Skip if already collected
        if (requirement.fieldName in context.collectedFields) {
          continue
        }

        // Skip if field condition isn't met
        if (
          !evaluateCondition(requirement.condition, context.collectedFields)
        ) {
          continue
        }

        // ScriptedFillingAgent only collects required fields
        if (!requirement.required) {
          continue
        }

        return requirement
      }
    }

    return null
  }

  /**
   * Build a prompt for a field
   */
  private buildPrompt(field: DataRequirement): string {
    let prompt = field.label

    if (field.helpText) {
      prompt += `\n${field.helpText}`
    }

    if (field.choices) {
      prompt += `\nChoices: ${field.choices.join(', ')}`
    }

    return prompt
  }

  /**
   * Parse user response into the appropriate type
   */
  private parseValue(
    response: string,
    fieldType: string,
  ): string | number | boolean {
    switch (fieldType) {
      case 'boolean':
        return (
          response.toLowerCase() === 'true' ||
          response.toLowerCase() === 'yes' ||
          response === '1'
        )
      case 'number':
      case 'currency':
        return Number(response)
      default:
        return response
    }
  }
}
