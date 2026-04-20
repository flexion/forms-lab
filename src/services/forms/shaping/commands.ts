import { z } from 'zod'
import type { DataCollectionSpec } from '../../data-collection'
import type { FormSpec } from '../types'

export interface ProjectState {
  formSpec: FormSpec
  dataSpec: DataCollectionSpec
}

const deliveryModeSchema = z.enum(['static', 'conversational', 'hybrid'])
const fieldTypeSchema = z.enum([
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
const sensitivitySchema = z.enum(['low', 'medium', 'high', 'pii'])
const controlSchema = z.enum(['radio', 'select', 'checkbox', 'toggle'])
const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

// Page operations
const reorderPagesSchema = z.object({
  kind: z.literal('reorderPages'),
  order: z.array(z.string()).min(1),
})
const swapPagesSchema = z.object({
  kind: z.literal('swapPages'),
  a: z.string(),
  b: z.string(),
})
const movePageSchema = z.object({
  kind: z.literal('movePage'),
  id: z.string(),
  toIndex: z.number().int().min(0),
})
const addPageSchema = z.object({
  kind: z.literal('addPage'),
  id: z.string().optional(),
  afterPageId: z.string().optional(),
  title: z.string(),
  deliveryMode: deliveryModeSchema.optional(),
})
const removePageSchema = z.object({
  kind: z.literal('removePage'),
  id: z.string(),
  moveGroupsTo: z.string().optional(),
})
const renamePageSchema = z.object({
  kind: z.literal('renamePage'),
  id: z.string(),
  title: z.string(),
})
const splitPageSchema = z.object({
  kind: z.literal('splitPage'),
  id: z.string(),
  newTitle: z.string(),
  groupsToMove: z.array(z.string()),
})
const mergePagesSchema = z.object({
  kind: z.literal('mergePages'),
  intoId: z.string(),
  fromId: z.string(),
})
const setDeliveryModeSchema = z.object({
  kind: z.literal('setDeliveryMode'),
  pageId: z.string(),
  mode: deliveryModeSchema,
})

// Group operations
const moveGroupSchema = z.object({
  kind: z.literal('moveGroup'),
  groupId: z.string(),
  toPageId: z.string(),
  atIndex: z.number().int().min(0).optional(),
})
const renameGroupSchema = z.object({
  kind: z.literal('renameGroup'),
  id: z.string(),
  title: z.string(),
})
const addGroupSchema = z.object({
  kind: z.literal('addGroup'),
  id: z.string().optional(),
  pageId: z.string(),
  title: z.string(),
})
const removeGroupSchema = z.object({
  kind: z.literal('removeGroup'),
  id: z.string(),
  moveFieldsTo: z.string().optional(),
})
const splitGroupSchema = z.object({
  kind: z.literal('splitGroup'),
  id: z.string(),
  newTitle: z.string(),
  fieldsToMove: z.array(z.string()),
})
const mergeGroupsSchema = z.object({
  kind: z.literal('mergeGroups'),
  intoId: z.string(),
  fromId: z.string(),
})

// Field operations
const moveFieldSchema = z.object({
  kind: z.literal('moveField'),
  fieldId: z.string(),
  toGroupId: z.string(),
  atIndex: z.number().int().min(0).optional(),
})
const reorderFieldsSchema = z.object({
  kind: z.literal('reorderFields'),
  groupId: z.string(),
  order: z.array(z.string()).min(1),
})
const relabelFieldSchema = z.object({
  kind: z.literal('relabelField'),
  id: z.string(),
  label: z.string(),
  helpText: z.string().optional(),
})
const setRequiredSchema = z.object({
  kind: z.literal('setRequired'),
  id: z.string(),
  required: z.boolean(),
})
const setFieldConditionSchema = z.object({
  kind: z.literal('setFieldCondition'),
  id: z.string(),
  condition: conditionSchema.nullable(),
})
const setFieldSensitivitySchema = z.object({
  kind: z.literal('setFieldSensitivity'),
  id: z.string(),
  level: sensitivitySchema,
})
const changeFieldTypeSchema = z.object({
  kind: z.literal('changeFieldType'),
  id: z.string(),
  fieldType: fieldTypeSchema,
  choices: z.array(z.string()).optional(),
})
const setFieldControlSchema = z.object({
  kind: z.literal('setFieldControl'),
  id: z.string(),
  control: controlSchema,
})
const addFieldSchema = z.object({
  kind: z.literal('addField'),
  id: z.string().optional(),
  groupId: z.string(),
  label: z.string(),
  fieldType: fieldTypeSchema,
  required: z.boolean(),
  control: controlSchema.optional(),
  helpText: z.string().optional(),
})
const removeFieldSchema = z.object({
  kind: z.literal('removeField'),
  id: z.string(),
})

export const commandSchema = z.discriminatedUnion('kind', [
  reorderPagesSchema,
  swapPagesSchema,
  movePageSchema,
  addPageSchema,
  removePageSchema,
  renamePageSchema,
  splitPageSchema,
  mergePagesSchema,
  setDeliveryModeSchema,
  moveGroupSchema,
  renameGroupSchema,
  addGroupSchema,
  removeGroupSchema,
  splitGroupSchema,
  mergeGroupsSchema,
  moveFieldSchema,
  reorderFieldsSchema,
  relabelFieldSchema,
  setRequiredSchema,
  setFieldConditionSchema,
  setFieldSensitivitySchema,
  changeFieldTypeSchema,
  setFieldControlSchema,
  addFieldSchema,
  removeFieldSchema,
])

export type Command = z.infer<typeof commandSchema>
