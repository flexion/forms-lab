import type { FC } from 'hono/jsx'

interface TagListProps {
  tags: string[]
  variant?: string
}

export const TagList: FC<TagListProps> = ({ tags, variant = 'tag' }) => {
  if (tags.length === 0) return null
  return (
    <div class="l-cluster">
      {tags.map((tag) => (
        <span key={tag} class="badge" data-variant={variant}>
          {tag}
        </span>
      ))}
    </div>
  )
}
