// src/entrypoints/app/routes/owner/edit/authoring-components.tsx
import type { FC } from 'hono/jsx'
import { StepIndicator } from '../../../../../design-system/components/flex-step-indicator'
import type {
  AuthoringStage,
  Criterion,
  SectionEvalResult,
} from '../../../../../services/form-authoring'

const STAGE_LABELS: Record<AuthoringStage, string> = {
  criteria: 'Evaluation Criteria',
  structure: 'Form Structure',
  sections: 'Section Fields',
  complete: 'Complete',
}

const STAGE_ORDER: AuthoringStage[] = [
  'criteria',
  'structure',
  'sections',
  'complete',
]

export const PipelineStageIndicator: FC<{
  currentStage: AuthoringStage
}> = ({ currentStage }) => {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const steps = STAGE_ORDER.map((stage, i) => ({
    label: STAGE_LABELS[stage],
    state: i < currentIndex ? ('complete' as const) : i === currentIndex ? ('current' as const) : undefined,
  }))

  return (
    <StepIndicator
      steps={steps}
      currentLabel={STAGE_LABELS[currentStage]}
      variant="counters"
    />
  )
}

export const CriteriaList: FC<{
  criteria: Criterion[]
  editable: boolean
  editBase: string
  branch: string
}> = ({ criteria, editable, editBase, branch }) => {
  return (
    <flex-criteria-editor
      data-edit-base={editBase}
      data-branch={branch}
      data-editable={editable ? 'true' : 'false'}
    >
      <ol class="criteria-list">
        {criteria.map((c) => (
          <li class="criteria-list__item" data-status={c.status} data-id={c.id}>
            <span class="criteria-list__text">{c.text}</span>
            <span class="criteria-list__citation">{c.source}</span>
            {editable ? (
              <span class="criteria-list__actions">
                <button type="button" data-action="approve" data-criterion-id={c.id}>
                  Approve
                </button>
                <button type="button" data-action="reject" data-criterion-id={c.id}>
                  Reject
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {editable ? (
        <div class="criteria-list__controls">
          <button type="button" data-action="add-criterion" class="flex-button" data-variant="outline">
            Add criterion
          </button>
          <button type="button" data-action="approve-all" class="flex-button">
            Approve criteria
          </button>
        </div>
      ) : null}
    </flex-criteria-editor>
  )
}

export const EvalScorecard: FC<{
  results: SectionEvalResult[]
  criteria: Criterion[]
}> = ({ results, criteria }) => {
  if (results.length === 0) return null

  const criteriaMap = new Map(criteria.map((c) => [c.id, c]))

  return (
    <flex-eval-scorecard>
      <ul class="eval-scorecard__list">
        {results.map((r) => {
          const criterion = criteriaMap.get(r.criterionId)
          return (
            <li class="eval-scorecard__item" data-pass={r.pass ? 'true' : 'false'}>
              <span class="eval-scorecard__icon">{r.pass ? '\u2713' : '\u2717'}</span>
              <span class="eval-scorecard__text">
                {criterion?.text ?? r.criterionId}
              </span>
              <details class="eval-scorecard__explanation">
                <summary>Details</summary>
                <p>{r.explanation}</p>
              </details>
              {r.retry ? (
                <span class="eval-scorecard__retry">Retry {r.retry}</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </flex-eval-scorecard>
  )
}
