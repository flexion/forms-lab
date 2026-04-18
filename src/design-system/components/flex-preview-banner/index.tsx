import type { FC } from 'hono/jsx'

interface PreviewBannerProps {
  branch: string
  editHref?: string
  sha?: string
}

/**
 * Full-width warning banner shown at the top of branch-qualified form pages.
 * Indicates the user is viewing a non-production preview and that submissions
 * will be pinned to the branch's current commit.
 */
export const PreviewBanner: FC<PreviewBannerProps> = ({
  branch,
  editHref,
  sha,
}) => (
  <div class="flex-preview-banner" role="status" aria-label="Preview banner">
    <div class="flex-preview-banner__body">
      <span class="flex-preview-banner__label">Preview</span>
      <span class="flex-preview-banner__text">
        You are viewing a preview on branch{' '}
        <strong class="flex-preview-banner__branch">{branch}</strong>.
        Submissions reference this version
        {sha ? (
          <>
            {' '}
            (<code class="flex-preview-banner__sha">{sha.slice(0, 7)}</code>)
          </>
        ) : null}
        .
      </span>
      {editHref ? (
        <a class="flex-preview-banner__link" href={editHref}>
          Open in editor
        </a>
      ) : null}
    </div>
  </div>
)
