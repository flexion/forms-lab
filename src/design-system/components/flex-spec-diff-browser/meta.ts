import type { ComponentMeta } from '../../types'

export const meta: ComponentMeta = {
  name: 'Spec Diff Browser',
  slug: 'flex-spec-diff-browser',
  category: 'feedback',
  description:
    'Annotated single-column diff of a form spec. Renders the head tree with inline change badges, before/after rows for modified fields, and base-only entries spliced in for removed pages, groups, and fields. Tops the view with an overview strip of change counts and jump-links.',
  kind: 'custom',
  interactive: true,
}
