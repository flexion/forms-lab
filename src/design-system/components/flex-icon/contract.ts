import type { UswdsContract } from '../../contract/types'

export const spec: UswdsContract = {
  kind: 'uswds-derived',
  component: 'flex-icon',
  reference: 'https://designsystem.digital.gov/components/icon/',
  mapping: [
    {
      uswds: 'usa-icon',
      flex: '.flex-icon',
      notes: 'SVG icon from USWDS sprite',
    },
  ],
  verified: ['width', 'height'],
  structuralIgnores: [],
  intentionalDifferences: [],
  fixtures: [],
  behavior: [
    {
      description: 'Decorative icons have aria-hidden="true"',
      tested: true,
    },
    {
      description: 'Meaningful icons have role="img" and aria-label',
      tested: true,
    },
  ],
}
