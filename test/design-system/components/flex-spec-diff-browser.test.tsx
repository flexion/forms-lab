import { describe, expect, it } from 'bun:test'
import { SpecDiffBrowser } from '../../../src/design-system/components/flex-spec-diff-browser'
import type { DataCollectionSpec } from '../../../src/services/data-collection'
import type { FormSpec, SpecChange } from '../../../src/services/forms'

// Base fixture: a two-page form with identity + contact groups.
const baseDataSpec: DataCollectionSpec = {
  id: 'spec-1',
  title: 'Sample',
  description: 'Sample spec',
  groups: [
    {
      id: 'g-identity',
      title: 'Identity',
      requirements: [
        {
          id: 'f-name',
          fieldName: 'name',
          label: 'Full name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'f-dob',
          fieldName: 'dob',
          label: 'Date of birth',
          fieldType: 'date',
          required: true,
        },
      ],
    },
    {
      id: 'g-contact',
      title: 'Contact',
      requirements: [
        {
          id: 'f-email',
          fieldName: 'email',
          label: 'Email',
          fieldType: 'email',
          required: false,
        },
      ],
    },
    {
      id: 'g-extra',
      title: 'Extras',
      requirements: [
        {
          id: 'f-note',
          fieldName: 'note',
          label: 'Note',
          fieldType: 'text',
          required: false,
        },
      ],
    },
  ],
}

const baseFormSpec: FormSpec = {
  id: 'form-1',
  specId: 'spec-1',
  title: 'Sample Form',
  pages: [
    {
      id: 'p-start',
      title: 'Getting started',
      groups: ['g-identity'],
      deliveryMode: 'static',
    },
    {
      id: 'p-contact',
      title: 'Contact information',
      groups: ['g-contact'],
      deliveryMode: 'static',
    },
    {
      id: 'p-extras',
      title: 'Extras',
      groups: ['g-extra'],
      deliveryMode: 'static',
    },
  ],
}

// Head fixture: adds a new "Address" field to contact, modifies the name
// label, removes the Extras page entirely.
const headDataSpec: DataCollectionSpec = {
  id: 'spec-1',
  title: 'Sample',
  description: 'Sample spec',
  groups: [
    {
      id: 'g-identity',
      title: 'Identity',
      requirements: [
        {
          id: 'f-name',
          fieldName: 'name',
          label: 'Legal name',
          fieldType: 'text',
          required: true,
        },
        {
          id: 'f-dob',
          fieldName: 'dob',
          label: 'Date of birth',
          fieldType: 'date',
          required: true,
        },
      ],
    },
    {
      id: 'g-contact',
      title: 'Contact',
      requirements: [
        {
          id: 'f-email',
          fieldName: 'email',
          label: 'Email',
          fieldType: 'email',
          required: false,
        },
        {
          id: 'f-address',
          fieldName: 'address',
          label: 'Mailing address',
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
  title: 'Sample Form',
  pages: [
    {
      id: 'p-start',
      title: 'Getting started',
      groups: ['g-identity'],
      deliveryMode: 'static',
    },
    {
      id: 'p-contact',
      title: 'Contact information',
      groups: ['g-contact'],
      deliveryMode: 'static',
    },
  ],
}

const changes: SpecChange[] = [
  {
    category: 'modified',
    resource: 'data-collection-spec',
    path: ['group:g-identity', 'field:f-name'],
    description: 'Field "Legal name": relabeled "Full name" to "Legal name"',
  },
  {
    category: 'added',
    resource: 'data-collection-spec',
    path: ['group:g-contact', 'field:f-address'],
    description: 'Added field "Mailing address" to group',
  },
  {
    category: 'removed',
    resource: 'data-collection-spec',
    path: ['group:g-extra'],
    description: 'Removed requirement group: "Extras"',
  },
  {
    category: 'removed',
    resource: 'form-spec',
    path: ['page:p-extras'],
    description: 'Removed page: "Extras"',
  },
]

function render(
  overrides: Partial<Parameters<typeof SpecDiffBrowser>[0]> = {},
) {
  return (
    SpecDiffBrowser({
      baseDataSpec,
      baseFormSpec,
      headDataSpec,
      headFormSpec,
      changes,
      ...overrides,
    })?.toString() ?? ''
  )
}

describe('flex-spec-diff-browser', () => {
  it('renders the overview strip with change counts', () => {
    const html = render()
    expect(html).toContain('flex-spec-diff-browser__overview')
    // One added, one modified, two removed
    expect(html).toContain('1 added')
    expect(html).toContain('1 modified')
    expect(html).toContain('2 removed')
  })

  it('renders a jump-link for every page with changes', () => {
    const html = render()
    // p-start has a modified field
    expect(html).toContain('href="#page-p-start"')
    // p-contact has an added field
    expect(html).toContain('href="#page-p-contact"')
    // p-extras was removed entirely
    expect(html).toContain('href="#page-p-extras"')
    // All should show up in the jump-list label
    expect(html).toContain('Pages with changes:')
  })

  it('marks added fields with data-change="added"', () => {
    const html = render()
    // The added field should be wrapped in an element with data-change="added"
    expect(html).toMatch(
      /id="field-f-address"[^>]*class="flex-spec-diff-browser__field"[^>]*data-change="added"/,
    )
    // And show the "+ New" badge
    expect(html).toContain('+ New')
  })

  it('renders modified fields with both the head value and the "was" row', () => {
    const html = render()
    // Modified field container
    expect(html).toMatch(/id="field-f-name"[^>]*data-change="modified"/)
    // The head label renders
    expect(html).toContain('Legal name')
    // The before/after "was:" marker row renders with the base label
    expect(html).toContain('was:')
    expect(html).toContain('Full name')
  })

  it('renders removed fields and pages from base with data-change="removed"', () => {
    const html = render()
    // Removed page panel exists at id=page-p-extras
    expect(html).toMatch(
      /<details[^>]*id="page-p-extras"[^>]*data-change="removed"/,
    )
    // And the group inside it is also rendered from base
    expect(html).toMatch(/id="group-g-extra"[^>]*data-change="removed"/)
    // Plus the field from that group
    expect(html).toMatch(/id="field-f-note"[^>]*data-change="removed"/)
    // A - Removed badge is present
    expect(html).toContain('- Removed')
  })

  it('collapses unchanged groups when revealMode="changed"', () => {
    // With revealMode='changed', the g-identity group on p-start has a
    // modified field (open) but would the contact page's identity group
    // be unchanged... To get an unchanged group in an open page we add
    // another group on p-start that has no changes. Simulate by crafting
    // a richer fixture inline:
    const richHead: DataCollectionSpec = {
      ...headDataSpec,
      groups: [
        ...headDataSpec.groups,
        {
          id: 'g-notes',
          title: 'Notes',
          requirements: [
            {
              id: 'f-notes',
              fieldName: 'notes',
              label: 'Notes',
              fieldType: 'text',
              required: false,
            },
          ],
        },
      ],
    }
    const richBase: DataCollectionSpec = {
      ...baseDataSpec,
      groups: [
        ...baseDataSpec.groups,
        {
          id: 'g-notes',
          title: 'Notes',
          requirements: [
            {
              id: 'f-notes',
              fieldName: 'notes',
              label: 'Notes',
              fieldType: 'text',
              required: false,
            },
          ],
        },
      ],
    }
    const richHeadForm: FormSpec = {
      ...headFormSpec,
      pages: [
        {
          id: 'p-start',
          title: 'Getting started',
          groups: ['g-identity', 'g-notes'],
          deliveryMode: 'static',
        },
        ...headFormSpec.pages.slice(1),
      ],
    }
    const richBaseForm: FormSpec = {
      ...baseFormSpec,
      pages: [
        {
          id: 'p-start',
          title: 'Getting started',
          groups: ['g-identity', 'g-notes'],
          deliveryMode: 'static',
        },
        ...baseFormSpec.pages.slice(1),
      ],
    }
    const html = render({
      baseDataSpec: richBase,
      baseFormSpec: richBaseForm,
      headDataSpec: richHead,
      headFormSpec: richHeadForm,
      revealMode: 'changed',
    })

    // The unchanged group shows its "N fields, unchanged" summary
    expect(html).toContain('unchanged')
    // And renders <details> that is NOT open for that group
    expect(html).toMatch(/<details[^>]*id="group-g-notes"(?![^>]*\bopen)[^>]*>/)
  })

  it('opens every panel when revealMode="all"', () => {
    const html = render({ revealMode: 'all' })
    // Every head page panel should be open
    expect(html).toMatch(/<details[^>]*id="page-p-start"[^>]*\bopen/)
    expect(html).toMatch(/<details[^>]*id="page-p-contact"[^>]*\bopen/)
  })

  it('defaults to revealMode="all" for initial-import (null base)', () => {
    const html = render({
      baseDataSpec: null,
      baseFormSpec: null,
      changes: headDataSpec.groups.flatMap((g) =>
        g.requirements.map(
          (r): SpecChange => ({
            category: 'added',
            resource: 'data-collection-spec',
            path: [`group:${g.id}`, `field:${r.id}`],
            description: `Added field "${r.label}"`,
          }),
        ),
      ),
    })
    // All head page panels render as open — initial-import has nothing
    // meaningful to collapse.
    expect(html).toMatch(/<details[^>]*id="page-p-start"[^>]*\bopen/)
    expect(html).toMatch(/<details[^>]*id="page-p-contact"[^>]*\bopen/)
  })

  it('renders the empty-state message when there are no changes', () => {
    const html = render({ changes: [] })
    expect(html).toContain('These refs are identical.')
  })
})
