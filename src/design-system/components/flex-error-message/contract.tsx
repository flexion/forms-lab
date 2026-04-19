import type { UswdsContract } from '../../contract/types'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-error-message',
  reference: 'https://designsystem.digital.gov/components/form-controls/',
  mapping: [
    {
      uswds: 'usa-error-message',
      flex: '.flex-error-message',
      notes: 'Inline validation error message',
    },
  ],
  verified: ['font-family', 'font-size', 'font-weight', 'color'],
  structuralIgnores: ['display'],
  intentionalDifferences: [],
  fixtures: [],
  behavior: [
    {
      description: 'Error message announced via role="alert" or aria-live',
      tested: true,
    },
  ],
}
