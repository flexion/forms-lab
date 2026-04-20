import { tool } from 'ai'
import { z } from 'zod'

const deliveryMode = z.enum(['static', 'conversational', 'hybrid'])
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
const sensitivity = z.enum(['low', 'medium', 'high', 'pii'])
const control = z.enum(['radio', 'select', 'checkbox', 'toggle'])
const condition = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const commandTools = {
  reorderPages: tool({
    description:
      'Reorder all pages into a new sequence. Provide a permutation of all existing page ids.',
    inputSchema: z.object({ order: z.array(z.string()).min(1) }),
  }),
  swapPages: tool({
    description:
      'Swap the positions of two pages in the form. Use this for simple exchanges like "swap pages 2 and 3".',
    inputSchema: z.object({ a: z.string(), b: z.string() }),
  }),
  movePage: tool({
    description:
      'Move a single page to a specific index in the pages array (0-based).',
    inputSchema: z.object({
      id: z.string(),
      toIndex: z.number().int().min(0),
    }),
  }),
  addPage: tool({
    description:
      'Add a new empty page. Optionally specify afterPageId to insert in place. Provide id if you need to reference this page in subsequent commands.',
    inputSchema: z.object({
      id: z.string().optional(),
      afterPageId: z.string().optional(),
      title: z.string(),
      deliveryMode: deliveryMode.optional(),
    }),
  }),
  removePage: tool({
    description:
      'Remove a page. If the page has groups, specify moveGroupsTo so they are relocated.',
    inputSchema: z.object({
      id: z.string(),
      moveGroupsTo: z.string().optional(),
    }),
  }),
  renamePage: tool({
    description: 'Change the title of an existing page.',
    inputSchema: z.object({ id: z.string(), title: z.string() }),
  }),
  splitPage: tool({
    description:
      'Split a page by moving some of its groups to a new page that appears right after the original.',
    inputSchema: z.object({
      id: z.string(),
      newTitle: z.string(),
      groupsToMove: z.array(z.string()),
    }),
  }),
  mergePages: tool({
    description:
      'Merge the groups of one page into another. The source page is removed.',
    inputSchema: z.object({ intoId: z.string(), fromId: z.string() }),
  }),
  setDeliveryMode: tool({
    description:
      'Set how a page is delivered to users: static (traditional form), conversational (guided step-by-step), or hybrid.',
    inputSchema: z.object({ pageId: z.string(), mode: deliveryMode }),
  }),
  moveGroup: tool({
    description:
      'Move a requirement group from its current page to a different page.',
    inputSchema: z.object({
      groupId: z.string(),
      toPageId: z.string(),
      atIndex: z.number().int().min(0).optional(),
    }),
  }),
  renameGroup: tool({
    description: 'Change the title of a requirement group.',
    inputSchema: z.object({ id: z.string(), title: z.string() }),
  }),
  addGroup: tool({
    description:
      'Add a new empty group to a page. Provide id if you need to reference this group in subsequent commands (e.g., to add fields to it).',
    inputSchema: z.object({
      id: z.string().optional(),
      pageId: z.string(),
      title: z.string(),
    }),
  }),
  removeGroup: tool({
    description:
      'Remove a group. If it has fields, specify moveFieldsTo to relocate them.',
    inputSchema: z.object({
      id: z.string(),
      moveFieldsTo: z.string().optional(),
    }),
  }),
  splitGroup: tool({
    description:
      'Split a group by moving some of its fields to a new group on the same page.',
    inputSchema: z.object({
      id: z.string(),
      newTitle: z.string(),
      fieldsToMove: z.array(z.string()),
    }),
  }),
  mergeGroups: tool({
    description:
      'Merge the fields of one group into another. The source group is removed.',
    inputSchema: z.object({ intoId: z.string(), fromId: z.string() }),
  }),
  moveField: tool({
    description: 'Move a field from its current group to a different group.',
    inputSchema: z.object({
      fieldId: z.string(),
      toGroupId: z.string(),
      atIndex: z.number().int().min(0).optional(),
    }),
  }),
  reorderFields: tool({
    description:
      "Reorder fields within a group. Provide a permutation of the group's field ids.",
    inputSchema: z.object({
      groupId: z.string(),
      order: z.array(z.string()).min(1),
    }),
  }),
  relabelField: tool({
    description:
      "Change a field's label (the question wording shown to users) and optionally its help text.",
    inputSchema: z.object({
      id: z.string(),
      label: z.string(),
      helpText: z.string().optional(),
    }),
  }),
  setRequired: tool({
    description: 'Mark a field as required or optional.',
    inputSchema: z.object({ id: z.string(), required: z.boolean() }),
  }),
  setFieldCondition: tool({
    description:
      'Set or clear a condition that controls when a field is shown. Pass null to clear.',
    inputSchema: z.object({
      id: z.string(),
      condition: condition.nullable(),
    }),
  }),
  setFieldSensitivity: tool({
    description:
      "Classify a field's privacy sensitivity: low, medium, high, or pii.",
    inputSchema: z.object({ id: z.string(), level: sensitivity }),
  }),
  changeFieldType: tool({
    description:
      "Change a field's type (e.g., text to date). For choice fields, include the choices array.",
    inputSchema: z.object({
      id: z.string(),
      fieldType,
      choices: z.array(z.string()).optional(),
    }),
  }),
  setFieldControl: tool({
    description:
      'Set the input control for a field: radio or select for choice fields, checkbox or toggle for boolean.',
    inputSchema: z.object({ id: z.string(), control }),
  }),
  addField: tool({
    description:
      'Add a new field to a group. Optionally specify id (to reference in later commands), control (only needed to override the default for the field type), and helpText. Use these shortcuts to avoid separate setFieldControl / relabelField commands.',
    inputSchema: z.object({
      id: z.string().optional(),
      groupId: z.string(),
      label: z.string(),
      fieldType,
      required: z.boolean(),
      control: control.optional(),
      helpText: z.string().optional(),
    }),
  }),
  removeField: tool({
    description: 'Remove a field from its group.',
    inputSchema: z.object({ id: z.string() }),
  }),
}
