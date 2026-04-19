import { describe, expect, it } from 'bun:test'
import type { DataCollectionSpec } from '../../../src/services/data-collection'
import type { FormSpec } from '../../../src/services/forms'
import { buildFormPreview } from '../../../src/services/forms/preview'

const dataSpec: DataCollectionSpec = {
  id: 'f1',
  title: 'Test',
  description: '',
  groups: [
    {
      id: 'contact',
      title: 'Contact',
      description: 'Your contact info',
      requirements: [
        {
          id: 'r1',
          fieldName: 'email',
          label: 'Email',
          fieldType: 'email',
          required: true,
          helpText: 'We will contact you here',
        },
        {
          id: 'r2',
          fieldName: 'phone',
          label: 'Phone',
          fieldType: 'phone',
          required: false,
        },
      ],
    },
  ],
}

const formSpec: FormSpec = {
  id: 'f1',
  specId: 'f1',
  title: 'Test',
  pages: [
    {
      id: 'p1',
      title: 'Contact page',
      description: 'Reach us',
      groups: ['contact'],
      deliveryMode: 'static',
    },
  ],
}

describe('buildFormPreview', () => {
  it('resolves pages, groups, and fields from the two specs', () => {
    const preview = buildFormPreview(dataSpec, formSpec)
    expect(preview).toHaveLength(1)
    const page = preview[0]
    if (!page) throw new Error('expected page')
    expect(page.id).toBe('p1')
    expect(page.title).toBe('Contact page')
    expect(page.description).toBe('Reach us')
    expect(page.deliveryMode).toBe('static')
    expect(page.groups).toHaveLength(1)
    const group = page.groups[0]
    if (!group) throw new Error('expected group')
    expect(group.id).toBe('contact')
    expect(group.title).toBe('Contact')
    expect(group.fields).toHaveLength(2)
    expect(group.fields[0]).toMatchObject({
      id: 'r1',
      fieldName: 'email',
      label: 'Email',
      fieldType: 'email',
      required: true,
      helpText: 'We will contact you here',
    })
    expect(group.fields[1]).toMatchObject({
      fieldName: 'phone',
      required: false,
    })
  })

  it('defaults deliveryMode to static when absent', () => {
    const preview = buildFormPreview(dataSpec, {
      ...formSpec,
      pages: [{ id: 'p1', title: 'P', groups: ['contact'] }],
    })
    expect(preview[0]?.deliveryMode).toBe('static')
  })

  it('marks missing groups rather than throwing', () => {
    const preview = buildFormPreview(dataSpec, {
      ...formSpec,
      pages: [
        {
          id: 'p1',
          title: 'P',
          groups: ['does-not-exist'],
          deliveryMode: 'static',
        },
      ],
    })
    const group = preview[0]?.groups[0]
    expect(group?.missing).toBe(true)
    expect(group?.fields).toEqual([])
    expect(group?.title).toContain('does-not-exist')
  })

  it('returns an empty array for a form with no pages', () => {
    const preview = buildFormPreview(dataSpec, { ...formSpec, pages: [] })
    expect(preview).toEqual([])
  })
})
