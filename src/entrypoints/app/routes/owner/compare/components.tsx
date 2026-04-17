import type { FC } from 'hono/jsx'
import {
  SemanticDiff,
  type SemanticDiffChange,
} from '../../../../../design-system/components/flex-semantic-diff'
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
        <div class="compare__actions">
          <form
            method="post"
            action={resolveUrl(
              `/${props.owner}/${props.slug}/compare/${range}/merge`,
            )}
          >
            <button type="submit" class="usa-button">
              Merge to {props.base}
            </button>
          </form>
          <form
            method="post"
            action={resolveUrl(
              `/${props.owner}/${props.slug}/compare/${range}/close`,
            )}
          >
            <button type="submit" class="usa-button usa-button--outline">
              Close
            </button>
          </form>
          <a
            class="usa-button usa-button--unstyled"
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
      {/* History / Comments / Preview panels added in Tasks 19-21 */}
    </main>
  )
}
