import { describe, expect, it } from 'bun:test'
import { SpecBrowser } from '../../../src/design-system/components/flex-spec-browser'
import type { DataCollectionSpec } from '../../../src/services/data-collection'
import type { FormSpec } from '../../../src/services/forms/types'
import type { FieldConfidence } from '../../../src/types/models'

const dataSpec: DataCollectionSpec = {
  id: 'spec-1',
  title: 'Sample Spec',
  description: 'A sample spec for tests.',
  groups: [
    {
      id: 'g-identity',
      title: 'Identity',
      description: 'Basic identifying info',
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
  ],
}

const formSpec: FormSpec = {
  id: 'form-1',
  specId: 'spec-1',
  title: 'Sample Form',
  pages: [
    {
      id: 'p-start',
      title: 'Getting started',
      description: 'A friendly intro page.',
      groups: ['g-identity'],
      deliveryMode: 'static',
    },
    {
      id: 'p-contact',
      title: 'Contact information',
      groups: ['g-contact'],
      deliveryMode: 'conversational',
    },
  ],
}

const confidence: FieldConfidence[] = [
  { fieldId: 'f-dob', confidence: 0.4, flags: ['ambiguous-type'] },
  { fieldId: 'f-email', confidence: 0.95 },
]

function render() {
  return (
    SpecBrowser({
      dataSpec,
      formSpec,
      confidence,
    })?.toString() ?? ''
  )
}

describe('flex-spec-browser', () => {
  it('renders a nav link for every page and group', () => {
    const html = render()

    // Wrapper custom element
    expect(html).toContain('<flex-spec-browser')

    // Nav heading
    expect(html).toContain('On this form')

    // Nav links for pages
    expect(html).toContain('href="#page-p-start"')
    expect(html).toContain('href="#page-p-contact"')

    // Groups nested under their parent pages in the sidebar nav
    expect(html).toContain('href="#group-g-identity"')
    expect(html).toContain('href="#group-g-contact"')
    expect(html).toContain('flex-spec-browser__nav-sublist')
    expect(html).toContain('flex-spec-browser__nav-link--sub')
  })

  it('renders <details> panels with correct ids, expanded by default', () => {
    const html = render()

    // Page panels
    expect(html).toMatch(/<details[^>]*id="page-p-start"[^>]*open/)
    expect(html).toMatch(/<details[^>]*id="page-p-contact"[^>]*open/)
    // Group panels
    expect(html).toMatch(/<details[^>]*id="group-g-identity"[^>]*open/)
    expect(html).toMatch(/<details[^>]*id="group-g-contact"[^>]*open/)

    // Delivery badges
    expect(html).toContain('data-delivery="static"')
    expect(html).toContain('data-delivery="conversational"')

    // Page summary text
    expect(html).toContain('Getting started')
    expect(html).toContain('Contact information')

    // Field rows from group tables
    expect(html).toContain('Full name')
    expect(html).toContain('Date of birth')
    expect(html).toContain('Email')
  })

  it('renders a confidence badge for low-confidence fields and hides it for high-confidence', () => {
    const html = render()

    // Low confidence (0.4) -> "Low confidence" label on the badge element
    expect(html).toContain('flex-confidence-badge')
    expect(html).toContain('Low confidence')

    // High confidence (0.95) field produces no badge and no label substring
    // for that specific field. We verify there's only one badge overall.
    const badgeMatches = html.match(/flex-confidence-badge/g) ?? []
    expect(badgeMatches.length).toBe(1)
  })

  it('honors defaultExpanded="first"', () => {
    const html =
      SpecBrowser({
        dataSpec,
        formSpec,
        defaultExpanded: 'first',
      })?.toString() ?? ''

    // First page panel is open, second is not
    expect(html).toMatch(/<details[^>]*id="page-p-start"[^>]*open/)
    expect(html).not.toMatch(/<details[^>]*id="page-p-contact"[^>]*open/)
  })

  it('links out to spec.json and form.json when blobBasePath is provided', () => {
    const html =
      SpecBrowser({
        dataSpec,
        formSpec,
        blobBasePath: '/alice/demo/blob/main',
      })?.toString() ?? ''

    expect(html).toContain('/alice/demo/blob/main/forms/default/form.json')
    expect(html).toContain('/alice/demo/blob/main/forms/default/spec.json')
  })
})
