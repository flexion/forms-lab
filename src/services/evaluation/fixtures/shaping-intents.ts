/**
 * Scripted shaping intents for the shaping-model-comparison evaluation suite.
 *
 * Reuses the 6 representative intents from the shaping-architecture qualitative
 * comparison (catalog/experiments/shaping-architecture/_suite.md), now with
 * concrete expected Command[] outputs for deterministic scoring.
 */
import type { DataCollectionSpec } from '../../../services/data-collection/types'
import type { Command, ProjectState } from '../../../services/forms/shaping/commands'
import type { FormSpec } from '../../../services/forms/types'
import type { ShapingGroundTruth } from '../kinds/shaping-commands'

// ---------------------------------------------------------------------------
// Shared fixture: a 5-page form with groups and fields
// ---------------------------------------------------------------------------

const fixtureFormSpec: FormSpec = {
  id: 'fixture-form',
  specId: 'fixture-spec',
  title: 'Benefits Application',
  description: 'A realistic multi-page government form for evaluation.',
  pages: [
    {
      id: 'page-1',
      title: 'Personal Information',
      groups: ['personal-info'],
      deliveryMode: 'static',
    },
    {
      id: 'page-2',
      title: 'Current Employment',
      groups: ['employment-current'],
      deliveryMode: 'static',
    },
    {
      id: 'page-3',
      title: 'Previous Employment',
      groups: ['employment-previous'],
      deliveryMode: 'static',
    },
    {
      id: 'page-4',
      title: 'Military Service',
      groups: ['military-service'],
      deliveryMode: 'static',
    },
    {
      id: 'page-5',
      title: 'Review & Submit',
      groups: ['review'],
      deliveryMode: 'static',
    },
  ],
}

const fixtureDataSpec: DataCollectionSpec = {
  id: 'fixture-spec',
  title: 'Benefits Application',
  description: 'Data collection spec for the benefits application fixture.',
  groups: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      requirements: [
        {
          id: 'firstName',
          fieldName: 'firstName',
          label: 'First name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'middleName',
          fieldName: 'middleName',
          label: 'Middle name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'lastName',
          fieldName: 'lastName',
          label: 'Last name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'dateOfBirth',
          fieldName: 'dateOfBirth',
          label: 'Date of birth',
          fieldType: 'date',
          required: true,
        },
        {
          id: 'email',
          fieldName: 'email',
          label: 'Email address',
          fieldType: 'email',
          required: true,
        },
      ],
    },
    {
      id: 'employment-current',
      title: 'Current Employment',
      requirements: [
        {
          id: 'currentEmployer',
          fieldName: 'currentEmployer',
          label: 'Current employer',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'currentJobTitle',
          fieldName: 'currentJobTitle',
          label: 'Job title',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'currentStartDate',
          fieldName: 'currentStartDate',
          label: 'Start date',
          fieldType: 'date',
          required: true,
        },
      ],
    },
    {
      id: 'employment-previous',
      title: 'Previous Employment',
      requirements: [
        {
          id: 'previousEmployer',
          fieldName: 'previousEmployer',
          label: 'Previous employer',
          fieldType: 'text',
          required: false,
        },
        {
          id: 'previousJobTitle',
          fieldName: 'previousJobTitle',
          label: 'Previous job title',
          fieldType: 'text',
          required: false,
        },
        {
          id: 'previousEndDate',
          fieldName: 'previousEndDate',
          label: 'End date',
          fieldType: 'date',
          required: false,
        },
      ],
    },
    {
      id: 'military-service',
      title: 'Military Service',
      requirements: [
        {
          id: 'branch',
          fieldName: 'branch',
          label: 'Branch of service',
          fieldType: 'choice',
          required: false,
          choices: ['Army', 'Navy', 'Air Force', 'Marines', 'Coast Guard'],
        },
        {
          id: 'serviceYears',
          fieldName: 'serviceYears',
          label: 'Years of service',
          fieldType: 'number',
          required: false,
        },
      ],
    },
    {
      id: 'review',
      title: 'Review & Submit',
      requirements: [
        {
          id: 'certify',
          fieldName: 'certify',
          label: 'I certify that the information above is accurate',
          fieldType: 'boolean',
          required: true,
        },
      ],
    },
  ],
}

export const fixtureProjectState: ProjectState = {
  formSpec: fixtureFormSpec,
  dataSpec: fixtureDataSpec,
}

// ---------------------------------------------------------------------------
// Scripted intents with expected commands
// ---------------------------------------------------------------------------

export interface ShapingIntentFixture {
  id: string
  intent: string
  expectedCommands: Command[]
  groundTruth: ShapingGroundTruth
}

const intents: Array<Omit<ShapingIntentFixture, 'groundTruth'>> = [
  {
    id: 'swap-pages',
    intent: 'Swap pages 2 and 3',
    expectedCommands: [{ kind: 'swapPages', a: 'page-2', b: 'page-3' }],
  },
  {
    id: 'merge-employment',
    intent: 'Combine the two employment pages into one',
    expectedCommands: [
      {
        kind: 'mergePages',
        intoId: 'page-2',
        fromId: 'page-3',
      },
    ],
  },
  {
    id: 'optional-middle-name',
    intent: 'Make the middle-name field optional',
    expectedCommands: [
      { kind: 'setRequired', id: 'middleName', required: false },
    ],
  },
  {
    id: 'move-military',
    intent: "Move 'military service' to page 4",
    expectedCommands: [
      {
        kind: 'moveGroup',
        groupId: 'military-service',
        toPageId: 'page-4',
      },
    ],
  },
  {
    id: 'rename-personal-info',
    intent: "Rename 'personal info' to 'applicant information'",
    expectedCommands: [
      {
        kind: 'renamePage',
        id: 'page-1',
        title: 'Applicant Information',
      },
    ],
  },
  {
    id: 'suggest-delivery-modes',
    intent:
      'Suggest delivery modes for each section based on complexity',
    expectedCommands: [
      { kind: 'setDeliveryMode', pageId: 'page-1', mode: 'static' },
      { kind: 'setDeliveryMode', pageId: 'page-2', mode: 'static' },
      { kind: 'setDeliveryMode', pageId: 'page-3', mode: 'static' },
      {
        kind: 'setDeliveryMode',
        pageId: 'page-4',
        mode: 'conversational',
      },
      { kind: 'setDeliveryMode', pageId: 'page-5', mode: 'static' },
    ],
  },
]

export const shapingIntentFixtures: ShapingIntentFixture[] = intents.map(
  (fixture) => ({
    ...fixture,
    groundTruth: {
      intent: fixture.intent,
      expectedCommands: fixture.expectedCommands,
    },
  }),
)
