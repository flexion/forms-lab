import type { FC } from 'hono/jsx'
import { Tag } from './index'

export const Default: FC = () => <Tag>New</Tag>

export const Big: FC = () => <Tag size="big">New</Tag>

export const MultipleTags: FC = () => (
  <div>
    <Tag>Info</Tag>
    <Tag>Draft</Tag>
    <Tag>Pending</Tag>
  </div>
)
