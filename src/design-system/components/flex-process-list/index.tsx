import type { Child, FC } from 'hono/jsx'

interface ProcessListItem {
  heading: string
  content: Child
}

interface ProcessListProps {
  items: ProcessListItem[]
}

export const ProcessList: FC<ProcessListProps> = ({ items }) => {
  return (
    <ol class="flex-process-list">
      {items.map((item) => (
        <li class="flex-process-list__item">
          <h4 class="flex-process-list__heading">{item.heading}</h4>
          <p>{item.content}</p>
        </li>
      ))}
    </ol>
  )
}
