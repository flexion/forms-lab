import type { FC } from 'hono/jsx'
import { Prose } from './index'

export const Default: FC = () => (
  <Prose html="<p>This is a prose block with <strong>rich text</strong> content.</p>" />
)

export const WithHeadings: FC = () => (
  <Prose html="<h2>Section heading</h2><p>Paragraph content under a heading.</p><h3>Subheading</h3><p>More content here.</p>" />
)

export const WithList: FC = () => (
  <Prose html="<p>Choose an option:</p><ul><li>First item</li><li>Second item</li><li>Third item</li></ul>" />
)
