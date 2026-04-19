import type { CustomContract } from '../../contract/types'

export const spec: CustomContract = {
  kind: 'custom',
  component: 'flex-preview-banner',
  variants: [
    {
      name: 'Default',
      description: 'Banner showing the branch name with no commit SHA or editor link.',
    },
    {
      name: 'WithSha',
      description: 'Banner including an abbreviated commit SHA, indicating the exact snapshot being previewed.',
    },
    {
      name: 'WithEditLink',
      description: 'Banner with both a SHA and an "Open in editor" link for quick access to editing.',
    },
  ],
  behavior: [
    {
      description: 'Banner is rendered at page level with role="status" so screen readers announce the preview context',
      tested: false,
    },
    {
      description: 'SHA is abbreviated to 7 characters in the display',
      tested: false,
    },
  ],
}
