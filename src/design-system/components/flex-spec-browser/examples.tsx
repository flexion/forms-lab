import type { FC } from 'hono/jsx'
import type { DataCollectionSpec } from '../../../services/data-collection'
import type { FormSpec } from '../../../services/forms'
import { SpecBrowser } from './index'

const minimalDataSpec: DataCollectionSpec = {
  id: 'spec-1',
  title: 'Contact Form Spec',
  description: 'Fields required for contact information.',
  groups: [
    {
      id: 'group-personal',
      title: 'Personal Information',
      requirements: [
        {
          id: 'req-first-name',
          fieldName: 'firstName',
          label: 'First name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'req-last-name',
          fieldName: 'lastName',
          label: 'Last name',
          fieldType: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'group-contact',
      title: 'Contact Details',
      requirements: [
        {
          id: 'req-email',
          fieldName: 'email',
          label: 'Email address',
          fieldType: 'email',
          required: true,
        },
      ],
    },
  ],
}

const minimalFormSpec: FormSpec = {
  id: 'form-1',
  specId: 'spec-1',
  title: 'Contact Form',
  pages: [
    {
      id: 'page-1',
      title: 'Your Information',
      groups: ['group-personal', 'group-contact'],
    },
  ],
}

export const Default: FC = () => (
  <SpecBrowser dataSpec={minimalDataSpec} formSpec={minimalFormSpec} />
)

export const WithConfidence: FC = () => (
  <SpecBrowser
    dataSpec={minimalDataSpec}
    formSpec={minimalFormSpec}
    confidence={[
      { fieldId: 'req-first-name', confidence: 0.95, flags: [] },
      { fieldId: 'req-last-name', confidence: 0.6, flags: [] },
      { fieldId: 'req-email', confidence: 0.35, flags: ['ambiguous layout'] },
    ]}
  />
)
