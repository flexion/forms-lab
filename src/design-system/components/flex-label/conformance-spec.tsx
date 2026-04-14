import type { ConformanceSpec } from '../../conformance/types'

export const spec: ConformanceSpec = {
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
