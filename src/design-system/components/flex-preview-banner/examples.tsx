import type { FC } from 'hono/jsx'
import { PreviewBanner } from './index'

export const Default: FC = () => <PreviewBanner branch="story-1/intake-form" />

export const WithSha: FC = () => (
  <PreviewBanner branch="story-1/intake-form" sha="abc1234def5678" />
)

export const WithEditLink: FC = () => (
  <PreviewBanner
    branch="story-2/pdf-extract"
    sha="abc1234def5678"
    editHref="/editor/forms/default"
  />
)
