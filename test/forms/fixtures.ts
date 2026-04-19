import type { DataCollectionSpec } from '../../src/services/data-collection'
import type { FormSpec as FormSpecForms } from '../../src/services/forms/types'
import type { FormSpec as FormSpecModels } from '../../src/types/models'

/**
 * A benefits application spec exercising all 10 field types,
 * conditional groups, and conditional fields.
 */
export const testDataSpec: DataCollectionSpec = {
  id: 'benefits-app',
  title: 'Benefits Application',
  description: 'Apply for housing benefits',
  groups: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Basic contact details',
      requirements: [
        {
          id: 'full-name',
          fieldName: 'fullName',
          label: 'Full Name',
          fieldType: 'text',
          required: true,
          validation: [
            {
              type: 'minLength',
              value: 2,
              message: 'Name must be at least 2 characters',
            },
          ],
        },
        {
          id: 'email',
          fieldName: 'email',
          label: 'Email Address',
          fieldType: 'email',
          required: true,
          helpText: 'We will use this to contact you about your application',
        },
        {
          id: 'phone',
          fieldName: 'phone',
          label: 'Phone Number',
          fieldType: 'phone',
          required: false,
        },
      ],
    },
    {
      id: 'employment',
      title: 'Employment Status',
      requirements: [
        {
          id: 'employed',
          fieldName: 'employed',
          label: 'Are you currently employed?',
          fieldType: 'choice',
          required: true,
          choices: ['Yes', 'No'],
        },
        {
          id: 'employment-type',
          fieldName: 'employmentType',
          label: 'Employment Type',
          fieldType: 'choice',
          required: true,
          choices: ['Full-time', 'Part-time', 'Contract', 'Self-employed'],
          condition: { field: 'employed', operator: 'equals', value: 'Yes' },
        },
      ],
    },
    {
      id: 'income',
      title: 'Income Details',
      condition: { field: 'employed', operator: 'equals', value: 'Yes' },
      requirements: [
        {
          id: 'monthly-income',
          fieldName: 'monthlyIncome',
          label: 'Monthly Income',
          fieldType: 'currency',
          required: true,
          validation: [{ type: 'min', value: 0 }],
        },
      ],
    },
    {
      id: 'additional',
      title: 'Additional Information',
      requirements: [
        {
          id: 'start-date',
          fieldName: 'startDate',
          label: 'Desired Start Date',
          fieldType: 'date',
          required: true,
        },
        {
          id: 'website',
          fieldName: 'website',
          label: 'Personal Website',
          fieldType: 'url',
          required: false,
        },
        {
          id: 'notes',
          fieldName: 'notes',
          label: 'Additional Notes',
          fieldType: 'longText',
          required: false,
          helpText: 'Any additional information you would like to provide',
        },
        {
          id: 'dependents',
          fieldName: 'dependents',
          label: 'Number of Dependents',
          fieldType: 'number',
          required: true,
          validation: [
            { type: 'min', value: 0 },
            { type: 'max', value: 20 },
          ],
        },
        {
          id: 'agree-terms',
          fieldName: 'agreeTerms',
          label: 'I agree to the terms and conditions',
          fieldType: 'boolean',
          required: true,
        },
      ],
    },
  ],
}

/**
 * A FormSpec referencing testDataSpec (models.ts version with timestamps).
 * 3 pages: personal info, employment + income (conversational), additional details.
 * Use for project-service and storage layer tests.
 */
export const testFormSpec: FormSpecModels = {
  id: 'benefits-form',
  specId: 'benefits-app',
  title: 'Benefits Application Form',
  pages: [
    {
      id: 'page-1',
      title: 'Personal Information',
      description: 'Please provide your contact details.',
      groups: ['personal-info'],
      deliveryMode: 'static',
    },
    {
      id: 'page-2',
      title: 'Employment',
      groups: ['employment', 'income'],
      deliveryMode: 'conversational',
    },
    {
      id: 'page-3',
      title: 'Additional Details',
      groups: ['additional'],
      deliveryMode: 'static',
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

/**
 * A FormSpec with a conditional page for testing page-skip logic (forms/types.ts version).
 * Use for forms service layer tests.
 */
export const conditionalPageFormSpec: FormSpecForms = {
  id: 'conditional-form',
  specId: 'benefits-app',
  title: 'Conditional Form',
  pages: [
    {
      id: 'page-1',
      title: 'Employment',
      groups: ['employment'],
    },
    {
      id: 'page-2',
      title: 'Income',
      groups: ['income'],
      condition: { field: 'employed', operator: 'equals', value: 'Yes' },
    },
    {
      id: 'page-3',
      title: 'Additional Details',
      groups: ['additional'],
    },
  ],
}
