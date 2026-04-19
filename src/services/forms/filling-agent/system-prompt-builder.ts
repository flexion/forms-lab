// src/services/forms/filling-agent/system-prompt-builder.ts
import type { RequirementGroup } from '../../data-collection'
import { evaluateCondition } from '../resolver'
import type { FieldEntry } from '../types'

/**
 * buildSystemPrompt - Generate system prompt for LLM-based filling agent
 *
 * Creates a detailed prompt that:
 * - Describes the form structure and purpose
 * - Lists available tools (collect_field, explain_field, skip_field)
 * - Enumerates remaining fields to collect
 * - Respects conditional logic (fields and groups)
 */
export function buildSystemPrompt(
  groups: RequirementGroup[],
  collectedFields: Record<string, FieldEntry>,
): string {
  const sections: string[] = []

  // Header: Role and purpose
  sections.push(`You are a conversational form-filling assistant. Your role is to help users complete a form by gathering required information through natural dialogue.

## Your Capabilities

You have access to three tools:

1. **collect_field** - Record a field value when the user provides it
   - Parameters: fieldName (string), value (string)
   - Use this when the user answers a question

2. **explain_field** - Provide additional context about a field
   - Parameters: fieldName (string)
   - Use this when the user asks for clarification or help

3. **skip_field** - Mark a field as intentionally skipped
   - Parameters: fieldName (string), reason (string)
   - Use this when a required field cannot be collected

## Guidelines

- ALWAYS include conversational text in your response alongside any tool calls
- After collecting a field, immediately ask for the next one in the same message
- Use natural, conversational language
- Extract all information you can from each user response
- If the user provides multiple pieces of information, collect all of them
- Provide context from field labels and help text when needed
- Respect the form structure and field types
- Only collect fields that are currently applicable (check conditions)
- For choice fields, present the available options
- When the user asks a question, use explain_field to provide clarification
- Move forward efficiently - don't re-ask for information already provided

Example: When user provides firstName, respond with "Thanks! I've recorded your first name. Now, what is your last name?"`)

  // Form structure
  sections.push('\n## Form Structure\n')

  for (const group of groups) {
    // Check if group condition is met
    if (!evaluateCondition(group.condition, collectedFields)) {
      continue
    }

    sections.push(`### ${group.title}`)
    if (group.description) {
      sections.push(group.description)
    }

    // List requirements in this group
    for (const req of group.requirements) {
      // Skip if already collected
      if (req.fieldName in collectedFields) {
        continue
      }

      // Skip if field condition is not met
      if (!evaluateCondition(req.condition, collectedFields)) {
        continue
      }

      const requiredLabel = req.required ? '(required)' : '(optional)'
      sections.push(`- **${req.fieldName}** ${requiredLabel}: ${req.label}`)
      sections.push(`  - Type: ${req.fieldType}`)

      if (req.helpText) {
        sections.push(`  - Help: ${req.helpText}`)
      }

      if (req.choices) {
        sections.push(`  - Choices: ${req.choices.join(', ')}`)
      }

      if (req.validation && req.validation.length > 0) {
        const validationDesc = req.validation
          .map((v) => {
            switch (v.type) {
              case 'min':
                return `min: ${v.value}`
              case 'max':
                return `max: ${v.value}`
              case 'minLength':
                return `minLength: ${v.value}`
              case 'maxLength':
                return `maxLength: ${v.value}`
              case 'pattern':
                return `pattern: ${v.value}`
              default:
                return ''
            }
          })
          .filter((d) => d)
          .join(', ')
        if (validationDesc) {
          sections.push(`  - Validation: ${validationDesc}`)
        }
      }
    }
  }

  // Summary
  const remainingCount = countRemainingFields(groups, collectedFields)
  sections.push(`\n## Current Status\n`)
  sections.push(
    `Fields remaining to collect: ${remainingCount} required fields\n`,
  )
  if (remainingCount === 0) {
    sections.push(
      '\nAll required fields have been collected! End your response with: "This section is now complete. You can continue to the next step."\n',
    )
  } else {
    sections.push(
      "Begin by asking for the first uncollected required field, or respond to the user's message if they've already provided information.",
    )
  }

  return sections.join('\n')
}

/**
 * Count remaining required fields that need to be collected
 */
function countRemainingFields(
  groups: RequirementGroup[],
  collectedFields: Record<string, FieldEntry>,
): number {
  let count = 0

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

      count++
    }
  }

  return count
}
