import type { FC } from 'hono/jsx'
import {
  SemanticDiff,
  type SemanticDiffChange,
} from '../../../../../design-system/components/flex-semantic-diff'
import { SpecDiffBrowser } from '../../../../../design-system/components/flex-spec-diff-browser'
import { VariantBadge } from '../../../../../design-system/components/flex-variant-badge'
import type {
  ChangeResource,
  SpecChange,
} from '../../../../../services/forms/comparison'
import type { Comment } from '../../../../../services/forms/review'
import type {
  ProjectView,
  ShapingLogEntry,
} from '../../../../../services/project-service'
import { resolveUrl } from '../../../../../shared/base-path'

const RESOURCE_LABELS: Record<ChangeResource, string> = {
  'data-collection-spec': 'Data collection spec',
  'form-spec': 'Form spec',
}

function toSemanticDiffChanges(changes: SpecChange[]): SemanticDiffChange[] {
  return changes.map((change) => ({
    category: change.category,
    groupKey: change.resource,
    groupLabel: RESOURCE_LABELS[change.resource],
    description: change.description,
  }))
}

export interface ReviewPageProps {
  owner: string
  slug: string
  base: string
  head: string
  changes: SpecChange[]
  comments: Comment[]
  log: ShapingLogEntry[]
  baseView: ProjectView
  headView: ProjectView
  shapingBadge?: { variantId: string; variantName: string } | null
}

export const ReviewPage: FC<ReviewPageProps> = (props) => {
  const range = `${props.base}...${props.head}`
  const { project } = props.headView
  return (
    <main class="compare">
      <header class="compare__header">
        <div class="compare__breadcrumb">
          <a href={resolveUrl(`/${props.owner}`)}>{props.owner}</a>
          {' / '}
          <a href={resolveUrl(`/${props.owner}/${props.slug}`)}>
            {project.name}
          </a>
          {' / '}
          <strong>Compare</strong>
        </div>
        <h1 class="compare__title">{props.head}</h1>
        <p class="compare__subtitle">
          <span>{props.base}</span> <span aria-hidden="true">&larr;</span>{' '}
          <span>{props.head}</span>
        </p>
        <div class="compare__meta">
          <span>
            {props.changes.length}{' '}
            {props.changes.length === 1 ? 'change' : 'changes'}
          </span>
          <span aria-hidden="true">&middot;</span>
          <span>
            {props.log.length} {props.log.length === 1 ? 'commit' : 'commits'}
          </span>
          <span aria-hidden="true">&middot;</span>
          <span>
            {props.comments.length}{' '}
            {props.comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
        {props.shapingBadge ? (
          <VariantBadge
            task="shaping"
            variantId={props.shapingBadge.variantId}
            variantName={props.shapingBadge.variantName}
          />
        ) : null}
        <div class="compare__actions">
          <form
            method="post"
            action={resolveUrl(
              `/${props.owner}/${props.slug}/compare/${range}/merge`,
            )}
          >
            <button type="submit" class="flex-button">
              Merge to {props.base}
            </button>
          </form>
          <form
            method="post"
            action={resolveUrl(
              `/${props.owner}/${props.slug}/compare/${range}/close`,
            )}
          >
            <button type="submit" class="flex-button" data-variant="outline">
              Close
            </button>
          </form>
          <a
            class="flex-button"
            data-variant="unstyled"
            href={resolveUrl(
              `/${props.owner}/${props.slug}/edit/${props.head}`,
            )}
          >
            Open in editor
          </a>
        </div>
      </header>
      <nav class="compare__tabs" role="tablist">
        <a href="#changes" role="tab">
          Changes ({props.changes.length})
        </a>
        <a href="#preview" role="tab">
          Preview
        </a>
        <a href="#history" role="tab">
          History ({props.log.length})
        </a>
        <a href="#comments" role="tab">
          Comments ({props.comments.length})
        </a>
      </nav>
      <section id="changes" class="compare__panel">
        <SemanticDiff changes={toSemanticDiffChanges(props.changes)} />
      </section>
      <section id="preview" class="compare__panel">
        {props.headView.spec && props.headView.formSpec ? (
          <SpecDiffBrowser
            baseDataSpec={props.baseView.spec}
            baseFormSpec={props.baseView.formSpec}
            headDataSpec={props.headView.spec}
            headFormSpec={props.headView.formSpec}
            changes={props.changes}
          />
        ) : (
          <p class="compare__empty">No specs on head yet.</p>
        )}
      </section>
      <section id="history" class="compare__panel">
        {props.log.length === 0 ? (
          <p class="compare__empty">No shaping events on this branch.</p>
        ) : (
          <ol class="compare__history">
            {props.log.map((entry) => (
              <li class="compare__history-entry">
                <time class="compare__history-time">{entry.timestamp}</time>
                <span
                  class="compare__history-source"
                  data-source={entry.source}
                >
                  {entry.source}
                </span>
                {entry.variantId ? (
                  <span class="compare__history-variant">
                    {entry.modelId ?? entry.variantId}
                  </span>
                ) : null}
                <p class="compare__history-explanation">{entry.explanation}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section id="comments" class="compare__panel">
        {props.comments.length === 0 ? (
          <p class="compare__empty">No comments yet.</p>
        ) : (
          <ol class="compare__comments">
            {props.comments.map((comment) => (
              <li class="compare__comment">
                <header class="compare__comment-header">
                  <strong class="compare__comment-author">
                    {comment.author}
                  </strong>
                  <time class="compare__comment-time">{comment.timestamp}</time>
                </header>
                <div class="compare__comment-body">{comment.body}</div>
              </li>
            ))}
          </ol>
        )}
        <form
          class="compare__comment-form"
          method="post"
          action={resolveUrl(
            `/${props.owner}/${props.slug}/compare/${range}/comments`,
          )}
        >
          <label class="compare__comment-label flex-label">
            Comment
            <textarea class="flex-textarea" name="body" rows={4} required />
          </label>
          <button type="submit" class="flex-button">
            Comment
          </button>
        </form>
      </section>
    </main>
  )
}
