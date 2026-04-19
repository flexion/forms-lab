import type { UswdsContract } from '../../contract/types'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-textarea',
  reference: 'https://designsystem.digital.gov/components/form-controls/',
  mapping: [
    {
      uswds: 'usa-textarea',
      flex: '.flex-textarea',
      notes: 'Multi-line text input',
    },
  ],
  verified: [
    'font-family',
    'font-size',
    'color',
    'background-color',
    'border-radius',
  ],
  structuralIgnores: ['display'],
  intentionalDifferences: [],
  fixtures: [],
  behavior: [
    { description: 'Focus ring visible on keyboard focus', tested: false },
    { description: 'Disabled state grays out textarea', tested: false },
  ],
}
