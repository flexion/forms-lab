import type { FC } from 'hono/jsx'
import type { DataCollectionSpec } from '../../../services/data-collection'
import type { FormSpec, SpecChange } from '../../../services/forms'
import { SpecDiffBrowser } from './index'

// ---------------------------------------------------------------------------
// Shared fixture data
// ---------------------------------------------------------------------------

const baseDataSpec: DataCollectionSpec = {
  id: 'spec-1',
  title: 'Contact Form Spec',
  description: 'Base version.',
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
  ],
}

const baseFormSpec: FormSpec = {
  id: 'form-1',
  specId: 'spec-1',
  title: 'Contact Form',
  pages: [
    {
      id: 'page-1',
      title: 'Your Information',
      groups: ['group-personal'],
    },
  ],
}

// Head spec adds a new group/field.
const headDataSpec: DataCollectionSpec = {
  id: 'spec-1',
  title: 'Contact Form Spec',
  description: 'Updated version.',
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
        {
          id: 'req-middle-name',
          fieldName: 'middleName',
          label: 'Middle name',
          fieldType: 'text',
          required: false,
        },
      ],
    },
  ],
}

const headFormSpec: FormSpec = {
  id: 'form-1',
  specId: 'spec-1',
  title: 'Contact Form',
  pages: [
    {
      id: 'page-1',
      title: 'Your Information',
      groups: ['group-personal'],
    },
  ],
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export const NoChanges: FC = () => (
  <SpecDiffBrowser
    baseDataSpec={baseDataSpec}
    baseFormSpec={baseFormSpec}
    headDataSpec={baseDataSpec}
    headFormSpec={baseFormSpec}
    changes={[]}
  />
)

export const WithAdditions: FC = () => {
  const changes: SpecChange[] = [
    {
      category: 'added',
      resource: 'data-collection-spec',
      path: ['group:group-personal', 'field:req-middle-name'],
      description: "Added field 'Middle name'",
    },
  ]
  return (
    <SpecDiffBrowser
      baseDataSpec={baseDataSpec}
      baseFormSpec={baseFormSpec}
      headDataSpec={headDataSpec}
      headFormSpec={headFormSpec}
      changes={changes}
    />
  )
}

export const InitialImport: FC = () => (
  <SpecDiffBrowser
    baseDataSpec={null}
    baseFormSpec={null}
    headDataSpec={headDataSpec}
    headFormSpec={headFormSpec}
    changes={[]}
    revealMode="all"
  />
)
