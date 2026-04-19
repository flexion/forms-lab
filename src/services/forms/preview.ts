/**
 * Stateless form preview — resolves a {dataSpec, formSpec} pair into a
 * read-only shape for rendering in the review page's Preview tab.
 *
 * No session, no values, no submit — just enough structure for a
 * reviewer to see the form's pages, groups, and fields.
 */

import type { DataCollectionSpec } from '../data-collection'
import type { DeliveryMode, FormSpec } from './types'

export interface PreviewField {
  id: string
  fieldName: string
  label: string
  fieldType: string
  required: boolean
  helpText?: string
}

export interface PreviewGroup {
  id: string
  title: string
  description?: string
  fields: PreviewField[]
  missing?: boolean
}

export interface PreviewPage {
  id: string
  title: string
  description?: string
  deliveryMode: DeliveryMode
  groups: PreviewGroup[]
}

export function buildFormPreview(
  dataSpec: DataCollectionSpec,
  formSpec: FormSpec,
): PreviewPage[] {
  const groupMap = new Map(dataSpec.groups.map((g) => [g.id, g]))
  return formSpec.pages.map((page) => ({
    id: page.id,
    title: page.title,
    description: page.description,
    deliveryMode: page.deliveryMode ?? 'static',
    groups: page.groups.map((gid) => {
      const group = groupMap.get(gid)
      if (!group) {
        return {
          id: gid,
          title: `(missing group: ${gid})`,
          fields: [],
          missing: true,
        }
      }
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        fields: group.requirements.map((r) => ({
          id: r.id,
          fieldName: r.fieldName,
          label: r.label,
          fieldType: r.fieldType,
          required: r.required,
          helpText: r.helpText,
        })),
      }
    }),
  }))
}
