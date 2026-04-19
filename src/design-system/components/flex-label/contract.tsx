import type { UswdsContract } from '../../contract/types'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-label',
  reference: 'https://designsystem.digital.gov/components/form-controls/',
  mapping: [
    {
      uswds: 'usa-label',
      flex: '.flex-label',
      notes: 'Form label',
    },
  ],
  verified: ['font-family', 'font-size', 'font-weight', 'line-height', 'color'],
  structuralIgnores: ['display'],
  intentionalDifferences: [],
  fixtures: [],
  behavior: [
    {
      description: 'Label associates with input via for/id',
      tested: true,
    },
  ],
}
