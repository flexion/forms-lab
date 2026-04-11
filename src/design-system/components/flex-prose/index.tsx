import type { FC } from 'hono/jsx'

interface ProseProps {
  html: string
}

export const Prose: FC<ProseProps> = ({ html }) => {
  return <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
