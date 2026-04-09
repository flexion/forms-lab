import type { FC } from 'hono/jsx'

interface Step {
  label: string
  state?: 'complete' | 'current'
}

type StepIndicatorVariant =
  | 'no-labels'
  | 'counters'
  | 'small-counters'
  | 'centered'

interface StepIndicatorProps {
  steps: Step[]
  currentLabel: string
  variant?: StepIndicatorVariant
}

export const StepIndicator: FC<StepIndicatorProps> = ({
  steps,
  currentLabel,
  variant,
}) => {
  const currentIndex = steps.findIndex((s) => s.state === 'current')
  const totalSteps = steps.length
  const currentStepNumber = currentIndex >= 0 ? currentIndex + 1 : 1

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label on div matches USWDS step-indicator pattern
    <div
      class="flex-step-indicator"
      data-variant={variant}
      aria-label="Progress"
    >
      <ol class="flex-step-indicator__segments">
        {steps.map((step) => (
          <li
            class="flex-step-indicator__segment"
            data-state={step.state}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span class="flex-step-indicator__segment-label">{step.label}</span>
          </li>
        ))}
      </ol>
      <div class="flex-step-indicator__header">
        <h4 class="flex-step-indicator__heading">
          <span class="flex-step-indicator__current-step">
            Step {currentStepNumber} of {totalSteps}
          </span>
          <span class="flex-step-indicator__heading-text">{currentLabel}</span>
        </h4>
      </div>
    </div>
  )
}
