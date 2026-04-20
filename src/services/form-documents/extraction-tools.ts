import { tool } from 'ai'
import { z } from 'zod'
import type { DataCollectionSpec } from '../data-collection'
import type { FieldConfidence } from './types'

const sensitivity = z.enum(['low', 'medium', 'high', 'pii'])
const fieldType = z.enum([
  'text',
  'email',
  'phone',
  'url',
  'number',
  'currency',
  'date',
  'boolean',
  'choice',
  'longText',
])

export const extractionTools = {
  createSpec: tool({
    description:
      'Initialize the extraction with the form ID, title, and description.',
    inputSchema: z.object({
      id: z.string().describe('kebab-case form identifier'),
      title: z.string(),
      description: z.string(),
    }),
    execute: async ({ id }) => `Spec "${id}" initialized.`,
  }),
  addGroup: tool({
    description: 'Add a requirement group to the spec.',
    inputSchema: z.object({
      id: z.string().describe('kebab-case group ID'),
      title: z.string(),
      description: z.string().optional(),
    }),
    execute: async ({ id }) => `Group "${id}" added.`,
  }),
  addField: tool({
    description:
      'Add a field (requirement) to the most recently added group. For yes/no questions, pass fieldType "choice" with choices ["Yes","No"] rather than boolean. Reserve boolean for agreement checkboxes.',
    inputSchema: z.object({
      id: z.string().describe('kebab-case field ID'),
      fieldName: z.string().describe('camelCase field name'),
      label: z.string(),
      fieldType: fieldType,
      required: z.boolean(),
      helpText: z.string().optional(),
      choices: z
        .array(z.string())
        .optional()
        .describe(
          'Required when fieldType is "choice" (e.g. ["Yes","No"] or ["Single","Married","Other"]). Omit for other field types.',
        ),
      sensitivity: sensitivity.optional(),
    }),
    execute: async ({ id }) => `Field "${id}" added.`,
  }),
  flagLowConfidence: tool({
    description: 'Flag a field as low confidence (< 0.8).',
    inputSchema: z.object({
      fieldId: z.string(),
      confidence: z.number().min(0).max(1),
      flags: z.array(z.string()).optional(),
    }),
    execute: async ({ fieldId }) => `Flagged "${fieldId}".`,
  }),
}

/** A tool call as returned by AI SDK's generateText response. */
interface ExtractionToolCall {
  toolName: 'createSpec' | 'addGroup' | 'addField' | 'flagLowConfidence'
  input: Record<string, unknown>
}

/** Reconstructed result from processing tool calls. */
export interface ReconstructedExtraction {
  spec: DataCollectionSpec
  confidence: FieldConfidence[]
}

/**
 * Reconstruct a DataCollectionSpec and confidence array from a sequence
 * of tool calls returned by the model. This is the unit-testable core
 * of the tool-use extraction variant.
 */
export function reconstructSpec(
  toolCalls: ExtractionToolCall[],
): ReconstructedExtraction {
  if (toolCalls.length === 0 || toolCalls[0].toolName !== 'createSpec') {
    throw new Error(
      'Expected createSpec as the first tool call, but got: ' +
        (toolCalls[0]?.toolName ?? 'empty'),
    )
  }

  const createCall = toolCalls[0].input as {
    id: string
    title: string
    description: string
  }

  const spec: DataCollectionSpec = {
    id: createCall.id,
    title: createCall.title,
    description: createCall.description,
    groups: [],
  }

  const confidence: FieldConfidence[] = []
  let currentGroupIndex = -1

  for (let i = 1; i < toolCalls.length; i++) {
    const call = toolCalls[i]
    switch (call.toolName) {
      case 'createSpec': {
        // Ignore duplicate createSpec calls
        break
      }
      case 'addGroup': {
        const input = call.input as {
          id: string
          title: string
          description?: string
        }
        spec.groups.push({
          id: input.id,
          title: input.title,
          description: input.description,
          requirements: [],
        })
        currentGroupIndex = spec.groups.length - 1
        break
      }
      case 'addField': {
        if (currentGroupIndex < 0) {
          throw new Error(
            'addField called before any group was created. Call addGroup first.',
          )
        }
        const input = call.input as {
          id: string
          fieldName: string
          label: string
          fieldType: string
          required: boolean
          helpText?: string
          choices?: string[]
          sensitivity?: string
        }
        spec.groups[currentGroupIndex].requirements.push({
          id: input.id,
          fieldName: input.fieldName,
          label: input.label,
          fieldType:
            input.fieldType as DataCollectionSpec['groups'][0]['requirements'][0]['fieldType'],
          required: input.required,
          helpText: input.helpText,
          choices: input.choices,
          sensitivity: input.sensitivity as
            | 'low'
            | 'medium'
            | 'high'
            | 'pii'
            | undefined,
        })
        break
      }
      case 'flagLowConfidence': {
        const input = call.input as {
          fieldId: string
          confidence: number
          flags?: string[]
        }
        confidence.push({
          fieldId: input.fieldId,
          confidence: input.confidence,
          flags: input.flags,
        })
        break
      }
    }
  }

  return { spec, confidence }
}
