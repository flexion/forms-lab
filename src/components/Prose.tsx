import type { FC } from 'hono/jsx'
import { renderMarkdown } from '../lib/markdown'

interface ProseProps {
  content: string
}

export const Prose: FC<ProseProps> = ({ content }) => {
  const html = renderMarkdown(content)
  return <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
