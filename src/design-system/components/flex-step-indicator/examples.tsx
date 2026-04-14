import type { FC } from 'hono/jsx'
import { StepIndicator } from './index'

const threeSteps = [
  { label: 'Personal information', state: 'complete' as const },
  { label: 'Household status', state: 'current' as const },
  { label: 'Supporting documents' },
]

const fiveSteps = [
  { label: 'Personal information', state: 'complete' as const },
  { label: 'Household status', state: 'complete' as const },
  { label: 'Supporting documents', state: 'current' as const },
  { label: 'Signature' },
  { label: 'Review and submit' },
]

export const Default: FC = () => (
  <StepIndicator steps={threeSteps} currentLabel="Household status" />
)

export const NoLabels: FC = () => (
  <StepIndicator
    steps={threeSteps}
    currentLabel="Household status"
    variant="no-labels"
  />
)

export const Counters: FC = () => (
  <StepIndicator
    steps={fiveSteps}
    currentLabel="Supporting documents"
    variant="counters"
  />
)

export const SmallCounters: FC = () => (
  <StepIndicator
    steps={fiveSteps}
    currentLabel="Supporting documents"
    variant="small-counters"
  />
)

export const Centered: FC = () => (
  <StepIndicator
    steps={threeSteps}
    currentLabel="Household status"
    variant="centered"
  />
)
