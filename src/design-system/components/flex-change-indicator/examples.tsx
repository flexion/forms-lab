import type { FC } from 'hono/jsx'
import { ChangeIndicator } from './index'

export const Added: FC = () => <ChangeIndicator variant="added" />

export const Removed: FC = () => <ChangeIndicator variant="removed" />

export const Modified: FC = () => <ChangeIndicator variant="modified" />

export const WithLabel: FC = () => (
  <ChangeIndicator variant="modified" label="Updated field" />
)
