import type { FC } from 'hono/jsx'
import { List } from './index'

export const UnorderedList: FC = () => (
  <List>
    <li>Milk</li>
    <li>Eggs</li>
    <li>Bread</li>
  </List>
)

export const OrderedList: FC = () => (
  <List ordered>
    <li>Preheat oven to 350 degrees.</li>
    <li>Mix dry ingredients together.</li>
    <li>Add eggs and sugar to mixture.</li>
  </List>
)

export const UnstyledList: FC = () => (
  <List variant="unstyled">
    <li>Milk</li>
    <li>Eggs</li>
    <li>Bread</li>
  </List>
)
