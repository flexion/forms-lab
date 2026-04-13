import type { FC } from 'hono/jsx'
import { Tag } from '../flex-tag'

interface TagListProps {
  tags: string[]
}

export const TagList: FC<TagListProps> = ({ tags }) => {
  if (tags.length === 0) return null
  return (
    <div class="l-cluster">
      {tags.map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
    </div>
  )
}
