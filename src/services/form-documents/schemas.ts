import { z } from 'zod'

export const validationRuleSchema = z.object({
  type: z.enum(['pattern', 'min', 'max', 'minLength', 'maxLength']),
  value: z.union([z.string(), z.number()]),
  message: z.string().optional(),
})

export const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const fieldConfidenceSchema = z.object({
  fieldId: z.string(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()).optional(),
})

export const dataRequirementSchema = z.object({
  id: z.string(),
  fieldName: z.string(),
  label: z.string(),
  fieldType: z.enum([
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
  ]),
  required: z.boolean(),
  helpText: z.string().optional(),
  validation: z.array(validationRuleSchema).optional(),
  condition: conditionSchema.optional(),
  sensitivity: z.enum(['low', 'medium', 'high', 'pii']).optional(),
})

export const requirementGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  requirements: z.array(dataRequirementSchema),
})

export const dataCollectionSpecSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  groups: z.array(requirementGroupSchema),
  version: z.string().optional(),
})

export const extractionResponseSchema = z.object({
  spec: dataCollectionSpecSchema,
  confidence: z.array(fieldConfidenceSchema),
})

export const formPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  groups: z.array(z.string()),
  deliveryMode: z.enum(['static', 'conversational', 'hybrid']),
})

export const formSpecSchema = z.object({
  id: z.string(),
  specId: z.string(),
  title: z.string(),
  pages: z.array(formPageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
